<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Request as ServiceRequest;
use App\Models\RequestCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * RequestService
 *
 * Business logic for the QDM request lifecycle.
 * All state transitions, escalation calculations, email triggers,
 * and cycle time computations live here — never in the Controller.
 *
 * @author  Jithin Varkey
 * @version 2.0
 */
class RequestService
{
    // Terminal statuses — no further transitions allowed
    private const TERMINAL = ['closed', 'cancelled', 'rejected'];

    // =========================================================================
    // QUERY BUILDING
    // =========================================================================

    /**
     * Build a filtered, role-scoped query for the request list.
     *
     * @param  Request $request
     * @return Builder
     */
    public function buildListQuery(Request $request): Builder
    {
        $user  = auth()->user();
        $query = ServiceRequest::with(['category', 'requester', 'assignee', 'department'])
            ->when($request->filled('status'),        fn($q) => $q->where('status', $request->status))
            ->when($request->filled('risk_level'),    fn($q) => $q->where('risk_level', $request->risk_level))
            ->when($request->filled('priority'),      fn($q) => $q->where('priority', $request->priority))
            ->when($request->filled('request_sub_type'), fn($q) => $q->where('request_sub_type', $request->request_sub_type))
            ->when($request->filled('department_id'), fn($q) => $q->where('department_id', $request->department_id))
            ->when($request->filled('category_id'),   fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->filled('assignee_id'),   fn($q) => $q->where('assignee_id', $request->assignee_id))
            ->when($request->filled('date_from'),     fn($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'),       fn($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->filled('q'), fn($q) => $q->where(function ($sub) use ($request) {
                $sub->where('title', 'like', "%{$request->q}%")
                    ->orWhere('reference_no', 'like', "%{$request->q}%");
            }));

        // Role-scoped visibility
        if ($user->role->slug === 'employee') {
            $query->where('requester_id', $user->id);
        } elseif ($user->role->slug === 'dept_manager') {
            $query->where('department_id', $user->department_id);
        }

        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $allowed = ['created_at', 'updated_at', 'status', 'priority', 'risk_level', 'estimated_completion_days'];

        return $query->orderBy(in_array($sortBy, $allowed) ? $sortBy : 'created_at', $sortDir);
    }

    // =========================================================================
    // CRUD
    // =========================================================================

    /**
     * Create a new request in draft status.
     *
     * @param  array $data
     * @param  User  $user
     * @return ServiceRequest
     */
    public function create(array $data, User $user): ServiceRequest
    {
        return DB::transaction(function () use ($data, $user) {
            $data['status']       = 'draft';
            $data['requester_id'] = $user->id;
            $data['reference_no'] = $this->generateRef('REQ');

            $model = ServiceRequest::create($data);
            $this->log($model, 'created', [], $model->toArray());

            return $model->load(['category', 'requester', 'department']);
        });
    }

    /**
     * Update a draft request.
     *
     * @param  int   $id
     * @param  array $data
     * @param  User  $user
     * @return ServiceRequest
     * @throws AccessDeniedHttpException
     */
    public function update(int $id, array $data, User $user): ServiceRequest
    {
        $model = $this->findOrFail($id, $user);

        if ($model->status !== 'draft' && $user->role->slug !== 'super_admin') {
            throw new AccessDeniedHttpException('Only draft requests can be edited.');
        }
        if ($model->requester_id !== $user->id && $user->role->slug !== 'super_admin') {
            throw new AccessDeniedHttpException('You can only edit your own requests.');
        }

        $old = $model->toArray();
        $model->update($data);
        $this->log($model, 'updated', $old, $model->toArray());

        return $model->fresh(['category', 'requester', 'department']);
    }

    /**
     * Delete a draft request (super_admin only).
     *
     * @param  int  $id
     * @param  User $user
     * @throws AccessDeniedHttpException
     */
    public function delete(int $id, User $user): void
    {
        if ($user->role->slug !== 'super_admin') {
            throw new AccessDeniedHttpException('Only super admins can delete requests.');
        }

        $model = ServiceRequest::findOrFail($id);
        if ($model->status !== 'draft') {
            throw new UnprocessableEntityHttpException('Only draft requests can be deleted.');
        }

        $this->log($model, 'deleted', $model->toArray(), []);
        $model->delete();
    }

    /**
     * Find a request scoped to the authenticated user.
     *
     * @param  int  $id
     * @param  User $user
     * @return ServiceRequest
     */
    public function findOrFail(int $id, User $user): ServiceRequest
    {
        $query = ServiceRequest::with([
            'category', 'requester', 'assignee', 'department', 'approvals.approver',
        ])->where('id', $id);

        if ($user->role->slug === 'employee') {
            $query->where('requester_id', $user->id);
        }

        return $query->firstOrFail();
    }

    // =========================================================================
    // WORKFLOW TRANSITIONS
    // =========================================================================

    /**
     * Submit a draft request for QDM Manager review.
     * Transition: draft → submitted
     *
     * @param  int  $id
     * @param  User $user
     * @return ServiceRequest
     */
    public function submit(int $id, User $user): ServiceRequest
    {
        $model = $this->requireStatus($id, ['draft'], $user);
        $this->assertOwner($model, $user);

        return $this->transition($model, 'submitted', $user);
    }

    /**
     * QDM Manager acknowledges request and sets ETA.
     * Transition: submitted → acknowledged
     * Side-effect: sends ETA notification email to requester.
     *
     * @param  int   $id
     * @param  array $data  {estimated_completion_days, notes?}
     * @param  User  $user
     * @return ServiceRequest
     */
    public function acknowledge(int $id, array $data, User $user): ServiceRequest
    {
        $this->assertRole($user, ['qa_manager', 'quality_supervisor', 'super_admin']);

        $model = $this->requireStatus($id, ['submitted', 'pending_clarification'], $user);

        return DB::transaction(function () use ($model, $data, $user) {
            $model->update([
                'status'                     => 'acknowledged',
                'estimated_completion_days'  => $data['estimated_completion_days'],
                'acknowledged_at'            => now(),
                'eta_set_at'                 => now(),
                'status_updated_by'          => $user->id,
                'status_updated_at'          => now(),
            ]);

            $this->log($model, 'acknowledged', [], [
                'estimated_completion_days' => $data['estimated_completion_days'],
            ]);

            // Send ETA email to requester
            $this->sendAcknowledgementEmail($model);

            // Create in-app notification
            $this->notify(
                $model->requester_id,
                'request_acknowledged',
                "Request {$model->reference_no} Acknowledged",
                "Your request has been acknowledged. Estimated completion: {$data['estimated_completion_days']} business day(s).",
                ['request_id' => $model->id]
            );

            return $model->fresh();
        });
    }

    /**
     * QDM Manager requests additional information from the requester.
     * Transition: submitted → pending_clarification
     *
     * @param  int   $id
     * @param  array $data
     * @param  User  $user
     * @return ServiceRequest
     */
    public function requestClarification(int $id, array $data, User $user): ServiceRequest
    {
        $this->assertRole($user, ['qa_manager', 'quality_supervisor', 'super_admin']);
        $model = $this->requireStatus($id, ['submitted'], $user);

        return DB::transaction(function () use ($model, $data, $user) {
            $model->update([
                'status'                         => 'pending_clarification',
                'clarification_requested_at'     => now(),
                'status_updated_by'              => $user->id,
                'status_updated_at'              => now(),
            ]);

            // Store the question as an internal comment
            $model->comments()->create([
                'user_id'     => $user->id,
                'comment'     => 'Clarification Requested: ' . $data['clarification_question'],
                'is_internal' => false,
            ]);

            $this->log($model, 'clarification_requested', [], $data);
            $this->notify(
                $model->requester_id,
                'clarification_requested',
                "Clarification Needed for {$model->reference_no}",
                $data['clarification_question'],
                ['request_id' => $model->id]
            );

            return $model->fresh();
        });
    }

    /**
     * Requester submits the clarification information.
     * Transition: pending_clarification → submitted
     *
     * @param  int   $id
     * @param  array $data
     * @param  User  $user
     * @return ServiceRequest
     */
    public function submitClarification(int $id, array $data, User $user): ServiceRequest
    {
        $model = $this->requireStatus($id, ['pending_clarification'], $user);
        $this->assertOwner($model, $user);

        return DB::transaction(function () use ($model, $data, $user) {
            $model->update([
                'status'                         => 'submitted',
                'clarification_notes'            => $data['clarification_notes'],
                'clarification_submitted_at'     => now(),
                'status_updated_by'              => $user->id,
                'status_updated_at'              => now(),
            ]);

            $this->log($model, 'clarification_submitted', [], $data);
            return $model->fresh();
        });
    }

    /**
     * Assign the request to a QDM team member.
     * Transition: acknowledged → under_review
     *
     * @param  int   $id
     * @param  array $data  {assignee_id}
     * @param  User  $user
     * @return ServiceRequest
     */
    public function assign(int $id, array $data, User $user): ServiceRequest
    {
        $this->assertRole($user, ['qa_manager', 'quality_supervisor', 'super_admin']);
        $model = $this->requireStatus($id, ['acknowledged'], $user);

        return DB::transaction(function () use ($model, $data, $user) {
            $model->update([
                'assignee_id'        => $data['assignee_id'],
                'status'             => 'under_review',
                'status_updated_by'  => $user->id,
                'status_updated_at'  => now(),
            ]);

            $this->log($model, 'assigned', [], ['assignee_id' => $data['assignee_id']]);
            $this->notify(
                $data['assignee_id'],
                'request_assigned',
                "Request {$model->reference_no} Assigned to You",
                "You have been assigned to handle: {$model->title}",
                ['request_id' => $model->id]
            );

            return $model->fresh();
        });
    }

    /**
     * Assignee starts working on the request.
     * Transition: under_review → in_progress
     *
     * @param  int  $id
     * @param  User $user
     * @return ServiceRequest
     */
    public function startProgress(int $id, User $user): ServiceRequest
    {
        $model = $this->requireStatus($id, ['under_review'], $user);
        return $this->transition($model, 'in_progress', $user);
    }

    /**
     * QDM staff marks the request as completed.
     * Transition: in_progress → completed
     * Side-effect: sends "Confirm Receipt" email to requester.
     * Calculates if delay_reason is needed (actual > ETA).
     *
     * @param  int   $id
     * @param  array $data  {resolution, delay_reason?}
     * @param  User  $user
     * @return ServiceRequest
     */
    public function complete(int $id, array $data, User $user): ServiceRequest
    {
        $model = $this->requireStatus($id, ['in_progress'], $user);

        return DB::transaction(function () use ($model, $data, $user) {
            // Auto-detect if delay reason is needed
            $isDelayed = $this->isDelayed($model);
            if ($isDelayed && empty($data['delay_reason'])) {
                throw new UnprocessableEntityHttpException(
                    'A delay reason is required because the ETA has been exceeded.'
                );
            }

            $model->update([
                'status'             => 'completed',
                'resolution'         => $data['resolution'],
                'completed_at'       => now(),
                'delay_reason'       => $data['delay_reason'] ?? null,
                'status_updated_by'  => $user->id,
                'status_updated_at'  => now(),
            ]);

            $this->log($model, 'completed', [], ['resolution' => $data['resolution']]);
            $this->sendCompletionEmail($model);
            $this->notify(
                $model->requester_id,
                'request_completed',
                "Request {$model->reference_no} Completed — Action Required",
                "Your request has been completed. Please log in and click Confirm Receipt to close it.",
                ['request_id' => $model->id]
            );

            return $model->fresh();
        });
    }

    /**
     * Requester confirms receipt of the completed deliverable.
     * Transition: completed → closed
     * Side-effect: calculates and stores cycle_time_hours.
     *
     * @param  int  $id
     * @param  User $user
     * @return ServiceRequest
     */
    public function confirmReceipt(int $id, User $user): ServiceRequest
    {
        $model = $this->requireStatus($id, ['completed'], $user);
        $this->assertOwner($model, $user);

        return DB::transaction(function () use ($model, $user) {
            $cycleTime = $this->calcCycleTime($model);

            $model->update([
                'status'                => 'closed',
                'closed_at'             => now(),
                'receipt_confirmed_at'  => now(),
                'cycle_time_hours'      => $cycleTime,
                'status_updated_by'     => $user->id,
                'status_updated_at'     => now(),
            ]);

            $this->log($model, 'closed', [], ['cycle_time_hours' => $cycleTime]);
            return $model->fresh();
        });
    }

    /**
     * Approve a request.
     * Transition: submitted | pending_approval → approved
     *
     * @param  int   $id
     * @param  array $data
     * @param  User  $user
     * @return ServiceRequest
     */
    public function approve(int $id, array $data, User $user): ServiceRequest
    {
        $this->assertRole($user, ['qa_manager', 'dept_manager', 'super_admin']);
        $model = $this->requireStatus($id, ['submitted', 'pending_approval'], $user);

        return DB::transaction(function () use ($model, $data, $user) {
            $model->update([
                'status'            => 'approved',
                'status_updated_by' => $user->id,
                'status_updated_at' => now(),
            ]);

            if (!empty($data['comments'])) {
                $model->comments()->create([
                    'user_id'     => $user->id,
                    'comment'     => $data['comments'],
                    'is_internal' => false,
                ]);
            }

            $this->log($model, 'approved', [], $data);
            $this->notify($model->requester_id, 'request_approved',
                "Request {$model->reference_no} Approved", '', ['request_id' => $model->id]);
            return $model->fresh();
        });
    }

    /**
     * Reject a request with mandatory reason.
     *
     * @param  int   $id
     * @param  array $data  {reason}
     * @param  User  $user
     * @return ServiceRequest
     */
    public function reject(int $id, array $data, User $user): ServiceRequest
    {
        $this->assertRole($user, ['qa_manager', 'dept_manager', 'super_admin']);
        $model = $this->requireStatus($id, ['submitted', 'acknowledged', 'pending_approval'], $user);

        return DB::transaction(function () use ($model, $data, $user) {
            $model->update([
                'status'            => 'rejected',
                'status_updated_by' => $user->id,
                'status_updated_at' => now(),
            ]);

            $model->comments()->create([
                'user_id'     => $user->id,
                'comment'     => 'Rejected: ' . $data['reason'],
                'is_internal' => false,
            ]);

            $this->log($model, 'rejected', [], $data);
            $this->notify($model->requester_id, 'request_rejected',
                "Request {$model->reference_no} Rejected", $data['reason'], ['request_id' => $model->id]);
            return $model->fresh();
        });
    }

    /**
     * Cancel a request.
     *
     * @param  int   $id
     * @param  array $data  {reason?}
     * @param  User  $user
     * @return ServiceRequest
     */
    public function cancel(int $id, array $data, User $user): ServiceRequest
    {
        $model = ServiceRequest::findOrFail($id);

        if (in_array($model->status, self::TERMINAL, true)) {
            throw new UnprocessableEntityHttpException("A {$model->status} request cannot be cancelled.");
        }

        // Only requester or managers can cancel
        $canCancel = $model->requester_id === $user->id
            || in_array($user->role->slug, ['qa_manager', 'super_admin'], true);

        if (!$canCancel) {
            throw new AccessDeniedHttpException('You are not authorised to cancel this request.');
        }

        return DB::transaction(function () use ($model, $data, $user) {
            $cycleTime = $this->calcCycleTime($model);

            $model->update([
                'status'            => 'cancelled',
                'cancelled_at'      => now(),
                'cycle_time_hours'  => $cycleTime,
                'status_updated_by' => $user->id,
                'status_updated_at' => now(),
            ]);

            if (!empty($data['reason'])) {
                $model->comments()->create([
                    'user_id' => $user->id, 'comment' => 'Cancelled: ' . $data['reason'], 'is_internal' => false,
                ]);
            }

            $this->log($model, 'cancelled', [], $data);
            return $model->fresh();
        });
    }

    /**
     * Admin override close.
     *
     * @param  int   $id
     * @param  array $data
     * @param  User  $user
     * @return ServiceRequest
     */
    public function close(int $id, array $data, User $user): ServiceRequest
    {
        $this->assertRole($user, ['qa_manager', 'super_admin']);
        $model = ServiceRequest::findOrFail($id);

        return DB::transaction(function () use ($model, $data, $user) {
            $cycleTime = $this->calcCycleTime($model);

            $model->update([
                'status'            => 'closed',
                'closed_at'         => now(),
                'cycle_time_hours'  => $cycleTime,
                'resolution'        => $data['resolution'],
                'status_updated_by' => $user->id,
                'status_updated_at' => now(),
            ]);

            $this->log($model, 'closed', [], $data);
            return $model->fresh();
        });
    }

    // =========================================================================
    // COMMENTS & APPROVALS
    // =========================================================================

    /** @return array */
    public function comments(int $id, User $user): array
    {
        $model    = $this->findOrFail($id, $user);
        $isPublic = in_array($user->role->slug, ['employee', 'client'], true);

        return $model->comments()
            ->with('user')
            ->when($isPublic, fn($q) => $q->where('is_internal', false))
            ->orderBy('created_at')
            ->get()
            ->toArray();
    }

    /** @return mixed */
    public function addComment(int $id, array $data, User $user): mixed
    {
        $model = ServiceRequest::findOrFail($id);
        return $model->comments()->create([
            'user_id'     => $user->id,
            'comment'     => $data['comment'],
            'is_internal' => $data['is_internal'] ?? false,
        ])->load('user');
    }

    /** @return array */
    public function approvals(int $id): array
    {
        return ServiceRequest::findOrFail($id)
            ->approvals()
            ->with('approver')
            ->orderBy('sequence')
            ->get()
            ->toArray();
    }

    // =========================================================================
    // STATS
    // =========================================================================

    /** @return array */
    public function stats(User $user): array
    {
        $base = ServiceRequest::query();
        if ($user->role->slug === 'employee') {
            $base->where('requester_id', $user->id);
        }

        return [
            'total'                  => (clone $base)->count(),
            'submitted'              => (clone $base)->where('status', 'submitted')->count(),
            'pending_clarification'  => (clone $base)->where('status', 'pending_clarification')->count(),
            'acknowledged'           => (clone $base)->where('status', 'acknowledged')->count(),
            'in_progress'            => (clone $base)->where('status', 'in_progress')->count(),
            'completed'              => (clone $base)->where('status', 'completed')->count(),
            'closed'                 => (clone $base)->where('status', 'closed')->count(),
            'overdue'                => (clone $base)
                ->whereIn('status', ['under_review', 'in_progress', 'acknowledged'])
                ->whereNotNull('eta_set_at')
                ->whereRaw('DATE_ADD(eta_set_at, INTERVAL estimated_completion_days DAY) < NOW()')
                ->count(),
        ];
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Generate reference number: PREFIX-YYYY-NNNN
     */
    private function generateRef(string $prefix): string
    {
        $year  = now()->year;
        $count = ServiceRequest::whereYear('created_at', $year)->count() + 1;
        return "{$prefix}-{$year}-" . str_pad((string)$count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Transition a model to a new status, recording audit fields.
     */
    private function transition(ServiceRequest $model, string $status, User $user): ServiceRequest
    {
        return DB::transaction(function () use ($model, $status, $user) {
            $model->update([
                'status'            => $status,
                'status_updated_by' => $user->id,
                'status_updated_at' => now(),
            ]);
            $this->log($model, $status, [], ['status' => $status]);
            return $model->fresh();
        });
    }

    /**
     * Calculate cycle time in hours from submission to now.
     */
    private function calcCycleTime(ServiceRequest $model): float
    {
        $start = $model->created_at ?? now();
        return round(now()->diffInMinutes($start) / 60, 2);
    }

    /**
     * Check whether ETA has been breached.
     */
    private function isDelayed(ServiceRequest $model): bool
    {
        if (!$model->eta_set_at || !$model->estimated_completion_days) {
            return false;
        }
        $etaDeadline = Carbon::parse($model->eta_set_at)->addDays($model->estimated_completion_days);
        return now()->greaterThan($etaDeadline);
    }

    /**
     * Assert the model is in one of the required statuses.
     *
     * @throws UnprocessableEntityHttpException
     */
    private function requireStatus(int $id, array $allowed, User $user): ServiceRequest
    {
        $model = ServiceRequest::findOrFail($id);
        if (!in_array($model->status, $allowed, true)) {
            $allowed = implode(', ', $allowed);
            throw new UnprocessableEntityHttpException(
                "This action requires status: {$allowed}. Current: {$model->status}"
            );
        }
        return $model;
    }

    /**
     * Assert the authenticated user is the request owner.
     *
     * @throws AccessDeniedHttpException
     */
    private function assertOwner(ServiceRequest $model, User $user): void
    {
        if ($model->requester_id !== $user->id && $user->role->slug !== 'super_admin') {
            throw new AccessDeniedHttpException('You can only perform this action on your own requests.');
        }
    }

    /**
     * Assert user has one of the required roles.
     *
     * @throws AccessDeniedHttpException
     */
    private function assertRole(User $user, array $roles): void
    {
        if (!in_array($user->role->slug, $roles, true)) {
            throw new AccessDeniedHttpException('Your role is not permitted to perform this action.');
        }
    }

    /** Write to activity_logs */
    private function log(ServiceRequest $model, string $action, array $old, array $new): void
    {
        \App\Models\ActivityLog::create([
            'user_id'    => auth()->id(),
            'module'     => 'requests',
            'action'     => $action,
            'model_type' => ServiceRequest::class,
            'model_id'   => $model->id,
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => request()->ip(),
        ]);
    }

    /** Create in-app notification */
    private function notify(int $userId, string $type, string $title, string $msg, array $data = []): void
    {
        \App\Models\Notification::create([
            'user_id' => $userId,
            'type'    => $type,
            'title'   => $title,
            'message' => $msg,
            'data'    => $data,
        ]);
    }

    /** Send acknowledgement email with ETA */
    private function sendAcknowledgementEmail(ServiceRequest $model): void
    {
        try {
            Mail::send([], [], function ($message) use ($model) {
                $requester = $model->requester;
                $eta       = $model->estimated_completion_days;
                $message->to($requester->email, $requester->name)
                    ->subject("Request #{$model->reference_no} – Acknowledged")
                    ->html(
                        "<p>Dear {$requester->name},</p>"
                        . "<p>Your request <strong>#{$model->reference_no}</strong> titled "
                        . "<em>\"{$model->title}\"</em> has been acknowledged.</p>"
                        . "<p><strong>Estimated completion time:</strong> {$eta} business day(s).</p>"
                        . "<p>You will be notified of any updates.</p>"
                        . "<p>Quality & Development Management Team<br>Diamond Insurance Brokers</p>"
                    );
            });
        } catch (\Throwable $e) {
            Log::error("Acknowledgement email failed for request {$model->id}: " . $e->getMessage());
        }
    }

    /** Send completion email with confirm receipt link */
    private function sendCompletionEmail(ServiceRequest $model): void
    {
        try {
            Mail::send([], [], function ($message) use ($model) {
                $requester   = $model->requester;
                $confirmUrl  = config('app.url') . "/requests/{$model->id}/confirm-receipt";
                $message->to($requester->email, $requester->name)
                    ->subject("Request #{$model->reference_no} – Completed")
                    ->html(
                        "<p>Dear {$requester->name},</p>"
                        . "<p>Your request <strong>\"{$model->title}\"</strong> has been completed.</p>"
                        . "<p>Kindly review the deliverables and click the button below to confirm receipt and officially close this request.</p>"
                        . "<p><a href='{$confirmUrl}' style='background:#1C8C8C;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;'>Confirm Receipt</a></p>"
                        . "<p>Please reply to this email if you have any comments or questions.</p>"
                        . "<p>Quality & Development Management Team<br>Diamond Insurance Brokers</p>"
                    );
            });
        } catch (\Throwable $e) {
            Log::error("Completion email failed for request {$model->id}: " . $e->getMessage());
        }
    }
}
