<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nc_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->enum('severity_default', ['minor', 'major', 'critical'])->default('minor');
        });

        Schema::create('nonconformances', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->string('title');
            $table->text('description');
            $table->foreignId('category_id')->nullable()->constrained('nc_categories');
            $table->foreignId('detected_by_id')->constrained('users');
            $table->foreignId('assigned_to_id')->nullable()->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('severity', ['minor', 'major', 'critical'])->default('minor');
            $table->enum('status', ['open', 'under_investigation', 'pending_capa', 'capa_in_progress', 'effectiveness_check', 'closed', 'cancelled'])->default('open');
            $table->enum('source', ['internal_audit', 'external_audit', 'client_complaint', 'process_review', 'supplier_issue', 'regulatory', 'other'])->default('other');
            $table->date('detection_date');
            $table->date('target_closure_date')->nullable();
            $table->date('actual_closure_date')->nullable();
            $table->text('immediate_action')->nullable();
            $table->text('root_cause')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('capas', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->foreignId('nc_id')->nullable()->constrained('nonconformances');
            $table->string('title');
            $table->text('description');
            $table->enum('type', ['corrective', 'preventive'])->default('corrective');
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('status', ['draft', 'open', 'in_progress', 'effectiveness_review', 'closed', 'cancelled'])->default('draft');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->date('proposed_date')->nullable();
            $table->date('target_date');
            $table->date('actual_completion_date')->nullable();
            $table->text('root_cause_analysis')->nullable();
            $table->text('action_plan')->nullable();
            $table->text('effectiveness_criteria')->nullable();
            $table->text('effectiveness_result')->nullable();
            $table->foreignId('effectiveness_verified_by_id')->nullable()->constrained('users');
            $table->timestamp('effectiveness_verified_at')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('capa_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('capa_id')->constrained('capas')->cascadeOnDelete();
            $table->text('task_description');
            $table->foreignId('responsible_id')->constrained('users');
            $table->date('due_date');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'overdue'])->default('pending');
            $table->text('completion_notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capa_tasks');
        Schema::dropIfExists('capas');
        Schema::dropIfExists('nonconformances');
        Schema::dropIfExists('nc_categories');
    }
};
