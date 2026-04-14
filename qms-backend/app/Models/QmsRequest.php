<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class QmsRequest extends Model {
    protected $table = 'requests';
    protected $fillable = [
        'reference_no','title','description','category_id','requester_id','assignee_id',
        'department_id','priority','status','type','due_date','closed_at','resolution','attachments','metadata',
    ];
    protected $casts = [
        'attachments' => 'array',
        'metadata'    => 'array',
        'due_date'    => 'date',
        'closed_at'   => 'datetime',
    ];

    public function category()  { return $this->belongsTo(RequestCategory::class); }
    public function requester() { return $this->belongsTo(User::class, 'requester_id'); }
    public function assignee()  { return $this->belongsTo(User::class, 'assignee_id'); }
    public function department(){ return $this->belongsTo(Department::class); }
    public function comments()  { return $this->hasMany(RequestComment::class, 'request_id')->orderBy('created_at','asc'); }
    public function approvals() { return $this->hasMany(RequestApproval::class, 'request_id')->orderBy('created_at','asc'); }

    public function isOverdue(): bool {
        return $this->due_date && $this->due_date->isPast() && !in_array($this->status, ['approved','closed','rejected']);
    }
}
