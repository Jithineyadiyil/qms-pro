<?php
/**
 * QMS Setup Diagnostic
 * Run from backend root: php check-setup.php
 */
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

echo "=== QMS Setup Diagnostic ===\n\n";

// 1. Check APP_KEY
$key = env('APP_KEY');
echo "1. APP_KEY: " . ($key ? "✅ Set" : "❌ MISSING — run: php artisan key:generate") . "\n";

// 2. Check DB connection
try {
    DB::connection()->getPdo();
    echo "2. Database: ✅ Connected (" . env('DB_DATABASE') . ")\n";
} catch (\Exception $e) {
    echo "2. Database: ❌ FAILED — " . $e->getMessage() . "\n";
    echo "   → Check DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD in .env\n";
    exit(1);
}

// 3. Check tables
$tables = DB::select("SHOW TABLES");
echo "3. Tables: " . count($tables) . " found\n";
if (count($tables) < 5) {
    echo "   → Run: php artisan migrate:fresh --seed\n";
}

// 4. Check users
try {
    $userCount = DB::table('users')->count();
    echo "4. Users: $userCount found\n";
    if ($userCount === 0) {
        echo "   → Run: php artisan db:seed\n";
    }
} catch (\Exception $e) {
    echo "4. Users table: ❌ Missing — run migrations first\n";
    exit(1);
}

// 5. Check admin user
$admin = DB::table('users')->where('email', 'admin@qms.com')->first();
if ($admin) {
    $pwOk = Hash::check('password', $admin->password);
    echo "5. admin@qms.com: ✅ Found (active=" . $admin->is_active . ", pw=" . ($pwOk ? "✅" : "❌ wrong hash") . ")\n";
    if (!$pwOk || !$admin->is_active) {
        echo "   → Fixing...\n";
        DB::table('users')->where('email', 'admin@qms.com')
            ->update(['password' => Hash::make('password'), 'is_active' => 1]);
        echo "   → ✅ Fixed! Password reset to: password\n";
    }
} else {
    echo "5. admin@qms.com: ❌ NOT FOUND\n";
    echo "   → Run: php artisan db:seed --class=UserSeeder\n";
}

// 6. Test login manually
echo "\n6. Testing login logic...\n";
$user = \App\Models\User::where('email', 'admin@qms.com')->first();
if ($user && Hash::check('password', $user->password)) {
    echo "   ✅ Login will work for admin@qms.com / password\n";
} else {
    echo "   ❌ Login will FAIL — resetting password now...\n";
    if ($user) {
        $user->update(['password' => Hash::make('password'), 'is_active' => 1]);
        echo "   ✅ Done! Try: admin@qms.com / password\n";
    }
}

echo "\n=== Done ===\n";
echo "If login still fails, check the browser Network tab for the actual error response.\n";
