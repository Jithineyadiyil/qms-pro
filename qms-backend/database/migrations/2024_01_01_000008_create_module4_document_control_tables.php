<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('code', 20)->unique();
            $table->foreignId('parent_id')->nullable()->constrained('document_categories');
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('document_no', 50)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('category_id')->nullable()->constrained('document_categories');
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('reviewer_id')->nullable()->constrained('users');
            $table->foreignId('approver_id')->nullable()->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->enum('type', ['policy', 'procedure', 'work_instruction', 'form', 'template', 'manual', 'specification', 'report', 'other'])->default('procedure');
            $table->enum('status', ['draft', 'under_review', 'pending_approval', 'approved', 'obsolete', 'superseded'])->default('draft');
            $table->string('version', 20)->default('1.0');
            $table->date('effective_date')->nullable();
            $table->date('review_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('file_path')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->boolean('is_controlled')->default(true);
            $table->boolean('requires_signature')->default(false);
            $table->json('tags')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->string('version', 20);
            $table->text('change_summary')->nullable();
            $table->foreignId('changed_by_id')->constrained('users');
            $table->string('file_path')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('document_access_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents');
            $table->foreignId('user_id')->constrained('users');
            $table->enum('action', ['view', 'download', 'print', 'share'])->default('view');
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('document_distributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents');
            $table->foreignId('user_id')->constrained('users');
            $table->timestamp('distributed_at')->useCurrent();
            $table->timestamp('acknowledged_at')->nullable();
            $table->unique(['document_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_distributions');
        Schema::dropIfExists('document_access_log');
        Schema::dropIfExists('document_versions');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('document_categories');
    }
};
