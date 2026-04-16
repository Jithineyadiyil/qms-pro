<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Notification;
use App\Models\Request as ServiceRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * RequestEscalationJob
 *
 * Implements all 8 QDM escalation rules by scanning active requests
 * and sending automated notifications at defined time thresholds.
 *
 * Schedule in app/Console/Kernel.php:
 *   $schedule->job(new RequestEscalationJob)->everyFiveMinutes();
 *
 * Rules:
 *   1. Submitted not acknowledged within 1h  → notify QDM Manager
 *   2. Acknowledged not assigned within 1h   → notify QDM Manager
 *   3. Assigned no update within 2h          → notify QDM Manager
 *   4. Still no update after 4h              → notify CEO
 *   5. ETA 75% elapsed                       → warn assigned QDM Staff
 *   6. ETA 90% elapsed                       → alert QDM Manager
 *   7. ETA breached (100%)                   → breach notification QDM Manager
 *   8. ETA + 2h breached                     → escalate to CEO
 *
 * @author  Jithin Varkey
 * @version 2.0
 */
class RequestEscalationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max execution retries */
    public int $tries = 3;

    /**
     * Execute the escalation checks.
     */
    public function handle(): void
    {
        Log::info('[RequestEscalationJob] Starting escalation check at ' . now()->toDateTimeString());

        $qdmManagerIds = $this->getManagerIds(['qa_manager', 'quality_supervisor']);
        $ceoIds        = $this->getManagerIds(['super_admin']);

        $this->rule1NotAcknowledged($qdmManagerIds);
        $this->rule2NotAssigned($qdmManagerIds);
        $this->rule3InactiveAfter2h($qdmManagerIds);
        $this->rule4InactiveAfter4h($ceoIds, $qdmManagerIds);
        $this->rule5Eta75Percent();
        $this->rule6Eta90Percent($qdmManagerIds);
        $this->rule7EtaBreach($qdmManagerIds);
        $this->rule8ExtendedBreach($ceoIds, $qdmManagerIds);

        Log::info('[RequestEscalationJob] Completed.');
    }

    // =========================================================================
    // RULE IMPLEMENTATIONS
    // =========================================================================

    /**
     * Rule 1: Request not acknowledged by QDM Manager within 1 business hour.
     * Trigger: status=submitted AND created_at < now - 1h AND no escalation sent.
     *
     * @param  array $managerIds
     */
    private function rule1NotAcknowledged(array $managerIds): void
    {
        $requests = ServiceRequest::where('status', 'submitted')
            ->where('created_at', '<', now()->subHour())
            ->whereNull('acknowledged_at')
            ->whereNull('escalation_rule1_at')  // prevent duplicate alerts
            ->get();

        foreach ($requests as $req) {
            $this->notifyMany($managerIds, 'escalation_rule1',
                "⚠ Rule 1: Request {$req->reference_no} Not Acknowledged",
                "Request #{$req->reference_no} submitted by {$req->requester->name} has not been acknowledged after 1 hour.",
                ['request_id' => $req->id, 'rule' => 1]
            );

            // Mark escalation sent to prevent duplicates
            $req->withoutTimestamps()->update(['metadata->escalation_rule1_at' => now()->toISOString()]);

            Log::warning("[EscalationRule1] Request {$req->reference_no} not acknowledged after 1h");
        }
    }

    /**
     * Rule 2: Request acknowledged but not assigned within 1h.
     *
     * @param  array $managerIds
     */
    private function rule2NotAssigned(array $managerIds): void
    {
        $requests = ServiceRequest::where('status', 'acknowledged')
            ->where('acknowledged_at', '<', now()->subHour())
            ->whereNull('assignee_id')
            ->get();

        foreach ($requests as $req) {
            $this->notifyMany($managerIds, 'escalation_rule2',
                "⚠ Rule 2: Request {$req->reference_no} Not Assigned",
                "Request #{$req->reference_no} has been acknowledged but not assigned after 1 hour.",
                ['request_id' => $req->id, 'rule' => 2]
            );
            Log::warning("[EscalationRule2] Request {$req->reference_no} not assigned after 1h");
        }
    }

    /**
     * Rule 3: Under review with no update for 2 hours.
     *
     * @param  array $managerIds
     */
    private function rule3InactiveAfter2h(array $managerIds): void
    {
        $requests = ServiceRequest::whereIn('status', ['under_review', 'in_progress'])
            ->where('status_updated_at', '<', now()->subHours(2))
            ->get();

        foreach ($requests as $req) {
            $this->notifyMany($managerIds, 'escalation_rule3',
                "⚠ Rule 3: Request {$req->reference_no} — 2h Inactivity",
                "No status update on request #{$req->reference_no} for 2 business hours.",
                ['request_id' => $req->id, 'rule' => 3]
            );
        }
    }

    /**
     * Rule 4: Still no update after 4 hours — escalate to CEO.
     *
     * @param  array $ceoIds
     * @param  array $managerIds
     */
    private function rule4InactiveAfter4h(array $ceoIds, array $managerIds): void
    {
        $requests = ServiceRequest::whereIn('status', ['under_review', 'in_progress'])
            ->where('status_updated_at', '<', now()->subHours(4))
            ->get();

        foreach ($requests as $req) {
            $this->notifyMany(
                array_merge($ceoIds, $managerIds),
                'escalation_rule4',
                "🔴 Rule 4 CEO Escalation: Request {$req->reference_no}",
                "Request #{$req->reference_no} has had no activity for 4+ hours. CEO escalation triggered.",
                ['request_id' => $req->id, 'rule' => 4, 'ceo_escalation' => true]
            );
            Log::error("[EscalationRule4] CEO escalation for request {$req->reference_no}");
        }
    }

    /**
     * Rule 5: ETA 75% elapsed — warn assigned staff.
     */
    private function rule5Eta75Percent(): void
    {
        $requests = ServiceRequest::where('status', 'in_progress')
            ->whereNotNull('eta_set_at')
            ->whereNotNull('estimated_completion_days')
            ->whereNotNull('assignee_id')
            ->get()
            ->filter(fn($r) => $this->etaPercent($r) >= 75 && $this->etaPercent($r) < 90);

        foreach ($requests as $req) {
            $percent = $this->etaPercent($req);
            $this->notifyMany([$req->assignee_id], 'escalation_rule5',
                "⏰ Rule 5: {$percent}% ETA Used — Request {$req->reference_no}",
                "You have used {$percent}% of the allocated time for request #{$req->reference_no}. Please prioritise.",
                ['request_id' => $req->id, 'rule' => 5, 'eta_percent' => $percent]
            );
        }
    }

    /**
     * Rule 6: ETA 90% elapsed — alert QDM Manager.
     *
     * @param  array $managerIds
     */
    private function rule6Eta90Percent(array $managerIds): void
    {
        $requests = ServiceRequest::where('status', 'in_progress')
            ->whereNotNull('eta_set_at')
            ->whereNotNull('estimated_completion_days')
            ->get()
            ->filter(fn($r) => $this->etaPercent($r) >= 90 && $this->etaPercent($r) < 100);

        foreach ($requests as $req) {
            $this->notifyMany($managerIds, 'escalation_rule6',
                "🔴 Rule 6: 90% ETA Risk — Request {$req->reference_no}",
                "Request #{$req->reference_no} is at 90%+ of its allocated processing time. Immediate attention required.",
                ['request_id' => $req->id, 'rule' => 6]
            );
        }
    }

    /**
     * Rule 7: ETA breached (100%) — SLA breach notification.
     *
     * @param  array $managerIds
     */
    private function rule7EtaBreach(array $managerIds): void
    {
        $requests = ServiceRequest::where('status', 'in_progress')
            ->whereNotNull('eta_set_at')
            ->whereNotNull('estimated_completion_days')
            ->get()
            ->filter(fn($r) => $this->etaPercent($r) >= 100 && $this->etaPercent($r) < $this->etaPercent($r, 2));

        foreach ($requests as $req) {
            $this->notifyMany($managerIds, 'escalation_rule7',
                "🚨 Rule 7: SLA Breach — Request {$req->reference_no}",
                "Request #{$req->reference_no} has exceeded its estimated completion time. SLA breach recorded.",
                ['request_id' => $req->id, 'rule' => 7, 'sla_breach' => true]
            );
        }
    }

    /**
     * Rule 8: ETA + 2 hours exceeded — escalate to CEO.
     *
     * @param  array $ceoIds
     * @param  array $managerIds
     */
    private function rule8ExtendedBreach(array $ceoIds, array $managerIds): void
    {
        $requests = ServiceRequest::where('status', 'in_progress')
            ->whereNotNull('eta_set_at')
            ->whereNotNull('estimated_completion_days')
            ->get()
            ->filter(function ($r) {
                if (!$r->eta_set_at || !$r->estimated_completion_days) {
                    return false;
                }
                $etaDeadline = Carbon::parse($r->eta_set_at)
                    ->addDays($r->estimated_completion_days)
                    ->addHours(2);
                return now()->greaterThan($etaDeadline);
            });

        foreach ($requests as $req) {
            $this->notifyMany(
                array_merge($ceoIds, $managerIds),
                'escalation_rule8',
                "🚨 Rule 8: Extended SLA Breach CEO Escalation — {$req->reference_no}",
                "Request #{$req->reference_no} has exceeded ETA by 2+ hours. CEO escalation initiated.",
                ['request_id' => $req->id, 'rule' => 8, 'ceo_escalation' => true]
            );
            Log::critical("[EscalationRule8] Extended breach CEO escalation: {$req->reference_no}");
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Calculate what percentage of the ETA has elapsed.
     *
     * @param  ServiceRequest $request
     * @param  int            $extraHours Additional hours to add to deadline
     * @return float
     */
    private function etaPercent(ServiceRequest $request, int $extraHours = 0): float
    {
        if (!$request->eta_set_at || !$request->estimated_completion_days) {
            return 0;
        }

        $start       = Carbon::parse($request->eta_set_at);
        $deadline    = $start->copy()->addDays($request->estimated_completion_days)->addHours($extraHours);
        $totalMins   = $start->diffInMinutes($deadline);
        $elapsedMins = $start->diffInMinutes(now());

        return $totalMins > 0 ? round(($elapsedMins / $totalMins) * 100, 1) : 0;
    }

    /**
     * Get user IDs for specified role slugs.
     *
     * @param  array $roleSlugs
     * @return array
     */
    private function getManagerIds(array $roleSlugs): array
    {
        return \App\Models\User::whereHas('role', fn($q) => $q->whereIn('slug', $roleSlugs))
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();
    }

    /**
     * Send in-app notifications to multiple users.
     *
     * @param  array  $userIds
     * @param  string $type
     * @param  string $title
     * @param  string $message
     * @param  array  $data
     */
    private function notifyMany(array $userIds, string $type, string $title, string $message, array $data = []): void
    {
        $records = array_map(fn($uid) => [
            'user_id'    => $uid,
            'type'       => $type,
            'title'      => $title,
            'message'    => $message,
            'data'       => json_encode($data),
            'created_at' => now(),
        ], $userIds);

        Notification::insert($records);
    }
}
