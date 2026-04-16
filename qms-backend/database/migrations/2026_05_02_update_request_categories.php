<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Replaces the 7 generic request categories with 10 Diamond-QMS categories
 * aligned to QDM v2 sub-types and Diamond Insurance Brokers departments.
 *
 * Safe to run on a live DB — existing requests retain their category_id FK;
 * orphaned FKs are set to NULL via the on-delete rule on the requests table.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Disable FK checks so we can delete from a referenced table
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('request_categories')->delete();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Insert the 10 aligned categories
        DB::table('request_categories')->insert([
            [
                'name'        => 'Policy & Procedure',
                'description' => 'New or updated policies, procedures, and work instructions',
                'sla_hours'   => 72,
                'created_at'  => now(),
            ],
            [
                'name'        => 'Document Control',
                'description' => 'Form updates, manuals, and document reviews',
                'sla_hours'   => 48,
                'created_at'  => now(),
            ],
            [
                'name'        => 'Quality & Compliance',
                'description' => 'Quality reviews, audits, and ISO 9001 requirements',
                'sla_hours'   => 48,
                'created_at'  => now(),
            ],
            [
                'name'        => 'Regulatory & SLA',
                'description' => 'SLA changes and regulatory compliance requests',
                'sla_hours'   => 24,
                'created_at'  => now(),
            ],
            [
                'name'        => 'IT & Cyber Security',
                'description' => 'Technology, systems, and cybersecurity requests',
                'sla_hours'   => 24,
                'created_at'  => now(),
            ],
            [
                'name'        => 'HR & Training',
                'description' => 'Human resources and training & development requests',
                'sla_hours'   => 96,
                'created_at'  => now(),
            ],
            [
                'name'        => 'Operations',
                'description' => 'Day-to-day unregulated and operational process work',
                'sla_hours'   => 72,
                'created_at'  => now(),
            ],
            [
                'name'        => 'Analysis & KPI',
                'description' => 'Issue analysis, KPI measurement, and performance reporting',
                'sla_hours'   => 48,
                'created_at'  => now(),
            ],
            [
                'name'        => 'Projects',
                'description' => 'New projects and system development initiatives',
                'sla_hours'   => 120,
                'created_at'  => now(),
            ],
            [
                'name'        => 'General',
                'description' => 'Other requests not covered by the above categories',
                'sla_hours'   => 72,
                'created_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('request_categories')->delete();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Restore original 7 categories
        DB::table('request_categories')->insert([
            ['name' => 'IT Support',     'description' => 'Information technology support requests', 'sla_hours' => 24, 'created_at' => now()],
            ['name' => 'HR Request',     'description' => 'Human resources related requests',        'sla_hours' => 48, 'created_at' => now()],
            ['name' => 'Procurement',    'description' => 'Purchase and procurement requests',        'sla_hours' => 72, 'created_at' => now()],
            ['name' => 'Quality Review', 'description' => 'Quality assessment requests',              'sla_hours' => 48, 'created_at' => now()],
            ['name' => 'Compliance',     'description' => 'Regulatory and compliance requests',       'sla_hours' => 24, 'created_at' => now()],
            ['name' => 'Training',       'description' => 'Training and development requests',        'sla_hours' => 96, 'created_at' => now()],
            ['name' => 'Facilities',     'description' => 'Facilities and infrastructure requests',   'sla_hours' => 48, 'created_at' => now()],
        ]);
    }
};
