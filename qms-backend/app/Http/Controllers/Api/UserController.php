<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{User, Role, Department};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller {
    public function index(Request $request) {
        $q = User::with(['role','department'])
            ->when($request->role_id,  fn($q,$v) => $q->where('role_id',$v))
            ->when($request->dept_id,  fn($q,$v) => $q->where('department_id',$v))
            ->when($request->is_active,fn($q,$v) => $q->where('is_active',$v))
            ->when($request->search,   fn($q,$v) => $q->where(fn($s)=>$s->where('name','like',"%$v%")->orWhere('email','like',"%$v%")->orWhere('employee_id','like',"%$v%")));
        return response()->json($q->orderBy('name')->paginate(20));
    }
    public function store(Request $request) {
        $data = $request->validate(['name'=>'required|max:200','email'=>'required|email|unique:users','password'=>'required|min:8','role_id'=>'required|exists:roles,id','department_id'=>'nullable|exists:departments,id','employee_id'=>'nullable|string|max:50','phone'=>'nullable|string|max:20']);
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);
        return response()->json($user->load(['role','department']),201);
    }
    public function show($id) { return response()->json(User::with(['role','department'])->findOrFail($id)); }
    public function update(Request $request, $id) {
        $user = User::findOrFail($id);
        $data = $request->validate(['name'=>'sometimes|max:200','email'=>"sometimes|email|unique:users,email,$id",'role_id'=>'sometimes|exists:roles,id','department_id'=>'nullable|exists:departments,id','employee_id'=>'nullable|string|max:50','phone'=>'nullable|string|max:20','is_active'=>'sometimes|boolean']);
        $user->update($data);
        return response()->json($user->fresh(['role','department']));
    }
    public function destroy($id) { User::findOrFail($id)->delete(); return response()->json(['message'=>'User deleted.']); }
    public function departments() { return response()->json(Department::with('head')->orderBy('name')->get()); }
    public function roles() { return response()->json(Role::orderBy('name')->get()); }
}
