<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Resets request_categories AUTO_INCREMENT to 1 so IDs match the
 * frontend REQUEST_CATEGORIES constant (1-10).
 *
 * Safe to run even if already correct — just re-inserts the 10 categories
 * with explicit IDs 1-10.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('request_categories')->delete();
        DB::statement('ALTER TABLE request_categories AUTO_INCREMENT = 1');
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        DB::table('request_categories')->insert([
            ['id'=>1,  'name'=>'Policy & Procedure',  'description'=>'New or updated policies, procedures, and work instructions', 'sla_hours'=>72,  'created_at'=>now()],
            ['id'=>2,  'name'=>'Document Control',    'description'=>'Form updates, manuals, and document reviews',                'sla_hours'=>48,  'created_at'=>now()],
            ['id'=>3,  'name'=>'Quality & Compliance','description'=>'Quality reviews, audits, and ISO 9001 requirements',          'sla_hours'=>48,  'created_at'=>now()],
            ['id'=>4,  'name'=>'Regulatory & SLA',    'description'=>'SLA changes and regulatory compliance requests',              'sla_hours'=>24,  'created_at'=>now()],
            ['id'=>5,  'name'=>'IT & Cyber Security', 'description'=>'Technology, systems, and cybersecurity requests',             'sla_hours'=>24,  'created_at'=>now()],
            ['id'=>6,  'name'=>'HR & Training',       'description'=>'Human resources and training & development requests',         'sla_hours'=>96,  'created_at'=>now()],
            ['id'=>7,  'name'=>'Operations',          'description'=>'Day-to-day unregulated and operational process work',         'sla_hours'=>72,  'created_at'=>now()],
            ['id'=>8,  'name'=>'Analysis & KPI',      'description'=>'Issue analysis, KPI measurement, and performance reporting',  'sla_hours'=>48,  'created_at'=>now()],
            ['id'=>9,  'name'=>'Projects',            'description'=>'New projects and system development initiatives',              'sla_hours'=>120, 'created_at'=>now()],
            ['id'=>10, 'name'=>'General',             'description'=>'Other requests not covered by the above categories',          'sla_hours'=>72,  'created_at'=>now()],
        ]);
    }

    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('request_categories')->delete();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
};
