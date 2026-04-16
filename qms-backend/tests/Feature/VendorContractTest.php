<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Vendor;
use App\Models\VendorContract;
use App\Models\VendorCategory;

/**
 * TC-VEN-001 to TC-VEN-008 — Vendor and Contract management.
 */
class VendorContractTest extends TestCase
{
    private function vendorPayload(array $overrides = []): array
    {
        return array_merge([
            'name'         => 'Test Vendor Co.',
            'type'         => 'service_provider',
            'risk_level'   => 'medium',
            'status'       => 'prospect',
            'contact_name' => 'Ali Al-Rashidi',
            'country'      => 'Saudi Arabia',
        ], $overrides);
    }

    private function contractPayload(int $vendorId, array $overrides = []): array
    {
        return array_merge([
            'vendor_id'  => $vendorId,
            'title'      => 'IT Support Services Agreement',
            'type'       => 'service',
            'value'      => 150000,
            'currency'   => 'SAR',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addYear()->toDateString(),
            'status'     => 'draft',
        ], $overrides);
    }

    // ── Vendor Create — TC-VEN-001 ─────────────────────────────────────────

    public function test_qa_manager_can_create_vendor(): void
    {
        $user = $this->qaManager();

        $res = $this->postJson('/api/vendors', $this->vendorPayload(), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonStructure(['id', 'code', 'name', 'status']);

        $this->assertDatabaseHas('vendors', ['name' => 'Test Vendor Co.']);
    }

    public function test_vendor_code_auto_generated(): void
    {
        $user = $this->qaManager();
        $res  = $this->postJson('/api/vendors', $this->vendorPayload(), $this->authAs($user));

        $this->assertNotNull($res->json('code'));
    }

    public function test_employee_cannot_create_vendor(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->postJson('/api/vendors', $this->vendorPayload(), $this->authAs($user))
            ->assertStatus(403);
    }

    // ── Qualify — TC-VEN-002 ───────────────────────────────────────────────

    public function test_qa_manager_can_qualify_vendor(): void
    {
        $user   = $this->qaManager();
        $vendor = Vendor::create(array_merge($this->vendorPayload(), [
            'code'                 => 'VND-001',
            'qualification_status' => 'pending',
        ]));

        $this->postJson("/api/vendors/{$vendor->id}/qualify", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('vendors', [
            'id'                   => $vendor->id,
            'qualification_status' => 'qualified',
        ]);
    }

    // ── Suspend ────────────────────────────────────────────────────────────

    public function test_qa_manager_can_suspend_vendor(): void
    {
        $user   = $this->qaManager();
        $vendor = Vendor::create(array_merge($this->vendorPayload(), [
            'code'   => 'VND-002',
            'status' => 'active',
        ]));

        $this->postJson("/api/vendors/{$vendor->id}/suspend", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('vendors', [
            'id'     => $vendor->id,
            'status' => 'suspended',
        ]);
    }

    // ── Evaluation — TC-VEN-003 ────────────────────────────────────────────

    public function test_can_add_vendor_evaluation(): void
    {
        $user   = $this->qaManager();
        $vendor = Vendor::create(array_merge($this->vendorPayload(), [
            'code'   => 'VND-003',
            'status' => 'active',
        ]));

        $res = $this->postJson("/api/vendors/{$vendor->id}/evaluations", [
            'evaluation_date'  => now()->toDateString(),
            'period'           => 'Q1 2025',
            'quality_score'    => 8,
            'delivery_score'   => 7,
            'price_score'      => 6,
            'service_score'    => 8,
            'compliance_score' => 9,
            'comments'         => 'Good performance overall',
        ], $this->authAs($user));

        $res->assertStatus(201);
        $this->assertDatabaseHas('vendor_evaluations', [
            'vendor_id'     => $vendor->id,
            'quality_score' => 8,
        ]);
    }

    // ── Contract Create — TC-VEN-004 ───────────────────────────────────────

    public function test_compliance_manager_can_create_contract(): void
    {
        $user   = $this->makeUser('compliance_manager', [
            'vendor.view', 'vendor.create'
        ]);
        $vendor = Vendor::create(array_merge($this->vendorPayload(), ['code' => 'VND-004']));

        $res = $this->postJson('/api/contracts', $this->contractPayload($vendor->id), $this->authAs($user));

        $res->assertStatus(201)
            ->assertJsonStructure(['id', 'contract_no', 'status']);

        $this->assertDatabaseHas('vendor_contracts', [
            'title'  => 'IT Support Services Agreement',
            'status' => 'draft',
        ]);
    }

    public function test_contract_number_auto_generated(): void
    {
        $user   = $this->qaManager();
        $vendor = Vendor::create(array_merge($this->vendorPayload(), ['code' => 'VND-005']));

        $res = $this->postJson('/api/contracts', $this->contractPayload($vendor->id), $this->authAs($user));
        $this->assertNotNull($res->json('contract_no'));
    }

    // ── Activate — TC-VEN-005 ─────────────────────────────────────────────

    public function test_can_activate_draft_contract(): void
    {
        $user     = $this->qaManager();
        $vendor   = Vendor::create(array_merge($this->vendorPayload(), ['code' => 'VND-006', 'status' => 'active']));
        $contract = VendorContract::create(array_merge($this->contractPayload($vendor->id), [
            'contract_no' => 'CON-2025-001',
            'owner_id'    => $user->id,
        ]));

        $this->postJson("/api/contracts/{$contract->id}/activate", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('vendor_contracts', [
            'id'     => $contract->id,
            'status' => 'active',
        ]);
    }

    // ── Terminate — TC-VEN-007 ────────────────────────────────────────────

    public function test_can_terminate_active_contract(): void
    {
        $user     = $this->qaManager();
        $vendor   = Vendor::create(array_merge($this->vendorPayload(), ['code' => 'VND-007', 'status' => 'active']));
        $contract = VendorContract::create(array_merge($this->contractPayload($vendor->id), [
            'contract_no' => 'CON-2025-002',
            'owner_id'    => $user->id,
            'status'      => 'active',
        ]));

        $this->postJson("/api/contracts/{$contract->id}/terminate", [], $this->authAs($user))
            ->assertOk();

        $this->assertDatabaseHas('vendor_contracts', [
            'id'     => $contract->id,
            'status' => 'terminated',
        ]);
    }

    // ── TC-VEN-008 — star rating does not crash ───────────────────────────

    /** Validates that overall_rating=8 (0-10 scale) is stored without error */
    public function test_evaluation_with_high_score_stored_correctly(): void
    {
        $user   = $this->qaManager();
        $vendor = Vendor::create(array_merge($this->vendorPayload(), [
            'code'   => 'VND-008',
            'status' => 'active',
        ]));

        // Score of 8 on 0-10 scale — previously caused RangeError in frontend
        $res = $this->postJson("/api/vendors/{$vendor->id}/evaluations", [
            'evaluation_date'  => now()->toDateString(),
            'quality_score'    => 8,
            'delivery_score'   => 9,
            'price_score'      => 7,
            'service_score'    => 8,
            'compliance_score' => 10,
        ], $this->authAs($user));

        $res->assertStatus(201);

        // Backend must store and return overall_score without error
        // The evaluation endpoint returns the new eval record
        $res->assertStatus(201);
        $this->assertDatabaseHas('vendor_evaluations', [
            'vendor_id'     => $vendor->id,
            'quality_score' => 8,
        ]);
        // Verify overall_score calculated and stored
        $eval = \App\Models\VendorEvaluation::where('vendor_id', $vendor->id)->first();
        $this->assertNotNull($eval->overall_score, 'overall_score must be calculated on save');
        $this->assertGreaterThanOrEqual(0, $eval->overall_score);
        $this->assertLessThanOrEqual(10, $eval->overall_score);
    }
}
