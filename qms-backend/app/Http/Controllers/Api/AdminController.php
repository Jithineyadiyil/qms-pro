<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{RequestCategory, NcCategory, RiskCategory, DocumentCategory, VendorCategory, ComplaintCategory};
use App\Models\{EmailTemplate, SystemSetting, User, Department, Role};
use Illuminate\Http\Request;

class AdminController extends Controller {

    // ─── USERS ───────────────────────────────────────────────────────────
    public function users(Request $request) {
        $q = User::with(['role','department'])
            ->when($request->role_id,      fn($q,$v)=>$q->where('role_id',$v))
            ->when($request->department_id,fn($q,$v)=>$q->where('department_id',$v))
            ->when($request->is_active,    fn($q,$v)=>$q->where('is_active',$v))
            ->when($request->search,       fn($q,$v)=>$q->where(fn($s)=>
                $s->where('name','like',"%$v%")->orWhere('email','like',"%$v%")->orWhere('employee_id','like',"%$v%")
            ));
        return response()->json($q->orderBy('name')->paginate(20));
    }

    public function storeUser(Request $request) {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'employee_id'   => 'nullable|string|unique:users,employee_id',
            'role_id'       => 'required|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'phone'         => 'nullable|string',
            'password'      => 'nullable|string|min:8',
        ]);
        $data['password'] = bcrypt($data['password'] ?? 'Password@123');
        $data['is_active'] = true;
        $user = User::create($data);
        return response()->json($user->load(['role','department']), 201);
    }

    public function updateUser(Request $request, $id) {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => 'sometimes|email|unique:users,email,'.$id,
            'employee_id'   => 'nullable|string|unique:users,employee_id,'.$id,
            'role_id'       => 'sometimes|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'phone'         => 'nullable|string',
            'is_active'     => 'sometimes|boolean',
        ]);
        if ($request->filled('password')) {
            $data['password'] = bcrypt($request->password);
        }
        $user->update($data);
        return response()->json($user->fresh(['role','department']));
    }

    public function toggleUser($id) {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);
        return response()->json($user->fresh(['role','department']));
    }

    public function resetPassword(Request $request, $id) {
        $user = User::findOrFail($id);
        $pw = $request->validate(['password'=>'required|string|min:8'])['password'];
        $user->update(['password' => bcrypt($pw)]);
        return response()->json(['message' => 'Password reset successfully.']);
    }

    // ─── DEPARTMENTS ─────────────────────────────────────────────────────
    public function departments() {
        return response()->json(Department::with(['head:id,name'])->withCount('users')->orderBy('name')->get());
    }

    public function storeDepartment(Request $request) {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'code'        => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'head_user_id'=> 'nullable|exists:users,id',
        ]);
        $dept = Department::create($data);
        return response()->json($dept->load('head:id,name'), 201);
    }

    public function updateDepartment(Request $request, $id) {
        $dept = Department::findOrFail($id);
        $dept->update($request->only(['name','code','description','head_user_id']));
        return response()->json($dept->fresh(['head:id,name']));
    }

    public function destroyDepartment($id) {
        $dept = Department::findOrFail($id);
        if ($dept->users()->count() > 0)
            return response()->json(['message' => 'Cannot delete department with active users.'], 422);
        $dept->delete();
        return response()->json(['message' => 'Department deleted.']);
    }

    // ─── ROLES ───────────────────────────────────────────────────────────
    public function roles() {
        return response()->json(Role::withCount('users')->orderBy('name')->get());
    }

    // ─── CATEGORIES (generic handler) ────────────────────────────────────
    private function categoryModel(string $type): string {
        return match($type) {
            'request'   => RequestCategory::class,
            'nc'        => NcCategory::class,
            'risk'      => RiskCategory::class,
            'document'  => DocumentCategory::class,
            'vendor'    => VendorCategory::class,
            'complaint' => ComplaintCategory::class,
            default     => abort(404, 'Unknown category type')
        };
    }

    public function categories($type) {
        $model = $this->categoryModel($type);
        $q = $model::query();
        if ($type === 'document') $q->with('children');
        return response()->json($q->orderBy('name')->get());
    }

    public function storeCategory(Request $request, $type) {
        $model = $this->categoryModel($type);
        $rules = ['name' => 'required|string|max:255', 'description' => 'nullable|string'];
        if ($type === 'request' || $type === 'complaint') $rules['sla_hours'] = 'nullable|integer|min:1';
        if ($type === 'nc')       $rules['severity_default'] = 'nullable|in:minor,major,critical';
        if ($type === 'document') $rules['code'] = 'nullable|string|max:20';
        if ($type === 'document') $rules['parent_id'] = 'nullable|exists:document_categories,id';
        $cat = $model::create($request->validate($rules));
        return response()->json($cat, 201);
    }

    public function updateCategory(Request $request, $type, $id) {
        $model = $this->categoryModel($type);
        $cat = $model::findOrFail($id);
        $rules = ['name' => 'sometimes|string|max:255', 'description' => 'nullable|string'];
        if ($type === 'request' || $type === 'complaint') $rules['sla_hours'] = 'nullable|integer|min:1';
        if ($type === 'nc')       $rules['severity_default'] = 'nullable|in:minor,major,critical';
        if ($type === 'document') $rules['code'] = 'nullable|string|max:20';
        $cat->update($request->validate($rules));
        return response()->json($cat->fresh());
    }

    public function destroyCategory($type, $id) {
        $model = $this->categoryModel($type);
        $model::findOrFail($id)->delete();
        return response()->json(['message' => 'Category deleted.']);
    }

    // ─── EMAIL TEMPLATES ─────────────────────────────────────────────────
    public function emailTemplates(Request $request) {
        $q = EmailTemplate::query()
            ->when($request->module, fn($q,$v)=>$q->where('module',$v));
        return response()->json($q->orderBy('module')->orderBy('name')->get());
    }

    public function showEmailTemplate($id) {
        return response()->json(EmailTemplate::findOrFail($id));
    }

    public function updateEmailTemplate(Request $request, $id) {
        $tpl = EmailTemplate::findOrFail($id);
        $tpl->update($request->validate([
            'name'          => 'sometimes|string',
            'subject'       => 'sometimes|string',
            'body_html'     => 'sometimes|string',
            'is_active'     => 'sometimes|boolean',
        ]));
        return response()->json($tpl->fresh());
    }

    public function storeEmailTemplate(Request $request) {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'module'        => 'required|string',
            'trigger_event' => 'required|string',
            'subject'       => 'required|string',
            'body_html'     => 'required|string',
            'variables'     => 'nullable|array',
            'is_active'     => 'boolean',
        ]);
        $data['slug'] = \Illuminate\Support\Str::slug($data['module'].'_'.$data['trigger_event'].'_'.time());
        $tpl = EmailTemplate::create($data);
        return response()->json($tpl, 201);
    }

    public function destroyEmailTemplate($id) {
        EmailTemplate::findOrFail($id)->delete();
        return response()->json(['message' => 'Template deleted.']);
    }

    // ─── SYSTEM SETTINGS ─────────────────────────────────────────────────
    public function settings() {
        return response()->json(SystemSetting::orderBy('group')->orderBy('label')->get());
    }

    public function updateSettings(Request $request) {
        foreach ($request->settings as $key => $value) {
            SystemSetting::where('key', $key)->update(['value' => $value]);
        }
        return response()->json(['message' => 'Settings saved.']);
    }

    // ─── ACTIVITY LOG ────────────────────────────────────────────────────
    public function activityLog(Request $request) {
        $q = \DB::table('activity_logs')
            ->leftJoin('users','activity_logs.user_id','=','users.id')
            ->select('activity_logs.*','users.name as user_name','users.email as user_email')
            ->when($request->user_id, fn($q,$v)=>$q->where('activity_logs.user_id',$v))
            ->when($request->module,  fn($q,$v)=>$q->where('module',$v));
        return response()->json($q->orderByDesc('activity_logs.created_at')->paginate(25));
    }

    // ─── ROLE CRUD ────────────────────────────────────────────────────────
    public function storeRole(Request $request) {
        $data = $request->validate([
            'name'        => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);
        $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        $role = Role::create($data);
        return response()->json($role->loadCount('users'), 201);
    }

    public function updateRole(Request $request, $id) {
        $role = Role::findOrFail($id);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255|unique:roles,name,'.$id,
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);
        $role->update($data);
        return response()->json($role->fresh()->loadCount('users'));
    }

    public function destroyRole($id) {
        $role = Role::findOrFail($id);
        if ($role->users()->count() > 0)
            return response()->json(['message' => 'Cannot delete a role that has assigned users.'], 422);
        $role->delete();
        return response()->json(['message' => 'Role deleted.']);
    }
}
