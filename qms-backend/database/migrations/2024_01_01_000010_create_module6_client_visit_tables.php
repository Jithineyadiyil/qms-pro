<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique()->nullable();
            $table->enum('type', ['client', 'insurer', 'regulator', 'partner', 'prospect'])->default('client');
            $table->string('industry', 150)->nullable();
            $table->string('contact_name', 200)->nullable();
            $table->string('contact_email', 200)->nullable();
            $table->string('contact_phone', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('country', 100)->nullable();
            $table->foreignId('account_manager_id')->nullable()->constrained('users');
            $table->enum('status', ['active', 'inactive', 'prospect'])->default('active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->foreignId('client_id')->constrained('clients');
            $table->enum('type', ['client_visit', 'insurer_audit', 'regulatory_inspection', 'partnership_review', 'sales_meeting', 'technical_review'])->default('client_visit');
            $table->text('purpose');
            $table->date('visit_date');
            $table->time('visit_time')->nullable();
            $table->decimal('duration_hours', 4, 1)->nullable();
            $table->string('location')->nullable();
            $table->boolean('is_virtual')->default(false);
            $table->string('meeting_link')->nullable();
            $table->foreignId('host_id')->constrained('users');
            $table->enum('status', ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'])->default('planned');
            $table->text('agenda')->nullable();
            $table->text('minutes')->nullable();
            $table->json('action_items')->nullable();
            $table->text('outcome')->nullable();
            $table->tinyInteger('rating')->nullable();
            $table->text('rating_comments')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('visit_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained('visits')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('external_name', 200)->nullable();
            $table->string('external_email', 200)->nullable();
            $table->string('external_role', 100)->nullable();
            $table->boolean('is_internal')->default(true);
            $table->boolean('attended')->nullable();
        });

        Schema::create('visit_findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained('visits')->cascadeOnDelete();
            $table->enum('finding_type', ['positive', 'concern', 'requirement', 'action_item', 'observation'])->default('observation');
            $table->text('description');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->foreignId('responsible_id')->nullable()->constrained('users');
            $table->date('due_date')->nullable();
            $table->enum('status', ['open', 'in_progress', 'closed'])->default('open');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_findings');
        Schema::dropIfExists('visit_participants');
        Schema::dropIfExists('visits');
        Schema::dropIfExists('clients');
    }
};
