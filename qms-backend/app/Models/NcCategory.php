<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class NcCategory extends Model {
    public $timestamps = false;
    protected $fillable = ['name','description','severity_default'];
    public function nonconformances() { return $this->hasMany(Nonconformance::class,'category_id'); }
}
