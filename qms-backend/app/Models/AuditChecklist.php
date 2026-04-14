<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditChecklist extends Model { public $timestamps=false; protected $fillable=['audit_id','section','question','requirement_ref','response','evidence','finding_type','notes','sequence']; protected $casts=['created_at'=>'datetime']; }
