<?php namespace App\Models; use Illuminate\Database\Eloquent\Model;

class AuditTeam extends Model {
    protected $fillable = ['audit_id','user_id','role'];
    public function audit() { return $this->belongsTo(Audit::class); }
    public function user()  { return $this->belongsTo(User::class); }
}

// ─────────────────────────────────────────────────
// NOTE: Each class in its own file in production.
// Split as needed. Included together for delivery.
// ─────────────────────────────────────────────────
