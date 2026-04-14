<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Request extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_no', 'title', 'description', 'category_id',
        'requester_id', 'assignee_id', 'department_id',
        'priority', 'status', 'type', 'due_date',
        'submitted_at', 'approved_at', 'approved_by',
        'closed_at', 'closed_by', 'resolution',
        'attachments', 'metadata',
    ];

    protected $casts = [
        'attachments'  => 'array',
        'metadata'     => 'array',
        'due_date'     => 'date',
        'submitted_at' => 'datetime',
        'approved_at'  => 'datetime',
        'closed_at'    => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────
    public function category()    { return $this->belongsTo(RequestCategory::class); }
    public function requester()   { return $this->belongsTo(User::class, 'requester_id'); }
    public function assignee()    { return $this->belongsTo(User::class, 'assignee_id'); }
    public function department()  { return $this->belongsTo(Department::class); }
    public function approvedBy()  { return $this->belongsTo(User::class, 'approved_by'); }
    public function closedBy()    { return $this->belongsTo(User::class, 'closed_by'); }
    public function comments()    { return $this->hasMany(RequestComment::class); }
    public function approvals()   { return $this->hasMany(RequestApproval::class); }

    // ── Scopes ────────────────────────────────────────────────────
    public function scopeOverdue($query)
    {
        return $query->where('due_date', '<', now())
                     ->whereNotIn('status', ['approved', 'closed', 'rejected']);
    }

    public function scopeOpen($query)
    {
        return $query->whereNotIn('status', ['approved', 'closed', 'rejected']);
    }
}
