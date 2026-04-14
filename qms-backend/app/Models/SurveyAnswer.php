<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SurveyAnswer extends Model {
    public $timestamps = false;
    protected $fillable = ['response_id','question_id','answer_text','answer_rating','answer_choices'];
    protected $casts = ['answer_choices' => 'array'];
    public function response()  { return $this->belongsTo(SurveyResponse::class, 'response_id'); }
    public function question()  { return $this->belongsTo(SurveyQuestion::class, 'question_id'); }
}
