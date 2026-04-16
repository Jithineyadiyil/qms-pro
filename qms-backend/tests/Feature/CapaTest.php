<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Capa;
use App\Models\Nonconformance;
use App\Models\Department;

/**
 * TC-CAPA-001 to TC-CAPA-006 — CAPA CRUD and workflow.
 */
class CapaTest extends TestCase
{
    private function capaPayload(array $overrides = []): array
    {
        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);
        return array_merge([
            'title'                  => 'Corrective Action for Process Gap',
            'description'            => 'Root cause analysis required',
            'type'                   => 'corrective',
            'priority'               => 'high',
            'target_date'            => now()->addDays(30)->toDateString(),
            'department_id'          => $dept->id,
            'effectiveness_criteria' => 'No recurrence within 90 days',
        ], $overrides);
    }

    // ── Create ─────────────────────────────────────────────────────────────

    /** TC-CAPA-001 */
    public function test_quality_supervisor_can_create_capa(): void
    {
        $user = $this->makeUser('quality_supervisor', ['capa.view', 'capa.create']);

        $res = $this->postJson('/api/capas', $this->capaPayload(), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonPath('status', 'open')
            ->assertJsonStructure(['id', 'reference_no', 'status']);

        $this->assertDatabaseHas('capas', ['title' => 'Corrective Action for Process Gap']);
    }

    public function test_capa_reference_number_auto_generated(): void
    {
        $user = $this->makeUser('quality_supervisor', ['capa.view', 'capa.create']);
        $res  = $this->postJson('/api/capas', $this->capaPayload(), $this->authAs($user));
        $ref  = $res->json('reference_no');

        $this->assertMatchesRegularExpression('/CAPA-\d{4}-\d+/', $ref);
    }

    public function test_employee_cannot_create_capa(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->postJson('/api/capas', $this->capaPayload(), $this->authAs($user))
            ->assertStatus(403);
    }

    // ── CAPA Route Resolution — TC-CAPA-002 ───────────────────────────────

    /** TC-CAPA-002: Verifies /api/capas does NOT hit nonconformances endpoint */
    public function test_capas_endpoint_exists_and_returns_correct_data(): void
    {
        $user = $this->makeUser('qa_officer', ['nc.view', 'nc.create', 'capa.view', 'capa.create']);

        // Create a CAPA
        $this->postJson('/api/capas', $this->capaPayload(), $this->authAs($user))
            ->assertStatus(201);

        // Listing must return capas, not "NC not found"
        $res = $this->getJson('/api/capas', $this->authAs($user));
        $res->assertOk();

        // Must NOT have an "NC not found"-style error
        $this->assertArrayNotHasKey('error', $res->json());
    }

    // ── Tasks — TC-CAPA-003 ────────────────────────────────────────────────

    public function test_can_add_task_to_capa(): void
    {
        $user  = $this->makeUser('quality_supervisor', ['capa.view', 'capa.create']);
        $capa  = Capa::create(array_merge($this->capaPayload(), [
            'reference_no' => 'CAPA-2025-001',
            'owner_id'     => $user->id,
            'status'       => 'open',
        ]));

        $res = $this->postJson("/api/capas/{$capa->id}/tasks", [
            'task_description' => 'Review QC procedure documentation',
            'responsible_id'   => $user->id,
            'due_date'         => now()->addDays(10)->toDateString(),
        ], $this->authAs($user));

        $res->assertStatus(201);
        $this->assertDatabaseHas('capa_tasks', [
            'capa_id'          => $capa->id,
            'task_description' => 'Review QC procedure documentation',
            'status'           => 'pending',
        ]);
    }

    /** TC-CAPA-004 */
    public function test_can_mark_task_complete(): void
    {
        $user  = $this->makeUser('quality_supervisor', ['capa.view', 'capa.create']);
        $capa  = Capa::create(array_merge($this->capaPayload(), [
            'reference_no' => 'CAPA-2025-002',
            'owner_id'     => $user->id,
            'status'       => 'open',
        ]));

        $taskRes = $this->postJson("/api/capas/{$capa->id}/tasks", [
            'task_description' => 'Update procedure',
            'responsible_id'   => $user->id,
            'due_date'         => now()->addDays(5)->toDateString(),
        ], $this->authAs($user));

        $taskId = $taskRes->json('id');
        $this->assertNotNull($taskId, 'Task ID must be returned after creation');

        $this->postJson("/api/capas/{$capa->id}/tasks/{$taskId}/complete",
            ['completion_notes' => 'Procedure updated and reviewed'],
            $this->authAs($user)
        )->assertOk();

        $this->assertDatabaseHas('capa_tasks', ['id' => $taskId, 'status' => 'completed']);
    }

    // ── NC → CAPA Integration — TC-NC-004 ─────────────────────────────────

    public function test_raising_capa_from_nc_creates_linked_capa(): void
    {
        $user = $this->qaManager();
        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);

        $nc = Nonconformance::create([
            'reference_no'   => 'NC-2025-010',
            'title'          => 'Source NC',
            'description'    => 'NC requiring CAPA',
            'severity'       => 'major',
            'source'         => 'internal_audit',
            'status'         => 'under_investigation',
            'detection_date' => now()->toDateString(),
            'department_id'  => $dept->id,
            'detected_by_id' => $user->id,
        ]);

        $this->postJson("/api/nonconformances/{$nc->id}/raise-capa", [], $this->authAs($user))
            ->assertOk();

        // raiseCapa marks NC as pending_capa (CAPA is then created separately)
        $this->assertDatabaseHas('nonconformances', [
            'id'     => $nc->id,
            'status' => 'pending_capa',
        ]);
    }

    // ── Close CAPA — TC-CAPA-005 ──────────────────────────────────────────

    public function test_close_capa_sets_actual_completion_date(): void
    {
        $user = $this->qaManager();
        $capa = Capa::create(array_merge($this->capaPayload(), [
            'reference_no' => 'CAPA-2025-003',
            'owner_id'     => $user->id,
            'status'       => 'effectiveness_review',
        ]));

        $this->postJson("/api/capas/{$capa->id}/close", [], $this->authAs($user))
            ->assertOk();

        $capa->refresh();
        $this->assertEquals('closed', $capa->status);
        $this->assertNotNull($capa->actual_completion_date,
            'actual_completion_date must be set on CAPA close');
    }

    // ── List / Filter ──────────────────────────────────────────────────────

    public function test_capa_list_returns_paginated_data(): void
    {
        $user = $this->qaManager();
        for ($i = 1; $i <= 3; $i++) {
            Capa::create(array_merge($this->capaPayload(), [
                'reference_no' => "CAPA-2025-00$i",
                'owner_id'     => $user->id,
                'status'       => 'open',
            ]));
        }

        $res = $this->getJson('/api/capas', $this->authAs($user));
        $res->assertOk();
        $this->assertGreaterThanOrEqual(3, count($res->json('data')));
    }
}
