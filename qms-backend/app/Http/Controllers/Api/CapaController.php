<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Capa, CapaTask, Nonconformance, User, Department};
use Illuminate\Http\Request;

class CapaController extends Controller {

    /** QA Manager / Super Admin see everything. Others scoped to their department. */
    private function isFullAccess(): bool {
        $perms = auth()->user()->role->permissions ?? [];
        return in_array('*', $perms) || in_array('capa.*', $perms);
    }

    private function scopedBase() {
        if ($this->isFullAccess()) return Capa::query();
        $user = auth()->user();
        return Capa::where(function($q) use ($user) {
            $q->where('department_id', $user->department_id)
              ->orWhere('owner_id', $user->id);
        });
    }

    public function index(Request $request) {
        $q = $this->scopedBase()
            ->with(['owner','department','nonconformance'])
            ->when($request->status,  fn($q,$v) => $q->where('status',$v))
            ->when($request->type,    fn($q,$v) => $q->where('type',$v))
            ->when($request->priority,fn($q,$v) => $q->where('priority',$v))
            ->when($request->owner_id,fn($q,$v) => $q->where('owner_id',$v))
            ->when($request->search,  fn($q,$v) => $q->where(fn($s)=>$s->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")));
        return response()->json($q->orderByDesc('created_at')->paginate(15));
    }

    public function store(Request $request) {
        $data = $request->validate([
            'nc_id'                  => 'nullable|exists:nonconformances,id',
            'title'                  => 'required|max:255',
            'description'            => 'required',
            'type'                   => 'required|in:corrective,preventive',
            'department_id'          => 'nullable|exists:departments,id',
            'priority'               => 'required|in:low,medium,high,critical',
            'target_date'            => 'required|date',
            'root_cause_analysis'    => 'nullable',
            'action_plan'            => 'nullable',
            'effectiveness_criteria' => 'nullable',
        ]);
        $data['owner_id']     = $request->user()->id;
        $data['reference_no'] = 'CAPA-' . date('Y') . '-' . str_pad(Capa::count()+1,4,'0',STR_PAD_LEFT);
        if (!empty($data['nc_id'])) {
            Nonconformance::find($data['nc_id'])?->update(['status' => 'capa_in_progress']);
        }
        $capa = Capa::create($data);
        return response()->json($capa->load(['owner','department','nonconformance']), 201);
    }

    public function show($id) {
        $capa = Capa::with(['owner','department','nonconformance','tasks.responsible'])->findOrFail($id);

        if (!$this->isFullAccess()) {
            $user = auth()->user();
            $allowed = $capa->department_id == $user->department_id
                    || $capa->owner_id == $user->id;
            if (!$allowed) abort(403, 'You do not have access to this CAPA.');
        }

        return response()->json($capa);
    }

    public function update(Request $request, $id) {
        $capa = Capa::findOrFail($id);
        $capa->update($request->only([
            'title','description','priority','status','target_date',
            'actual_completion_date','root_cause_analysis','action_plan',
            'effectiveness_criteria','effectiveness_result','owner_id',
        ]));
        return response()->json($capa->fresh(['owner','department']));
    }

    public function destroy($id) {
        Capa::findOrFail($id)->delete();
        return response()->json(['message' => 'CAPA deleted.']);
    }

    public function addTask(Request $request, $id) {
        $capa = Capa::findOrFail($id);
        if ($capa->status === 'open') $capa->update(['status' => 'in_progress']);
        $task = $capa->tasks()->create($request->validate([
            'task_description' => 'required',
            'responsible_id'   => 'required|exists:users,id',
            'due_date'         => 'required|date',
        ]));
        return response()->json($task->load('responsible'), 201);
    }

    public function updateTask(Request $request, $id, $taskId) {
        $task = CapaTask::where('capa_id',$id)->findOrFail($taskId);
        $task->update($request->only(['task_description','responsible_id','due_date','status','completion_notes']));
        if ($request->status === 'completed') $task->update(['completed_at' => now()]);
        return response()->json($task->fresh('responsible'));
    }

    public function completeTask(Request $request, $id, $taskId) {
        $task = CapaTask::where('capa_id',$id)->findOrFail($taskId);
        $task->update(['status' => 'completed', 'completion_notes' => $request->completion_notes, 'completed_at' => now()]);
        return response()->json($task->fresh());
    }

    public function effectivenessReview(Request $request, $id) {
        $capa = Capa::findOrFail($id);
        $capa->update([
            'status'                       => 'closed',
            'effectiveness_result'         => $request->validate(['effectiveness_result' => 'required'])['effectiveness_result'],
            'effectiveness_verified_by_id' => $request->user()->id,
            'effectiveness_verified_at'    => now(),
            'actual_completion_date'       => now(),
        ]);
        if ($capa->nc_id) {
            Nonconformance::find($capa->nc_id)?->update([
                'status'              => 'closed',
                'actual_closure_date' => now()->toDateString(),
            ]);
        }
        return response()->json($capa->fresh());
    }

    public function close(Request $request, $id) {
        $capa = Capa::findOrFail($id);
        $capa->update(['status' => 'closed', 'actual_completion_date' => now()]);
        return response()->json($capa->fresh());
    }

    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }

    public function departments() {
        return response()->json(Department::select('id','name')->orderBy('name')->get());
    }

    public function openNcs() {
        return response()->json(Nonconformance::whereNotIn('status',['closed','cancelled'])->select('id','reference_no','title','severity')->orderByDesc('created_at')->get());
    }

    public function stats() {
        $base = $this->scopedBase();
        $byStatus = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total','status');
        return response()->json([
            'by_status'         => $byStatus,
            'by_type'           => (clone $base)->selectRaw('type, count(*) as total')->groupBy('type')->get(),
            'open'              => (clone $base)->whereNotIn('status',['closed','cancelled'])->count(),
            'overdue'           => (clone $base)->whereNotNull('target_date')->where('target_date','<',now())->whereNotIn('status',['closed','cancelled'])->count(),
            'in_progress'       => (clone $base)->where('status','in_progress')->count(),
            'closed_this_month' => (clone $base)->where('status','closed')->whereMonth('updated_at',now()->month)->count(),
        ]);
    }
}
