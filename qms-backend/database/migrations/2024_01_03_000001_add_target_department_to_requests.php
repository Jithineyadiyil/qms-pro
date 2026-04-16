<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Add target_department column so a request can be routed
     * to either the Quality or Compliance department.
     * Existing rows default to 'quality' so nothing breaks.
     */
    public function up(): void {
        Schema::table('requests', function (Blueprint $table) {
            if (!Schema::hasColumn('requests', 'target_department')) {
                $table->enum('target_department', ['quality', 'compliance'])
                      ->default('quality')
                      ->after('type')
                      ->comment('Which department receives this request after Dept Manager approval');
            }
        });
    }

    public function down(): void {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn('target_department');
        });
    }
};
