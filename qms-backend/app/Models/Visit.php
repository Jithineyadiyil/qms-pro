<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Visit extends Model {
    protected $fillable = ['reference_no','client_id','type','purpose','visit_date','visit_time','duration_hours','location','is_virtual','meeting_link','host_id','status','agenda','minutes','action_items','outcome','rating','rating_comments','follow_up_date','attachments'];
    protected $casts = ['visit_date'=>'date','follow_up_date'=>'date','action_items'=>'array','attachments'=>'array','is_virtual'=>'boolean'];
    public function client()       { return $this->belongsTo(Client::class); }
    public function host()         { return $this->belongsTo(User::class,'host_id'); }
    public function participants() { return $this->hasMany(VisitParticipant::class); }
    public function findings()     { return $this->hasMany(VisitFinding::class); }
}
