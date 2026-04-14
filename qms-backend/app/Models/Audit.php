<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Audit extends Model {
    protected $fillable = ['reference_no','program_id','title','description','type','scope','criteria','lead_auditor_id','department_id','status','planned_start_date','planned_end_date','actual_start_date','actual_end_date','report_date','overall_result','executive_summary','attachments'];
    protected $casts = ['attachments'=>'array','planned_start_date'=>'date','planned_end_date'=>'date','actual_start_date'=>'date','actual_end_date'=>'date','report_date'=>'date'];
    public function program()     { return $this->belongsTo(AuditProgram::class); }
    public function leadAuditor() { return $this->belongsTo(User::class,'lead_auditor_id'); }
    public function department()  { return $this->belongsTo(Department::class); }
    public function team()        { return $this->belongsToMany(User::class,'audit_team')->withPivot('role'); }
    public function checklists()  { return $this->hasMany(AuditChecklist::class); }
    public function findings()    { return $this->hasMany(AuditFinding::class); }
}
