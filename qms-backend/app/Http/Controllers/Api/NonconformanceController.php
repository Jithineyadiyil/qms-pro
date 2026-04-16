<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Nonconformance, NcCategory, User, Department};
use Illuminate\Http\Request;

class NonconformanceController extends Controller {

    /** QA Manager / Super Admin see everything. Others scoped to their department. */
    private function isFullAccess(): bool {
        $perms = auth()->user()->role->permissions ?? [];
        return in_array('*', $perms) || in_array('nc.*', $perms);
    }

    public function index(Request $request) {
        $q = Nonconformance::with(['category','detectedBy','assignedTo','department'])
            ->when($request->status,        fn($q,$v) => $q->where('status',$v))
            ->when($request->severity,      fn($q,$v) => $q->where('severity',$v))
            ->when($request->source,        fn($q,$v) => $q->where('source',$v))
            ->when($request->department_id, fn($q,$v) => $q->where('department_id',$v))
            ->when($request->search,        fn($q,$v) => $q->where(fn($s)=>$s->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")));

        // Scope to user's department if not full-access role
        if (!$this->isFullAccess()) {
            $deptId = auth()->user()->department_id;
            $userId = auth()->id();
            $q->where(function($query) use ($deptId, $userId) {
                $query->where('department_id', $deptId)
                      ->orWhere('detected_by_id', $userId)
                      ->orWhere('assigned_to_id', $userId);
            });
        }

        return response()->json($q->orderByDesc('created_at')->paginate(15));
    }

    public function store(Request $request) {
        if (!auth()->user()->hasPermission('nc.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }
        $data = $request->validate([
            'title'               => 'required|max:255',
            'description'         => 'required',
            'category_id'         => 'nullable|exists:nc_categories,id',
            'department_id'       => 'nullable|exists:departments,id',
            'severity'            => 'required|in:minor,major,critical',
            'source'              => 'required',
            'detection_date'      => 'required|date',
            'target_closure_date' => 'nullable|date',
            'immediate_action'    => 'nullable|string',
        ]);
        $data['detected_by_id'] = $request->user()->id;
        $data['reference_no']   = 'NC-' . date('Y') . '-' . str_pad(Nonconformance::count()+1,4,'0',STR_PAD_LEFT);
        $data['status']         = 'open';
        $nc = Nonconformance::create($data);
        return response()->json($nc->load(['category','detectedBy','department']), 201);
    }

    public function show($id) {
        $nc = Nonconformance::with(['category','detectedBy','assignedTo','department','capas.owner','capas.tasks'])->findOrFail($id);

        // Non-full-access users can only view NCs in their dept, raised by them, or assigned to them
        if (!$this->isFullAccess()) {
            $user = auth()->user();
            $allowed = $nc->department_id == $user->department_id
                    || $nc->detected_by_id == $user->id
                    || $nc->assigned_to_id == $user->id;
            if (!$allowed) abort(403, 'You do not have access to this non-conformance.');
        }

        return response()->json($nc);
    }

    public function update(Request $request, $id) {
        $nc = Nonconformance::findOrFail($id);
        $nc->update($request->validate([
            'title'               => 'sometimes|max:255',
            'description'         => 'sometimes',
            'severity'            => 'sometimes|in:minor,major,critical',
            'status'              => 'sometimes',
            'assigned_to_id'      => 'nullable|exists:users,id',
            'target_closure_date' => 'nullable|date',
            'immediate_action'    => 'nullable',
            'root_cause'          => 'nullable',
        ]));
        return response()->json($nc->fresh(['category','detectedBy','assignedTo','department']));
    }

    public function destroy($id) {
        Nonconformance::findOrFail($id)->delete();
        return response()->json(['message' => 'NC deleted.']);
    }

    public function assign(Request $request, $id) {
        $nc = Nonconformance::findOrFail($id);
        $nc->update([
            'assigned_to_id' => $request->validate(['user_id' => 'required|exists:users,id'])['user_id'],
            'status'         => 'under_investigation',
        ]);
        return response()->json($nc->fresh(['assignedTo']));
    }

    public function startInvestigation(Request $request, $id) {
        $nc = Nonconformance::findOrFail($id);
        $nc->update(['status' => 'under_investigation', 'root_cause' => $request->root_cause]);
        return response()->json($nc->fresh());
    }

    public function close(Request $request, $id) {
        $request->validate(['actual_closure_date' => 'required|date']);
        $nc = Nonconformance::findOrFail($id);
        $nc->update([
            'status'              => 'closed',
            'actual_closure_date' => $request->actual_closure_date,
            'root_cause'          => $request->root_cause,
        ]);
        return response()->json($nc->fresh());
    }

    public function raiseCapa($id) {
        $nc = Nonconformance::findOrFail($id);
        $nc->update(['status' => 'pending_capa']);
        return response()->json(['message' => 'NC status updated to pending_capa.', 'nc_id' => $id]);
    }

    public function categories() { return response()->json(NcCategory::orderBy('name')->get()); }

    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }

    public function departments() {
        return response()->json(Department::select('id','name')->orderBy('name')->get());
    }

    public function stats() {
        $base = $this->isFullAccess()
            ? Nonconformance::query()
            : Nonconformance::where(function($q) {
                $user = auth()->user();
                $q->where('department_id', $user->department_id)
                  ->orWhere('detected_by_id', $user->id)
                  ->orWhere('assigned_to_id', $user->id);
              });

        $byStatus   = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total','status');
        $bySeverity = (clone $base)->selectRaw('severity, count(*) as total')->groupBy('severity')->pluck('total','severity');

        return response()->json([
            'by_status'         => $byStatus,
            'by_severity'       => $bySeverity,
            'open'              => (clone $base)->whereNotIn('status',['closed','cancelled'])->count(),
            'critical'          => (clone $base)->where('severity','critical')->whereNotIn('status',['closed','cancelled'])->count(),
            'overdue'           => (clone $base)->whereNotNull('target_closure_date')->where('target_closure_date','<',now())->whereNotIn('status',['closed','cancelled'])->count(),
            'closed_this_month' => (clone $base)->where('status','closed')->whereMonth('updated_at',now()->month)->whereYear('updated_at',now()->year)->count(),
            'total'             => (clone $base)->count(),
        ]);
    }
}
