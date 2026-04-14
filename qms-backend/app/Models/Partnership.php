<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Partnership extends Model { public $timestamps=false; protected $fillable=['name','partner_type','vendor_id','client_id','description','start_date','end_date','status','owner_id','value_proposition','kpis']; protected $casts=['start_date'=>'date','end_date'=>'date','kpis'=>'array','created_at'=>'datetime']; public function vendor(){ return $this->belongsTo(Vendor::class); } public function client(){ return $this->belongsTo(Client::class); } public function owner(){ return $this->belongsTo(User::class,'owner_id'); } }
