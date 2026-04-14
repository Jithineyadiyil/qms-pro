<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DocumentCategory extends Model { public $timestamps=false; protected $fillable=['name','code','parent_id']; public function parent(){ return $this->belongsTo(self::class,'parent_id'); } public function children(){ return $this->hasMany(self::class,'parent_id'); } public function documents(){ return $this->hasMany(Document::class,'category_id'); } }
