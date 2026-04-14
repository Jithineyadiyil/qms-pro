<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class RequestComment extends Model {
    public $timestamps = false;
    protected $fillable = ['request_id','user_id','comment','is_internal','attachments'];
    protected $casts = ['is_internal'=>'boolean','attachments'=>'array','created_at'=>'datetime'];
    public function user() { return $this->belongsTo(User::class); }
    public function request() { return $this->belongsTo(QmsRequest::class, 'request_id'); }
}
