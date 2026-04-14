<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RiskCategory;

class RiskCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Strategic Risk',          'description' => 'Risks to strategic objectives and organisational direction'],
            ['name' => 'Operational Risk',         'description' => 'Risks in day-to-day operational activities'],
            ['name' => 'Financial Risk',            'description' => 'Financial exposure, losses, and cash-flow risks'],
            ['name' => 'Compliance & Legal Risk',   'description' => 'Regulatory, legal, and contractual exposure'],
            ['name' => 'Technology & Cyber Risk',   'description' => 'IT infrastructure and cybersecurity threats'],
            ['name' => 'Reputational Risk',         'description' => 'Brand image and reputational damage risks'],
            ['name' => 'Environmental Risk',        'description' => 'Environmental and sustainability exposure'],
            ['name' => 'People & HR Risk',          'description' => 'Talent retention, succession, and HR-related risks'],
            ['name' => 'Supply Chain Risk',         'description' => 'Supplier dependency and supply chain disruptions'],
        ];

        foreach ($categories as $cat) {
            RiskCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        $this->command->info('✅ Risk categories seeded');
    }
}
