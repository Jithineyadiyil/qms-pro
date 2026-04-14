<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{
    Document,
    DocumentCategory,
    DocumentVersion,
    DocumentAccessLog,
    User,
    Department
};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller {

    /** Returns true if the user belongs to the Quality Assurance department */
    private function isQualityUser(Request $request): bool {
        return $request->user()->department?->code === 'QA';
    }

    /** Abort with 403 if user is not Quality dept */
    private function requireQualityDept(Request $request): void {
        if (!$this->isQualityUser($request) && !$request->user()->isSuperAdmin()) {
            abort(403, 'Only the Quality department can perform this action.');
        }
    }

    public function index(Request $request) {
        $user = $request->user();
        $isQA = $this->isQualityUser($request) || $user->isSuperAdmin();
        $deptId = $user->department_id;

        $q = Document::with(['category', 'owner', 'department', 'distributedDepartments'])
                ->when($request->type, fn($q, $v) => $q->where('type', $v))
                ->when($request->category_id, fn($q, $v) => $q->where('category_id', $v))
                ->when($request->search, fn($q, $v) => $q->where(fn($s) =>
                        $s->where('title', 'like', "%$v%")->orWhere('document_no', 'like', "%$v%")
        ));

        if ($isQA) {
            // Quality dept sees ALL documents, all statuses, with status filter
            $q->when($request->status, fn($q, $v) => $q->where('status', $v));
        } else {
            // Other depts see ONLY approved documents distributed to their department
            $q->where('status', 'approved')
                    ->where(function ($query) use ($deptId) {
                        $query->where('department_id', $deptId) // owning dept
                        ->orWhereHas('distributedDepartments', fn($d) => $d->where('departments.id', $deptId));
                    });
        }

        return response()->json($q->orderByDesc('updated_at')->paginate(15));
    }

    public function store(Request $request) {
        $this->requireQualityDept($request);

        $data = $request->validate([
            'title' => 'required|max:255',
            'description' => 'nullable',
            'category_id' => 'nullable|exists:document_categories,id',
            'department_id' => 'nullable|exists:departments,id',
            'type' => 'required|in:policy,procedure,work_instruction,form,template,manual,specification,report,other',
            'reviewer_id' => 'nullable|exists:users,id',
            'approver_id' => 'nullable|exists:users,id',
            'version' => 'nullable|string|max:20',
            'effective_date' => 'nullable|date',
            'review_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'is_controlled' => 'boolean',
            'requires_signature' => 'boolean',
            'distribute_to' => 'nullable|array',
            'distribute_to.*' => 'exists:departments,id',
            'file' => 'nullable|file|max:20480',
        ]);

        // Always owned by the QA department unless overridden
        $data['owner_id'] = $request->user()->id;
        $data['department_id'] = $data['department_id'] ?? $request->user()->department_id;
        $data['document_no'] = $this->generateDocNo($data['type']);
        $data['version'] = $data['version'] ?? '1.0';

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $data['file_path'] = $file->store('documents', 'public');
            $data['file_size'] = $file->getSize();
            $data['mime_type'] = $file->getMimeType();
        }

        $distributeTo = $data['distribute_to'] ?? [];
        unset($data['file'], $data['distribute_to']);

        $doc = Document::create($data);

        // Initial version record
        $doc->versions()->create([
            'version' => $doc->version,
            'change_summary' => 'Initial version',
            'changed_by_id' => $request->user()->id,
            'file_path' => $doc->file_path,
        ]);

        // Distribute to selected departments
        if (!empty($distributeTo)) {
            $doc->distributedDepartments()->syncWithoutDetaching(
                    collect($distributeTo)->mapWithKeys(fn($id) => [$id => ['distributed_at' => now()]])->all()
            );
        }

        return response()->json($doc->load(['category', 'owner', 'department', 'distributedDepartments']), 201);
    }

    public function show(Request $request, $id) {
        $user = $request->user();
        $doc = Document::with(['category', 'owner', 'reviewer', 'approver', 'department', 'versions.changedBy', 'distributedDepartments'])->findOrFail($id);
        $isQA = $this->isQualityUser($request) || $user->isSuperAdmin();

        // Non-QA users can only see approved docs distributed to their department
        if (!$isQA) {
            if ($doc->status !== 'approved')
                abort(403, 'Document not available.');
            if (!$doc->isVisibleToDepartment($user->department_id)) {
                abort(403, 'This document has not been distributed to your department.');
            }
        }

        try {
            $doc->accessLogs()->create(['user_id' => $user->id, 'action' => 'view', 'ip_address' => $request->ip()]);
        } catch (\Exception $e) {
            
        }

        return response()->json($doc);
    }

    public function update(Request $request, $id) {
        $this->requireQualityDept($request);
        $doc = Document::findOrFail($id);
        $doc->update($request->only([
                    'title', 'description', 'status', 'reviewer_id', 'approver_id',
                    'version', 'effective_date', 'review_date', 'expiry_date',
                    'is_controlled', 'requires_signature', 'tags',
        ]));
        return response()->json($doc->fresh(['category', 'owner', 'department', 'distributedDepartments']));
    }

    public function destroy(Request $request, $id) {
        $this->requireQualityDept($request);
        $doc = Document::findOrFail($id);
        if ($doc->file_path)
            Storage::disk('public')->delete($doc->file_path);
        $doc->delete();
        return response()->json(['message' => 'Document deleted.']);
    }

    public function submitForReview(Request $request, $id) {
        $this->requireQualityDept($request);
        $doc = Document::findOrFail($id);
        if ($doc->status !== 'draft')
            abort(422, 'Only draft documents can be submitted for review.');
        $doc->update(['status' => 'under_review', 'submitted_at' => now()]);
        return response()->json($doc->fresh());
    }

    public function approve(Request $request, $id) {
        $this->requireQualityDept($request);
        $doc = Document::findOrFail($id);
        if (!in_array($doc->status, ['under_review', 'pending_approval'])) {
            abort(422, 'Document must be under review to approve.');
        }
        $doc->update([
            'status' => 'approved',
            'effective_date' => $request->effective_date ?? now()->toDateString(),
            'approver_id' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);
        return response()->json($doc->fresh());
    }

    public function reject(Request $request, $id) {
        $this->requireQualityDept($request);
        $request->validate(['reason' => 'required|string']);
        $doc = Document::findOrFail($id);
        $doc->update(['status' => 'draft', 'rejection_reason' => $request->reason]);
        return response()->json(['message' => 'Document rejected.', 'reason' => $request->reason]);
    }

    public function markObsolete(Request $request, $id) {
        $this->requireQualityDept($request);
        $doc = Document::findOrFail($id);
        $doc->update(['status' => 'obsolete']);
        return response()->json($doc->fresh());
    }

    public function newVersion(Request $request, $id) {
        $this->requireQualityDept($request);
        $doc = Document::findOrFail($id);
        $request->validate([
            'version' => 'required|string|max:20',
            'change_summary' => 'nullable|string',
            'file' => 'nullable|file|max:20480',
        ]);

        $filePath = $doc->file_path;
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filePath = $file->store('documents', 'public');
            $doc->update(['file_path' => $filePath, 'file_size' => $file->getSize(), 'mime_type' => $file->getMimeType()]);
        }

        $ver = $doc->versions()->create([
            'version' => $request->version,
            'change_summary' => $request->change_summary,
            'changed_by_id' => $request->user()->id,
            'file_path' => $filePath,
        ]);

        $doc->update(['version' => $request->version, 'status' => 'draft']);
        return response()->json($ver->load('changedBy'), 201);
    }

    /** Distribute (or update distribution) of a document to specific departments */
    public function distribute(Request $request, $id) {
        $this->requireQualityDept($request);
        $request->validate([
            'department_ids' => 'required|array',
            'department_ids.*' => 'exists:departments,id',
        ]);
        $doc = Document::findOrFail($id);
        if ($doc->status !== 'approved')
            abort(422, 'Only approved documents can be distributed.');

        $doc->distributedDepartments()->sync(
                collect($request->department_ids)->mapWithKeys(fn($id) => [$id => ['distributed_at' => now()]])->all()
        );

        return response()->json([
                    'message' => 'Document distributed to ' . count($request->department_ids) . ' department(s).',
                    'departments' => $doc->fresh()->distributedDepartments,
        ]);
    }

    public function versions($id) {
        Document::findOrFail($id);
        return response()->json(DocumentVersion::with('changedBy')->where('document_id', $id)->orderByDesc('created_at')->get());
    }

    public function accessLog($id) {
        Document::findOrFail($id);
        return response()->json(DocumentAccessLog::with(['user', 'user.department'])->where('document_id', $id)->orderByDesc('created_at')->take(50)->get());
    }

    public function download(Request $request, $id) {
        $user = $request->user();
        $doc = Document::findOrFail($id);
        $isQA = $this->isQualityUser($request) || $user->isSuperAdmin();

        if (!$isQA) {
            if ($doc->status !== 'approved')
                abort(403);
            if (!$doc->isVisibleToDepartment($user->department_id))
                abort(403);
            if ($doc->type != 'form')
                abort(403);
        }

        try {
            $doc->accessLogs()->create(['user_id' => $user->id, 'action' => 'download', 'ip_address' => $request->ip()]);
        } catch (\Exception $e) {
            
        }

        if (!$doc->file_path || !Storage::disk('public')->exists($doc->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }
        return response()->json(['url' => Storage::disk('public')->url($doc->file_path), 'filename' => basename($doc->file_path)]);
    }

    public function expiring(Request $request) {
        $isQA = $this->isQualityUser($request) || $request->user()->isSuperAdmin();
        $days = $request->days ?? 30;
        $q = Document::with(['owner', 'department'])
                ->whereNotNull('review_date')
                ->whereDate('review_date', '<=', now()->addDays($days))
                ->where('status', 'approved')
                ->orderBy('review_date');

        if (!$isQA) {
            $deptId = $request->user()->department_id;
            $q->where(function ($query) use ($deptId) {
                $query->where('department_id', $deptId)
                        ->orWhereHas('distributedDepartments', fn($d) => $d->where('departments.id', $deptId));
            });
        }
        return response()->json($q->get());
    }

    public function stats(Request $request) {
        $isQA = $this->isQualityUser($request) || $request->user()->isSuperAdmin();
        $deptId = $request->user()->department_id;

        $base = Document::query();
        if (!$isQA) {
            $base->where('status', 'approved')
                    ->where(function ($q) use ($deptId) {
                        $q->where('department_id', $deptId)
                        ->orWhereHas('distributedDepartments', fn($d) => $d->where('departments.id', $deptId));
                    });
        }

        return response()->json([
                    'by_status' => (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->get(),
                    'by_type' => (clone $base)->selectRaw('type, count(*) as total')->groupBy('type')->get(),
        ]);
    }

    public function categories() {
        return response()->json(DocumentCategory::orderBy('name')->get());
    }

    public function users() {
        return response()->json(User::select('id', 'name', 'email')->where('is_active', 1)->orderBy('name')->get());
    }

    public function departments() {
        return response()->json(Department::select('id', 'name', 'code')->orderBy('name')->get());
    }

    private function generateDocNo(string $type): string {
        $prefix = match ($type) {
            'policy' => 'POL',
            'procedure' => 'PRO',
            'work_instruction' => 'WI',
            'form', 'template' => 'FRM',
            'manual' => 'MAN',
            'specification' => 'SPC',
            'report' => 'RPT',
            default => 'DOC',
        };
        $count = Document::where('document_no', 'like', "$prefix-%")->count() + 1;
        return $prefix . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    public function preview(Request $request,$id) {
        $doc = Document::findOrFail($id);
        $user = $request->user();
        if (!$doc->file_path) {
            abort(404);
        }

        $path = Storage::disk('public')->path($doc->file_path);
          try {
            $doc->accessLogs()->create(['user_id' => $user->id, 'action' => 'view', 'ip_address' => $request->ip()]);
        } catch (\Exception $e) {
            
        }

        return response()->file($path, [
                    'Content-Disposition' => 'inline'
        ]);
    }
}
