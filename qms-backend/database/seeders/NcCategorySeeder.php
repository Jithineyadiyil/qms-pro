<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\NcCategory;

class NcCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Process Non-Conformance',   'description' => 'Deviations from defined processes and procedures',        'severity_default' => 'minor'],
            ['name' => 'Product / Service Quality', 'description' => 'Quality failures in products or services delivered',       'severity_default' => 'major'],
            ['name' => 'Documentation',             'description' => 'Documentation errors, gaps, or missing records',           'severity_default' => 'minor'],
            ['name' => 'Regulatory Compliance',     'description' => 'Breaches of regulatory or statutory requirements',        'severity_default' => 'critical'],
            ['name' => 'Customer Requirement',      'description' => 'Failure to meet agreed customer requirements',             'severity_default' => 'major'],
            ['name' => 'Supplier / Vendor Issue',   'description' => 'Non-conformances originating from external suppliers',     'severity_default' => 'major'],
            ['name' => 'Safety & Environment',      'description' => 'Health, safety, or environmental non-conformances',        'severity_default' => 'critical'],
            ['name' => 'Training & Competency',     'description' => 'Staff competency or training gaps identified',             'severity_default' => 'minor'],
            ['name' => 'Equipment & Calibration',   'description' => 'Faulty or uncalibrated measurement equipment',             'severity_default' => 'major'],
        ];

        foreach ($categories as $cat) {
            NcCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        $this->command->info('✅ NC categories seeded');
    }
}
