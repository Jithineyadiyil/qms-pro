<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class KeyResult extends Model { protected $fillable=['objective_id','title','description','owner_id','metric_type','start_value','target_value','current_value','status','unit']; public function objective(){ return $this->belongsTo(Objective::class); } public function owner(){ return $this->belongsTo(User::class,'owner_id'); } public function checkIns(){ return $this->hasMany(KrCheckIn::class,'key_result_id'); } }
