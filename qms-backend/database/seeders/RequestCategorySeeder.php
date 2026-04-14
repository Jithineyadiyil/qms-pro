<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RequestCategory;

class RequestCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'IT Support',       'description' => 'Hardware, software, and network support',   'sla_hours' => 24],
            ['name' => 'HR Request',        'description' => 'Leave, benefits, and HR-related requests',  'sla_hours' => 48],
            ['name' => 'Procurement',       'description' => 'Purchase orders and supplier requests',     'sla_hours' => 72],
            ['name' => 'Quality Review',    'description' => 'Quality assessment and verification',       'sla_hours' => 48],
            ['name' => 'Compliance',        'description' => 'Regulatory and compliance requests',        'sla_hours' => 24],
            ['name' => 'Training',          'description' => 'Training and development requests',         'sla_hours' => 96],
            ['name' => 'Facilities',        'description' => 'Facilities and infrastructure requests',    'sla_hours' => 48],
            ['name' => 'Finance Approval',  'description' => 'Budget and financial approval requests',    'sla_hours' => 48],
            ['name' => 'Policy Update',     'description' => 'Policy review and update requests',         'sla_hours' => 72],
            ['name' => 'Access Management', 'description' => 'System access and permissions requests',    'sla_hours' => 24],
        ];

        foreach ($categories as $cat) {
            RequestCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        $this->command->info('✅ Request categories seeded');
    }
}
