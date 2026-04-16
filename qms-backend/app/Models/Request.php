<?php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Request Model — QDM v2
 *
 * All original + QDM migration columns are in $fillable.
 * FK columns are cast to integer — fixes SQLite returning IDs as strings,
 * which would cause strict !== comparisons to fail in RequestService.
 */
class Request extends Model
{
    protected $table = 'requests';

    protected $fillable = [
        // ── Original ─────────────────────────────────────────────────────────
        'reference_no', 'title', 'description', 'type', 'priority',
        'status', 'resolution', 'attachments', 'due_date', 'closed_at',
        'category_id', 'requester_id', 'assignee_id', 'department_id',

        // ── QDM v2 (2026_05_01 migration) ────────────────────────────────────
        'request_sub_type', 'dynamic_fields', 'risk_level',
        'estimated_completion_days', 'eta_set_at',
        'acknowledged_at', 'clarification_requested_at',
        'clarification_submitted_at', 'clarification_notes',
        'completed_at', 'receipt_confirmed_at', 'cancelled_at',
        'cycle_time_hours', 'delay_reason',
        'status_updated_by', 'status_updated_at',
    ];

    protected $casts = [
        // ── FK integer casts ─────────────────────────────────────────────────
        // CRITICAL: SQLite returns all columns as strings. Without these casts,
        // service checks like ($model->requester_id !== $actor->id) evaluate
        // "1" !== 1 => true even when the IDs are logically equal.
        'category_id'        => 'integer',
        'requester_id'       => 'integer',
        'assignee_id'        => 'integer',
        'department_id'      => 'integer',
        'status_updated_by'  => 'integer',

        // ── Numeric ──────────────────────────────────────────────────────────
        'estimated_completion_days' => 'integer',
        'cycle_time_hours'          => 'decimal:2',

        // ── Datetime ─────────────────────────────────────────────────────────
        'due_date'                   => 'datetime',
        'closed_at'                  => 'datetime',
        'eta_set_at'                 => 'datetime',
        'acknowledged_at'            => 'datetime',
        'clarification_requested_at' => 'datetime',
        'clarification_submitted_at' => 'datetime',
        'completed_at'               => 'datetime',
        'receipt_confirmed_at'       => 'datetime',
        'cancelled_at'               => 'datetime',
        'status_updated_at'          => 'datetime',

        // ── JSON ─────────────────────────────────────────────────────────────
        'dynamic_fields' => 'array',
        'attachments'    => 'array',
    ];

    public function category()        { return $this->belongsTo(RequestCategory::class); }
    public function requester()       { return $this->belongsTo(User::class, 'requester_id'); }
    public function assignee()        { return $this->belongsTo(User::class, 'assignee_id'); }
    public function department()      { return $this->belongsTo(Department::class); }
    public function statusUpdatedBy() { return $this->belongsTo(User::class, 'status_updated_by'); }
    public function comments()        { return $this->hasMany(RequestComment::class); }
    public function approvals()       { return $this->hasMany(RequestApproval::class); }
}
