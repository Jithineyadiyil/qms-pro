<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('name');
            $table->string('module', 50); // requests, nc, capa, risk, audit, complaint, vendor, visit
            $table->string('trigger_event', 100); // created, updated, approved, rejected, overdue ...
            $table->string('subject');
            $table->text('body_html');
            $table->json('variables')->nullable(); // [{key:'{{ref}}', desc:'Reference number'}]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('group', 50)->default('general'); // general, notifications, security, appearance
            $table->string('label');
            $table->text('value')->nullable();
            $table->string('type', 30)->default('text'); // text, boolean, number, select, color, textarea
            $table->json('options')->nullable(); // for select type
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('email_templates');
    }
};
