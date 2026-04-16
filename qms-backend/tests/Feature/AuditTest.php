<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Audit;
use App\Models\Department;

/**
 * TC-AUD-001 to TC-AUD-008 — Audit planning and workflow.
 */
class AuditTest extends TestCase
{
    private function auditPayload(array $overrides = []): array
    {
        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);
        return array_merge([
            'title'              => 'ISO 9001 Internal Audit Q2',
            'type'               => 'internal',
            'planned_start_date' => now()->addDays(7)->toDateString(),
            'planned_end_date'   => now()->addDays(8)->toDateString(),
            'objectives'         => 'Verify process compliance',
            'department_id'      => $dept->id,
        ], $overrides);
    }

    // ── TC-AUD-001 — Plan ──────────────────────────────────────────────────

    public function test_qa_manager_can_plan_audit(): void
    {
        $user = $this->makeUser('qa_manager', ['audit.view', 'audit.create']);

        $res = $this->postJson('/api/audits', $this->auditPayload(), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonPath('status', 'planned')
            ->assertJsonStructure(['id', 'reference_no', 'status']);

        $this->assertDatabaseHas('audits', ['title' => 'ISO 9001 Internal Audit Q2']);
    }

    public function test_audit_reference_auto_generated(): void
    {
        $user = $this->makeUser('qa_manager', ['audit.view', 'audit.create']);
        $res  = $this->postJson('/api/audits', $this->auditPayload(), $this->authAs($user));

        $ref = $res->json('reference_no');
        $this->assertNotNull($ref);
        $this->assertMatchesRegularExpression('/AUD-\d{4}-\d+/', $ref);
    }

    public function test_employee_cannot_plan_audit(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->postJson('/api/audits', $this->auditPayload(), $this->authAs($user))
            ->assertStatus(403);
    }

    // ── TC-AUD-002 — Notify ────────────────────────────────────────────────

    public function test_can_notify_auditees(): void
    {
        $user  = $this->makeUser('auditor', ['audit.view', 'audit.create', 'audit.approve']);
        $audit = Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-001',
            'lead_auditor_id' => $user->id,
            'status'          => 'planned',
        ]));

        $this->postJson("/api/audits/{$audit->id}/notify", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('audits', [
            'id'     => $audit->id,
            'status' => 'notified',
        ]);
    }

    // ── TC-AUD-003 — Start ─────────────────────────────────────────────────

    public function test_can_start_notified_audit(): void
    {
        $user  = $this->makeUser('auditor', ['audit.view', 'audit.create', 'audit.approve']);
        $audit = Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-002',
            'lead_auditor_id' => $user->id,
            'status'          => 'notified',
        ]));

        $this->postJson("/api/audits/{$audit->id}/start", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('audits', [
            'id'     => $audit->id,
            'status' => 'in_progress',
        ]);
    }

    // ── TC-AUD-004 — Add Finding ───────────────────────────────────────────

    public function test_can_add_audit_finding(): void
    {
        $user  = $this->makeUser('auditor', ['audit.view', 'audit.create', 'audit.approve']);
        $audit = Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-003',
            'lead_auditor_id' => $user->id,
            'status'          => 'in_progress',
        ]));

        $res = $this->postJson("/api/audits/{$audit->id}/findings", [
            'finding_type'   => 'minor_nc',
            'description'    => 'Process step 3 missing documentation',
            'requirement_ref'=> 'ISO 9001:2015 Clause 7.5',
            'priority'       => 'medium',
        ], $this->authAs($user));

        $res->assertStatus(201);
        $this->assertDatabaseHas('audit_findings', [
            'audit_id'    => $audit->id,
            'finding_type'=> 'minor_nc',
        ]);
    }

    // ── TC-AUD-005 — Issue Report ──────────────────────────────────────────

    public function test_can_issue_audit_report(): void
    {
        $user  = $this->makeUser('auditor', ['audit.view', 'audit.create', 'audit.approve']);
        $audit = Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-004',
            'lead_auditor_id' => $user->id,
            'status'          => 'in_progress',
        ]));

        $this->postJson("/api/audits/{$audit->id}/issue-report", [
            'overall_result' => 'minor_findings',
            'report_date'    => now()->toDateString(),
        ], $this->authAs($user))->assertOk();

        $this->assertDatabaseHas('audits', [
            'id'     => $audit->id,
            'status' => 'report_issued',
        ]);
    }

    // ── TC-AUD-006 — Close ─────────────────────────────────────────────────

    public function test_can_close_audit_after_report(): void
    {
        $user  = $this->qaManager();
        $audit = Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-005',
            'lead_auditor_id' => $user->id,
            'status'          => 'report_issued',
        ]));

        $this->postJson("/api/audits/{$audit->id}/close", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('audits', ['id' => $audit->id, 'status' => 'closed']);
    }

    // ── TC-AUD-008 — Filter ────────────────────────────────────────────────

    public function test_audit_list_filterable_by_type(): void
    {
        $user = $this->makeUser('auditor', ['audit.view', 'audit.create', 'audit.approve']);

        Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-010',
            'lead_auditor_id' => $user->id,
            'status'          => 'planned',
            'type'            => 'internal',
        ]));
        Audit::create(array_merge($this->auditPayload(), [
            'reference_no'    => 'AUD-2025-011',
            'lead_auditor_id' => $user->id,
            'status'          => 'planned',
            'type'            => 'surveillance',
        ]));

        $res  = $this->getJson('/api/audits?type=internal', $this->authAs($user));
        $data = $res->json('data');

        $this->assertNotEmpty($data);
        foreach ($data as $a) {
            $this->assertEquals('internal', $a['type']);
        }
    }
}
