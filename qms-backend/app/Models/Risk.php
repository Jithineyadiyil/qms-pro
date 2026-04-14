<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Risk extends Model {
    protected $fillable = [
        'reference_no','title','description','category_id','owner_id','department_id','type','status',
        'likelihood','impact','residual_likelihood','residual_impact','treatment_strategy','treatment_plan',
        'review_date','next_review_date','attachments',
    ];
    protected $casts = ['attachments'=>'array','review_date'=>'date','next_review_date'=>'date'];
    public function category()   { return $this->belongsTo(RiskCategory::class); }
    public function owner()      { return $this->belongsTo(User::class,'owner_id'); }
    public function department() { return $this->belongsTo(Department::class); }
    public function controls()   { return $this->hasMany(RiskControl::class); }
    public function reviews()    { return $this->hasMany(RiskReview::class); }
    public function getRiskScoreAttribute() { return $this->likelihood * $this->impact; }
    public function getRiskLevelAttribute() {
        $s = $this->risk_score;
        if($s<=4) return 'low'; if($s<=9) return 'medium'; if($s<=16) return 'high'; return 'critical';
    }
}
