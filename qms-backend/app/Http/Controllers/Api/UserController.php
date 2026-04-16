<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends BaseController
{
    // ── Standard CRUD ─────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = User::with('role', 'department')
            ->when($request->role,          fn($q) => $q->whereHas('role', fn($r) => $r->where('slug', $request->role)))
            ->when($request->role_id,       fn($q) => $q->where('role_id', $request->role_id))
            ->when($request->department_id, fn($q) => $q->where('department_id', $request->department_id))
            ->when($request->is_active !== null, fn($q) => $q->where('is_active', (bool)$request->is_active))
            ->when($request->search, fn($q) => $q->where(fn($s) =>
                $s->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
                  ->orWhere('employee_id', 'like', "%{$request->search}%")
            ));
        return $this->paginated($query);
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardAdmin();

        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:8',
            'role_id'       => 'required|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'employee_id'   => 'nullable|string|max:50',
            'phone'         => 'nullable|string|max:20',
        ]);
        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);
        $this->logActivity('users', 'created', $user);
        return $this->success($user->load('role', 'department'), 'User created', 201);
    }

    public function show(int $id): JsonResponse
    {
        return $this->success(User::with('role', 'department')->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user      = User::findOrFail($id);
        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => "sometimes|email|unique:users,email,{$id}",
            'role_id'       => 'sometimes|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'phone'         => 'nullable|string|max:20',
        ]);
        $user->update($validated);
        return $this->success($user->fresh('role', 'department'));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->guardAdmin();
        User::findOrFail($id)->delete();
        return $this->success(null, 'User deleted');
    }

    // ── Admin: Users ──────────────────────────────────────────────────────────

    public function adminIndex(Request $request): JsonResponse
    {
        $this->guardAdmin();
        return $this->index($request);
    }

    public function toggleActive(int $id): JsonResponse
    {
        $this->guardAdmin();
        $user = User::findOrFail($id);
        $user->update(['is_active' => !((bool) $user->is_active)]);
        $this->logActivity('users', 'toggled_active', $user);
        return $this->success($user->fresh(), 'User status updated');
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $this->guardAdmin();
        $request->validate(['password' => 'required|string|min:8']);
        $user = User::findOrFail($id);
        $user->update(['password' => Hash::make($request->password)]);
        $this->logActivity('users', 'password_reset', $user);
        return $this->success(null, 'Password reset successfully');
    }

    // ── Admin: Roles ──────────────────────────────────────────────────────────

    public function roles(): JsonResponse
    {
        return $this->success(Role::orderBy('name')->get());
    }

    public function rolesIndex(): JsonResponse
    {
        $this->guardAdmin();
        return $this->success(Role::withCount('users')->orderBy('name')->get());
    }

    public function storeRole(Request $request): JsonResponse
    {
        $this->guardAdmin();
        $validated = $request->validate([
            'name'        => 'required|string|max:100|unique:roles,name',
            'slug'        => 'sometimes|string|max:100|unique:roles,slug',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);
        // Auto-generate slug from name if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $validated['name']));
        }
        $role = Role::create($validated);
        return $this->success($role, 'Role created', 201);
    }

    public function updateRole(Request $request, int $id): JsonResponse
    {
        $this->guardAdmin();
        $role = Role::findOrFail($id);
        $validated = $request->validate([
            'name'        => "sometimes|string|max:100|unique:roles,name,{$id}",
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);
        $role->update($validated);
        return $this->success($role->fresh(), 'Role updated');
    }

    public function destroyRole(int $id): JsonResponse
    {
        $this->guardAdmin();
        $role = Role::findOrFail($id);
        if ($role->users()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Cannot delete a role that has users.'], 422);
        }
        $role->delete();
        return $this->success(null, 'Role deleted');
    }

    // ── Admin: Departments ────────────────────────────────────────────────────

    public function departments(): JsonResponse
    {
        return $this->success(Department::orderBy('name')->get());
    }

    public function departmentsIndex(): JsonResponse
    {
        $this->guardAdmin();
        return $this->success(Department::withCount('users')->orderBy('name')->get());
    }

    public function storeDepartment(Request $request): JsonResponse
    {
        $this->guardAdmin();
        $validated = $request->validate([
            'name'        => 'required|string|max:100|unique:departments,name',
            'code'        => 'required|string|max:20|unique:departments,code',
            'description' => 'nullable|string',
        ]);
        $dept = Department::create($validated);
        return $this->success($dept, 'Department created', 201);
    }

    public function updateDepartment(Request $request, int $id): JsonResponse
    {
        $this->guardAdmin();
        $dept = Department::findOrFail($id);
        $validated = $request->validate([
            'name'        => "sometimes|string|max:100|unique:departments,name,{$id}",
            'code'        => "sometimes|string|max:20|unique:departments,code,{$id}",
            'description' => 'nullable|string',
        ]);
        $dept->update($validated);
        return $this->success($dept->fresh(), 'Department updated');
    }

    public function destroyDepartment(int $id): JsonResponse
    {
        $this->guardAdmin();
        $dept = Department::findOrFail($id);
        if ($dept->users()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Cannot delete a department that has users.'], 422);
        }
        $dept->delete();
        return $this->success(null, 'Department deleted');
    }

    // ── Admin: Activity Log ───────────────────────────────────────────────────

    public function activityLog(Request $request): JsonResponse
    {
        $this->guardAdmin();
        $perPage = $request->integer('per_page', 15);
        $rows    = DB::table('activity_logs')->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'success'      => true,
            'data'         => $rows->items(),
            'total'        => $rows->total(),
            'current_page' => $rows->currentPage(),
            'last_page'    => $rows->lastPage(),
        ]);
    }

    // ── Guard helper ─────────────────────────────────────────────────────────

    private function guardAdmin(): void
    {
        $slug = optional(optional(auth()->user())->role)->slug ?? '';
        if (!in_array($slug, ['super_admin', 'qa_manager'], true)) {
            abort(403, 'Admin privileges required.');
        }
    }
}
