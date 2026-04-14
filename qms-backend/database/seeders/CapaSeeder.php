<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CapaSeeder extends Seeder {
    public function run(): void {
        $now = now();
        DB::table('capas')->insertOrIgnore([
            ['reference_no'=>'CAPA-2024-0001','nc_id'=>1,'title'=>'Restore and Validate Audit Logging System','description'=>'Corrective action to restore audit trail functionality and validate all claims processed during the outage period.','type'=>'corrective','owner_id'=>5,'department_id'=>3,'status'=>'in_progress','priority'=>'high','proposed_date'=>'2024-01-10','target_date'=>'2024-02-15','root_cause_analysis'=>'Audit logging disabled during patch deployment due to missing checklist item in change management procedure.','action_plan'=>'1. Restore audit log system. 2. Re-process affected claims manually. 3. Update change management checklist. 4. Retrain IT team.','effectiveness_criteria'=>'Zero audit trail gaps in 30-day post-implementation review.','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'CAPA-2024-0002','nc_id'=>3,'title'=>'Customer Service Capacity & Automation Improvement','description'=>'Address SLA breach through workforce planning and automated ticket routing implementation.','type'=>'corrective','owner_id'=>13,'department_id'=>8,'status'=>'open','priority'=>'critical','proposed_date'=>'2024-01-18','target_date'=>'2024-03-31','root_cause_analysis'=>'Insufficient headcount for peak volumes. No predictive staffing model. Manual ticket routing causing delays.','action_plan'=>'1. Hire 3 additional CS agents. 2. Implement automated routing rules. 3. Establish peak-season staffing model.','effectiveness_criteria'=>'SLA compliance rate >= 95% for 3 consecutive months.','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'CAPA-2024-0003','nc_id'=>5,'title'=>'DR/BCP Documentation and Testing','description'=>'Preventive action to improve disaster recovery documentation and conduct quarterly DR tests.','type'=>'preventive','owner_id'=>5,'department_id'=>3,'status'=>'closed','priority'=>'critical','proposed_date'=>'2024-01-07','target_date'=>'2024-01-25','actual_completion_date'=>'2024-01-22','root_cause_analysis'=>'Backup documentation was outdated. DR runbook not reviewed since 2021.','action_plan'=>'1. Update DR runbook. 2. Conduct tabletop exercise. 3. Schedule quarterly DR tests.','effectiveness_criteria'=>'Successful DR test with RTO < 4 hours.','effectiveness_result'=>'DR test conducted Jan 20 - RTO achieved in 2.8 hours. All documentation updated.','effectiveness_verified_by_id'=>2,'effectiveness_verified_at'=>$now->copy()->subDays(3),'created_at'=>$now,'updated_at'=>$now],
        ]);

        // CAPA Tasks
        DB::table('capa_tasks')->insertOrIgnore([
            ['capa_id'=>1,'task_description'=>'Restore audit logging service and validate connectivity','responsible_id'=>11,'due_date'=>'2024-01-25','status'=>'completed','completion_notes'=>'Logging service restored and verified on Jan 23.','completed_at'=>$now->copy()->subDays(8),'created_at'=>$now->copy()->subDays(20)],
            ['capa_id'=>1,'task_description'=>'Manual review and re-processing of 23 affected claims','responsible_id'=>11,'due_date'=>'2024-01-31','status'=>'in_progress','created_at'=>$now->copy()->subDays(20)],
            ['capa_id'=>1,'task_description'=>'Update change management checklist with logging verification step','responsible_id'=>5,'due_date'=>'2024-02-10','status'=>'pending','created_at'=>$now->copy()->subDays(20)],
            ['capa_id'=>2,'task_description'=>'Post job descriptions for 3 Customer Service Agent roles','responsible_id'=>6,'due_date'=>'2024-02-01','status'=>'completed','completion_notes'=>'Job postings live on LinkedIn and Bayt.com','completed_at'=>$now->copy()->subDays(5),'created_at'=>$now->copy()->subDays(15)],
            ['capa_id'=>2,'task_description'=>'Configure automated ticket routing rules in CRM','responsible_id'=>5,'due_date'=>'2024-02-28','status'=>'in_progress','created_at'=>$now->copy()->subDays(15)],
        ]);
    }
}
