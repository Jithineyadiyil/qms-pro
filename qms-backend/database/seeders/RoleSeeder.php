<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder {
    public function run(): void {
        $roles = [
            [
                'name'        => 'Super Admin',
                'slug'        => 'super_admin',
                'description' => 'Full system access.',
                'permissions' => '["*"]',
            ],
            [
                'name'        => 'QA Manager',
                'slug'        => 'qa_manager',
                'description' => 'Quality Management — receives approved requests, assigns to QA team.',
                'permissions' => json_encode([
                    'request.*', 'nc.*', 'capa.*', 'risk.*',
                    'document.*', 'audit.*', 'complaint.*',
                    'vendor.*', 'visit.*',
                    'sla.view', 'okr.view', 'report.view', 'survey.view',
                ]),
            ],
            [
                'name'        => 'Department Manager',
                'slug'        => 'dept_manager',
                'description' => 'Approves/rejects requests from their department before forwarding to QA.',
                'permissions' => json_encode([
                    'request.view', 'request.create', 'request.approve',
                    'nc.view', 'nc.create',
                    'capa.view', 'capa.create',
                    'complaint.view', 'complaint.create',
                    'document.view',
                    'risk.view',
                    'audit.view',
                    'report.view',
                ]),
            ],
            [
                'name'        => 'QA Officer',
                'slug'        => 'qa_officer',
                'description' => 'QA team member — processes requests assigned by the QA Manager.',
                'permissions' => json_encode([
                    'request.view', 'request.process',
                    'nc.view', 'nc.create',
                    'capa.view', 'capa.create',
                    'document.view',
                    'risk.view',
                    'audit.view',
                    'complaint.view',
                ]),
            ],
            [
                'name'        => 'Auditor',
                'slug'        => 'auditor',
                'description' => 'Audit execution and NC/CAPA access.',
                'permissions' => json_encode([
                    'audit.*',
                    'nc.create', 'nc.view',
                    'capa.view',
                    'request.view',
                    'document.view',
                    'risk.view',
                ]),
            ],
            [
                'name'        => 'Employee',
                'slug'        => 'employee',
                'description' => 'Staff — can raise requests to the Quality department.',
                'permissions' => json_encode([
                    'request.create', 'request.view_own',
                    'nc.view',
                    'capa.view',
                    'complaint.create',
                    'document.view',
                ]),
            ],
            [
                'name'        => 'Client',
                'slug'        => 'client',
                'description' => 'Client portal access.',
                'permissions' => json_encode([
                    'complaint.create',
                    'visit.view',
                ]),
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(['slug' => $role['slug']], $role);
        }
    }
}
