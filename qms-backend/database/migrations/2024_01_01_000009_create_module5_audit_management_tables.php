<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_programs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('year');
            $table->enum('status', ['planned', 'active', 'completed', 'cancelled'])->default('planned');
            $table->foreignId('created_by_id')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('audits', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->foreignId('program_id')->nullable()->constrained('audit_programs');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['internal', 'external', 'surveillance', 'certification', 'supplier', 'process', 'system', 'compliance'])->default('internal');
            $table->text('scope')->nullable();
            $table->text('criteria')->nullable();
            $table->foreignId('lead_auditor_id')->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('status', ['planned', 'notified', 'in_progress', 'draft_report', 'report_issued', 'closed', 'cancelled'])->default('planned');
            $table->date('planned_start_date');
            $table->date('planned_end_date');
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->date('report_date')->nullable();
            $table->enum('overall_result', ['satisfactory', 'minor_findings', 'major_findings', 'critical_findings'])->nullable();
            $table->text('executive_summary')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_team', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('audits')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->enum('role', ['lead_auditor', 'auditor', 'observer', 'technical_expert'])->default('auditor');
            $table->unique(['audit_id', 'user_id']);
        });

        Schema::create('audit_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('audits')->cascadeOnDelete();
            $table->string('section')->nullable();
            $table->text('question');
            $table->string('requirement_ref', 100)->nullable();
            $table->enum('response', ['yes', 'no', 'partial', 'na', 'not_checked'])->nullable();
            $table->text('evidence')->nullable();
            $table->enum('finding_type', ['conformity', 'minor_nc', 'major_nc', 'observation', 'opportunity'])->nullable();
            $table->text('notes')->nullable();
            $table->integer('sequence')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('audit_findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('audits')->cascadeOnDelete();
            $table->string('reference_no', 50);
            $table->enum('finding_type', ['minor_nc', 'major_nc', 'observation', 'opportunity', 'positive'])->default('minor_nc');
            $table->text('description');
            $table->string('requirement_ref')->nullable();
            $table->text('evidence')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->foreignId('assignee_id')->nullable()->constrained('users');
            $table->enum('status', ['open', 'capa_raised', 'closed'])->default('open');
            $table->foreignId('capa_id')->nullable()->constrained('capas');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_findings');
        Schema::dropIfExists('audit_checklists');
        Schema::dropIfExists('audit_team');
        Schema::dropIfExists('audits');
        Schema::dropIfExists('audit_programs');
    }
};
