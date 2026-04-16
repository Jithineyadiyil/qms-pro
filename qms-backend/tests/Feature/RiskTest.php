<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Risk;
use App\Models\RiskCategory;
use App\Models\Department;

/**
 * TC-RISK-001 to TC-RISK-008 — Risk register CRUD, permissions, score calculation.
 */
class RiskTest extends TestCase
{
    private function riskPayload(array $overrides = []): array
    {
        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);
        return array_merge([
            'title'               => 'Data Breach Risk',
            'description'         => 'Potential breach of client PII data',
            'likelihood'          => 3,
            'impact'              => 4,
            'type'                => 'operational',
            'treatment_strategy'  => 'mitigate',
            'status'              => 'identified',
            'department_id'       => $dept->id,
        ], $overrides);
    }

    // ── Create — TC-RISK-001 ───────────────────────────────────────────────

    public function test_qa_manager_can_create_risk(): void
    {
        $user = $this->qaManager();

        $res = $this->postJson('/api/risks', $this->riskPayload(), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonStructure(['id', 'reference_no', 'risk_level']);

        $this->assertDatabaseHas('risks', ['title' => 'Data Breach Risk']);
    }

    /** TC-RISK-005 — Score auto-calculation */
    public function test_risk_score_calculated_correctly(): void
    {
        $user    = $this->qaManager();
        $payload = $this->riskPayload(['likelihood' => 3, 'impact' => 5]);

        $res = $this->postJson('/api/risks', $payload, $this->authAs($user));

        // Score = 3 × 5 = 15 → High
        $data = $res->json();
        $this->assertEquals(15, $data['risk_score']);
        $this->assertEquals('high', $data['risk_level']);
    }

    public function test_critical_risk_level_assigned_for_high_score(): void
    {
        $user    = $this->qaManager();
        $payload = $this->riskPayload(['likelihood' => 5, 'impact' => 5]);

        $res  = $this->postJson('/api/risks', $payload, $this->authAs($user));
        $data = $res->json();

        $this->assertEquals(25, $data['risk_score']);
        $this->assertEquals('critical', $data['risk_level']);
    }

    public function test_low_risk_level_assigned_for_low_score(): void
    {
        $user    = $this->qaManager();
        $payload = $this->riskPayload(['likelihood' => 1, 'impact' => 2]);

        $res  = $this->postJson('/api/risks', $payload, $this->authAs($user));
        $data = $res->json();

        $this->assertEquals('low', $data['risk_level']);
    }

    // ── TC-RISK-003 — Employee cannot create risk ──────────────────────────

    public function test_employee_cannot_create_risk(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->postJson('/api/risks', $this->riskPayload(), $this->authAs($user))
            ->assertStatus(403);
    }

    public function test_unauthenticated_cannot_access_risks(): void
    {
        $this->getJson('/api/risks')->assertStatus(401);
    }

    // ── Read ───────────────────────────────────────────────────────────────

    public function test_risk_list_returns_risks(): void
    {
        $user = $this->qaManager();
        Risk::create(array_merge($this->riskPayload(), [
            'reference_no' => 'RSK-2025-001',
            'score'        => 12,
            'risk_level'   => 'high',
            'owner_id'     => $user->id,
        ]));

        $this->getJson('/api/risks', $this->authAs($user))->assertOk();
    }

    public function test_risk_matrix_endpoint_returns_matrix(): void
    {
        $user = $this->qaManager();

        $this->getJson('/api/risks/matrix', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure(['matrix']);
    }

    // ── TC-RISK-004 — Update ───────────────────────────────────────────────

    public function test_qa_manager_can_update_risk(): void
    {
        $user = $this->qaManager();
        $risk = Risk::create(array_merge($this->riskPayload(), [
            'reference_no' => 'RSK-2025-002',
            'score'        => 12,
            'risk_level'   => 'high',
            'owner_id'     => $user->id,
        ]));

        $this->putJson("/api/risks/{$risk->id}",
            ['treatment_strategy' => 'transfer'],
            $this->authAs($user)
        )->assertOk();

        $this->assertDatabaseHas('risks', [
            'id'                 => $risk->id,
            'treatment_strategy' => 'transfer',
        ]);
    }

    // ── TC-RISK-008 — Filter ───────────────────────────────────────────────

    public function test_risks_filtered_by_level(): void
    {
        $user = $this->qaManager();
        Risk::create(array_merge($this->riskPayload(), [
            'reference_no' => 'RSK-2025-003',
            'likelihood'   => 5, 'impact' => 5,
            'score'        => 25, 'risk_level' => 'critical',
            'owner_id'     => $user->id,
        ]));
        Risk::create(array_merge($this->riskPayload(), [
            'reference_no' => 'RSK-2025-004',
            'likelihood'   => 1, 'impact' => 1,
            'score'        => 1, 'risk_level' => 'low',
            'owner_id'     => $user->id,
        ]));

        $res  = $this->getJson('/api/risks?risk_level=critical', $this->authAs($user));
        $data = $res->json('data');   // paginated: root is {data:[...], total:N, ...}

        $this->assertNotEmpty($data);
        foreach ($data as $r) {
            $this->assertEquals('critical', $r['risk_level']);
        }
    }
}
