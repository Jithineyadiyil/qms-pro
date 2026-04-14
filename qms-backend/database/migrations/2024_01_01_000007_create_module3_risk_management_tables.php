<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risk_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
        });

        Schema::create('risks', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->string('title');
            $table->text('description');
            $table->foreignId('category_id')->nullable()->constrained('risk_categories');
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('type', ['strategic', 'operational', 'financial', 'compliance', 'reputational', 'technical', 'environmental', 'other'])->default('operational');
            $table->enum('status', ['identified', 'assessed', 'treatment_in_progress', 'monitored', 'closed', 'accepted'])->default('identified');
            $table->tinyInteger('likelihood')->default(3);
            $table->tinyInteger('impact')->default(3);
            // risk_score and risk_level are computed in PHP (MySQL generated columns are tricky in migrations)
            $table->tinyInteger('risk_score')->storedAs('likelihood * impact');
            $table->string('risk_level', 20)->storedAs("CASE WHEN likelihood * impact <= 4 THEN 'low' WHEN likelihood * impact <= 9 THEN 'medium' WHEN likelihood * impact <= 16 THEN 'high' ELSE 'critical' END");
            $table->tinyInteger('residual_likelihood')->nullable();
            $table->tinyInteger('residual_impact')->nullable();
            $table->enum('treatment_strategy', ['avoid', 'mitigate', 'transfer', 'accept'])->nullable();
            $table->text('treatment_plan')->nullable();
            $table->date('review_date')->nullable();
            $table->date('next_review_date')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('risk_controls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('risk_id')->constrained('risks')->cascadeOnDelete();
            $table->text('control_description');
            $table->enum('control_type', ['preventive', 'detective', 'corrective'])->default('preventive');
            $table->foreignId('owner_id')->constrained('users');
            $table->enum('effectiveness', ['effective', 'partially_effective', 'ineffective', 'not_tested'])->default('not_tested');
            $table->date('last_tested_date')->nullable();
            $table->date('next_test_date')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('risk_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('risk_id')->constrained('risks')->cascadeOnDelete();
            $table->foreignId('reviewed_by_id')->constrained('users');
            $table->date('review_date');
            $table->tinyInteger('likelihood_reviewed')->nullable();
            $table->tinyInteger('impact_reviewed')->nullable();
            $table->string('status_after', 50)->nullable();
            $table->text('comments')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risk_reviews');
        Schema::dropIfExists('risk_controls');
        Schema::dropIfExists('risks');
        Schema::dropIfExists('risk_categories');
    }
};
