<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SlaMetric extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'sla_id', 'metric_name', 'target_value', 'unit',
        'measurement_frequency', 'threshold_warning', 'threshold_critical',
    ];

    public function sla() { return $this->belongsTo(SlaDefinition::class, 'sla_id'); }
}
