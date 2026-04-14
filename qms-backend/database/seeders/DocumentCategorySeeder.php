<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DocumentCategory;

class DocumentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Policies',           'code' => 'POL', 'parent_id' => null],
            ['name' => 'Procedures',         'code' => 'PRO', 'parent_id' => null],
            ['name' => 'Work Instructions',  'code' => 'WI',  'parent_id' => null],
            ['name' => 'Forms & Templates',  'code' => 'FT',  'parent_id' => null],
            ['name' => 'Manuals',            'code' => 'MAN', 'parent_id' => null],
            ['name' => 'Reports',            'code' => 'RPT', 'parent_id' => null],
            ['name' => 'Contracts',          'code' => 'CON', 'parent_id' => null],
            ['name' => 'Standards',          'code' => 'STD', 'parent_id' => null],
        ];

        foreach ($categories as $cat) {
            DocumentCategory::updateOrCreate(['code' => $cat['code']], $cat);
        }

        $this->command->info('✅ Document categories seeded');
    }
}
