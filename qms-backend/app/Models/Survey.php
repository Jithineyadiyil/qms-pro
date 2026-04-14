<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Survey extends Model {
    protected $fillable = [
        'reference_no','title','description','type','status',
        'target_type','target_id','send_date','close_date',
        'created_by_id','department_id','response_count','avg_score',
        'nps_score','thank_you_message','is_anonymous',
    ];
    protected $casts = [
        'send_date' => 'date', 'close_date' => 'date',
        'is_anonymous' => 'boolean',
        'avg_score' => 'float', 'nps_score' => 'float',
    ];
    public function createdBy()   { return $this->belongsTo(User::class, 'created_by_id'); }
    public function department()  { return $this->belongsTo(Department::class); }
    public function questions()   { return $this->hasMany(SurveyQuestion::class)->orderBy('sort_order'); }
    public function responses()   { return $this->hasMany(SurveyResponse::class); }
}
