<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RequestSeeder extends Seeder {
    public function run(): void {
        $now = now();
        $requests = [
            // id, ref, title, desc, cat, requester, assignee, dept, priority, status, type, due_date
            [1,'REQ-2024-0001','Laptop Replacement for Finance Team','Current laptops in Finance are 5+ years old and causing productivity issues.',1,12,null,4,'high','submitted','internal','2024-02-15'],
            [2,'REQ-2024-0002','ISO 9001 Internal Audit Scheduling','Need to schedule Q1 internal audit for QA department.',4,2,8,1,'medium','approved','internal','2024-02-01'],
            [3,'REQ-2024-0003','Employee Training - Data Privacy','Mandatory PDPA awareness training for all staff.',6,6,null,5,'medium','in_progress','internal','2024-03-01'],
            [4,'REQ-2024-0004','Office Renovation - 3rd Floor','The 3rd floor meeting rooms require refurbishment.',7,4,null,2,'low','draft','internal',null],
            [5,'REQ-2024-0005','Regulatory Filing - SAMA Q4 Report','Quarterly compliance report submission to SAMA.',5,3,2,7,'critical','pending_approval','regulatory','2024-01-31'],
            [6,'REQ-2024-0006','New HR Policy Review','Review and update the Remote Work Policy document.',2,6,2,5,'medium','in_review','internal','2024-02-28'],
            [7,'REQ-2024-0007','Client Portal Enhancement Request','SABIC has requested additional reporting features in the portal.',1,7,5,6,'high','submitted','client','2024-02-20'],
            [8,'REQ-2024-0008','Vendor Qualification - Tahakom Digital','Initiate qualification process for new digital marketing vendor.',3,7,2,6,'medium','in_progress','vendor','2024-03-15'],
            [9,'REQ-2024-0009','Access Control System Upgrade','Upgrade physical access control system in server room.',1,5,null,3,'critical','submitted','internal','2024-01-25'],
            [10,'REQ-2024-0010','Annual Quality Report - 2023','Prepare and circulate the annual quality performance report.',4,2,null,1,'high','closed','internal','2024-01-31'],
        ];

        foreach ($requests as $r) {
            DB::table('requests')->insertOrIgnore([
                'id'           => $r[0],
                'reference_no' => $r[1],
                'title'        => $r[2],
                'description'  => $r[3],
                'category_id'  => $r[4],
                'requester_id' => $r[5],
                'assignee_id'  => $r[6],
                'department_id'=> $r[7],
                'priority'     => $r[8],
                'status'       => $r[9],
                'type'         => $r[10],
                'due_date'     => $r[11],
                'closed_at'    => $r[9] === 'closed' ? $now : null,
                'resolution'   => $r[9] === 'closed' ? 'Annual quality report successfully prepared and distributed to all stakeholders.' : null,
                'created_at'   => $now->copy()->subDays(rand(5,30)),
                'updated_at'   => $now,
            ]);
        }

        // Sample comments
        DB::table('request_comments')->insertOrIgnore([
            ['request_id'=>1,'user_id'=>12,'comment'=>'The Dell Latitude models have been identified as suitable replacements. Estimated cost: SAR 15,000.','is_internal'=>0,'created_at'=>$now->copy()->subDays(2)],
            ['request_id'=>1,'user_id'=>2, 'comment'=>'Please provide the IT asset replacement policy for justification.','is_internal'=>1,'created_at'=>$now->copy()->subDays(1)],
            ['request_id'=>5,'user_id'=>3, 'comment'=>'SAMA portal submission confirmed. Reference number: SAMA-2024-Q4-001892.','is_internal'=>0,'created_at'=>$now->copy()->subDays(3)],
            ['request_id'=>7,'user_id'=>7, 'comment'=>'SABIC requirements document attached. Development estimated at 3 weeks.','is_internal'=>0,'created_at'=>$now->copy()->subDays(1)],
        ]);

        // Approval record for REQ-0005
        DB::table('request_approvals')->insertOrIgnore([
            ['request_id'=>5,'approver_id'=>2,'sequence'=>1,'status'=>'pending','comments'=>null,'decided_at'=>null,'created_at'=>$now->copy()->subDays(1)],
        ]);
    }
}
