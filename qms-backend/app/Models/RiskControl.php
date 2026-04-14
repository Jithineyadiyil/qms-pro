<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RiskControl extends Model { public $timestamps=false; protected $fillable=['risk_id','control_description','control_type','owner_id','effectiveness','last_tested_date','next_test_date']; protected $casts=['last_tested_date'=>'date','next_test_date'=>'date','created_at'=>'datetime']; public function owner(){ return $this->belongsTo(User::class,'owner_id'); } }
