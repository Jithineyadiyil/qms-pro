<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Objective, KeyResult, KrCheckIn, User, Department};
use Illuminate\Http\Request;

class OkrController extends Controller {

    public function index(Request $request) {
        $q = Objective::with(['owner','department','keyResults.owner'])
            ->when($request->status,       fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,         fn($q,$v)=>$q->where('type',$v))
            ->when($request->department_id,fn($q,$v)=>$q->where('department_id',$v))
            ->when($request->owner_id,     fn($q,$v)=>$q->where('owner_id',$v))
            ->when($request->search,       fn($q,$v)=>$q->where('title','like',"%$v%"))
            ->whereNull('parent_id'); // top-level only
        return response()->json($q->orderByDesc('created_at')->paginate(20));
    }

    public function store(Request $request) {
        $data = $request->validate([
            'title'         => 'required|string',
            'description'   => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'type'          => 'in:company,department,team,individual',
            'status'        => 'in:draft,active,at_risk,completed,cancelled',
            'period_start'  => 'required|date',
            'period_end'    => 'required|date|after:period_start',
            'parent_id'     => 'nullable|exists:objectives,id',
            'key_results'              => 'nullable|array',
            'key_results.*.title'      => 'required|string',
            'key_results.*.target_value'=> 'required|numeric',
            'key_results.*.start_value' => 'nullable|numeric',
            'key_results.*.metric_type' => 'nullable|in:percentage,number,boolean,currency',
            'key_results.*.unit'        => 'nullable|string',
            'key_results.*.owner_id'    => 'nullable|exists:users,id',
        ]);
        $data['owner_id'] = $request->user()->id;
        $data['status']   = $data['status'] ?? 'draft';
        $krs = $data['key_results'] ?? [];
        unset($data['key_results']);

        $obj = Objective::create($data);
        foreach ($krs as $kr) {
            $obj->keyResults()->create(array_merge($kr, [
                'owner_id' => $kr['owner_id'] ?? $request->user()->id,
            ]));
        }
        return response()->json($obj->load(['owner','department','keyResults.owner']), 201);
    }

    public function show($id) {
        return response()->json(
            Objective::with(['owner','department','keyResults.owner','keyResults.checkIns.checkedBy','parent','children.keyResults'])
                ->findOrFail($id)
        );
    }

    public function update(Request $request, $id) {
        $obj = Objective::findOrFail($id);
        $obj->update($request->validate([
            'title'          => 'sometimes|required|string',
            'description'    => 'nullable|string',
            'status'         => 'in:draft,active,at_risk,completed,cancelled',
            'period_start'   => 'nullable|date',
            'period_end'     => 'nullable|date',
            'progress_percent'=> 'nullable|numeric|min:0|max:100',
            'department_id'  => 'nullable|exists:departments,id',
        ]));
        return response()->json($obj->fresh(['owner','department','keyResults']));
    }

    public function destroy($id) {
        Objective::findOrFail($id)->delete();
        return response()->json(['message' => 'Objective deleted.']);
    }

    public function keyResults($id) {
        Objective::findOrFail($id);
        return response()->json(KeyResult::with(['owner','checkIns.checkedBy'])->where('objective_id',$id)->get());
    }

    public function addKeyResult(Request $request, $id) {
        Objective::findOrFail($id);
        $kr = KeyResult::create(array_merge(
            $request->validate([
                'title'        => 'required|string',
                'description'  => 'nullable|string',
                'metric_type'  => 'in:percentage,number,boolean,currency',
                'start_value'  => 'nullable|numeric',
                'target_value' => 'required|numeric',
                'current_value'=> 'nullable|numeric',
                'unit'         => 'nullable|string',
                'owner_id'     => 'nullable|exists:users,id',
            ]),
            ['objective_id' => $id, 'owner_id' => $request->input('owner_id', $request->user()->id)]
        ));
        return response()->json($kr->load('owner'), 201);
    }

    public function updateKeyResult(Request $request, $objId, $krId) {
        $kr = KeyResult::where('objective_id',$objId)->findOrFail($krId);
        $kr->update($request->validate([
            'title'         => 'sometimes|required|string',
            'target_value'  => 'nullable|numeric',
            'current_value' => 'nullable|numeric',
            'status'        => 'in:on_track,at_risk,off_track,completed',
            'unit'          => 'nullable|string',
        ]));
        // Recalculate parent objective progress
        $this->recalcObjectiveProgress($objId);
        return response()->json($kr->fresh());
    }

    public function checkIn(Request $request, $objId, $krId) {
        $kr = KeyResult::where('objective_id',$objId)->findOrFail($krId);
        $data = $request->validate([
            'value'           => 'required|numeric',
            'notes'           => 'nullable|string',
            'confidence_level'=> 'nullable|integer|between:1,10',
            'status'          => 'nullable|in:on_track,at_risk,off_track,completed',
        ]);
        $ci = KrCheckIn::create(array_merge($data, [
            'key_result_id' => $krId,
            'checked_by_id' => $request->user()->id,
        ]));
        $kr->update([
            'current_value' => $data['value'],
            'status'        => $data['status'] ?? $kr->status,
        ]);
        $this->recalcObjectiveProgress($objId);
        return response()->json($ci->load('checkedBy'), 201);
    }

    private function recalcObjectiveProgress($objId) {
        $krs = KeyResult::where('objective_id', $objId)->get();
        if ($krs->isEmpty()) return;
        $avg = $krs->avg('progress_percent');
        Objective::where('id', $objId)->update(['progress_percent' => round($avg ?? 0, 2)]);
    }

    public function stats() {
        $byStatus = Objective::selectRaw('status, count(*) as total')->groupBy('status')->get();
        $byType   = Objective::selectRaw('type, count(*) as total')->groupBy('type')->get();
        $krStats  = KeyResult::selectRaw('status, count(*) as total')->groupBy('status')->get();
        $avgProg  = Objective::where('status','active')->avg('progress_percent');
        return response()->json([
            'by_status'   => $byStatus,
            'by_type'     => $byType,
            'kr_by_status'=> $krStats,
            'avg_progress'=> $avgProg ? round($avgProg, 1) : 0,
        ]);
    }

    public function tree() {
        $objectives = Objective::with(['owner','keyResults','children.keyResults'])
            ->whereNull('parent_id')
            ->get();
        return response()->json($objectives);
    }

    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }

    public function departments() {
        return response()->json(Department::orderBy('name')->get());
    }
}
