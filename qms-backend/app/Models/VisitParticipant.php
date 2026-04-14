<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VisitParticipant extends Model { public $timestamps=false; protected $fillable=['visit_id','user_id','external_name','external_email','external_role','is_internal','attended']; public function user(){ return $this->belongsTo(User::class); } }
