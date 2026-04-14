<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ClientSeeder extends Seeder {
    public function run(): void {
        $now = now();
        DB::table('clients')->insertOrIgnore([
            ['name'=>'Al-Rajhi Insurance Co.', 'code'=>'ARI','type'=>'insurer','industry'=>'Insurance','contact_name'=>'Faisal Al-Rajhi','contact_email'=>'faisal@alrajhi-ins.com','contact_phone'=>'+966 11 234 5678','country'=>'Saudi Arabia','account_manager_id'=>7,'status'=>'active','created_at'=>$now,'updated_at'=>$now],
            ['name'=>'SABIC Industries',        'code'=>'SAB','type'=>'client', 'industry'=>'Petrochemical','contact_name'=>'Dr. Waleed Hamdan','contact_email'=>'w.hamdan@sabic.com','contact_phone'=>'+966 13 345 6789','country'=>'Saudi Arabia','account_manager_id'=>7,'status'=>'active','created_at'=>$now,'updated_at'=>$now],
            ['name'=>'Saudi ARAMCO',            'code'=>'SAR','type'=>'client', 'industry'=>'Oil & Gas',    'contact_name'=>'Eng. Nasser Al-Dossary','contact_email'=>'n.aldossary@aramco.com','contact_phone'=>'+966 13 456 7890','country'=>'Saudi Arabia','account_manager_id'=>7,'status'=>'active','created_at'=>$now,'updated_at'=>$now],
            ['name'=>'SAMA (Central Bank)',     'code'=>'SAM','type'=>'regulator','industry'=>'Financial Regulation','contact_name'=>'Regulatory Affairs','contact_email'=>'qa@sama.gov.sa','contact_phone'=>'+966 11 462 2222','country'=>'Saudi Arabia','account_manager_id'=>3,'status'=>'active','created_at'=>$now,'updated_at'=>$now],
            ['name'=>'Gulf Medical Group',      'code'=>'GMG','type'=>'client', 'industry'=>'Healthcare',   'contact_name'=>'Dr. Aisha Al-Mansouri','contact_email'=>'a.mansouri@gulfmed.com','contact_phone'=>'+971 4 234 5678','country'=>'UAE','account_manager_id'=>7,'status'=>'active','created_at'=>$now,'updated_at'=>$now],
            ['name'=>'TechPark Solutions',      'code'=>'TPS','type'=>'partner','industry'=>'Technology',   'contact_name'=>'James Wong','contact_email'=>'james.wong@techpark.io','contact_phone'=>'+65 6234 5678','country'=>'Singapore','account_manager_id'=>7,'status'=>'prospect','created_at'=>$now,'updated_at'=>$now],
        ]);
    }
}
