<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Document extends Model {
    protected $fillable = [
        'document_no','title','description','category_id','owner_id','reviewer_id','approver_id','department_id',
        'type','status','version','effective_date','review_date','expiry_date','file_path','file_size',
        'mime_type','is_controlled','requires_signature','tags','metadata',
        'rejection_reason','submitted_at','approved_at',
    ];
    protected $casts = [
        'tags'=>'array','metadata'=>'array',
        'effective_date'=>'date','review_date'=>'date','expiry_date'=>'date',
        'is_controlled'=>'boolean','requires_signature'=>'boolean',
        'submitted_at'=>'datetime','approved_at'=>'datetime',
    ];

    public function category()             { return $this->belongsTo(DocumentCategory::class); }
    public function owner()                { return $this->belongsTo(User::class,'owner_id'); }
    public function reviewer()             { return $this->belongsTo(User::class,'reviewer_id'); }
    public function approver()             { return $this->belongsTo(User::class,'approver_id'); }
    public function department()           { return $this->belongsTo(Department::class); }
    public function versions()             { return $this->hasMany(DocumentVersion::class); }
    public function accessLogs()           { return $this->hasMany(DocumentAccessLog::class); }
    public function distributions()        { return $this->hasMany(DocumentDistribution::class); }

    /** Departments this document has been distributed to */
    public function distributedDepartments() {
        return $this->belongsToMany(Department::class, 'document_departments', 'document_id', 'department_id')
                    ->withPivot('distributed_at');
    }

    /** Is this document visible to the given department? */
    public function isVisibleToDepartment(int $departmentId): bool {
        // Quality dept (owner) always sees their own docs
        if ($this->department_id === $departmentId) return true;
        return $this->distributedDepartments()->where('departments.id', $departmentId)->exists();
    }
}
