<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AuditSeeder extends Seeder {
    public function run(): void {
        $now = now();
        DB::table('audit_programs')->insertOrIgnore([
            ['id'=>1,'name'=>'Annual Audit Programme 2024','description'=>'Comprehensive internal audit programme covering all ISO 9001:2015 clauses and key business processes.','year'=>2024,'status'=>'active','created_by_id'=>2,'created_at'=>$now],
        ]);

        DB::table('audits')->insertOrIgnore([
            ['reference_no'=>'AUD-2024-0001','program_id'=>1,'title'=>'Q1 QMS Compliance Audit - Operations','type'=>'internal','scope'=>'Review of Operations department QMS compliance including claims processing, document control, and staff competency.','criteria'=>'ISO 9001:2015 Clauses 7, 8, 9','lead_auditor_id'=>8,'department_id'=>2,'status'=>'report_issued','planned_start_date'=>'2024-01-15','planned_end_date'=>'2024-01-17','actual_start_date'=>'2024-01-15','actual_end_date'=>'2024-01-17','report_date'=>'2024-01-22','overall_result'=>'minor_findings','executive_summary'=>'Overall QMS compliance is satisfactory. One major and two minor non-conformances identified, primarily related to audit trail documentation and record keeping.','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'AUD-2024-0002','program_id'=>1,'title'=>'IT Security & Data Protection Audit','type'=>'compliance','scope'=>'Assessment of IT security controls, data protection practices, and alignment with PDPA requirements.','criteria'=>'ISO 27001 Controls, PDPA Article 16-23','lead_auditor_id'=>9,'department_id'=>3,'status'=>'in_progress','planned_start_date'=>'2024-02-01','planned_end_date'=>'2024-02-03','actual_start_date'=>'2024-02-01','actual_end_date'=>null,'created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'AUD-2024-0003','program_id'=>1,'title'=>'Q2 Supplier Audit - Oracle Corporation','type'=>'supplier','scope'=>'Evaluation of Oracle support service delivery, SLA compliance, and account management practices.','criteria'=>'Vendor SLA, ISO 9001 Clause 8.4','lead_auditor_id'=>8,'department_id'=>null,'status'=>'planned','planned_start_date'=>'2024-04-10','planned_end_date'=>'2024-04-10','created_at'=>$now,'updated_at'=>$now],
        ]);

        // Audit team
        DB::table('audit_team')->insertOrIgnore([
            ['audit_id'=>1,'user_id'=>8,'role'=>'lead_auditor'],
            ['audit_id'=>1,'user_id'=>2,'role'=>'observer'],
            ['audit_id'=>2,'user_id'=>9,'role'=>'lead_auditor'],
            ['audit_id'=>2,'user_id'=>3,'role'=>'technical_expert'],
        ]);

        // Findings for AUD-2024-0001
        DB::table('audit_findings')->insertOrIgnore([
            ['audit_id'=>1,'reference_no'=>'AUD-2024-0001-F01','finding_type'=>'major_nc','description'=>'Audit trail records missing for claims processed Dec 10-15. Violates ISO 9001 clause 9.1.3 record retention requirements.','requirement_ref'=>'ISO 9001:2015 Clause 9.1.3','department_id'=>3,'assignee_id'=>5,'status'=>'capa_raised','capa_id'=>1,'created_at'=>$now],
            ['audit_id'=>1,'reference_no'=>'AUD-2024-0001-F02','finding_type'=>'minor_nc','description'=>'3 of 12 sampled controlled documents not signed by approver. Document control procedure requires approval signatures.','requirement_ref'=>'ISO 9001:2015 Clause 7.5.2','department_id'=>2,'assignee_id'=>4,'status'=>'open','created_at'=>$now],
            ['audit_id'=>1,'reference_no'=>'AUD-2024-0001-F03','finding_type'=>'positive','description'=>'Operations team demonstrates excellent understanding of process metrics. KPIs consistently tracked and acted upon.','requirement_ref'=>'ISO 9001:2015 Clause 9.1','department_id'=>2,'status'=>'closed','created_at'=>$now],
        ]);
    }
}
