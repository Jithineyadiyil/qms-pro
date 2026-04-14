<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model {

    protected $fillable = ['name', 'code', 'type', 'industry', 'contact_name', 'contact_email', 'contact_phone', 'address', 'country', 'account_manager_id', 'status', 'metadata'];
    protected $casts = ['metadata' => 'array'];

    public function accountManager() {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function visits() {
        return $this->hasMany(Visit::class);
    }

    public function complaints() {
        return $this->hasMany(Complaint::class);
    }
}
