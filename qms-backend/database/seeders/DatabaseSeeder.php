<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder {
    public function run(): void {
        $this->call([
            RoleSeeder::class,
            DepartmentSeeder::class,
            UserSeeder::class,
            CategorySeeder::class,
            ClientSeeder::class,
            VendorSeeder::class,
            VendorContractSeeder::class,
            RequestCategorySeeder::class,
            RequestSeeder::class,
            NonconformanceSeeder::class,
            CapaSeeder::class,
            RiskSeeder::class,
            DocumentSeeder::class,
            AuditSeeder::class,
            VisitSeeder::class,
            SlaSeeder::class,
            ComplaintSeeder::class,
            OkrSeeder::class,
            SurveySeeder::class,
            AdminSeeder::class,
        ]);
    }
}
