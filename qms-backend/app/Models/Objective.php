<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Objective extends Model { protected $fillable=['title','description','owner_id','department_id','type','status','period_start','period_end','progress_percent','parent_id']; protected $casts=['period_start'=>'date','period_end'=>'date']; public function owner(){ return $this->belongsTo(User::class,'owner_id'); } public function department(){ return $this->belongsTo(Department::class); } public function parent(){ return $this->belongsTo(self::class,'parent_id'); } public function children(){ return $this->hasMany(self::class,'parent_id'); } public function keyResults(){ return $this->hasMany(KeyResult::class); } }
