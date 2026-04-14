<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OkrSeeder extends Seeder {
    public function run(): void {
        $now = now();
        // Company-level objective
        DB::table('objectives')->insertOrIgnore([
            ['id'=>1,'title'=>'Achieve ISO 9001:2015 Recertification','description'=>'Successfully pass the ISO 9001 surveillance audit with zero major non-conformances.','owner_id'=>2,'department_id'=>1,'type'=>'company','status'=>'active','period_start'=>'2024-01-01','period_end'=>'2024-12-31','progress_percent'=>35,'created_at'=>$now,'updated_at'=>$now],
            ['id'=>2,'title'=>'Reduce Customer Complaints by 40%','description'=>'Drive down complaint volume through proactive quality improvement and better SLA management.','owner_id'=>2,'department_id'=>8,'type'=>'company','status'=>'active','period_start'=>'2024-01-01','period_end'=>'2024-12-31','progress_percent'=>20,'created_at'=>$now,'updated_at'=>$now],
            ['id'=>3,'title'=>'Improve IT System Reliability','description'=>'Achieve 99.5% system uptime and reduce incident resolution time.','owner_id'=>5,'department_id'=>3,'type'=>'department','status'=>'active','period_start'=>'2024-01-01','period_end'=>'2024-12-31','progress_percent'=>60,'parent_id'=>null,'created_at'=>$now,'updated_at'=>$now],
        ]);

        DB::table('key_results')->insertOrIgnore([
            // OBJ 1
            ['objective_id'=>1,'title'=>'Complete all planned internal audits','owner_id'=>8,'metric_type'=>'number','start_value'=>0,'target_value'=>12,'current_value'=>2,'status'=>'on_track','unit'=>'audits','created_at'=>$now,'updated_at'=>$now],
            ['objective_id'=>1,'title'=>'Close all open NCs before surveillance audit','owner_id'=>2,'metric_type'=>'percentage','start_value'=>0,'target_value'=>100,'current_value'=>40,'status'=>'on_track','unit'=>'%','created_at'=>$now,'updated_at'=>$now],
            ['objective_id'=>1,'title'=>'Staff QMS training completion rate','owner_id'=>6,'metric_type'=>'percentage','start_value'=>60,'target_value'=>100,'current_value'=>72,'status'=>'on_track','unit'=>'%','created_at'=>$now,'updated_at'=>$now],
            // OBJ 2
            ['objective_id'=>2,'title'=>'Reduce monthly complaint volume','owner_id'=>13,'metric_type'=>'number','start_value'=>18,'target_value'=>11,'current_value'=>16,'status'=>'at_risk','unit'=>'complaints/month','created_at'=>$now,'updated_at'=>$now],
            ['objective_id'=>2,'title'=>'Achieve SLA compliance rate >= 95%','owner_id'=>13,'metric_type'=>'percentage','start_value'=>72,'target_value'=>95,'current_value'=>78,'status'=>'at_risk','unit'=>'%','created_at'=>$now,'updated_at'=>$now],
            // OBJ 3
            ['objective_id'=>3,'title'=>'System uptime percentage','owner_id'=>5,'metric_type'=>'percentage','start_value'=>97.5,'target_value'=>99.5,'current_value'=>99.1,'status'=>'on_track','unit'=>'%','created_at'=>$now,'updated_at'=>$now],
            ['objective_id'=>3,'title'=>'Mean Time to Resolve (MTTR) reduction','owner_id'=>5,'metric_type'=>'number','start_value'=>6.5,'target_value'=>3.0,'current_value'=>4.2,'status'=>'on_track','unit'=>'hours','created_at'=>$now,'updated_at'=>$now],
        ]);
    }
}
