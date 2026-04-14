<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Department extends Model {
    protected $fillable = ['name', 'code', 'head_user_id'];
    public function head() { return $this->belongsTo(User::class, 'head_user_id'); }
    public function users() { return $this->hasMany(User::class); }
    public function requests() { return $this->hasMany(QmsRequest::class); }
    public function nonconformances() { return $this->hasMany(Nonconformance::class); }
    public function risks() { return $this->hasMany(Risk::class); }
}
