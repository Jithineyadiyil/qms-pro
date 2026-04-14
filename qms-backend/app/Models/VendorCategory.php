<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VendorCategory extends Model { public $timestamps=false; protected $fillable=['name','description']; public function vendors(){ return $this->hasMany(Vendor::class,'category_id'); } }
