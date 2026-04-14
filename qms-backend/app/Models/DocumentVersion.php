<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DocumentVersion extends Model { public $timestamps=false; protected $fillable=['document_id','version','change_summary','changed_by_id','file_path','approved_at']; protected $casts=['approved_at'=>'datetime','created_at'=>'datetime']; public function changedBy(){ return $this->belongsTo(User::class,'changed_by_id'); } }
