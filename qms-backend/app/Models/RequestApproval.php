<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class RequestApproval extends Model {
    public $timestamps = false;
    protected $fillable = ['request_id','approver_id','sequence','status','comments','decided_at'];
    protected $casts = ['decided_at'=>'datetime','created_at'=>'datetime'];
    public function approver() { return $this->belongsTo(User::class, 'approver_id'); }
    public function request()  { return $this->belongsTo(QmsRequest::class, 'request_id'); }
}
