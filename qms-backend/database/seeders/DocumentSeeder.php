<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentSeeder extends Seeder {
    public function run(): void {
        $now = now();

        // dept IDs: 1=QA, 2=Operations, 3=IT, 4=Finance, 5=HR, 6=Sales&Marketing, 7=Compliance&Risk, 8=Customer Service
        DB::table('documents')->insertOrIgnore([
            ['document_no'=>'POL-001','title'=>'Quality Management Policy',           'category_id'=>1,'owner_id'=>2,'reviewer_id'=>3,'approver_id'=>1,'department_id'=>1,'type'=>'policy',          'status'=>'approved',     'version'=>'3.1','effective_date'=>'2024-01-01','review_date'=>'2025-01-01','is_controlled'=>1,'requires_signature'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'POL-002','title'=>'Information Security Policy',         'category_id'=>1,'owner_id'=>5,'reviewer_id'=>2,'approver_id'=>1,'department_id'=>1,'type'=>'policy',          'status'=>'approved',     'version'=>'2.0','effective_date'=>'2024-01-01','review_date'=>'2025-01-01','is_controlled'=>1,'requires_signature'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'POL-003','title'=>'Data Privacy and Protection Policy',  'category_id'=>1,'owner_id'=>3,'reviewer_id'=>2,'approver_id'=>1,'department_id'=>1,'type'=>'policy',          'status'=>'approved',     'version'=>'1.2','effective_date'=>'2023-06-01','review_date'=>'2024-06-01','is_controlled'=>1,'requires_signature'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'PRO-001','title'=>'Document Control Procedure',          'category_id'=>2,'owner_id'=>2,'reviewer_id'=>8,'approver_id'=>2,'department_id'=>1,'type'=>'procedure',       'status'=>'approved',     'version'=>'2.3','effective_date'=>'2023-09-01','review_date'=>'2024-09-01','is_controlled'=>1,'requires_signature'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'PRO-002','title'=>'Non-Conformance and CAPA Procedure',  'category_id'=>2,'owner_id'=>2,'reviewer_id'=>8,'approver_id'=>2,'department_id'=>1,'type'=>'procedure',       'status'=>'approved',     'version'=>'1.5','effective_date'=>'2023-01-01','review_date'=>'2024-01-01','is_controlled'=>1,'requires_signature'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'PRO-003','title'=>'Internal Audit Procedure',            'category_id'=>2,'owner_id'=>8,'reviewer_id'=>2,'approver_id'=>2,'department_id'=>1,'type'=>'procedure',       'status'=>'approved',     'version'=>'2.0','effective_date'=>'2023-01-01','review_date'=>'2025-01-01','is_controlled'=>1,'requires_signature'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'WI-001', 'title'=>'Claims Processing Work Instruction',  'category_id'=>3,'owner_id'=>4,'reviewer_id'=>2,'approver_id'=>4,'department_id'=>1,'type'=>'work_instruction','status'=>'approved',     'version'=>'1.1','effective_date'=>'2023-04-01','review_date'=>'2024-04-01','is_controlled'=>1,'requires_signature'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'MAN-001','title'=>'QMS Operations Manual',               'category_id'=>5,'owner_id'=>2,'reviewer_id'=>3,'approver_id'=>1,'department_id'=>1,'type'=>'manual',          'status'=>'approved',     'version'=>'4.0','effective_date'=>'2024-01-01','review_date'=>'2025-01-01','is_controlled'=>1,'requires_signature'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'PRO-004','title'=>'Complaint Handling Procedure',        'category_id'=>2,'owner_id'=>2,'reviewer_id'=>9,'approver_id'=>2,'department_id'=>1,'type'=>'procedure',       'status'=>'under_review', 'version'=>'1.3','effective_date'=>null,         'review_date'=>'2024-02-01','is_controlled'=>1,'requires_signature'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['document_no'=>'FRM-001','title'=>'NC Report Form Template',             'category_id'=>4,'owner_id'=>2,'reviewer_id'=>null,'approver_id'=>null,'department_id'=>1,'type'=>'form',      'status'=>'approved',     'version'=>'1.0','effective_date'=>'2023-01-01','review_date'=>'2025-01-01','is_controlled'=>0,'requires_signature'=>0,'created_at'=>$now,'updated_at'=>$now],
        ]);

        // Seed department distributions for approved documents
        // POL-001 (id=1): distributed to all depts
        // POL-002 (id=2): IT, Compliance
        // POL-003 (id=3): IT, Compliance, HR
        // PRO-001 (id=4): all depts (doc control applies everywhere)
        // PRO-002 (id=5): all depts (NC/CAPA awareness)
        // PRO-003 (id=6): all depts (audit applies everywhere)
        // WI-001  (id=7): Operations only
        // MAN-001 (id=8): all depts
        // FRM-001 (id=10): all depts
        $distributions = [
            // POL-001 → all non-QA depts
            ['document_id'=>1,'department_id'=>2],['document_id'=>1,'department_id'=>3],
            ['document_id'=>1,'department_id'=>4],['document_id'=>1,'department_id'=>5],
            ['document_id'=>1,'department_id'=>6],['document_id'=>1,'department_id'=>7],
            ['document_id'=>1,'department_id'=>8],
            // POL-002 → IT, Compliance
            ['document_id'=>2,'department_id'=>3],['document_id'=>2,'department_id'=>7],
            // POL-003 → IT, Compliance, HR
            ['document_id'=>3,'department_id'=>3],['document_id'=>3,'department_id'=>7],['document_id'=>3,'department_id'=>5],
            // PRO-001 → all
            ['document_id'=>4,'department_id'=>2],['document_id'=>4,'department_id'=>3],
            ['document_id'=>4,'department_id'=>4],['document_id'=>4,'department_id'=>5],
            ['document_id'=>4,'department_id'=>6],['document_id'=>4,'department_id'=>7],
            ['document_id'=>4,'department_id'=>8],
            // PRO-002 → all
            ['document_id'=>5,'department_id'=>2],['document_id'=>5,'department_id'=>3],
            ['document_id'=>5,'department_id'=>4],['document_id'=>5,'department_id'=>5],
            ['document_id'=>5,'department_id'=>6],['document_id'=>5,'department_id'=>7],
            ['document_id'=>5,'department_id'=>8],
            // PRO-003 → all
            ['document_id'=>6,'department_id'=>2],['document_id'=>6,'department_id'=>3],
            ['document_id'=>6,'department_id'=>4],['document_id'=>6,'department_id'=>5],
            ['document_id'=>6,'department_id'=>6],['document_id'=>6,'department_id'=>7],
            ['document_id'=>6,'department_id'=>8],
            // WI-001 → Operations only
            ['document_id'=>7,'department_id'=>2],
            // MAN-001 → all
            ['document_id'=>8,'department_id'=>2],['document_id'=>8,'department_id'=>3],
            ['document_id'=>8,'department_id'=>4],['document_id'=>8,'department_id'=>5],
            ['document_id'=>8,'department_id'=>6],['document_id'=>8,'department_id'=>7],
            ['document_id'=>8,'department_id'=>8],
            // FRM-001 → all
            ['document_id'=>10,'department_id'=>2],['document_id'=>10,'department_id'=>3],
            ['document_id'=>10,'department_id'=>4],['document_id'=>10,'department_id'=>5],
            ['document_id'=>10,'department_id'=>6],['document_id'=>10,'department_id'=>7],
            ['document_id'=>10,'department_id'=>8],
        ];

        foreach ($distributions as $dist) {
            DB::table('document_departments')->insertOrIgnore(array_merge($dist, ['distributed_at' => $now]));
        }
    }
}
