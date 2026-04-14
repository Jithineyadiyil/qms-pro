<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{SlaDefinition, SlaMetric, SlaMeasurement, User, Client, Department};
use Illuminate\Http\Request;

class SlaController extends Controller {

    public function index(Request $request) {
        $q = SlaDefinition::with(['client','department','metrics'])
            ->when($request->status,    fn($q,$v)=>$q->where('status',$v))
            ->when($request->client_id, fn($q,$v)=>$q->where('client_id',$v))
            ->when($request->search,    fn($q,$v)=>$q->where('name','like',"%$v%"));
        return response()->json($q->orderByDesc('created_at')->paginate(15));
    }

    public function store(Request $request) {
        $data = $request->validate([
            'name'                  => 'required|string',
            'description'           => 'nullable|string',
            'client_id'             => 'nullable|exists:clients,id',
            'department_id'         => 'nullable|exists:departments,id',
            'category'              => 'nullable|string',
            'response_time_hours'   => 'nullable|integer|min:1',
            'resolution_time_hours' => 'nullable|integer|min:1',
            'availability_percent'  => 'nullable|numeric|min:0|max:100',
            'penalty_clause'        => 'nullable|string',
            'reward_clause'         => 'nullable|string',
            'effective_from'        => 'required|date',
            'effective_to'          => 'nullable|date|after:effective_from',
            'status'                => 'in:draft,active,expired,suspended',
        ]);
        $data['status'] = $data['status'] ?? 'draft';
        $sla = SlaDefinition::create($data);
        return response()->json($sla->load(['client','department']), 201);
    }

    public function show($id) {
        return response()->json(
            SlaDefinition::with(['client','department','metrics','measurements.metric','measurements.recordedBy'])
                ->findOrFail($id)
        );
    }

    public function update(Request $request, $id) {
        $sla = SlaDefinition::findOrFail($id);
        $sla->update($request->validate([
            'name'                  => 'sometimes|required|string',
            'description'           => 'nullable|string',
            'client_id'             => 'nullable|exists:clients,id',
            'department_id'         => 'nullable|exists:departments,id',
            'category'              => 'nullable|string',
            'response_time_hours'   => 'nullable|integer',
            'resolution_time_hours' => 'nullable|integer',
            'availability_percent'  => 'nullable|numeric',
            'penalty_clause'        => 'nullable|string',
            'reward_clause'         => 'nullable|string',
            'effective_from'        => 'nullable|date',
            'effective_to'          => 'nullable|date',
            'status'                => 'in:draft,active,expired,suspended',
        ]));
        return response()->json($sla->fresh(['client','department']));
    }

    public function destroy($id) {
        SlaDefinition::findOrFail($id)->delete();
        return response()->json(['message' => 'SLA deleted.']);
    }

    public function activate($id) {
        $sla = SlaDefinition::findOrFail($id);
        $sla->update(['status' => 'active']);
        return response()->json($sla->fresh());
    }

    public function suspend($id) {
        $sla = SlaDefinition::findOrFail($id);
        $sla->update(['status' => 'suspended']);
        return response()->json($sla->fresh());
    }

    public function metrics($id) {
        SlaDefinition::findOrFail($id);
        return response()->json(SlaMetric::where('sla_id', $id)->get());
    }

    public function addMetric(Request $request, $id) {
        SlaDefinition::findOrFail($id);
        $metric = SlaMetric::create(array_merge(
            $request->validate([
                'metric_name'           => 'required|string',
                'target_value'          => 'required|numeric',
                'unit'                  => 'nullable|string',
                'measurement_frequency' => 'in:daily,weekly,monthly,quarterly',
                'threshold_warning'     => 'nullable|numeric',
                'threshold_critical'    => 'nullable|numeric',
            ]),
            ['sla_id' => $id]
        ));
        return response()->json($metric, 201);
    }

    public function measurements($id) {
        SlaDefinition::findOrFail($id);
        return response()->json(
            SlaMeasurement::with(['metric','recordedBy'])
                ->where('sla_id', $id)
                ->orderByDesc('period_start')
                ->get()
        );
    }

    public function recordMeasurement(Request $request, $id) {
        SlaDefinition::findOrFail($id);
        $data = $request->validate([
            'metric_id'         => 'required|exists:sla_metrics,id',
            'period_start'      => 'required|date',
            'period_end'        => 'required|date',
            'actual_value'      => 'required|numeric',
            'target_value'      => 'required|numeric',
            'threshold_warning' => 'nullable|numeric',
            'notes'             => 'nullable|string',
        ]);
        $data['sla_id']          = $id;
        $data['recorded_by_id']  = $request->user()->id;
        $m = SlaMeasurement::create($data);
        return response()->json($m->load(['metric','recordedBy']), 201);
    }

    public function stats() {
        $all     = SlaDefinition::count();
        $active  = SlaDefinition::where('status','active')->count();
        $expired = SlaDefinition::where('status','expired')->count();
        $expiring= SlaDefinition::where('status','active')
            ->whereNotNull('effective_to')
            ->where('effective_to','<=', now()->addDays(30))
            ->count();

        // avg compliance from measurements: met / total * 100
        $total_m  = SlaMeasurement::count();
        $met_m    = SlaMeasurement::where('status','met')->count();
        $avg_comp = $total_m > 0 ? round($met_m / $total_m * 100, 1) : null;

        $breached = SlaMeasurement::where('status','breached')
            ->whereDate('period_end', '>=', now()->subDays(30))
            ->count();

        return response()->json([
            'total'           => $all,
            'active'          => $active,
            'expired'         => $expired,
            'expiring_soon'   => $expiring,
            'avg_compliance'  => $avg_comp,
            'breached_30d'    => $breached,
        ]);
    }

    public function dashboard() {
        $slas = SlaDefinition::where('status','active')
            ->with(['client','metrics','measurements' => fn($q)=>$q->orderByDesc('period_start')])
            ->get()
            ->map(function($sla) {
                $measurements = $sla->measurements;
                $total = $measurements->count();
                $met   = $measurements->where('status','met')->count();
                $sla->compliance_percent = $total > 0 ? round($met / $total * 100, 1) : null;
                $sla->latest_measurement = $measurements->first();
                unset($sla->measurements);
                return $sla;
            });
        return response()->json($slas);
    }

    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }
    public function clients() {
        return response()->json(Client::where('status','active')->select('id','name','type')->orderBy('name')->get());
    }
    public function departments() {
        return response()->json(Department::orderBy('name')->get());
    }
}
