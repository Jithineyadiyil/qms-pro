<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Models\Request as ServiceRequest;
use App\Models\RequestComment;
use App\Models\RequestApproval;
use App\Models\RequestCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * RequestController — QDM v2
 *
 * Handles all request lifecycle endpoints.
 * store() now accepts risk_level, request_sub_type, dynamic_fields
 * so the QDM form can save without validation errors.
 */
class RequestController extends BaseController
{
    // ── GET /api/requests ─────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = ServiceRequest::with(['category', 'requester', 'assignee', 'department']);

        if ($request->filled('status'))        $query->where('status', $request->status);
        if ($request->filled('priority'))      $query->where('priority', $request->priority);
        if ($request->filled('type'))          $query->where('type', $request->type);
        if ($request->filled('department_id')) $query->where('department_id', $request->department_id);
        if ($request->filled('category_id'))   $query->where('category_id', $request->category_id);
        if ($request->filled('assignee_id'))   $query->where('assignee_id', $request->assignee_id);
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn($sq) => $sq
                ->where('title',        'like', "%{$q}%")
                ->orWhere('reference_no','like', "%{$q}%")
                ->orWhere('description', 'like', "%{$q}%")
            );
        }
        if ($request->filled('date_from')) $query->whereDate('created_at', '>=', $request->date_from);
        if ($request->filled('date_to'))   $query->whereDate('created_at', '<=', $request->date_to);

        $user = auth()->user();
        if ($user->role->slug === 'employee') {
            $query->where('requester_id', $user->id);
        } elseif ($user->role->slug === 'department_manager') {
            $query->where('department_id', $user->department_id);
        }

        $query->orderBy('created_at', 'desc');
        return $this->paginated($query, (int) $request->get('per_page', 15));
    }

    // ── POST /api/requests ────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // ── Core (always required) ────────────────────────────────────
            'title'            => 'required|string|max:255',
            'description'      => 'required|string',
            'type'             => 'required|in:internal,external,client,vendor,regulatory',
            'priority'         => 'required|in:low,medium,high,critical',

            // ── QDM v2 (nullable so drafts without them still save) ───────
            'risk_level'       => 'nullable|in:low,medium,high,critical',
            'request_sub_type' => 'nullable|string|in:'
                . 'policy_update,new_policy,procedure_update,new_procedure,'
                . 'sla_update,new_sla,form_update,new_form,unregulated_work,'
                . 'document_review,quality_review,issue_analysis,kpi_measurement,'
                . 'manual_update,new_manual,new_project,new_development,'
                . 'quality_note,external_audit_prep,other',
            'dynamic_fields'   => 'nullable|array',

            // ── Optional ──────────────────────────────────────────────────
            'category_id'      => 'nullable|exists:request_categories,id',
            'department_id'    => 'nullable|exists:departments,id',
            'due_date'         => 'nullable|date|after_or_equal:today',
            'attachments'      => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $category = isset($validated['category_id'])
                ? RequestCategory::find($validated['category_id'])
                : null;

            if (empty($validated['due_date']) && $category?->sla_hours) {
                $validated['due_date'] = now()->addHours($category->sla_hours);
            }

            $serviceRequest = ServiceRequest::create([
                ...$validated,
                'reference_no' => $this->generateRef('REQ'),
                'requester_id' => auth()->id(),
                'department_id'=> $validated['department_id'] ?? auth()->user()->department_id,
                'status'       => 'draft',
            ]);

            $this->logActivity('requests', 'create', $serviceRequest, [], $validated);
            DB::commit();

            return $this->success(
                $serviceRequest->load(['category', 'requester', 'assignee', 'department']),
                'Request created successfully',
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to create request: ' . $e->getMessage(), 500);
        }
    }

    // ── GET /api/requests/{id} ────────────────────────────────────────────

    public function show(int $id): JsonResponse
    {
        $sr = ServiceRequest::with([
            'category', 'requester', 'assignee', 'department',
            'comments.user', 'approvals.approver',
        ])->findOrFail($id);

        return $this->success($sr);
    }

    // ── PUT /api/requests/{id} ────────────────────────────────────────────

    public function update(Request $request, int $id): JsonResponse
    {
        $sr = ServiceRequest::findOrFail($id);

        if (in_array($sr->status, ['approved', 'closed'], true)) {
            return $this->error('Cannot update a closed or approved request', 422);
        }

        $validated = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'description'      => 'sometimes|string',
            'category_id'      => 'nullable|exists:request_categories,id',
            'department_id'    => 'nullable|exists:departments,id',
            'type'             => 'sometimes|in:internal,external,client,vendor,regulatory',
            'priority'         => 'sometimes|in:low,medium,high,critical',
            'risk_level'       => 'nullable|in:low,medium,high,critical',
            'request_sub_type' => 'nullable|string',
            'dynamic_fields'   => 'nullable|array',
            'due_date'         => 'nullable|date',
            'attachments'      => 'nullable|array',
        ]);

        $old = $sr->toArray();
        $sr->update($validated);
        $this->logActivity('requests', 'update', $sr, $old, $validated);

        return $this->success(
            $sr->fresh(['category', 'requester', 'assignee', 'department']),
            'Request updated successfully'
        );
    }

    // ── DELETE /api/requests/{id} ─────────────────────────────────────────

    public function destroy(int $id): JsonResponse
    {
        $sr = ServiceRequest::findOrFail($id);

        if ($sr->status !== 'draft') {
            return $this->error('Only draft requests can be deleted', 422);
        }

        $this->logActivity('requests', 'delete', $sr);
        $sr->delete();

        return $this->success(null, 'Request deleted successfully');
    }

    // ── POST /api/requests/{id}/submit ────────────────────────────────────

    public function submit(int $id): JsonResponse
    {
        $sr = ServiceRequest::findOrFail($id);

        if ($sr->status !== 'draft') {
            return $this->error('Only draft requests can be submitted', 422);
        }

        // Ownership check — only the requester can submit
        if ((int) $sr->requester_id !== auth()->id()) {
            $role = auth()->user()->role->slug ?? '';
            if (!in_array($role, ['super_admin', 'qa_manager', 'dept_manager'], true)) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
        }

        $sr->update(['status' => 'submitted', 'submitted_at' => now()]);
        $this->logActivity('requests', 'submit', $sr);

        return $this->success($sr->fresh(), 'Request submitted successfully');
    }

    // ── POST /api/requests/{id}/assign ────────────────────────────────────

    public function assign(Request $request, int $id): JsonResponse
    {
        $request->validate(['assignee_id' => 'required|exists:users,id']);
        $sr = ServiceRequest::findOrFail($id);

        $old = ['assignee_id' => $sr->assignee_id, 'status' => $sr->status];
        $sr->update(['assignee_id' => $request->assignee_id, 'status' => 'under_review']);

        $this->logActivity('requests', 'assign', $sr, $old);
        $this->sendNotification(
            $request->assignee_id,
            'request_assigned',
            'Request Assigned to You',
            "You have been assigned to request {$sr->reference_no}",
            ['request_id' => $sr->id]
        );

        return $this->success($sr->fresh(['assignee']), 'Request assigned successfully');
    }

    // ── POST /api/requests/{id}/approve ───────────────────────────────────

    public function approve(Request $request, int $id): JsonResponse
    {
        $request->validate(['comments' => 'nullable|string']);
        $sr = ServiceRequest::findOrFail($id);

        $sr->update(['status' => 'approved', 'approved_at' => now(), 'approved_by' => auth()->id()]);

        RequestApproval::create([
            'request_id'  => $id,
            'approver_id' => auth()->id(),
            'status'      => 'approved',
            'comments'    => $request->comments,
            'decided_at'  => now(),
        ]);

        $this->logActivity('requests', 'approve', $sr);
        $this->sendNotification(
            $sr->requester_id,
            'request_approved',
            'Your Request Has Been Approved',
            "Request {$sr->reference_no} has been approved.",
            ['request_id' => $sr->id]
        );

        return $this->success($sr->fresh(), 'Request approved successfully');
    }

    // ── POST /api/requests/{id}/reject ────────────────────────────────────

    public function reject(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => 'required|string']);
        $sr = ServiceRequest::findOrFail($id);

        $sr->update(['status' => 'rejected']);

        RequestApproval::create([
            'request_id'  => $id,
            'approver_id' => auth()->id(),
            'status'      => 'rejected',
            'comments'    => $request->reason,
            'decided_at'  => now(),
        ]);

        $this->logActivity('requests', 'reject', $sr);
        $this->sendNotification(
            $sr->requester_id,
            'request_rejected',
            'Your Request Has Been Rejected',
            "Request {$sr->reference_no} was rejected. Reason: {$request->reason}",
            ['request_id' => $sr->id]
        );

        return $this->success($sr->fresh(), 'Request rejected');
    }

    // ── POST /api/requests/{id}/close ─────────────────────────────────────

    public function close(Request $request, int $id): JsonResponse
    {
        $request->validate(['resolution' => 'required|string']);
        $sr = ServiceRequest::findOrFail($id);

        $sr->update([
            'status'     => 'closed',
            'resolution' => $request->resolution,
            'closed_at'  => now(),
            'closed_by'  => auth()->id(),
        ]);

        $this->logActivity('requests', 'close', $sr);
        $this->sendNotification(
            $sr->requester_id,
            'request_closed',
            'Request Closed',
            "Request {$sr->reference_no} has been closed.",
            ['request_id' => $sr->id]
        );

        return $this->success($sr->fresh(), 'Request closed successfully');
    }

    // ── QDM v2 workflow actions ───────────────────────────────────────────

    public function acknowledge(Request $request, int $id): JsonResponse
    {
        $request->validate(['estimated_completion_days' => 'required|integer|min:1|max:90']);
        $sr = ServiceRequest::findOrFail($id);

        $user = auth()->user();
        if (!in_array($user->role->slug ?? '', ['super_admin', 'qa_manager', 'dept_manager'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        ServiceRequest::where('id', $id)->update([
            'status'                    => 'acknowledged',
            'estimated_completion_days' => $request->estimated_completion_days,
            'acknowledged_at'           => now(),
            'eta_set_at'                => now(),
            'status_updated_by'         => auth()->id(),
            'status_updated_at'         => now(),
        ]);

        return $this->success($sr->fresh(), 'Request acknowledged');
    }

    public function requestClarification(Request $request, int $id): JsonResponse
    {
        $request->validate(['clarification_question' => 'required|string']);
        $sr = ServiceRequest::findOrFail($id);

        ServiceRequest::where('id', $id)->update([
            'status'                      => 'pending_clarification',
            'clarification_requested_at'  => now(),
            'clarification_notes'         => $request->clarification_question,
        ]);

        return $this->success($sr->fresh(), 'Clarification requested');
    }

    public function submitClarification(Request $request, int $id): JsonResponse
    {
        $request->validate(['clarification_notes' => 'required|string']);
        $sr = ServiceRequest::findOrFail($id);

        ServiceRequest::where('id', $id)->update([
            'status'                       => 'submitted',
            'clarification_submitted_at'   => now(),
            'clarification_notes'          => $request->clarification_notes,
        ]);

        return $this->success($sr->fresh(), 'Clarification submitted');
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $request->validate(['resolution' => 'required|string', 'delay_reason' => 'sometimes|string']);
        $sr = ServiceRequest::findOrFail($id);

        // Require delay_reason if ETA was exceeded
        $etaExceeded = $sr->eta_set_at && $sr->estimated_completion_days
            && now()->diffInDays($sr->eta_set_at, false) > $sr->estimated_completion_days;

        if ($etaExceeded && empty($request->delay_reason)) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => ['delay_reason' => ['Delay reason is required when ETA has been exceeded.']],
            ], 422);
        }

        ServiceRequest::where('id', $id)->update([
            'status'           => 'completed',
            'resolution'       => $request->resolution,
            'completed_at'     => now(),
            'delay_reason'     => $request->delay_reason,
            'cycle_time_hours' => $sr->created_at ? now()->diffInHours($sr->created_at) : null,
        ]);

        return $this->success($sr->fresh(), 'Request completed');
    }

    public function confirmReceipt(int $id): JsonResponse
    {
        $sr = ServiceRequest::findOrFail($id);

        ServiceRequest::where('id', $id)->update([
            'status'               => 'closed',
            'receipt_confirmed_at' => now(),
            'cycle_time_hours'     => $sr->created_at ? now()->diffInHours($sr->created_at) : null,
        ]);

        return $this->success($sr->fresh(), 'Receipt confirmed — request closed');
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string']);
        $sr = ServiceRequest::findOrFail($id);

        if (in_array($sr->status, ['closed', 'cancelled', 'approved'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'This request cannot be cancelled.',
                'errors'  => ['status' => ['Cannot cancel a ' . $sr->status . ' request.']],
            ], 422);
        }

        ServiceRequest::where('id', $id)->update([
            'status'       => 'cancelled',
            'cancelled_at' => now(),
            'delay_reason' => $request->reason,
        ]);

        return $this->success($sr->fresh(), 'Request cancelled');
    }

    // ── Supporting endpoints ──────────────────────────────────────────────

    public function comments(int $id): JsonResponse
    {
        $comments = RequestComment::with('user')
            ->where('request_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        return $this->success($comments);
    }

    public function addComment(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'comment'     => 'required|string',
            'is_internal' => 'boolean',
        ]);

        ServiceRequest::findOrFail($id);

        $comment = RequestComment::create([
            'request_id'  => $id,
            'user_id'     => auth()->id(),
            'comment'     => $request->comment,
            'is_internal' => $request->boolean('is_internal', false),
        ]);

        return $this->success($comment->load('user'), 'Comment added', 201);
    }

    public function approvals(int $id): JsonResponse
    {
        $approvals = RequestApproval::with('approver')
            ->where('request_id', $id)
            ->orderBy('sequence')
            ->get();

        return $this->success($approvals);
    }

    public function categories(): JsonResponse
    {
        return $this->success(RequestCategory::orderBy('name')->get());
    }

    public function stats(): JsonResponse
    {
        $user = auth()->user();
        $base = ServiceRequest::query();

        if ($user->role->slug === 'employee') {
            $base->where('requester_id', $user->id);
        }

        return $this->success([
            'total'       => (clone $base)->count(),
            'draft'       => (clone $base)->where('status', 'draft')->count(),
            'submitted'   => (clone $base)->where('status', 'submitted')->count(),
            'in_progress' => (clone $base)->where('status', 'in_progress')->count(),
            'approved'    => (clone $base)->where('status', 'approved')->count(),
            'rejected'    => (clone $base)->where('status', 'rejected')->count(),
            'closed'      => (clone $base)->where('status', 'closed')->count(),
            'overdue'     => (clone $base)->where('due_date', '<', now())
                ->whereNotIn('status', ['approved', 'closed', 'rejected'])->count(),
        ]);
    }
}
