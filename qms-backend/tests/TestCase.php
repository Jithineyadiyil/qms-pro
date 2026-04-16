<?php
namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Create a role with given permissions and slug.
     */
    protected function createRole(string $name, string $slug, array $permissions = []): Role
    {
        return Role::create([
            'name'        => $name,
            'slug'        => $slug,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Create a user with a given role slug.
     */
    protected function makeUser(string $roleSlug, array $permissions = [], array $attrs = []): User
    {
        $role = Role::where('slug', $roleSlug)->first()
            ?? $this->createRole(ucfirst(str_replace('_', ' ', $roleSlug)), $roleSlug, $permissions);

        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);

        return User::factory()->create(array_merge([
            'role_id'       => $role->id,
            'department_id' => $dept->id,
            'is_active'     => true,
        ], $attrs));
    }

    /**
     * Create a super admin user.
     */
    protected function superAdmin(): User
    {
        return $this->makeUser('super_admin', ['*']);
    }

    /**
     * Create a QA Manager with all QMS permissions.
     */
    protected function qaManager(): User
    {
        return $this->makeUser('qa_manager', [
            'nc.view', 'nc.create', 'nc.approve',
            'capa.view', 'capa.create', 'capa.approve',
            'risk.view', 'risk.create', 'risk.approve',
            'audit.view', 'audit.create', 'audit.approve',
            'complaint.view', 'complaint.create', 'complaint.approve',
            'document.view', 'document.create', 'document.approve',
            'vendor.view', 'vendor.create',
            'visit.view', 'visit.create',
            'report.view',
            'request.view', 'request.create', 'request.approve',
        ]);
    }

    /**
     * Authenticate as a user and return Sanctum token headers.
     */
    protected function authAs(User $user): array
    {
        $token = $user->createToken('test')->plainTextToken;
        return ['Authorization' => "Bearer $token"];
    }
}
