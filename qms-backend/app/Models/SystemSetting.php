<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model {
    protected $fillable = ['key','group','label','value','type','options','description'];
    protected $casts = ['options' => 'array'];
}
