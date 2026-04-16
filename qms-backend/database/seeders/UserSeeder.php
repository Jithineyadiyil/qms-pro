<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder {
    public function run(): void {

        // Resolve role IDs by slug
        $role = fn(string $slug) => DB::table('roles')->where('slug', $slug)->value('id');

        $r_super      = $role('super_admin');
        $r_qamgr      = $role('qa_manager');
        $r_qasup      = $role('quality_supervisor');
        $r_officer    = $role('qa_officer');
        $r_compmgr    = $role('compliance_manager');
        $r_compofc    = $role('compliance_officer');
        $r_deptmgr    = $role('dept_manager');
        $r_auditor    = $role('auditor');
        $r_emp        = $role('employee');
        $r_client     = $role('client');

        // dept IDs (from DepartmentSeeder order):
        // 1=QA, 2=Operations, 3=IT, 4=Finance, 5=HR, 6=Sales&Mktg, 7=Compliance&Risk, 8=CustomerService

        $users = [
            // ── Super Admin ──────────────────────────────────────────
            ['name' => 'System Administrator',   'email' => 'admin@qms.com',           'employee_id' => 'EMP001', 'role_id' => $r_super,   'department_id' => 1],

            // ── Quality Department ───────────────────────────────────
            ['name' => 'Fatima Al-Hassan',        'email' => 'fatima.h@qms.com',        'employee_id' => 'EMP002', 'role_id' => $r_qamgr,   'department_id' => 1],
            ['name' => 'Shaden Al-Otaibi',        'email' => 'shaden.a@qms.com',        'employee_id' => 'EMP003', 'role_id' => $r_qasup,   'department_id' => 1],
            ['name' => 'Ahmed Al-Rashid',         'email' => 'ahmed.r@qms.com',         'employee_id' => 'EMP004', 'role_id' => $r_officer, 'department_id' => 1],
            ['name' => 'Hana Al-Otaibi',          'email' => 'hana.o@qms.com',          'employee_id' => 'EMP005', 'role_id' => $r_officer, 'department_id' => 1],
            ['name' => 'Yusuf Al-Amri',           'email' => 'yusuf.a@qms.com',         'employee_id' => 'EMP006', 'role_id' => $r_officer, 'department_id' => 1],

            // ── Compliance & Risk Department ─────────────────────────
            ['name' => 'Turki Al-Abdali',         'email' => 'turki.a@qms.com',         'employee_id' => 'EMP007', 'role_id' => $r_compmgr, 'department_id' => 7],
            ['name' => 'Rawan Al-Yayani',         'email' => 'rawan.y@qms.com',         'employee_id' => 'EMP008', 'role_id' => $r_compofc, 'department_id' => 7],
            ['name' => 'Jinesh M Mani',           'email' => 'j.mani@dbroker.com.sa',   'employee_id' => 'EMP009', 'role_id' => $r_compofc, 'department_id' => 7],

            // ── Department Managers ──────────────────────────────────
            ['name' => 'Omar Al-Farsi',           'email' => 'omar.f@qms.com',          'employee_id' => 'EMP010', 'role_id' => $r_deptmgr, 'department_id' => 2],  // Operations
            ['name' => 'Sara Al-Mohri',           'email' => 'sara.m@qms.com',          'employee_id' => 'EMP011', 'role_id' => $r_deptmgr, 'department_id' => 3],  // IT
            ['name' => 'Nouf Al-Raoji',           'email' => 'nouf.r@qms.com',          'employee_id' => 'EMP012', 'role_id' => $r_deptmgr, 'department_id' => 4],  // Finance
            ['name' => 'Khalid Al-Sabah',         'email' => 'khalid.s@qms.com',        'employee_id' => 'EMP013', 'role_id' => $r_deptmgr, 'department_id' => 5],  // HR
            ['name' => 'Noura Al-Qassim',         'email' => 'noura.q@qms.com',         'employee_id' => 'EMP014', 'role_id' => $r_deptmgr, 'department_id' => 6],  // Sales & Mktg
            ['name' => 'Shahad Al-Harti',         'email' => 'shahad.h@qms.com',        'employee_id' => 'EMP015', 'role_id' => $r_deptmgr, 'department_id' => 8],  // Customer Service

            // ── Auditor ──────────────────────────────────────────────
            ['name' => 'Tariq Al-Dosari',         'email' => 'tariq.d@qms.com',         'employee_id' => 'EMP016', 'role_id' => $r_auditor, 'department_id' => 1],

            // ── Employees (various depts) ────────────────────────────
            ['name' => 'Mohammed Al-Ghamdi',      'email' => 'mohammed.g@qms.com',      'employee_id' => 'EMP017', 'role_id' => $r_emp, 'department_id' => 2],
            ['name' => 'Layla Al-Shehri',         'email' => 'layla.s@qms.com',         'employee_id' => 'EMP018', 'role_id' => $r_emp, 'department_id' => 3],
            ['name' => 'Abdullah Al-Zahrani',     'email' => 'abdullah.z@qms.com',      'employee_id' => 'EMP019', 'role_id' => $r_emp, 'department_id' => 4],
            ['name' => 'Reem Al-Harbi',           'email' => 'reem.h@qms.com',          'employee_id' => 'EMP020', 'role_id' => $r_emp, 'department_id' => 8],

            // ── Client portal ────────────────────────────────────────
            ['name' => 'Client Portal User',      'email' => 'client@example.com',      'employee_id' => 'CLI001', 'role_id' => $r_client, 'department_id' => null],
        ];

        $now = now();
        foreach ($users as $u) {
            DB::table('users')->updateOrInsert(
                ['email' => $u['email']],
                array_merge($u, [
                    'password'          => Hash::make('password'),
                    'phone'             => '+966 50' . rand(1000000, 9999999),
                    'is_active'         => 1,
                    'email_verified_at' => $now,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ])
            );
        }

        // ── Set department heads ──────────────────────────────────────
        $headOf = fn(int $deptId, string $email) =>
            DB::table('departments')->where('id', $deptId)
              ->update(['head_user_id' => DB::table('users')->where('email', $email)->value('id')]);

        $headOf(1, 'fatima.h@qms.com');   // QA
        $headOf(2, 'omar.f@qms.com');     // Operations
        $headOf(3, 'sara.m@qms.com');     // IT
        $headOf(4, 'nouf.r@qms.com');     // Finance
        $headOf(5, 'khalid.s@qms.com');   // HR
        $headOf(6, 'noura.q@qms.com');    // Sales & Mktg
        $headOf(7, 'turki.a@qms.com');    // Compliance & Risk
        $headOf(8, 'shahad.h@qms.com');   // Customer Service
    }
}
