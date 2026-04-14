<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ComplaintCategory extends Model { public $timestamps=false; protected $fillable=['name','description','sla_hours']; public function complaints(){ return $this->hasMany(Complaint::class,'category_id'); } }
