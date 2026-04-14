<?php
/**
 * Quick fix: Reset admin password or create admin user directly.
 * Run from backend root: php fix-login.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

echo "=== QMS Login Fix ===\n\n";

// Check if users table has data
$count = DB::table('users')->count();
echo "Users in database: $count\n";

if ($count === 0) {
    echo "No users found! Run: php artisan migrate:fresh --seed\n\n";

    // Ensure roles and departments exist first, then create admin
    $roleId = DB::table('roles')->where('name', 'super_admin')->value('id');
    if (!$roleId) {
        $roleId = DB::table('roles')->insertGetId([
            'name' => 'super_admin',
            'display_name' => 'Super Admin',
            'permissions' => json_encode(['*']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "Created super_admin role (id=$roleId)\n";
    }

    $deptId = DB::table('departments')->first()?->id;
    if (!$deptId) {
        $deptId = DB::table('departments')->insertGetId([
            'name' => 'Quality',
            'description' => 'Quality Department',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "Created Quality department (id=$deptId)\n";
    }

    DB::table('users')->insert([
        'name'              => 'System Administrator',
        'email'             => 'admin@qms.com',
        'password'          => Hash::make('password'),
        'employee_id'       => 'EMP001',
        'role_id'           => $roleId,
        'department_id'     => $deptId,
        'is_active'         => 1,
        'email_verified_at' => now(),
        'created_at'        => now(),
        'updated_at'        => now(),
    ]);
    echo "✅ Created admin user: admin@qms.com / password\n";
} else {
    // Users exist — just reset the admin password
    $updated = DB::table('users')
        ->where('email', 'admin@qms.com')
        ->update(['password' => Hash::make('password'), 'is_active' => 1]);

    if ($updated) {
        echo "✅ Password reset: admin@qms.com → 'password'\n";
    } else {
        echo "admin@qms.com not found. Resetting ALL user passwords to 'password'...\n";
        DB::table('users')->update(['password' => Hash::make('password'), 'is_active' => 1]);
        echo "✅ All " . DB::table('users')->count() . " users now have password: 'password'\n";
    }

    // Show all users
    echo "\nAll users:\n";
    DB::table('users')->get()->each(function($u) {
        echo "  - {$u->email}\n";
    });
}

echo "\nDone. Try logging in at your app.\n";
