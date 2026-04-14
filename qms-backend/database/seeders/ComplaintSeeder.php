<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComplaintSeeder extends Seeder {
    public function run(): void {
        $now = now();
        DB::table('complaints')->insertOrIgnore([
            ['reference_no'=>'CMP-2024-0001','title'=>'Unacceptable Response Time on Claims','description'=>'Our team submitted 5 urgent claims on Jan 10 and received no acknowledgment within 24 hours. This breaches our SLA agreement.','category_id'=>1,'complainant_type'=>'client','complainant_name'=>'Mohammed Al-Hashim','complainant_email'=>'m.hashim@sabic.com','client_id'=>2,'assignee_id'=>13,'department_id'=>8,'severity'=>'high','status'=>'under_investigation','source'=>'email','received_date'=>'2024-01-12 09:00:00','acknowledged_date'=>'2024-01-12 11:30:00','target_resolution_date'=>'2024-01-26 09:00:00','capa_required'=>1,'capa_id'=>2,'is_regulatory'=>0,'escalation_level'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'CMP-2024-0002','title'=>'Data Privacy Concern - Unauthorized Access','description'=>'We have reason to believe our confidential project data was accessed by an unauthorized third party via your system.','category_id'=>5,'complainant_type'=>'client','complainant_name'=>'Dr. Aisha Al-Mansouri','complainant_email'=>'a.mansouri@gulfmed.com','client_id'=>5,'assignee_id'=>5,'department_id'=>3,'severity'=>'critical','status'=>'escalated','source'=>'email','received_date'=>'2024-01-16 14:00:00','acknowledged_date'=>'2024-01-16 14:45:00','target_resolution_date'=>'2024-01-18 14:00:00','is_regulatory'=>1,'escalation_level'=>2,'escalated_to_id'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'CMP-2024-0003','title'=>'Invoice Discrepancy - Overcharge Q4 2023','description'=>'Our Q4 2023 invoice includes charges for services not rendered. Total discrepancy: SAR 12,500.','category_id'=>2,'complainant_type'=>'client','complainant_name'=>'Finance Department','complainant_email'=>'finance@aramco.com','client_id'=>3,'assignee_id'=>12,'department_id'=>4,'severity'=>'medium','status'=>'pending_resolution','source'=>'email','received_date'=>'2024-01-18 10:00:00','acknowledged_date'=>'2024-01-18 12:00:00','target_resolution_date'=>'2024-01-22 10:00:00','is_regulatory'=>0,'escalation_level'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'CMP-2024-0004','title'=>'Staff Behaviour Complaint','description'=>'During our site visit on Jan 8, one of your customer service staff was dismissive and unhelpful in addressing our technical queries.','category_id'=>3,'complainant_type'=>'client','complainant_name'=>'Eng. Nasser Al-Dossary','complainant_email'=>'n.aldossary@aramco.com','client_id'=>3,'assignee_id'=>6,'department_id'=>8,'severity'=>'medium','status'=>'resolved','source'=>'in_person','received_date'=>'2024-01-09 08:00:00','acknowledged_date'=>'2024-01-09 09:00:00','actual_resolution_date'=>'2024-01-15 16:00:00','resolution'=>'Staff member counselled and provided customer service refresher training. Client acknowledged resolution.','customer_satisfaction'=>4,'is_regulatory'=>0,'escalation_level'=>0,'created_at'=>$now,'updated_at'=>$now],
        ]);

        // Complaint updates
        DB::table('complaint_updates')->insertOrIgnore([
            ['complaint_id'=>1,'user_id'=>13,'update_type'=>'status_change','previous_status'=>'received','new_status'=>'under_investigation','comment'=>'Investigation initiated. Reviewing system logs for the period in question.','notify_complainant'=>1,'created_at'=>$now->copy()->subDays(3)],
            ['complaint_id'=>2,'user_id'=>5, 'update_type'=>'escalation',   'previous_status'=>'acknowledged','new_status'=>'escalated','comment'=>'Escalated to CISO and management due to potential data breach. Security team engaged.','notify_complainant'=>1,'created_at'=>$now->copy()->subDays(2)],
            ['complaint_id'=>4,'user_id'=>6, 'update_type'=>'resolution',   'previous_status'=>'under_investigation','new_status'=>'resolved','comment'=>'Matter resolved. Apology issued to client. Staff has completed refresher training.','notify_complainant'=>1,'created_at'=>$now->copy()->subDays(8)],
        ]);
    }
}
