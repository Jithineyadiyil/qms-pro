<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role_id', 'department_id',
        'employee_id', 'phone', 'avatar', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'is_active'         => 'boolean',
        'password'          => 'hashed',
    ];

    public function role() { return $this->belongsTo(Role::class); }
    public function department() { return $this->belongsTo(Department::class); }
    public function requests() { return $this->hasMany(QmsRequest::class, 'requester_id'); }
    public function assignedRequests() { return $this->hasMany(QmsRequest::class, 'assignee_id'); }
    public function nonconformances() { return $this->hasMany(Nonconformance::class, 'detected_by_id'); }
    public function capas() { return $this->hasMany(Capa::class, 'owner_id'); }
    public function risks() { return $this->hasMany(Risk::class, 'owner_id'); }
    public function qmsNotifications() { return $this->hasMany(QmsNotification::class); }

    public function hasRole(string $slug): bool { return $this->role?->slug === $slug; }
    public function hasAnyRole(array $slugs): bool { return in_array($this->role?->slug, $slugs); }
    public function isSuperAdmin(): bool { return $this->hasRole('super_admin'); }
    public function isQaManager(): bool { return $this->hasRole('qa_manager'); }
    public function isDeptManager(): bool { return $this->hasRole('dept_manager'); }
    public function hasPermission(string $permission): bool {
        if ($this->isSuperAdmin()) return true;
        $permissions = $this->role?->permissions ?? [];
        if (in_array('*', $permissions)) return true;
        if (in_array($permission, $permissions)) return true;
        // Check module wildcard: e.g. nc.* covers nc.view, nc.create etc.
        $module = explode('.', $permission)[0];
        return in_array($module . '.*', $permissions);
    }
}
