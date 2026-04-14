<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Multi-department distribution: which depts can SEE this document
        Schema::create('document_departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->timestamp('distributed_at')->useCurrent();
            $table->unique(['document_id', 'department_id']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('requires_signature');
            $table->timestamp('submitted_at')->nullable()->after('rejection_reason');
            $table->timestamp('approved_at')->nullable()->after('submitted_at');
        });
    }

    public function down(): void {
        Schema::dropIfExists('document_departments');
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['rejection_reason', 'submitted_at', 'approved_at']);
        });
    }
};
