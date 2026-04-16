<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SlaMeasurement extends Model
{
    public $timestamps = false;  // only created_at, no updated_at

    protected $fillable = [
        'sla_id', 'metric_id', 'period_start', 'period_end',
        'actual_value', 'target_value', 'threshold_warning',
        'notes', 'recorded_by_id', 'status', 'created_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'created_at'   => 'datetime',
    ];

    public function metric()     { return $this->belongsTo(SlaMetric::class, 'metric_id'); }
    public function recordedBy() { return $this->belongsTo(User::class, 'recorded_by_id'); }
}
