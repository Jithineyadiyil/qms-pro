<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditFinding extends Model { public $timestamps=false; protected $fillable=['audit_id','reference_no','finding_type','description','requirement_ref','evidence','department_id','assignee_id','status','capa_id']; protected $casts=['created_at'=>'datetime']; public function assignee(){ return $this->belongsTo(User::class,'assignee_id'); } public function department(){ return $this->belongsTo(Department::class); } public function capa(){ return $this->belongsTo(Capa::class); } }
