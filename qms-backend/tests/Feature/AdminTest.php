<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;

/**
 * TC-ADM-001 to TC-ADM-008 — Administration: users, roles, departments.
 */
class AdminTest extends TestCase
{
    // ── User CRUD — TC-ADM-001 ─────────────────────────────────────────────

    public function test_super_admin_can_create_user(): void
    {
        $admin = $this->superAdmin();
        $role  = $this->createRole('QA Officer', 'qa_officer', ['nc.view', 'nc.create']);
        $dept  = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);

        $res = $this->postJson('/api/admin/users', [
            'name'          => 'New QA Officer',
            'email'         => 'newofficer@diamond.com',
            'password'      => 'Password@123',
            'role_id'       => $role->id,
            'department_id' => $dept->id,
        ], $this->authAs($admin));

        $res->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'newofficer@diamond.com']);
    }

    /** TC-ADM-002 — role_id is required */
    public function test_create_user_without_role_returns_validation_error(): void
    {
        $admin = $this->superAdmin();
        $dept  = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);

        $this->postJson('/api/admin/users', [
            'name'          => 'No Role User',
            'email'         => 'norole@diamond.com',
            'password'      => 'Password@123',
            'department_id' => $dept->id,
        ], $this->authAs($admin))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['role_id']);
    }

    /** TC-ADM-003 — Toggle user active state */
    public function test_admin_can_toggle_user_active_status(): void
    {
        $admin = $this->superAdmin();
        $user  = $this->makeUser('employee', ['request.view'], ['is_active' => true]);

        $this->postJson("/api/admin/users/{$user->id}/toggle", [], $this->authAs($admin))
            ->assertOk();

        $user->refresh();
        $this->assertFalse((bool)$user->is_active);

        // Toggle back
        $this->postJson("/api/admin/users/{$user->id}/toggle", [], $this->authAs($admin))
            ->assertOk();

        $user->refresh();
        $this->assertTrue((bool)$user->is_active);
    }

    /** TC-ADM-006 — Reset password */
    public function test_admin_can_reset_user_password(): void
    {
        $admin  = $this->superAdmin();
        $target = $this->makeUser('employee', ['request.view']);

        $this->postJson("/api/admin/users/{$target->id}/reset-password",
            ['password' => 'NewPassword@456'],
            $this->authAs($admin)
        )->assertOk();
    }

    public function test_non_admin_cannot_access_admin_endpoints(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->getJson('/api/admin/users', $this->authAs($user))
            ->assertStatus(403);
    }

    // ── Roles — TC-ADM-005 ─────────────────────────────────────────────────

    public function test_admin_can_create_role_with_permissions(): void
    {
        $admin = $this->superAdmin();

        $res = $this->postJson('/api/admin/roles', [
            'name'        => 'Compliance Viewer',
            'description' => 'Read-only access to compliance data',
            'permissions' => ['complaint.view', 'risk.view'],
        ], $this->authAs($admin));

        $res->assertStatus(201);
        $this->assertDatabaseHas('roles', ['name' => 'Compliance Viewer']);

        $role = Role::where('name', 'Compliance Viewer')->first();
        $this->assertContains('complaint.view', $role->permissions);
        $this->assertContains('risk.view', $role->permissions);
    }

    /** TC-ADM-006 — Cannot delete role with users */
    public function test_cannot_delete_role_that_has_users(): void
    {
        $admin = $this->superAdmin();
        $role  = $this->createRole('Occupied Role', 'occupied', ['nc.view']);
        $this->makeUser('occupied', ['nc.view'], ['role_id' => $role->id]);

        $this->deleteJson("/api/admin/roles/{$role->id}", [], $this->authAs($admin))
            ->assertStatus(422);

        // Role must still exist
        $this->assertDatabaseHas('roles', ['id' => $role->id]);
    }

    public function test_can_delete_empty_role(): void
    {
        $admin = $this->superAdmin();
        $role  = $this->createRole('Empty Role', 'empty_role', ['nc.view']);

        $this->deleteJson("/api/admin/roles/{$role->id}", [], $this->authAs($admin))
            ->assertOk();

        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    // ── Departments ─────────────────────────────────────────────────────────

    public function test_admin_can_create_department(): void
    {
        $admin = $this->superAdmin();

        $res = $this->postJson('/api/admin/departments', [
            'name'        => 'Cyber Security',
            'code'        => 'CS',
            'description' => 'Handles IT security',
        ], $this->authAs($admin));

        $res->assertStatus(201);
        $this->assertDatabaseHas('departments', ['name' => 'Cyber Security']);
    }

    /** TC-ADM-004 — Department delete blocked if has users */
    public function test_cannot_delete_department_with_users(): void
    {
        $admin = $this->superAdmin();
        $dept  = Department::create(['name' => 'Occupied Dept', 'code' => 'OCC']);

        // Create user in this department
        $role = $this->createRole('Test', 'test_role', ['nc.view']);
        User::factory()->create(['department_id' => $dept->id, 'role_id' => $role->id]);

        $this->deleteJson("/api/admin/departments/{$dept->id}", [], $this->authAs($admin))
            ->assertStatus(422);

        $this->assertDatabaseHas('departments', ['id' => $dept->id]);
    }

    // ── Activity Log ───────────────────────────────────────────────────────

    public function test_activity_log_returns_paginated_data(): void
    {
        $admin = $this->superAdmin();

        $res = $this->getJson('/api/admin/activity-log?per_page=50', $this->authAs($admin));
        $res->assertOk()
            ->assertJsonStructure(['data', 'total', 'current_page', 'last_page']);

        // Verify per_page is respected
        $this->assertLessThanOrEqual(50, count($res->json('data')));
    }
}
