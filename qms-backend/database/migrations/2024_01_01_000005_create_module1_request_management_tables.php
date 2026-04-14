<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('request_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->integer('sla_hours')->default(48);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->string('title');
            $table->text('description');
            $table->foreignId('category_id')->nullable()->constrained('request_categories');
            $table->foreignId('requester_id')->constrained('users');
            $table->foreignId('assignee_id')->nullable()->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['draft', 'submitted', 'in_review', 'in_progress', 'pending_approval', 'approved', 'rejected', 'closed'])->default('draft');
            $table->enum('type', ['internal', 'external', 'client', 'vendor', 'regulatory'])->default('internal');
            $table->date('due_date')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('resolution')->nullable();
            $table->json('attachments')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('request_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->text('comment');
            $table->boolean('is_internal')->default(false);
            $table->json('attachments')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('request_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->cascadeOnDelete();
            $table->foreignId('approver_id')->constrained('users');
            $table->integer('sequence')->default(1);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('comments')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_approvals');
        Schema::dropIfExists('request_comments');
        Schema::dropIfExists('requests');
        Schema::dropIfExists('request_categories');
    }
};
