<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Notification Model
 *
 * The notifications table has only created_at (no updated_at).
 * UPDATED_AT = null prevents Eloquent from writing that column.
 */
class Notification extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'type', 'title', 'message', 'data', 'read_at',
    ];

    protected $casts = [
        'data'    => 'array',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
