<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SlaSeeder extends Seeder {
    public function run(): void {
        $clients = DB::table('clients')->pluck('id');
        if ($clients->isEmpty()) return;

        $slas = [
            ['name'=>'Complaint Resolution SLA','category'=>'Customer Service','client_id'=>$clients[0],'effective_from'=>'2025-01-01','effective_to'=>'2025-12-31','status'=>'active','response_time_hours'=>4,'resolution_time_hours'=>48,'availability_percent'=>99.0],
            ['name'=>'Policy Processing SLA','category'=>'Policy Admin','client_id'=>$clients[1]??$clients[0],'effective_from'=>'2025-03-01','effective_to'=>'2025-12-31','status'=>'active','response_time_hours'=>8,'resolution_time_hours'=>72,'availability_percent'=>98.5],
            ['name'=>'Claims Response SLA','category'=>'Claims','client_id'=>$clients[2]??$clients[0],'effective_from'=>'2025-01-01','effective_to'=>'2025-06-30','status'=>'active','response_time_hours'=>2,'resolution_time_hours'=>24,'availability_percent'=>99.9],
            ['name'=>'IT Support Response SLA','category'=>'IT','client_id'=>null,'effective_from'=>'2026-01-01','effective_to'=>'2026-12-31','status'=>'active','response_time_hours'=>1,'resolution_time_hours'=>8,'availability_percent'=>99.5],
            ['name'=>'Document Review Turnaround','category'=>'Quality','client_id'=>null,'effective_from'=>'2026-01-15','effective_to'=>'2026-12-31','status'=>'active','response_time_hours'=>24,'resolution_time_hours'=>120,'availability_percent'=>null],
            ['name'=>'Vendor Evaluation SLA','category'=>'Procurement','client_id'=>null,'effective_from'=>'2026-02-01','effective_to'=>'2026-12-31','status'=>'active','response_time_hours'=>48,'resolution_time_hours'=>336,'availability_percent'=>null],
        ];

        DB::table('sla_definitions')->insertOrIgnore($slas);
    }
}
