<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sla_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('clients');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->string('category', 150)->nullable();
            $table->integer('response_time_hours')->nullable();
            $table->integer('resolution_time_hours')->nullable();
            $table->decimal('availability_percent', 5, 2)->nullable();
            $table->text('penalty_clause')->nullable();
            $table->text('reward_clause')->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->enum('status', ['draft', 'active', 'expired', 'suspended'])->default('draft');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('sla_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sla_id')->constrained('sla_definitions')->cascadeOnDelete();
            $table->string('metric_name', 150);
            $table->decimal('target_value', 10, 2);
            $table->string('unit', 50)->nullable();
            $table->enum('measurement_frequency', ['daily', 'weekly', 'monthly', 'quarterly'])->default('monthly');
            $table->decimal('threshold_warning', 10, 2)->nullable();
            $table->decimal('threshold_critical', 10, 2)->nullable();
        });

        Schema::create('sla_measurements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sla_id')->constrained('sla_definitions');
            $table->foreignId('metric_id')->constrained('sla_metrics');
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('actual_value', 10, 2);
            $table->decimal('target_value', 10, 2);
            $table->decimal('threshold_warning', 10, 2)->nullable();
            // status computed in application layer
            $table->string('status', 20)->default('breached')->comment('Set by application: met/warning/breached');
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by_id')->nullable()->constrained('users');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('objectives', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('type', ['company', 'department', 'team', 'individual'])->default('department');
            $table->enum('status', ['draft', 'active', 'at_risk', 'completed', 'cancelled'])->default('draft');
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('progress_percent', 5, 2)->default(0);
            $table->foreignId('parent_id')->nullable()->constrained('objectives');
            $table->timestamps();
        });

        Schema::create('key_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('objective_id')->constrained('objectives')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('owner_id')->constrained('users');
            $table->enum('metric_type', ['percentage', 'number', 'boolean', 'currency'])->default('percentage');
            $table->decimal('start_value', 10, 2)->default(0);
            $table->decimal('target_value', 10, 2);
            $table->decimal('current_value', 10, 2)->default(0);
            $table->decimal('progress_percent', 5, 2)->default(0)->comment('Calculated by application on update; MySQL stored: LEAST(100,((cur-start)/(target-start))*100)');
            $table->enum('status', ['on_track', 'at_risk', 'off_track', 'completed'])->default('on_track');
            $table->string('unit', 50)->nullable();
            $table->timestamps();
        });

        Schema::create('kr_check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('key_result_id')->constrained('key_results')->cascadeOnDelete();
            $table->decimal('value', 10, 2);
            $table->text('notes')->nullable();
            $table->tinyInteger('confidence_level')->nullable();
            $table->foreignId('checked_by_id')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kr_check_ins');
        Schema::dropIfExists('key_results');
        Schema::dropIfExists('objectives');
        Schema::dropIfExists('sla_measurements');
        Schema::dropIfExists('sla_metrics');
        Schema::dropIfExists('sla_definitions');
    }
};
