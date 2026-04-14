<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SurveyResponse extends Model {
    public $timestamps = false;
    protected $fillable = [
        'survey_id','respondent_name','respondent_email','respondent_type',
        'client_id','user_id','token','submitted_at','ip_address',
    ];
    protected $casts = ['submitted_at' => 'datetime'];
    public function survey()  { return $this->belongsTo(Survey::class); }
    public function client()  { return $this->belongsTo(Client::class); }
    public function user()    { return $this->belongsTo(User::class); }
    public function answers() { return $this->hasMany(SurveyAnswer::class, 'response_id'); }
}
