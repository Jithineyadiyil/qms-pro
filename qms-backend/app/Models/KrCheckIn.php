<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class KrCheckIn extends Model { public $timestamps=false; protected $fillable=['key_result_id','value','notes','confidence_level','checked_by_id']; protected $casts=['created_at'=>'datetime']; public function checkedBy(){ return $this->belongsTo(User::class,'checked_by_id'); } }
