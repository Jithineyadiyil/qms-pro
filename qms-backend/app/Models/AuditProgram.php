<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditProgram extends Model { public $timestamps=false; protected $fillable=['name','description','year','status','created_by_id']; protected $casts=['created_at'=>'datetime']; public function createdBy(){ return $this->belongsTo(User::class,'created_by_id'); } public function audits(){ return $this->hasMany(Audit::class,'program_id'); } }
