<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VisitFinding extends Model { public $timestamps=false; protected $fillable=['visit_id','finding_type','description','priority','responsible_id','due_date','status']; protected $casts=['due_date'=>'date']; public function responsible(){ return $this->belongsTo(User::class,'responsible_id'); } }
