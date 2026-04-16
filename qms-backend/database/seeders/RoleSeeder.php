<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder {
    public function run(): void {
        $roles = [

            // ── 1. Super Admin ────────────────────────────────────
            [
                'name'        => 'Super Admin',
                'slug'        => 'super_admin',
                'description' => 'Full system access — all modules, settings, and user management.',
                'permissions' => '["*"]',
            ],

            // ── 2. QA Manager ─────────────────────────────────────
            [
                'name'        => 'QA Manager',
                'slug'        => 'qa_manager',
                'description' => 'Leads the Quality department. Receives approved requests, assigns to QA team, oversees all quality modules.',
                'permissions' => json_encode([
                    'request.*', 'nc.*', 'capa.*', 'risk.*',
                    'document.*', 'audit.*', 'complaint.*',
                    'vendor.*', 'visit.*',
                    'sla.view', 'okr.view', 'report.view', 'survey.view',
                    'admin.access',
                ]),
            ],

            // ── 3. Quality Supervisor ──────────────────────────────
            // Between QA Manager and QA Officer.
            // Can action NC/CAPA/audits and assign work to officers,
            // but cannot access vendor management, OKR editing, or admin.
            [
                'name'        => 'Quality Supervisor',
                'slug'        => 'quality_supervisor',
                'description' => 'Supervises QA Officers. Processes NCs, CAPAs, audits, and assigns tasks. Reports to QA Manager.',
                'permissions' => json_encode([
                    'request.view', 'request.create', 'request.approve',
                    'nc.*', 'capa.*',
                    'risk.view', 'risk.create',
                    'document.view', 'document.create',
                    'audit.*',
                    'complaint.view', 'complaint.create',
                    'visit.view',
                    'sla.view', 'okr.view',
                    'report.view', 'survey.view',
                ]),
            ],

            // ── 4. Quality Officer ─────────────────────────────────
            [
                'name'        => 'Quality Officer',
                'slug'        => 'qa_officer',
                'description' => 'QA team member — processes requests assigned by the QA Manager or Supervisor.',
                'permissions' => json_encode([
                    'request.view', 'request.process',
                    'nc.view', 'nc.create',
                    'capa.view', 'capa.create',
                    'document.view',
                    'risk.view',
                    'audit.view',
                    'complaint.view',
                    'report.view',
                ]),
            ],

            // ── 5. Compliance Manager ──────────────────────────────
            // Owns the Compliance & Risk department.
            // Full access to complaints, NC, risk, audits, documents.
            // Can view SLA and reports but cannot manage vendors or OKR.
            [
                'name'        => 'Compliance Manager',
                'slug'        => 'compliance_manager',
                'description' => 'Leads Compliance & Risk. Manages regulatory complaints, NC/CAPA, risk register, and audit findings.',
                'permissions' => json_encode([
                    'request.view', 'request.create',
                    'nc.*', 'capa.*',
                    'risk.*',
                    'document.view', 'document.create',
                    'audit.view', 'audit.create',
                    'complaint.*',
                    'sla.view',
                    'report.view',
                ]),
            ],

            // ── 6. Compliance Officer ──────────────────────────────
            [
                'name'        => 'Compliance Officer',
                'slug'        => 'compliance_officer',
                'description' => 'Compliance team member — handles regulatory complaints, NC records, and risk assessments.',
                'permissions' => json_encode([
                    'request.view',
                    'nc.view', 'nc.create',
                    'capa.view', 'capa.create',
                    'risk.view', 'risk.create',
                    'document.view',
                    'audit.view',
                    'complaint.view', 'complaint.create',
                    'report.view',
                ]),
            ],

            // ── 7. Department Manager ──────────────────────────────
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

            // ── 8. Auditor ─────────────────────────────────────────
            [
                'name'        => 'Auditor',
                'slug'        => 'auditor',
                'description' => 'Internal auditor — executes audit programmes and raises NC/CAPA findings.',
                'permissions' => json_encode([
                    'audit.*',
                    'nc.create', 'nc.view',
                    'capa.view',
                    'request.view',
                    'document.view',
                    'risk.view',
                    'report.view',
                ]),
            ],

            // ── 9. Employee ────────────────────────────────────────
            [
                'name'        => 'Employee',
                'slug'        => 'employee',
                'description' => 'General staff — can raise requests and submit complaints.',
                'permissions' => json_encode([
                    'request.create', 'request.view_own',
                    'nc.view',
                    'capa.view',
                    'complaint.create',
                    'document.view',
                ]),
            ],

            // ── 10. Client ─────────────────────────────────────────
            [
                'name'        => 'Client',
                'slug'        => 'client',
                'description' => 'External client portal — complaint submission and visit tracking only.',
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
