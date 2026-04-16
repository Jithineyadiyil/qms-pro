<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Complaint;
use App\Models\Department;
use App\Models\Client;

/**
 * TC-COMP-001 to TC-COMP-008 — Complaint lifecycle and permissions.
 * Columns in complaints table: reference_no, title, description, category_id,
 * complainant_type, complainant_name, complainant_email, complainant_phone,
 * client_id, assignee_id, department_id, severity, status, source,
 * received_date, target_resolution_date, actual_resolution_date,
 * root_cause, resolution, customer_satisfaction, is_regulatory,
 * escalation_level, escalated_to_id, capa_required, capa_id, attachments
 */
class ComplaintTest extends TestCase
{
    private function seedData(): array
    {
        $dept   = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);
        $client = Client::firstOrCreate(
            ['name' => 'Test Client'],
            ['type' => 'client', 'status' => 'active']
        );
        return [$dept, $client];
    }

    private function complaintPayload(array $overrides = []): array
    {
        [$dept, $client] = $this->seedData();
        return array_merge([
            'title'                  => 'Policy documentation missing',
            'description'            => 'Client unable to find their policy docs',
            'severity'               => 'high',
            'source'                 => 'email',
            'received_date'          => now()->toDateTimeString(),
            'target_resolution_date' => now()->addDays(5)->toDateTimeString(),
            'department_id'          => $dept->id,
            'client_id'              => $client->id,
        ], $overrides);
    }

    /** Direct DB insert using only real schema columns */
    private function makeComplaint(array $attrs = []): Complaint
    {
        [$dept, $client] = $this->seedData();
        return Complaint::create(array_merge([
            'reference_no'           => 'CMP-' . uniqid(),
            'title'                  => 'Test Complaint',
            'description'            => 'Test',
            'severity'               => 'medium',
            'source'                 => 'email',
            'status'                 => 'received',
            'received_date'          => now()->toDateTimeString(),
            'department_id'          => $dept->id,
            'client_id'              => $client->id,
            'complainant_email'      => 'default@diamond.com',
        ], $attrs));
    }

    // ── TC-COMP-001 — Create via API ─────────────────────────────────────────

    public function test_compliance_officer_can_log_complaint(): void
    {
        $user = $this->makeUser('compliance_officer', ['complaint.view', 'complaint.create']);

        $res = $this->postJson('/api/complaints', $this->complaintPayload(), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonPath('status', 'received')
            ->assertJsonStructure(['id', 'reference_no', 'severity']);

        $this->assertDatabaseHas('complaints', [
            'title'  => 'Policy documentation missing',
            'status' => 'received',
        ]);
    }

    public function test_complaint_reference_is_auto_generated(): void
    {
        $user = $this->makeUser('compliance_officer', ['complaint.view', 'complaint.create']);
        $res  = $this->postJson('/api/complaints', $this->complaintPayload(), $this->authAs($user));

        $ref = $res->json('reference_no');
        $this->assertNotNull($ref);
        $this->assertMatchesRegularExpression('/CMP-\d{4}-\d+/', $ref);
    }

    public function test_employee_cannot_create_complaint(): void
    {
        $user = $this->makeUser('employee', ['request.view']);
        $this->postJson('/api/complaints', $this->complaintPayload(), $this->authAs($user))
            ->assertStatus(403);
    }

    // ── TC-COMP-005 — Regulatory flag ────────────────────────────────────────

    public function test_regulatory_flag_stored_correctly(): void
    {
        $user    = $this->makeUser('compliance_officer', ['complaint.view', 'complaint.create']);
        $payload = array_merge($this->complaintPayload(), ['is_regulatory' => true]);

        $this->postJson('/api/complaints', $payload, $this->authAs($user))
            ->assertStatus(201);

        $this->assertDatabaseHas('complaints', ['is_regulatory' => 1]);
    }

    // ── TC-COMP-002 — Assign ─────────────────────────────────────────────────

    public function test_compliance_manager_can_assign_complaint(): void
    {
        $manager = $this->makeUser('compliance_manager', [
            'complaint.view', 'complaint.create', 'complaint.approve'
        ]);
        $officer = $this->makeUser('compliance_officer', ['complaint.view']);

        $complaint = $this->makeComplaint(['status' => 'received']);

        $this->postJson(
            "/api/complaints/{$complaint->id}/assign",
            ['assignee_id' => $officer->id],
            $this->authAs($manager)
        )->assertOk();

        $this->assertDatabaseHas('complaints', [
            'id'          => $complaint->id,
            'assignee_id' => $officer->id,
        ]);
    }

    // ── TC-COMP-004 — Resolve ────────────────────────────────────────────────

    public function test_resolve_complaint_sets_resolution_date(): void
    {
        $user = $this->makeUser('compliance_manager', [
            'complaint.view', 'complaint.create', 'complaint.approve'
        ]);

        $complaint = $this->makeComplaint(['status' => 'under_investigation']);

        $this->postJson("/api/complaints/{$complaint->id}/resolve", [
            'resolution'            => 'Policy documents provided to client',
            'customer_satisfaction' => 4,
        ], $this->authAs($user))->assertOk();

        $complaint->refresh();
        $this->assertEquals('resolved', $complaint->status);
        $this->assertNotNull($complaint->actual_resolution_date,
            'actual_resolution_date must be set on resolve');
        $this->assertEquals(4, $complaint->customer_satisfaction);
    }

    // ── TC-COMP-006 — Employee scope ─────────────────────────────────────────

    /**
     * Employee scope: controller filters by complainant_email = user->email.
     * Create one complaint with employee's email and one with a different email.
     */
    public function test_employee_sees_only_own_complaints(): void
    {
        $employee = $this->makeUser('employee', ['complaint.view', 'complaint.create']);
        $this->makeUser('compliance_manager', ['complaint.view', 'complaint.create']);

        // Complaint "owned" by employee (via complainant_email)
        $this->makeComplaint(['complainant_email' => $employee->email]);

        // Another complaint with a different email — employee must NOT see this
        $this->makeComplaint(['complainant_email' => 'otherperson@diamond.com']);

        $res  = $this->getJson('/api/complaints', $this->authAs($employee));
        $data = $res->json('data');

        $this->assertCount(1, $data, 'Employee should only see complaints matching their email');
        $this->assertEquals($employee->email, $data[0]['complainant_email']);
    }

    public function test_compliance_manager_sees_all_complaints(): void
    {
        $manager = $this->makeUser('compliance_manager', [
            'complaint.view', 'complaint.create', 'complaint.approve'
        ]);

        $this->makeComplaint(['complainant_email' => 'employee1@diamond.com']);
        $this->makeComplaint(['complainant_email' => 'employee2@diamond.com']);

        $res  = $this->getJson('/api/complaints', $this->authAs($manager));
        $data = $res->json('data');

        $this->assertCount(2, $data, 'Compliance manager should see all complaints');
    }
}
