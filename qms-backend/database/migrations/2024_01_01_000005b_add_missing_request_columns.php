<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('requests', function (Blueprint $table) {
            if (!Schema::hasColumn('requests', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('due_date');
            }
            if (!Schema::hasColumn('requests', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('submitted_at');
            }
            if (!Schema::hasColumn('requests', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->constrained('users')->after('approved_at');
            }
            if (!Schema::hasColumn('requests', 'closed_by')) {
                $table->foreignId('closed_by')->nullable()->constrained('users')->after('closed_at');
            }
        });
    }
    public function down(): void {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn(['submitted_at','approved_at','approved_by','closed_by']);
        });
    }
};
