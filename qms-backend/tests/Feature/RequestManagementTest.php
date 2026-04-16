<?php
declare(strict_types=1);
namespace Tests\Feature;

use App\Models\Request as ServiceRequest;
use Tests\TestCase;

class RequestManagementTest extends TestCase
{
    /** Reads a key from either {data:{key}} or {key} response shape */
    private function pick($res, string $key): mixed
    {
        $body = $res->json();
        return $body['data'][$key] ?? $body[$key] ?? null;
    }

    private function reqPayload(array $overrides = []): array
    {
        return array_merge([
            'title'            => 'IT Equipment Request',
            'description'      => 'New laptop required for new hire.',
            'type'             => 'internal',
            'priority'         => 'medium',
            'risk_level'       => 'low',
            'request_sub_type' => 'unregulated_work',
            'dynamic_fields'   => [
                'process_name'          => 'IT Equipment Procurement',
                'not_documented_reason' => 'Ad-hoc new hire request',
            ],
        ], $overrides);
    }

    private function makeRequest(array $attrs = []): ServiceRequest
    {
        $user = $this->makeUser('employee', ['request.view', 'request.create']);
        return ServiceRequest::create(array_merge([
            'reference_no'     => 'REQ-' . uniqid(),
            'title'            => 'Test Request',
            'description'      => 'Test',
            'type'             => 'internal',
            'request_sub_type' => 'quality_note',
            'priority'         => 'medium',
            'risk_level'       => 'low',
            'status'           => 'submitted',
            'requester_id'     => $user->id,
        ], $attrs));
    }

    public function test_employee_can_create_request(): void
    {
        $user = $this->makeUser('employee', ['request.view', 'request.create']);
        $res  = $this->postJson('/api/requests', $this->reqPayload(), $this->authAs($user));

        $res->assertStatus(201);
        $this->assertNotNull($this->pick($res, 'id'));
        $this->assertNotNull($this->pick($res, 'reference_no'));
        $this->assertNotNull($this->pick($res, 'status'));
        $this->assertDatabaseHas('requests', ['title' => 'IT Equipment Request']);
    }

    public function test_request_reference_auto_generated(): void
    {
        $user = $this->makeUser('employee', ['request.view', 'request.create']);
        $res  = $this->postJson('/api/requests', $this->reqPayload(), $this->authAs($user));
        $ref  = $this->pick($res, 'reference_no');

        $this->assertNotNull($ref);
        $this->assertMatchesRegularExpression('/REQ-\d{4}-\d+/', $ref);
    }

    public function test_request_initial_status_is_draft_or_submitted(): void
    {
        $user   = $this->makeUser('employee', ['request.view', 'request.create']);
        $res    = $this->postJson('/api/requests', $this->reqPayload(), $this->authAs($user));
        $status = $this->pick($res, 'status');

        $this->assertContains($status, ['draft', 'submitted'], 'Initial status should be draft or submitted');
    }

    public function test_unauthenticated_cannot_create_request(): void
    {
        $this->postJson('/api/requests', $this->reqPayload())->assertStatus(401);
    }

    public function test_dept_manager_can_approve_request(): void
    {
        $manager = $this->makeUser('dept_manager', ['request.view', 'request.approve']);
        $request = $this->makeRequest(['status' => 'submitted']);

        $this->postJson("/api/requests/{$request->id}/approve", [
            'comments' => 'Approved for Q2 budget',
        ], $this->authAs($manager))->assertOk();

        $this->assertDatabaseHas('requests', ['id' => $request->id, 'status' => 'approved']);
    }

    public function test_dept_manager_can_reject_request(): void
    {
        $manager = $this->makeUser('dept_manager', ['request.view', 'request.approve']);
        $request = $this->makeRequest(['status' => 'submitted']);

        $this->postJson("/api/requests/{$request->id}/reject", [
            'reason' => 'Insufficient justification',
        ], $this->authAs($manager))->assertOk();

        $this->assertDatabaseHas('requests', ['id' => $request->id, 'status' => 'rejected']);
    }

    public function test_request_list_filterable_by_status(): void
    {
        $manager = $this->makeUser('qa_manager', ['request.view']);
        $this->makeRequest(['status' => 'submitted']);
        $this->makeRequest(['status' => 'closed']);

        $res  = $this->getJson('/api/requests?status=submitted', $this->authAs($manager));
        $data = $res->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $r) {
            $this->assertEquals('submitted', $r['status']);
        }
    }

    public function test_qa_manager_can_close_approved_request(): void
    {
        $manager = $this->makeUser('qa_manager', ['request.view', 'request.approve']);
        $request = $this->makeRequest(['status' => 'approved']);

        $this->postJson("/api/requests/{$request->id}/close", [
            'resolution' => 'Equipment procured and delivered',
        ], $this->authAs($manager))->assertOk();

        $this->assertDatabaseHas('requests', ['id' => $request->id, 'status' => 'closed']);
    }
}
