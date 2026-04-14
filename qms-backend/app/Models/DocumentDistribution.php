<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DocumentDistribution extends Model {
    protected $fillable = ['document_id','user_id','distributed_at','acknowledged_at'];
    protected $casts = ['distributed_at'=>'datetime','acknowledged_at'=>'datetime'];
    public function user()     { return $this->belongsTo(User::class); }
    public function document() { return $this->belongsTo(Document::class); }
}
