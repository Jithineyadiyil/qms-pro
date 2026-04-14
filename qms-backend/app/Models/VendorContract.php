<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VendorContract extends Model { protected $fillable=['vendor_id','contract_no','title','description','type','value','currency','start_date','end_date','auto_renewal','renewal_notice_days','status','owner_id','file_path']; protected $casts=['start_date'=>'date','end_date'=>'date','auto_renewal'=>'boolean']; public function vendor(){ return $this->belongsTo(Vendor::class); } public function owner(){ return $this->belongsTo(User::class,'owner_id'); } }
