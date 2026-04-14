<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ComplaintUpdate extends Model { public $timestamps=false; protected $fillable=['complaint_id','user_id','update_type','previous_status','new_status','comment','notify_complainant']; protected $casts=['notify_complainant'=>'boolean','created_at'=>'datetime']; public function user(){ return $this->belongsTo(User::class); } }
