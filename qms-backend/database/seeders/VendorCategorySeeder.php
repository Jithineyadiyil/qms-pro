<?php
declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * VendorCategorySeeder — always seeds all 8 Diamond vendor categories.
 * Safe to re-run (DELETE + INSERT, FK-safe since no vendors assigned yet on fresh install).
 */
class VendorCategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('vendor_categories')->delete();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        DB::table('vendor_categories')->insert([
            ['name' => 'Technology & Software',      'description' => 'IT products, software, and SaaS vendors'],
            ['name' => 'Professional Services',       'description' => 'Consulting, advisory, and professional services'],
            ['name' => 'Facility Management',         'description' => 'Building, maintenance, and facility services'],
            ['name' => 'Logistics & Transport',       'description' => 'Shipping, courier, and logistics providers'],
            ['name' => 'Marketing & Communications',  'description' => 'Marketing agencies and media companies'],
            ['name' => 'Financial Services',          'description' => 'Banking, insurance, and financial providers'],
            ['name' => 'Training & Development',      'description' => 'Training providers and e-learning platforms'],
            ['name' => 'Legal Services',              'description' => 'Law firms and legal advisory services'],
        ]);

        $this->command->info('✅ Vendor categories seeded (8 categories)');
    }
}
