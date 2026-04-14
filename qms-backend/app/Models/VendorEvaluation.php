<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VendorEvaluation extends Model { public $timestamps=false; protected $fillable=['vendor_id','evaluated_by_id','evaluation_date','period','quality_score','delivery_score','price_score','service_score','compliance_score','comments','recommendations','status']; protected $casts=['evaluation_date'=>'date','created_at'=>'datetime']; public function vendor(){ return $this->belongsTo(Vendor::class); } public function evaluatedBy(){ return $this->belongsTo(User::class,'evaluated_by_id'); } }
