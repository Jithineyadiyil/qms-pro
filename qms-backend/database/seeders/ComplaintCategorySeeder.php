<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ComplaintCategory;

class ComplaintCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Service Quality',        'description' => 'Complaints relating to quality of services provided',    'sla_hours' => 48],
            ['name' => 'Billing & Payment',       'description' => 'Financial disputes, billing errors, overcharges',        'sla_hours' => 24],
            ['name' => 'Staff Conduct',           'description' => 'Complaints about employee behaviour or conduct',         'sla_hours' => 72],
            ['name' => 'Process & Procedure',     'description' => 'Issues with internal processes or procedures',           'sla_hours' => 48],
            ['name' => 'System & Technology',     'description' => 'Technology failures affecting service delivery',         'sla_hours' => 24],
            ['name' => 'Communication',           'description' => 'Communication failures or lack of response',             'sla_hours' => 48],
            ['name' => 'Regulatory',              'description' => 'Compliance or regulatory-related complaints',            'sla_hours' => 24],
            ['name' => 'Delay & Turnaround',      'description' => 'SLA breaches and excessive delays',                     'sla_hours' => 48],
            ['name' => 'Data & Privacy',          'description' => 'Data handling, privacy, or confidentiality issues',     'sla_hours' => 24],
        ];

        foreach ($categories as $cat) {
            ComplaintCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        $this->command->info('✅ Complaint categories seeded');
    }
}
