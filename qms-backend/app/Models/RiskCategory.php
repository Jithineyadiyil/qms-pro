<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RiskCategory extends Model { public $timestamps=false; protected $fillable=['name','description']; public function risks(){ return $this->hasMany(Risk::class,'category_id'); } }
