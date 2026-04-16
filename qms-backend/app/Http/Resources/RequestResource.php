<?php
declare(strict_types=1);
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * RequestResource — API response transformer for the QDM Request model.
 *
 * Includes all QDM fields: request_type, type_metadata, risk_level,
 * ETA fields, cycle time, escalation timestamps.
 */
class RequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'reference_no'                => $this->reference_no,
            'title'                       => $this->title,
            'description'                 => $this->description,

            // QDM Classification
            'request_type'                => $this->request_type,
            'type_metadata'               => $this->type_metadata,
            'type'                        => $this->type,
            'priority'                    => $this->priority,
            'risk_level'                  => $this->risk_level,
            'status'                      => $this->status,

            // SLA / ETA
            'estimated_completion_days'   => $this->estimated_completion_days,
            'eta_date'                    => $this->eta_date?->format('Y-m-d'),
            'actual_completion_date'      => $this->actual_completion_date?->format('Y-m-d'),
            'delay_reason'                => $this->delay_reason,
            'cycle_time_hours'            => $this->cycle_time_hours,
            'is_overdue'                  => $this->is_overdue,
            'eta_elapsed_percent'         => $this->eta_elapsed_percent,

            // Clarification
            'clarification_notes'         => $this->clarification_notes,

            // Timestamps
            'due_date'                    => $this->due_date?->format('Y-m-d'),
            'acknowledged_at'             => $this->acknowledged_at?->toIso8601String(),
            'completed_at'                => $this->completed_at?->toIso8601String(),
            'clarification_requested_at'  => $this->clarification_requested_at?->toIso8601String(),
            'closed_at'                   => $this->closed_at?->toIso8601String(),
            'created_at'                  => $this->created_at->toIso8601String(),
            'updated_at'                  => $this->updated_at->toIso8601String(),

            // Relations
            'requester'       => $this->whenLoaded('requester', fn() => [
                'id' => $this->requester->id, 'name' => $this->requester->name, 'email' => $this->requester->email,
            ]),
            'assignee'        => $this->whenLoaded('assignee', fn() => $this->assignee ? [
                'id' => $this->assignee->id, 'name' => $this->assignee->name,
            ] : null),
            'department'      => $this->whenLoaded('department', fn() => $this->department ? [
                'id' => $this->department->id, 'name' => $this->department->name, 'code' => $this->department->code,
            ] : null),
            'category'        => $this->whenLoaded('category', fn() => $this->category ? [
                'id' => $this->category->id, 'name' => $this->category->name, 'sla_hours' => $this->category->sla_hours,
            ] : null),
            'status_updated_by' => $this->whenLoaded('statusUpdatedBy', fn() => $this->statusUpdatedBy ? [
                'id' => $this->statusUpdatedBy->id, 'name' => $this->statusUpdatedBy->name,
            ] : null),
            'comments'        => $this->whenLoaded('comments'),
            'approvals'       => $this->whenLoaded('approvals'),
        ];
    }
}
