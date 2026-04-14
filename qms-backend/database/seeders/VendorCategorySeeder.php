<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\VendorCategory;

class VendorCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Technology & Software',       'description' => 'IT products and software vendors'],
            ['name' => 'Professional Services',        'description' => 'Consulting, advisory, and professional services'],
            ['name' => 'Facility Management',          'description' => 'Building, maintenance, and facility services'],
            ['name' => 'Logistics & Transport',        'description' => 'Shipping, courier, and logistics providers'],
            ['name' => 'Marketing & Communications',   'description' => 'Marketing agencies and media companies'],
            ['name' => 'Financial Services',           'description' => 'Banking, insurance, and financial providers'],
            ['name' => 'Training & Development',       'description' => 'Training providers and e-learning platforms'],
            ['name' => 'Legal Services',               'description' => 'Law firms and legal advisory services'],
        ];

        foreach ($categories as $cat) {
            VendorCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        $this->command->info('✅ Vendor categories seeded');
    }
}
