<?php
namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;

/**
 * TC-AUTH-003 / TC-AUTH-008 — Unit tests for permission and role logic.
 */
class UserPermissionTest extends TestCase
{
    public function test_super_admin_has_all_permissions(): void
    {
        $user = $this->makeUser('super_admin', ['*']);
        $this->assertTrue($user->hasPermission('nc.view'));
        $this->assertTrue($user->hasPermission('risk.delete'));
        $this->assertTrue($user->hasPermission('anything'));
        $this->assertTrue($user->isSuperAdmin());
    }

    public function test_user_with_specific_permission_passes_check(): void
    {
        $user = $this->makeUser('qa_officer', ['nc.view', 'nc.create']);
        $this->assertTrue($user->hasPermission('nc.view'));
        $this->assertTrue($user->hasPermission('nc.create'));
        $this->assertFalse($user->hasPermission('nc.approve'));
    }

    public function test_user_with_wildcard_module_permission(): void
    {
        $user = $this->makeUser('qa_manager', ['nc.*', 'capa.*']);
        $this->assertTrue($user->hasPermission('nc.view'));
        $this->assertTrue($user->hasPermission('nc.approve'));
        $this->assertTrue($user->hasPermission('capa.create'));
        $this->assertFalse($user->hasPermission('risk.view'));
    }

    public function test_inactive_user_attribute(): void
    {
        $user = $this->makeUser('employee', ['request.view'], ['is_active' => false]);
        $this->assertFalse($user->is_active);
    }

    public function test_employee_has_no_admin_permissions(): void
    {
        $user = $this->makeUser('employee', ['request.view', 'request.create']);
        $this->assertFalse($user->hasPermission('nc.create'));
        $this->assertFalse($user->hasPermission('admin.access'));
        $this->assertFalse($user->isSuperAdmin());
    }

    public function test_has_role_check(): void
    {
        $user = $this->makeUser('auditor', ['audit.view']);
        $this->assertTrue($user->hasRole('auditor'));
        $this->assertFalse($user->hasRole('qa_manager'));
    }

    public function test_has_any_role(): void
    {
        $user = $this->makeUser('compliance_manager', ['complaint.view']);
        $this->assertTrue($user->hasAnyRole(['compliance_manager', 'qa_manager']));
        $this->assertFalse($user->hasAnyRole(['employee', 'auditor']));
    }
}
