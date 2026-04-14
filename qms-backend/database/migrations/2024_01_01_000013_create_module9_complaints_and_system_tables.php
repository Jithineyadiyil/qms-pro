<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->integer('sla_hours')->default(72);
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->string('title');
            $table->text('description');
            $table->foreignId('category_id')->nullable()->constrained('complaint_categories');
            $table->enum('complainant_type', ['client', 'vendor', 'employee', 'public', 'regulator', 'other'])->default('client');
            $table->string('complainant_name', 200)->nullable();
            $table->string('complainant_email', 200)->nullable();
            $table->string('complainant_phone', 50)->nullable();
            $table->foreignId('client_id')->nullable()->constrained('clients');
            $table->foreignId('assignee_id')->nullable()->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['received', 'acknowledged', 'under_investigation', 'pending_resolution', 'resolved', 'closed', 'escalated', 'withdrawn'])->default('received');
            $table->enum('source', ['email', 'phone', 'web_form', 'in_person', 'social_media', 'regulator', 'other'])->default('email');
            $table->dateTime('received_date');
            $table->dateTime('acknowledged_date')->nullable();
            $table->dateTime('target_resolution_date')->nullable();
            $table->dateTime('actual_resolution_date')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('resolution')->nullable();
            $table->tinyInteger('customer_satisfaction')->nullable();
            $table->boolean('is_regulatory')->default(false);
            $table->integer('escalation_level')->default(0);
            $table->foreignId('escalated_to_id')->nullable()->constrained('users');
            $table->boolean('capa_required')->default(false);
            $table->foreignId('capa_id')->nullable()->constrained('capas');
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('complaint_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->enum('update_type', ['status_change', 'comment', 'escalation', 'resolution', 'closure'])->default('comment');
            $table->string('previous_status', 50)->nullable();
            $table->string('new_status', 50)->nullable();
            $table->text('comment')->nullable();
            $table->boolean('notify_complainant')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        // Notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 100);
            $table->string('title');
            $table->text('message')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'read_at']);
        });

        // Activity Logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('module', 100);
            $table->string('action', 100);
            $table->string('model_type', 100)->nullable();
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['module', 'action']);
            $table->index(['model_type', 'model_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('complaint_updates');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('complaint_categories');
    }
};
