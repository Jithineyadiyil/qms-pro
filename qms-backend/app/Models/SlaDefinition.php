<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SlaDefinition extends Model
{
    public $timestamps = false;  // table has created_at but no updated_at

    protected $fillable = [
        'name', 'description', 'client_id', 'department_id', 'category',
        'response_time_hours', 'resolution_time_hours', 'availability_percent',
        'penalty_clause', 'reward_clause', 'effective_from', 'effective_to',
        'status', 'created_at',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to'   => 'date',
        'created_at'     => 'datetime',
    ];

    public function client()       { return $this->belongsTo(Client::class); }
    public function department()   { return $this->belongsTo(Department::class); }
    public function metrics()      { return $this->hasMany(SlaMetric::class, 'sla_id'); }
    public function measurements() { return $this->hasMany(SlaMeasurement::class, 'sla_id'); }
}
