<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Visit;
use App\Models\VisitParticipant;
use App\Models\VisitFinding;
use App\Models\Client;
use App\Models\User;

class VisitSeeder extends Seeder
{
    public function run(): void
    {
        $qaMgr  = User::where('email', 'qa.manager@qms.com')->first();
        $opsMgr = User::where('email', 'ops.manager@qms.com')->first();
        $admin  = User::where('email', 'admin@qms.com')->first();

        $clients = Client::pluck('id', 'code');

        $visits = [
            [
                'reference_no'  => 'VIS-2024-0001',
                'client_id'     => $clients['ARAMCO'],
                'type'          => 'client_visit',
                'purpose'       => 'Quarterly QMS performance review and SLA compliance discussion. Review of open NCs and CAPA status. Contract renewal discussion for FY2025.',
                'visit_date'    => now()->subDays(10)->toDateString(),
                'visit_time'    => '10:00:00',
                'duration_hours'=> 3.0,
                'location'      => 'Saudi Aramco HQ — Dhahran',
                'is_virtual'    => false,
                'host_id'       => $qaMgr->id,
                'status'        => 'completed',
                'agenda'        => "1. Welcome and introductions\n2. QMS KPI dashboard review\n3. Open NC and CAPA status\n4. SLA performance Q3-2024\n5. Contract renewal terms discussion\n6. AOB",
                'minutes'       => 'Meeting commenced at 10:05. All agenda items covered. Saudi Aramco expressed satisfaction with QMS improvements. Contract renewal agreed in principle. Formal documentation to follow.',
                'outcome'       => 'Positive outcome. Contract renewal confirmed. Two action items assigned.',
                'rating'        => 4,
                'rating_comments' => 'Very productive meeting. QMS team well-prepared.',
            ],
            [
                'reference_no'  => 'VIS-2024-0002',
                'client_id'     => $clients['GIG'],
                'type'          => 'insurer_audit',
                'purpose'       => 'Annual insurance policy renewal audit. GIG to review risk management framework, claim history, and operational risk controls before confirming renewal terms.',
                'visit_date'    => now()->addDays(21)->toDateString(),
                'visit_time'    => '09:00:00',
                'duration_hours'=> 6.0,
                'location'      => 'Head Office — Riyadh',
                'is_virtual'    => false,
                'host_id'       => $admin->id,
                'status'        => 'confirmed',
                'agenda'        => "1. Company overview and organisational changes\n2. Risk register review\n3. Claims history FY2024\n4. Business continuity plan review\n5. Inspection of facilities\n6. Q&A",
                'minutes'       => null,
                'outcome'       => null,
                'rating'        => null,
            ],
            [
                'reference_no'  => 'VIS-2024-0003',
                'client_id'     => $clients['NEOM'],
                'type'          => 'sales_meeting',
                'purpose'       => 'Initial discovery meeting with NEOM procurement team to explore QMS services opportunity for their Smart City project. Estimated contract value SAR 5M over 3 years.',
                'visit_date'    => now()->addDays(7)->toDateString(),
                'visit_time'    => '14:00:00',
                'duration_hours'=> 2.0,
                'location'      => 'NEOM Project Office — Tabuk',
                'is_virtual'    => false,
                'host_id'       => $opsMgr->id,
                'status'        => 'planned',
                'agenda'        => "1. Company introduction and QMS Pro capabilities\n2. NEOM project requirements overview\n3. Initial solution proposal\n4. Next steps",
                'minutes'       => null,
                'outcome'       => null,
                'rating'        => null,
            ],
            [
                'reference_no'  => 'VIS-2024-0004',
                'client_id'     => $clients['SABIC'],
                'type'          => 'technical_review',
                'purpose'       => 'Technical review of QMS implementation at SABIC site. Review integration with SABIC\'s SAP QM module. Resolve 3 open technical issues.',
                'visit_date'    => now()->addDays(3)->toDateString(),
                'visit_time'    => '10:30:00',
                'duration_hours'=> 4.0,
                'location'      => 'Virtual — Microsoft Teams',
                'is_virtual'    => true,
                'meeting_link'  => 'https://teams.microsoft.com/l/meetup-join/example',
                'host_id'       => $qaMgr->id,
                'status'        => 'confirmed',
                'agenda'        => "1. SAP QM integration status\n2. Open technical issues review\n3. Data migration progress\n4. UAT sign-off timeline",
                'minutes'       => null,
                'outcome'       => null,
                'rating'        => null,
            ],
        ];

        foreach ($visits as $visit) {
            $record = Visit::updateOrCreate(['reference_no' => $visit['reference_no']], $visit);

            // Add participants to completed visit
            if ($visit['status'] === 'completed') {
                VisitParticipant::firstOrCreate(
                    ['visit_id' => $record->id, 'user_id' => $qaMgr->id],
                    ['is_internal' => true, 'attended' => true]
                );
                VisitParticipant::firstOrCreate(
                    ['visit_id' => $record->id, 'user_id' => null, 'external_name' => 'Faisal Al-Malki'],
                    ['external_email' => 'faisal.malki@aramco.com.sa', 'external_role' => 'QMS Coordinator', 'is_internal' => false, 'attended' => true]
                );

                VisitFinding::firstOrCreate(
                    ['visit_id' => $record->id, 'description' => 'Contract renewal agreed. Legal team to issue renewal documentation within 5 business days.'],
                    ['finding_type' => 'action_item', 'priority' => 'high', 'responsible_id' => $admin->id, 'due_date' => now()->addDays(5)->toDateString(), 'status' => 'open']
                );
            }
        }

        $this->command->info('✅ Visits seeded (4 records)');
    }
}
