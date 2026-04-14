<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VendorContractSeeder extends Seeder {
    public function run(): void {
        $now = now();
        // Get vendor IDs and owner IDs
        $vendors = DB::table('vendors')->pluck('id');
        $owner = DB::table('users')->first()?->id ?? 1;
        if ($vendors->isEmpty()) return;

        $contracts = [
            ['contract_no'=>'CON-2024-0001','title'=>'IT Infrastructure Maintenance Agreement','type'=>'maintenance','value'=>250000,'currency'=>'SAR','start_date'=>'2024-01-01','end_date'=>'2024-12-31','status'=>'active'],
            ['contract_no'=>'CON-2024-0002','title'=>'Cybersecurity Consulting Services','type'=>'service','value'=>180000,'currency'=>'SAR','start_date'=>'2024-02-01','end_date'=>'2024-07-31','status'=>'expired'],
            ['contract_no'=>'CON-2025-0001','title'=>'Cloud Hosting & Support SLA','type'=>'service','value'=>420000,'currency'=>'SAR','start_date'=>'2025-01-01','end_date'=>'2025-12-31','status'=>'active'],
            ['contract_no'=>'CON-2025-0002','title'=>'Legal & Compliance Advisory NDA','type'=>'nda','value'=>60000,'currency'=>'SAR','start_date'=>'2025-03-01','end_date'=>'2026-02-28','status'=>'active'],
            ['contract_no'=>'CON-2025-0003','title'=>'HR Recruitment Partnership Agreement','type'=>'partnership','value'=>95000,'currency'=>'SAR','start_date'=>'2025-06-01','end_date'=>'2026-05-31','status'=>'active'],
            ['contract_no'=>'CON-2026-0001','title'=>'Office Facilities Management Contract','type'=>'supply','value'=>310000,'currency'=>'SAR','start_date'=>'2026-01-01','end_date'=>'2026-12-31','status'=>'active'],
            ['contract_no'=>'CON-2026-0002','title'=>'Marketing & Brand Services Agreement','type'=>'service','value'=>140000,'currency'=>'SAR','start_date'=>'2026-01-15','end_date'=>'2026-12-31','status'=>'active'],
            ['contract_no'=>'CON-2026-0003','title'=>'Software Licensing Agreement — ERP','type'=>'service','value'=>560000,'currency'=>'SAR','start_date'=>'2026-02-01','end_date'=>'2027-01-31','status'=>'active'],
            ['contract_no'=>'CON-2026-0004','title'=>'Insurance Brokerage Platform NDA','type'=>'nda','value'=>null,'currency'=>'SAR','start_date'=>'2026-02-15','end_date'=>'2028-02-14','status'=>'active'],
            ['contract_no'=>'CON-2025-0004','title'=>'HVAC Maintenance Service','type'=>'maintenance','value'=>85000,'currency'=>'SAR','start_date'=>'2025-04-01','end_date'=>'2025-09-30','status'=>'expired'],
        ];

        foreach ($contracts as $i => $c) {
            $c['vendor_id'] = $vendors[$i % $vendors->count()];
            $c['owner_id'] = $owner;
            $c['created_at'] = $now;
            $c['updated_at'] = $now;
            DB::table('vendor_contracts')->insertOrIgnore($c);
        }
    }
}
