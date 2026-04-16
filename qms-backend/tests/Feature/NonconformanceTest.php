<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Nonconformance;
use App\Models\Department;

/**
 * TC-NC-001 to TC-NC-006 — NC CRUD and workflow.
 */
class NonconformanceTest extends TestCase
{
    private function ncPayload(array $overrides = []): array
    {
        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);
        return array_merge([
            'title'          => 'Test NC Title',
            'description'    => 'Detailed description of the NC',
            'severity'       => 'major',
            'source'         => 'internal_audit',
            'detection_date' => now()->toDateString(),
            'department_id'  => $dept->id,
        ], $overrides);
    }

    // ── Create ─────────────────────────────────────────────────────────────

    /** TC-NC-001 */
    public function test_qa_officer_can_create_nc(): void
    {
        $user = $this->makeUser('qa_officer', ['nc.view', 'nc.create']);

        $res = $this->postJson('/api/nonconformances', $this->ncPayload(), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonStructure(['id', 'reference_no', 'status'])
            ->assertJsonPath('status', 'open');

        $this->assertDatabaseHas('nonconformances', ['title' => 'Test NC Title', 'status' => 'open']);
    }

    public function test_nc_gets_auto_generated_reference_number(): void
    {
        $user = $this->makeUser('qa_officer', ['nc.view', 'nc.create']);
        $res  = $this->postJson('/api/nonconformances', $this->ncPayload(), $this->authAs($user));

        $ref = $res->json('reference_no');
        $this->assertNotNull($ref);
        $this->assertMatchesRegularExpression('/NC-\d{4}-\d+/', $ref);
    }

    public function test_employee_cannot_create_nc(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->postJson('/api/nonconformances', $this->ncPayload(), $this->authAs($user))
            ->assertStatus(403);
    }

    public function test_unauthenticated_cannot_create_nc(): void
    {
        $this->postJson('/api/nonconformances', $this->ncPayload())
            ->assertStatus(401);
    }

    public function test_nc_title_is_required(): void
    {
        $user    = $this->makeUser('qa_officer', ['nc.view', 'nc.create']);
        $payload = $this->ncPayload(['title' => '']);

        $this->postJson('/api/nonconformances', $payload, $this->authAs($user))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    // ── Read ───────────────────────────────────────────────────────────────

    public function test_qa_manager_can_list_ncs(): void
    {
        $user = $this->qaManager();
        Nonconformance::create(array_merge($this->ncPayload(), [
            'reference_no'   => 'NC-2025-001',
            'detected_by_id' => $user->id,
            'status'         => 'open',
        ]));

        $this->getJson('/api/nonconformances', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_nc_detail_returns_full_record(): void
    {
        $user = $this->qaManager();
        $nc   = Nonconformance::create(array_merge($this->ncPayload(), [
            'reference_no'   => 'NC-2025-001',
            'detected_by_id' => $user->id,
            'status'         => 'open',
        ]));

        $this->getJson("/api/nonconformances/{$nc->id}", $this->authAs($user))
            ->assertOk()
            ->assertJsonPath('id', $nc->id);
    }

    // ── Workflow ───────────────────────────────────────────────────────────

    /** TC-NC-002 */
    public function test_qa_manager_can_assign_nc(): void
    {
        $manager  = $this->qaManager();
        $assignee = $this->makeUser('qa_officer', ['nc.view', 'nc.create']);

        $nc = Nonconformance::create(array_merge($this->ncPayload(), [
            'reference_no'   => 'NC-2025-002',
            'detected_by_id' => $manager->id,
            'status'         => 'open',
        ]));

        $this->postJson("/api/nonconformances/{$nc->id}/assign",
            ['user_id' => $assignee->id],
            $this->authAs($manager)
        )->assertOk();

        $this->assertDatabaseHas('nonconformances', [
            'id'             => $nc->id,
            'assigned_to_id' => $assignee->id,
        ]);
    }

    /** TC-NC-003 */
    public function test_investigation_changes_status(): void
    {
        $user = $this->qaManager();
        $nc   = Nonconformance::create(array_merge($this->ncPayload(), [
            'reference_no'   => 'NC-2025-003',
            'detected_by_id' => $user->id,
            'status'         => 'open',
        ]));

        $this->postJson("/api/nonconformances/{$nc->id}/investigate",
            ['root_cause' => 'Process gap identified in QC step 3'],
            $this->authAs($user)
        )->assertOk();

        $this->assertDatabaseHas('nonconformances', [
            'id'     => $nc->id,
            'status' => 'under_investigation',
        ]);
    }

    /** TC-NC-005 */
    public function test_close_nc_sets_actual_closure_date(): void
    {
        $user = $this->qaManager();
        $nc   = Nonconformance::create(array_merge($this->ncPayload(), [
            'reference_no'   => 'NC-2025-004',
            'detected_by_id' => $user->id,
            'status'         => 'under_investigation',
        ]));

        $this->postJson("/api/nonconformances/{$nc->id}/close",
            ['actual_closure_date' => now()->toDateString(), 'closure_notes' => 'Root cause addressed and verified'],
            $this->authAs($user)
        )->assertOk();

        $nc->refresh();
        $this->assertEquals('closed', $nc->status);
        $this->assertNotNull($nc->actual_closure_date, 'actual_closure_date must be set on close');
    }

    // ── Update / Delete ────────────────────────────────────────────────────

    public function test_qa_manager_can_update_nc(): void
    {
        $user = $this->qaManager();
        $nc   = Nonconformance::create(array_merge($this->ncPayload(), [
            'reference_no'   => 'NC-2025-005',
            'detected_by_id' => $user->id,
            'status'         => 'open',
        ]));

        $this->putJson("/api/nonconformances/{$nc->id}",
            ['severity' => 'critical'],
            $this->authAs($user)
        )->assertOk();

        $this->assertDatabaseHas('nonconformances', ['id' => $nc->id, 'severity' => 'critical']);
    }
}
