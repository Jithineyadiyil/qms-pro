<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DocumentAccessLog extends Model {
    protected $table = 'document_access_logs';
    
    protected $fillable = ['document_id','user_id','action','ip_address','created_at'];
    protected $casts = ['created_at' => 'datetime'];
    public function user()     { return $this->belongsTo(User::class); }
    public function document() { return $this->belongsTo(Document::class); }
}
