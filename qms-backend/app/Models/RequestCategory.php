<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class RequestCategory extends Model {
    public $timestamps = false;
    protected $fillable = ['name', 'description', 'sla_hours'];
    public function requests() { return $this->hasMany(QmsRequest::class, 'category_id'); }
}
