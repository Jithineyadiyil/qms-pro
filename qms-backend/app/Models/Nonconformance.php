<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Nonconformance extends Model {
    protected $fillable = [
        'reference_no','title','description','category_id','detected_by_id','assigned_to_id','department_id',
        'severity','status','source','detection_date','target_closure_date','actual_closure_date',
        'immediate_action','root_cause','attachments',
    ];
    protected $casts = ['attachments'=>'array','detection_date'=>'date','target_closure_date'=>'date','actual_closure_date'=>'date'];
    public function category()    { return $this->belongsTo(NcCategory::class); }
    public function detectedBy()  { return $this->belongsTo(User::class,'detected_by_id'); }
    public function assignedTo()  { return $this->belongsTo(User::class,'assigned_to_id'); }
    public function department()  { return $this->belongsTo(Department::class); }
    public function capas()       { return $this->hasMany(Capa::class,'nc_id'); }
}
