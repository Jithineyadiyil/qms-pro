<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RiskReview extends Model { public $timestamps=false; protected $fillable=['risk_id','reviewed_by_id','review_date','likelihood_reviewed','impact_reviewed','status_after','comments']; protected $casts=['review_date'=>'date','created_at'=>'datetime']; public function reviewedBy(){ return $this->belongsTo(User::class,'reviewed_by_id'); } }
