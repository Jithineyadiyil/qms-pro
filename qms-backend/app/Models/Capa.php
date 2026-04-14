<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Capa extends Model {
    protected $fillable = [
        'reference_no','nc_id','title','description','type','owner_id','department_id','status','priority',
        'proposed_date','target_date','actual_completion_date','root_cause_analysis','action_plan',
        'effectiveness_criteria','effectiveness_result','effectiveness_verified_by_id','effectiveness_verified_at','attachments',
    ];
    protected $casts = ['attachments'=>'array','target_date'=>'date','proposed_date'=>'date','actual_completion_date'=>'date','effectiveness_verified_at'=>'datetime'];
    public function nonconformance()       { return $this->belongsTo(Nonconformance::class,'nc_id'); }
    public function owner()                { return $this->belongsTo(User::class,'owner_id'); }
    public function department()           { return $this->belongsTo(Department::class); }
    public function effectivenessVerifier(){ return $this->belongsTo(User::class,'effectiveness_verified_by_id'); }
    public function tasks()                { return $this->hasMany(CapaTask::class); }
}
