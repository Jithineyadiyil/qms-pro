<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration: Add QDM Workflow Fields to Requests Table
 *
 * Extends the requests table with fields required by the Diamond Insurance
 * Quality & Development Management (QDM) request lifecycle:
 *  - risk_level, request_sub_type, dynamic_fields (type-specific questions)
 *  - ETA tracking, acknowledgement, completion, clarification timestamps
 *  - delay_reason, cycle_time_hours
 *  - Expanded status ENUM to cover the full QDM workflow
 *
 * @author  Jithin Varkey
 * @version 2.0
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Steps 0–3 are MySQL-only.
        // SQLite (used by the test suite) does not support MODIFY COLUMN or
        // ENUM types — it stores status as plain text and needs no ALTER.
        if (DB::getDriverName() === 'mysql') {

            // Step 0 — Migrate 'in_review' → 'under_review' before the ALTER
            DB::statement("UPDATE requests SET status = 'under_review' WHERE status = 'in_review'");

            // Step 1 — Disable strict mode so MySQL warning 1265 is not fatal
            $originalMode = DB::select("SELECT @@SESSION.sql_mode AS mode")[0]->mode;
            DB::statement("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");

            // Step 2 — Expand the status ENUM with new QDM workflow values
            DB::statement("
                ALTER TABLE requests
                MODIFY COLUMN status ENUM(
                    'draft',
                    'submitted',
                    'pending_clarification',
                    'acknowledged',
                    'under_review',
                    'in_progress',
                    'completed',
                    'pending_approval',
                    'approved',
                    'rejected',
                    'closed',
                    'cancelled'
                ) NOT NULL DEFAULT 'draft'
                COMMENT 'QDM workflow status'
            ");

            // Step 3 — Restore original SQL mode
            DB::statement("SET SESSION sql_mode = '{$originalMode}'");
        }

        Schema::table('requests', function (Blueprint $table) {

            // ── QDM Request Type Details ──────────────────────────────────────
            $table->string('request_sub_type', 100)
                  ->nullable()
                  ->after('type')
                  ->comment('Specific sub-type from QDM form: policy_update, new_policy, procedure_update, sla_update, unregulated_work, document_review, quality_review, issue_analysis, kpi_measurement, form_update, new_form, manual_update, new_project, new_development, quality_note, external_audit_prep, other');

            $table->json('dynamic_fields')
                  ->nullable()
                  ->after('request_sub_type')
                  ->comment('Type-specific question answers stored as key-value JSON per Appendix A');

            // ── Risk & Priority ───────────────────────────────────────────────
            $table->enum('risk_level', ['low', 'medium', 'high'])
                  ->default('medium')
                  ->after('priority')
                  ->comment('Risk level as defined by QDM: low/medium/high');

            // ── ETA & Estimation ──────────────────────────────────────────────
            $table->unsignedSmallInteger('estimated_completion_days')
                  ->nullable()
                  ->after('risk_level')
                  ->comment('Estimated processing time in business days set by QDM Manager on acknowledge');

            $table->timestamp('eta_set_at')
                  ->nullable()
                  ->after('estimated_completion_days')
                  ->comment('When QDM Manager set the ETA');

            // ── Workflow Timestamps ───────────────────────────────────────────
            $table->timestamp('acknowledged_at')
                  ->nullable()
                  ->after('eta_set_at')
                  ->comment('When QDM Manager acknowledged the request');

            $table->timestamp('clarification_requested_at')
                  ->nullable()
                  ->after('acknowledged_at')
                  ->comment('When clarification was last requested from requester');

            $table->timestamp('clarification_submitted_at')
                  ->nullable()
                  ->after('clarification_requested_at')
                  ->comment('When requester submitted the requested clarification');

            $table->timestamp('completed_at')
                  ->nullable()
                  ->after('clarification_submitted_at')
                  ->comment('When QDM staff marked the request as completed (before requester confirmation)');

            $table->timestamp('receipt_confirmed_at')
                  ->nullable()
                  ->after('completed_at')
                  ->comment('When requester clicked Confirm Receipt — triggers status=closed');

            $table->timestamp('cancelled_at')
                  ->nullable()
                  ->after('receipt_confirmed_at')
                  ->comment('When the request was cancelled');

            // ── Cycle Time & Delay ────────────────────────────────────────────
            $table->decimal('cycle_time_hours', 10, 2)
                  ->nullable()
                  ->after('cancelled_at')
                  ->comment('Auto-calculated: hours from submitted to closed/cancelled');

            $table->text('delay_reason')
                  ->nullable()
                  ->after('cycle_time_hours')
                  ->comment('Documents reason when actual completion exceeds ETA');

            // ── Tracking ──────────────────────────────────────────────────────
            $table->foreignId('status_updated_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete()
                  ->after('delay_reason')
                  ->comment('User who last changed the request status');

            $table->timestamp('status_updated_at')
                  ->nullable()
                  ->after('status_updated_by')
                  ->comment('Timestamp of the most recent status update');

            $table->text('clarification_notes')
                  ->nullable()
                  ->after('status_updated_at')
                  ->comment('Clarification information submitted by requester');
        });

        // Step 2 — Performance indexes
        Schema::table('requests', function (Blueprint $table) {
            $table->index('risk_level',        'idx_requests_risk_level');
            $table->index('request_sub_type',  'idx_requests_sub_type');
            $table->index('acknowledged_at',   'idx_requests_acknowledged_at');
            $table->index('completed_at',      'idx_requests_completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropIndex('idx_requests_risk_level');
            $table->dropIndex('idx_requests_sub_type');
            $table->dropIndex('idx_requests_acknowledged_at');
            $table->dropIndex('idx_requests_completed_at');

            $table->dropForeign(['status_updated_by']);

            $table->dropColumn([
                'request_sub_type', 'dynamic_fields', 'risk_level',
                'estimated_completion_days', 'eta_set_at', 'acknowledged_at',
                'clarification_requested_at', 'clarification_submitted_at',
                'completed_at', 'receipt_confirmed_at', 'cancelled_at',
                'cycle_time_hours', 'delay_reason', 'status_updated_by',
                'status_updated_at', 'clarification_notes',
            ]);
        });

        // Revert status ENUM — MySQL only
        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE requests
                MODIFY COLUMN status ENUM(
                    'draft','submitted','in_review','in_progress',
                    'pending_approval','approved','rejected','closed'
                ) NOT NULL DEFAULT 'draft'
            ");
        }
    }
};
