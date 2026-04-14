<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder {
    public function run(): void {
        DB::table('departments')->insertOrIgnore([
            ['name'=>'Quality Assurance',    'code'=>'QA'],
            ['name'=>'Operations',           'code'=>'OPS'],
            ['name'=>'Information Technology','code'=>'IT'],
            ['name'=>'Finance',              'code'=>'FIN'],
            ['name'=>'Human Resources',      'code'=>'HR'],
            ['name'=>'Sales & Marketing',    'code'=>'SM'],
            ['name'=>'Compliance & Risk',    'code'=>'CR'],
            ['name'=>'Customer Service',     'code'=>'CS'],
        ]);
    }
}
