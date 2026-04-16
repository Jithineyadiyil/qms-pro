<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SlaDefinition;
use App\Models\SlaMetric;
use App\Models\SlaMeasurement;
use App\Models\User;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SlaController — full SLA management.
 *
 * Fixes applied:
 *  1. Added /clients, /departments, /{id}/activate, /{id}/suspend routes (were missing)
 *  2. recordMeasurement() now auto-computes measurement status (met/warning/breached)
 *  3. SlaDefinition::$timestamps = false handled — created_at manual on store
 */
class SlaController extends Controller
{
    // ── GET /api/sla ──────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $q = SlaDefinition::with(['client', 'department', 'metrics'])
            ->when($request->status,    fn ($q, $v) => $q->where('status', $v))
            ->when($request->client_id, fn ($q, $v) => $q->where('client_id', $v))
            ->when($request->search,    fn ($q, $v) => $q->where('name', 'like', "%$v%"));

        return response()->json($q->orderByDesc('created_at')->paginate(15));
    }

    // ── POST /api/sla ─────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'description'           => 'nullable|string',
            'client_id'             => 'nullable|exists:clients,id',
            'department_id'         => 'nullable|exists:departments,id',
            'category'              => 'nullable|string|max:100',
            'response_time_hours'   => 'nullable|integer|min:1',
            'resolution_time_hours' => 'nullable|integer|min:1',
            'availability_percent'  => 'nullable|numeric|min:0|max:100',
            'penalty_clause'        => 'nullable|string',
            'reward_clause'         => 'nullable|string',
            'effective_from'        => 'required|date',
            'effective_to'          => 'nullable|date|after:effective_from',
            'status'                => 'nullable|in:draft,active,expired,suspended',
        ]);

        $data['status'] = $data['status'] ?? 'draft';
        $data['created_at'] = now();   // manual because timestamps=false

        $sla = SlaDefinition::create($data);
        return response()->json($sla->load(['client', 'department']), 201);
    }

    // ── GET /api/sla/{id} ─────────────────────────────────────────────────────
    public function show(int $id): JsonResponse
    {
        return response()->json(
            SlaDefinition::with(['client', 'department', 'metrics',
                'measurements.metric', 'measurements.recordedBy'])
                ->findOrFail($id)
        );
    }

    // ── PUT /api/sla/{id} ─────────────────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $sla = SlaDefinition::findOrFail($id);
        $sla->update($request->validate([
            'name'                  => 'sometimes|required|string|max:255',
            'description'           => 'nullable|string',
            'client_id'             => 'nullable|exists:clients,id',
            'department_id'         => 'nullable|exists:departments,id',
            'category'              => 'nullable|string|max:100',
            'response_time_hours'   => 'nullable|integer|min:1',
            'resolution_time_hours' => 'nullable|integer|min:1',
            'availability_percent'  => 'nullable|numeric|min:0|max:100',
            'penalty_clause'        => 'nullable|string',
            'reward_clause'         => 'nullable|string',
            'effective_from'        => 'nullable|date',
            'effective_to'          => 'nullable|date',
            'status'                => 'nullable|in:draft,active,expired,suspended',
        ]));
        return response()->json($sla->fresh(['client', 'department']));
    }

    // ── DELETE /api/sla/{id} ──────────────────────────────────────────────────
    public function destroy(int $id): JsonResponse
    {
        SlaDefinition::findOrFail($id)->delete();
        return response()->json(['message' => 'SLA deleted.']);
    }

    // ── POST /api/sla/{id}/activate ───────────────────────────────────────────
    public function activate(int $id): JsonResponse
    {
        $sla = SlaDefinition::findOrFail($id);
        $sla->update(['status' => 'active']);
        return response()->json($sla->fresh());
    }

    // ── POST /api/sla/{id}/suspend ────────────────────────────────────────────
    public function suspend(int $id): JsonResponse
    {
        $sla = SlaDefinition::findOrFail($id);
        $sla->update(['status' => 'suspended']);
        return response()->json($sla->fresh());
    }

    // ── GET /api/sla/{id}/metrics ─────────────────────────────────────────────
    public function metrics(int $id): JsonResponse
    {
        SlaDefinition::findOrFail($id);
        return response()->json(SlaMetric::where('sla_id', $id)->get());
    }

    // ── POST /api/sla/{id}/metrics ────────────────────────────────────────────
    public function addMetric(Request $request, int $id): JsonResponse
    {
        SlaDefinition::findOrFail($id);
        $metric = SlaMetric::create(array_merge(
            $request->validate([
                'metric_name'           => 'required|string|max:150',
                'target_value'          => 'required|numeric',
                'unit'                  => 'nullable|string|max:50',
                'measurement_frequency' => 'nullable|in:daily,weekly,monthly,quarterly',
                'threshold_warning'     => 'nullable|numeric',
                'threshold_critical'    => 'nullable|numeric',
            ]),
            ['sla_id' => $id]
        ));
        return response()->json($metric, 201);
    }

    // ── GET /api/sla/{id}/measurements ────────────────────────────────────────
    public function measurements(int $id): JsonResponse
    {
        SlaDefinition::findOrFail($id);
        return response()->json(
            SlaMeasurement::with(['metric', 'recordedBy'])
                ->where('sla_id', $id)
                ->orderByDesc('period_start')
                ->get()
        );
    }

    // ── POST /api/sla/{id}/measurements ──────────────────────────────────────
    public function recordMeasurement(Request $request, int $id): JsonResponse
    {
        SlaDefinition::findOrFail($id);
        $data = $request->validate([
            'metric_id'         => 'required|exists:sla_metrics,id',
            'period_start'      => 'required|date',
            'period_end'        => 'required|date|after_or_equal:period_start',
            'actual_value'      => 'required|numeric',
            'target_value'      => 'required|numeric',
            'threshold_warning' => 'nullable|numeric',
            'notes'             => 'nullable|string',
        ]);

        // Auto-compute measurement status
        $actual  = (float) $data['actual_value'];
        $target  = (float) $data['target_value'];
        $warning = isset($data['threshold_warning']) ? (float) $data['threshold_warning'] : null;

        if ($actual >= $target) {
            $status = 'met';
        } elseif ($warning !== null && $actual >= $warning) {
            $status = 'warning';
        } else {
            $status = 'breached';
        }

        $data['sla_id']         = $id;
        $data['recorded_by_id'] = $request->user()->id;
        $data['status']         = $status;
        $data['created_at']     = now();   // manual — timestamps=false

        $m = SlaMeasurement::create($data);
        return response()->json($m->load(['metric', 'recordedBy']), 201);
    }

    // ── GET /api/sla/stats ────────────────────────────────────────────────────
    public function stats(): JsonResponse
    {
        $all      = SlaDefinition::count();
        $active   = SlaDefinition::where('status', 'active')->count();
        $expired  = SlaDefinition::where('status', 'expired')->count();
        $expiring = SlaDefinition::where('status', 'active')
            ->whereNotNull('effective_to')
            ->where('effective_to', '<=', now()->addDays(30))
            ->count();

        $total_m  = SlaMeasurement::count();
        $met_m    = SlaMeasurement::where('status', 'met')->count();
        $avg_comp = $total_m > 0 ? round($met_m / $total_m * 100, 1) : null;

        $breached = SlaMeasurement::where('status', 'breached')
            ->whereDate('period_end', '>=', now()->subDays(30))
            ->count();

        return response()->json([
            'total'          => $all,
            'active'         => $active,
            'expired'        => $expired,
            'expiring_soon'  => $expiring,
            'avg_compliance' => $avg_comp,
            'breached_30d'   => $breached,
        ]);
    }

    // ── GET /api/sla/dashboard ────────────────────────────────────────────────
    public function dashboard(): JsonResponse
    {
        $slas = SlaDefinition::where('status', 'active')
            ->with(['client', 'metrics', 'measurements' => fn ($q) => $q->orderByDesc('period_start')])
            ->get()
            ->map(function ($sla) {
                $measurements = $sla->measurements;
                $total = $measurements->count();
                $met   = $measurements->where('status', 'met')->count();
                $sla->compliance_percent  = $total > 0 ? round($met / $total * 100, 1) : null;
                $sla->latest_measurement  = $measurements->first();
                unset($sla->measurements);
                return $sla;
            });

        return response()->json($slas);
    }

    // ── GET /api/sla/clients ──────────────────────────────────────────────────
    public function clients(): JsonResponse
    {
        return response()->json(
            Client::where('status', 'active')->select('id', 'name', 'type')->orderBy('name')->get()
        );
    }

    // ── GET /api/sla/departments ──────────────────────────────────────────────
    public function departments(): JsonResponse
    {
        return response()->json(Department::orderBy('name')->get());
    }

    // ── GET /api/sla/users ────────────────────────────────────────────────────
    public function users(): JsonResponse
    {
        return response()->json(
            User::select('id', 'name', 'email')->where('is_active', 1)->orderBy('name')->get()
        );
    }
}
