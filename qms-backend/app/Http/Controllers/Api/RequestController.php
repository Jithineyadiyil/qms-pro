<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request as ServiceRequest;
use App\Models\RequestComment;
use App\Models\RequestApproval;
use App\Models\RequestCategory;
use App\Models\User;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequestController extends Controller
{
    // ─────────────────────────────────────────────────────
    // Role helpers  (slug-based, no hardcoded IDs)
    // ─────────────────────────────────────────────────────

    private function userRole(): string  { return auth()->user()->role?->slug ?? ''; }
    private function isQAManager(): bool { return in_array($this->userRole(), ['super_admin','qa_manager']); }
    private function isDeptManager():bool{ return $this->userRole() === 'dept_manager'; }
    private function isQAOfficer(): bool { return $this->userRole() === 'qa_officer'; }

    /** Find the primary QA Manager (dept code=QA, role=qa_manager) */
    private function findQAManager(): ?User {
        $qaManagerRoleId = DB::table('roles')->where('slug','qa_manager')->value('id');
        $qaDeptId        = DB::table('departments')->where('code','QA')->value('id');
        // Prefer the dept head, fall back to first QA Manager in QA dept
        $dept = Department::find($qaDeptId);
        if ($dept?->head_user_id) {
            $head = User::find($dept->head_user_id);
            if ($head?->role_id === $qaManagerRoleId) return $head;
        }
        return User::where('role_id', $qaManagerRoleId)
                   ->where('department_id', $qaDeptId)
                   ->where('is_active', 1)
                   ->first();
    }

    // ─────────────────────────────────────────────────────
    // GET /api/requests
    // ─────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $user  = auth()->user();
        $query = ServiceRequest::with(['category','requester','assignee','department']);

        if ($request->filled('status'))        $query->where('status',        $request->status);
        if ($request->filled('priority'))      $query->where('priority',      $request->priority);
        if ($request->filled('type'))          $query->where('type',          $request->type);
        if ($request->filled('department_id')) $query->where('department_id', $request->department_id);
        if ($request->filled('category_id'))   $query->where('category_id',   $request->category_id);
        if ($request->filled('assignee_id'))   $query->where('assignee_id',   $request->assignee_id);
        if ($request->filled('overdue'))       $query->whereNotNull('due_date')->where('due_date','<',now())->whereNotIn('status',['closed','rejected']);
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn($s) => $s->where('title','like',"%$q%")
                ->orWhere('reference_no','like',"%$q%")
                ->orWhere('description','like',"%$q%"));
        }

        // ── Visibility scoping ─────────────────────────
        if ($this->isQAManager()) {
            // QA Manager / Super Admin: see all requests
        } elseif ($this->isDeptManager()) {
            // Dept Manager: only requests from their department
            $query->where('department_id', $user->department_id);
        } elseif ($this->isQAOfficer()) {
            // QA Officer: only requests assigned to them (in_progress)
            // + approved requests in the QA queue so they can see context
            $query->where(function($q) use ($user) {
                $q->where('assignee_id', $user->id)
                  ->orWhereIn('status', ['approved']); // visible QA queue
            });
        } else {
            // Employee: only their own submissions
            $query->where('requester_id', $user->id);
        }

        return response()->json($query->orderByDesc('created_at')->paginate((int)$request->get('per_page',15)));
    }

    // ─────────────────────────────────────────────────────
    // POST /api/requests  (Employee creates)
    // ─────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'required|string',
            'category_id' => 'nullable|exists:request_categories,id',
            'type'        => 'nullable|in:internal,external,client,vendor,regulatory',
            'priority'    => 'required|in:low,medium,high,critical',
            'due_date'    => 'nullable|date',
        ]);

        $category = isset($validated['category_id']) ? RequestCategory::find($validated['category_id']) : null;
        if (empty($validated['due_date']) && $category?->sla_hours) {
            $validated['due_date'] = now()->addHours($category->sla_hours)->toDateString();
        }

        $ref = 'REQ-' . date('Y') . '-' . str_pad(ServiceRequest::count() + 1, 4, '0', STR_PAD_LEFT);

        $req = ServiceRequest::create(array_merge($validated, [
            'reference_no'  => $ref,
            'requester_id'  => auth()->id(),
            'department_id' => auth()->user()->department_id ?? null,
            'status'        => 'draft',
            'type'          => $validated['type'] ?? 'internal',
        ]));

        return response()->json($req->load(['category','requester','assignee','department']), 201);
    }

    // ─────────────────────────────────────────────────────
    // GET /api/requests/{id}
    // ─────────────────────────────────────────────────────
    public function show($id)
    {
        $req  = ServiceRequest::with(['category','requester','assignee','department','comments.user','approvals.approver'])->findOrFail($id);
        $user = auth()->user();

        // Employees: only their own
        if (!$this->isQAManager() && !$this->isDeptManager() && !$this->isQAOfficer()) {
            if ($req->requester_id !== $user->id) abort(403, 'You can only view your own requests.');
        }
        // Dept Managers: only their dept
        if ($this->isDeptManager() && $req->department_id !== $user->department_id) {
            abort(403, 'You can only view requests from your department.');
        }

        return response()->json($req);
    }

    // ─────────────────────────────────────────────────────
    // PUT /api/requests/{id}
    // ─────────────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $req = ServiceRequest::findOrFail($id);
        if ($req->status !== 'draft') {
            return response()->json(['message' => 'Only draft requests can be edited.'], 422);
        }
        if ($req->requester_id !== auth()->id() && !$this->isQAManager()) {
            abort(403, 'Only the requester can edit this request.');
        }
        $req->update($request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category_id' => 'nullable|exists:request_categories,id',
            'type'        => 'nullable|in:internal,external,client,vendor,regulatory',
            'priority'    => 'sometimes|in:low,medium,high,critical',
            'due_date'    => 'nullable|date',
        ]));
        return response()->json($req->fresh(['category','requester','assignee','department']));
    }

    // ─────────────────────────────────────────────────────
    // DELETE /api/requests/{id}
    // ─────────────────────────────────────────────────────
    public function destroy($id)
    {
        $req = ServiceRequest::findOrFail($id);
        if ($req->status !== 'draft') {
            return response()->json(['message' => 'Only draft requests can be deleted.'], 422);
        }
        $req->delete();
        return response()->json(['message' => 'Request deleted.']);
    }

    // ─────────────────────────────────────────────────────
    // POST /api/requests/{id}/submit
    // Employee submits draft → awaiting Dept Manager approval
    // ─────────────────────────────────────────────────────
    public function submit($id)
    {
        $req = ServiceRequest::findOrFail($id);
        if ($req->status !== 'draft') {
            return response()->json(['message' => 'Only draft requests can be submitted.'], 422);
        }
        if ($req->requester_id !== auth()->id() && !$this->isQAManager()) {
            abort(403, 'Only the requester can submit this request.');
        }

        $req->update(['status' => 'submitted', 'submitted_at' => now()]);

        RequestApproval::create([
            'request_id'  => $id,
            'approver_id' => auth()->id(),
            'sequence'    => 1,
            'status'      => 'pending',
            'comments'    => 'Submitted by ' . auth()->user()->name . '. Awaiting Department Manager approval.',
        ]);

        return response()->json($req->fresh(['category','requester','assignee','department']));
    }

    // ─────────────────────────────────────────────────────
    // POST /api/requests/{id}/approve
    // Dept Manager approves → auto-assigns to QA Manager
    // ─────────────────────────────────────────────────────
    public function approve(Request $request, $id)
    {
        if (!$this->isDeptManager() && !$this->isQAManager()) {
            abort(403, 'Only Department Managers can approve requests.');
        }

        $req = ServiceRequest::findOrFail($id);
        if ($req->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted requests can be approved.'], 422);
        }

        // Dept Manager scoped to own dept
        if ($this->isDeptManager()) {
            if ($req->department_id !== auth()->user()->department_id) {
                abort(403, 'You can only approve requests from your department.');
            }
        }

        $request->validate(['comments' => 'nullable|string']);

        // Auto-find the QA Manager to assign to
        $qaManager = $this->findQAManager();

        $req->update([
            'status'      => 'approved',      // approved = in QA Manager inbox
            'approved_at' => now(),
            'approved_by' => auth()->id(),
            'assignee_id' => $qaManager?->id, // ← auto-assign to QA Manager
        ]);

        // Step 1: Dept Manager approval log
        RequestApproval::create([
            'request_id'  => $id,
            'approver_id' => auth()->id(),
            'sequence'    => 1,
            'status'      => 'approved',
            'comments'    => $request->comments
                ?: 'Approved by ' . auth()->user()->name . '. Forwarded to Quality Department.',
            'decided_at'  => now(),
        ]);

        return response()->json($req->fresh(['category','requester','assignee','department']));
    }

    // ─────────────────────────────────────────────────────
    // POST /api/requests/{id}/reject
    // Dept Manager rejects → back to employee
    // ─────────────────────────────────────────────────────
    public function reject(Request $request, $id)
    {
        if (!$this->isDeptManager() && !$this->isQAManager()) {
            abort(403, 'Only Department Managers can reject requests.');
        }

        $req = ServiceRequest::findOrFail($id);
        if ($req->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted requests can be rejected.'], 422);
        }
        if ($this->isDeptManager() && $req->department_id !== auth()->user()->department_id) {
            abort(403, 'You can only reject requests from your department.');
        }

        $request->validate(['reason' => 'required|string']);

        $req->update(['status' => 'rejected', 'assignee_id' => null]);

        RequestApproval::create([
            'request_id'  => $id,
            'approver_id' => auth()->id(),
            'sequence'    => 1,
            'status'      => 'rejected',
            'comments'    => $request->reason,
            'decided_at'  => now(),
        ]);

        return response()->json($req->fresh(['category','requester','assignee','department']));
    }

    // ─────────────────────────────────────────────────────
    // POST /api/requests/{id}/assign
    // QA Manager assigns to a QA Officer / Specialist
    // ─────────────────────────────────────────────────────
    public function assign(Request $request, $id)
    {
        if (!$this->isQAManager()) {
            abort(403, 'Only the QA Manager can assign requests to team members.');
        }

        $request->validate(['assignee_id' => 'required|exists:users,id']);
        $req = ServiceRequest::findOrFail($id);

        if ($req->status !== 'approved') {
            return response()->json([
                'message' => 'Only requests in the QA queue (approved) can be assigned. The request must be approved by the Department Manager first.'
            ], 422);
        }

        $officer = User::findOrFail($request->assignee_id);

        $req->update([
            'assignee_id' => $officer->id,
            'status'      => 'in_progress',
        ]);

        // Log QA assignment
        RequestApproval::create([
            'request_id'  => $id,
            'approver_id' => auth()->id(),
            'sequence'    => 2,
            'status'      => 'approved',
            'comments'    => 'Assigned to ' . $officer->name . ' by QA Manager ' . auth()->user()->name . '.',
            'decided_at'  => now(),
        ]);

        return response()->json($req->fresh(['category','requester','assignee','department']));
    }

    // ─────────────────────────────────────────────────────
    // POST /api/requests/{id}/close
    // QA Officer closes with resolution / QA Manager can also close
    // ─────────────────────────────────────────────────────
    public function close(Request $request, $id)
    {
        if (!$this->isQAManager() && !$this->isQAOfficer()) {
            abort(403, 'Only QA staff can close requests.');
        }

        $request->validate(['resolution' => 'required|string']);
        $req = ServiceRequest::findOrFail($id);

        // QA Officer: must be assigned to them
        if ($this->isQAOfficer() && $req->assignee_id !== auth()->id()) {
            abort(403, 'You can only close requests assigned to you.');
        }

        if (!in_array($req->status, ['in_progress', 'approved'])) {
            return response()->json(['message' => 'Request cannot be closed from its current status.'], 422);
        }

        $req->update([
            'status'     => 'closed',
            'resolution' => $request->resolution,
            'closed_at'  => now(),
            'closed_by'  => auth()->id(),
        ]);

        return response()->json($req->fresh(['category','requester','assignee','department']));
    }

    // ─────────────────────────────────────────────────────
    // Comments
    // ─────────────────────────────────────────────────────
    public function comments($id)
    {
        return response()->json(
            RequestComment::with('user')->where('request_id', $id)->orderBy('created_at')->get()
        );
    }

    public function addComment(Request $request, $id)
    {
        $request->validate(['comment' => 'required|string', 'is_internal' => 'boolean']);
        ServiceRequest::findOrFail($id);
        $comment = RequestComment::create([
            'request_id'  => $id,
            'user_id'     => auth()->id(),
            'comment'     => $request->comment,
            'is_internal' => $request->boolean('is_internal', false),
        ]);
        return response()->json($comment->load('user'), 201);
    }

    public function approvals($id)
    {
        return response()->json(
            RequestApproval::with('approver')->where('request_id', $id)->orderBy('sequence')->get()
        );
    }

    // ─────────────────────────────────────────────────────
    // Stats — scoped per role
    // ─────────────────────────────────────────────────────
    public function stats()
    {
        $user = auth()->user();
        $base = ServiceRequest::query();

        if ($this->isQAManager()) {
            // All requests
        } elseif ($this->isDeptManager()) {
            $base->where('department_id', $user->department_id);
        } elseif ($this->isQAOfficer()) {
            $base->where(function($q) use ($user) {
                $q->where('assignee_id', $user->id)->orWhere('status','approved');
            });
        } else {
            $base->where('requester_id', $user->id);
        }

        return response()->json([
            'total'       => (clone $base)->count(),
            'draft'       => (clone $base)->where('status','draft')->count(),
            'submitted'   => (clone $base)->where('status','submitted')->count(),
            'approved'    => (clone $base)->where('status','approved')->count(),   // QA Manager inbox
            'in_progress' => (clone $base)->where('status','in_progress')->count(),
            'rejected'    => (clone $base)->where('status','rejected')->count(),
            'closed'      => (clone $base)->where('status','closed')->count(),
            'overdue'     => (clone $base)->whereNotNull('due_date')->where('due_date','<',now())->whereNotIn('status',['closed','rejected'])->count(),
            'critical'    => (clone $base)->where('priority','critical')->whereNotIn('status',['closed','rejected'])->count(),
        ]);
    }

    // ─────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────
    public function categories()  { return response()->json(RequestCategory::orderBy('name')->get()); }

    /** Returns QA dept users (officers + manager) for assignment dropdown */
    public function users()
    {
        $qaDeptId = DB::table('departments')->where('code','QA')->value('id');
        return response()->json(
            User::select('id','name','email','role_id','department_id')
                ->where('is_active', 1)
                ->where('department_id', $qaDeptId)
                ->with('role:id,name,slug')
                ->orderBy('name')
                ->get()
        );
    }

    public function departments() { return response()->json(Department::orderBy('name')->get()); }
}
