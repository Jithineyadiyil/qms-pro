<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SurveyQuestion extends Model {
    protected $fillable = [
        'survey_id','question_text','question_type','rating_max',
        'options','is_required','sort_order',
    ];
    protected $casts = [
        'options' => 'array', 'is_required' => 'boolean',
    ];
    public function survey()  { return $this->belongsTo(Survey::class); }
    public function answers() { return $this->hasMany(SurveyAnswer::class, 'question_id'); }
}
