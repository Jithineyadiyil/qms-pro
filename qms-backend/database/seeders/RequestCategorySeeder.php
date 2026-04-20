<?php
declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RequestCategory;

/**
 * RequestCategorySeeder
 *
 * Seeds the 10 Diamond-QMS aligned request categories.
 * Uses updateOrCreate so it is safe to re-run on an existing database.
 */
class RequestCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Policy & Procedure',   'description' => 'New or updated policies, procedures, and work instructions', 'sla_hours' => 72],
            ['name' => 'Document Control',      'description' => 'Form updates, manuals, and document reviews',                'sla_hours' => 48],
            ['name' => 'Quality & Compliance',  'description' => 'Quality reviews, audits, and ISO 9001 requirements',          'sla_hours' => 48],
            ['name' => 'Regulatory & SLA',      'description' => 'SLA changes and regulatory compliance requests',              'sla_hours' => 24],
            ['name' => 'IT & Cyber Security',   'description' => 'Technology, systems, and cybersecurity requests',             'sla_hours' => 24],
            ['name' => 'HR & Training',         'description' => 'Human resources and training & development requests',         'sla_hours' => 96],
            ['name' => 'Operations',            'description' => 'Day-to-day unregulated and operational process work',         'sla_hours' => 72],
            ['name' => 'Analysis & KPI',        'description' => 'Issue analysis, KPI measurement, and performance reporting',  'sla_hours' => 48],
            ['name' => 'Projects',              'description' => 'New projects and system development initiatives',              'sla_hours' => 120],
            ['name' => 'General',               'description' => 'Other requests not covered by the above categories',          'sla_hours' => 72],
        ];

        // Remove old categories that no longer exist (safe — only removes if no FK references)
        $newNames = array_column($categories, 'name');
        RequestCategory::whereNotIn('name', $newNames)->doesntHave('requests')->delete();

        // Upsert by name — preserves IDs if names match
        foreach ($categories as $cat) {
            RequestCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        $this->command->info('✅ Request categories seeded (10 Diamond-QMS categories)');
    }
}
