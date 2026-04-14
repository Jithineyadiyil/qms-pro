<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('email', 200)->unique();
            $table->string('password');
            $table->foreignId('role_id')->constrained('roles');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->string('employee_id', 50)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('avatar')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        // Add FK for departments.head_user_id now that users table exists
        Schema::table('departments', function (Blueprint $table) {
            $table->foreign('head_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropForeign(['head_user_id']);
        });
        Schema::dropIfExists('users');
    }
};
