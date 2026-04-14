<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RiskSeeder extends Seeder {
    public function run(): void {
        $now = now();
        DB::table('risks')->insertOrIgnore([
            ['reference_no'=>'RSK-2024-0001','title'=>'Cybersecurity Breach via Phishing Attack','description'=>'Risk of employee credentials being compromised through targeted phishing, leading to data breach.','category_id'=>5,'owner_id'=>5,'department_id'=>3,'type'=>'technical','status'=>'treatment_in_progress','likelihood'=>4,'impact'=>5,'residual_likelihood'=>2,'residual_impact'=>4,'treatment_strategy'=>'mitigate','treatment_plan'=>'1. Deploy advanced email filtering. 2. Mandatory phishing awareness training. 3. MFA enforcement for all systems.','review_date'=>'2024-01-15','next_review_date'=>'2024-04-15','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'RSK-2024-0002','title'=>'Key Person Dependency - QA Function','description'=>'Over-reliance on single QA Manager for ISO compliance knowledge. Risk of knowledge loss if role vacates.','category_id'=>2,'owner_id'=>2,'department_id'=>1,'type'=>'operational','status'=>'assessed','likelihood'=>3,'impact'=>4,'residual_likelihood'=>2,'residual_impact'=>3,'treatment_strategy'=>'mitigate','treatment_plan'=>'1. Document all QA processes. 2. Cross-train QA team members. 3. Implement succession planning.','review_date'=>'2024-02-01','next_review_date'=>'2024-05-01','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'RSK-2024-0003','title'=>'Regulatory Non-Compliance - PDPA','description'=>'Risk of violating Personal Data Protection Act due to inadequate data management practices.','category_id'=>4,'owner_id'=>3,'department_id'=>7,'type'=>'compliance','status'=>'treatment_in_progress','likelihood'=>3,'impact'=>5,'residual_likelihood'=>2,'residual_impact'=>4,'treatment_strategy'=>'mitigate','treatment_plan'=>'1. Complete data inventory audit. 2. Implement data classification policy. 3. Staff training.','review_date'=>'2024-01-20','next_review_date'=>'2024-04-20','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'RSK-2024-0004','title'=>'Client Concentration Risk','description'=>'Three clients account for 65% of revenue. Loss of any one client would significantly impact business.','category_id'=>1,'owner_id'=>7,'department_id'=>6,'type'=>'strategic','status'=>'monitored','likelihood'=>2,'impact'=>5,'residual_likelihood'=>2,'residual_impact'=>4,'treatment_strategy'=>'mitigate','treatment_plan'=>'1. New business development program. 2. Client retention strategy. 3. Revenue diversification targets in OKRs.','review_date'=>'2024-03-01','next_review_date'=>'2024-06-01','created_at'=>$now,'updated_at'=>$now],
            ['reference_no'=>'RSK-2024-0005','title'=>'Third-Party Vendor Failure - IT Systems','description'=>'Risk of IT service disruption due to failure or insolvency of primary IT managed services vendor.','category_id'=>2,'owner_id'=>5,'department_id'=>3,'type'=>'operational','status'=>'identified','likelihood'=>2,'impact'=>4,'treatment_strategy'=>'transfer','treatment_plan'=>'1. Review vendor financial stability. 2. Ensure contractual SLA penalties. 3. Identify backup vendor options.','review_date'=>'2024-02-15','next_review_date'=>'2024-05-15','created_at'=>$now,'updated_at'=>$now],
        ]);

        // Risk Controls
        DB::table('risk_controls')->insertOrIgnore([
            ['risk_id'=>1,'control_description'=>'Advanced email gateway with AI-based phishing detection deployed','control_type'=>'preventive','owner_id'=>5,'effectiveness'=>'effective','last_tested_date'=>'2024-01-10','next_test_date'=>'2024-04-10','created_at'=>$now],
            ['risk_id'=>1,'control_description'=>'Multi-factor authentication enforced for all privileged access','control_type'=>'preventive','owner_id'=>5,'effectiveness'=>'effective','last_tested_date'=>'2024-01-05','next_test_date'=>'2024-07-05','created_at'=>$now],
            ['risk_id'=>3,'control_description'=>'Data Protection Impact Assessment (DPIA) process in place','control_type'=>'detective','owner_id'=>3,'effectiveness'=>'partially_effective','last_tested_date'=>'2023-12-01','next_test_date'=>'2024-03-01','created_at'=>$now],
        ]);
    }
}
