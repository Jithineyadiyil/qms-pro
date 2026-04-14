<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class CapaTask extends Model {
    public $timestamps = false;
    protected $fillable = ['capa_id','task_description','responsible_id','due_date','status','completion_notes','completed_at'];
    protected $casts = ['due_date'=>'date','completed_at'=>'datetime','created_at'=>'datetime'];
    public function capa()        { return $this->belongsTo(Capa::class); }
    public function responsible() { return $this->belongsTo(User::class,'responsible_id'); }
}
