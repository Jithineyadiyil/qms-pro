<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{QmsRequest, Nonconformance, Capa, Risk, Audit, Complaint, Document,
                Vendor, VendorContract, VendorEvaluation, Visit, Survey, Objective,
                SlaDefinition, SlaMeasurement, User, Client};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ReportController
 *
 * All analytics endpoints respect the from/to date range.
 * Record endpoints support pagination, search, and filter params.
 *
 * Fixes applied:
 *  - avg_closure_days now uses actual_closure_date (not updated_at)
 *  - NC / CAPA monthly "closed" counts use actual_closure_date / actual_completion_date
 *  - recSummary totals added to all record endpoints for accurate chip display
 */
class ReportController extends Controller
{
    private function dateRange(Request $r): array
    {
        return [
            $r->from ?? now()->startOfYear()->toDateString(),
            $r->to   ?? now()->toDateString(),
        ];
    }

    // ── KPI Summary ────────────────────────────────────────────────────────

    // ── DB-driver-aware SQL helpers ────────────────────────────────────────
    private function sqlHourDiff(string $end, string $start): string
    {
        if (\DB::connection()->getDriverName() === 'sqlite') {
            return "CAST((julianday($end) - julianday($start)) * 24 AS INTEGER)";
        }
        return "TIMESTAMPDIFF(HOUR,$start,$end)";
    }

    private function sqlDateDiff(string $end, string $start): string
    {
        if (\DB::connection()->getDriverName() === 'sqlite') {
            return "CAST(julianday($end) - julianday($start) AS INTEGER)";
        }
        return "DATEDIFF($end,$start)";
    }

    public function kpiSummary(Request $request)
    {
        if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }
        [$from, $to] = $this->dateRange($request);

        $ncTotal   = Nonconformance::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $ncClosed  = Nonconformance::where('status','closed')->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $ncRate    = $ncTotal > 0 ? round($ncClosed / $ncTotal * 100, 1) : 0;

        $capaClosed = Capa::where('status','closed')->whereNotNull('actual_completion_date')
                        ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $capaOnTime = Capa::where('status','closed')->whereNotNull('actual_completion_date')
                        ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
                        ->whereColumn('actual_completion_date','<=','target_date')->count();
        $capaRate   = $capaClosed > 0 ? round($capaOnTime / $capaClosed * 100, 1) : 0;

        $avgResH = round(Complaint::whereIn('status',['resolved','closed'])
            ->whereNotNull('actual_resolution_date')
            ->whereBetween('received_date', [$from, $to])
            ->selectRaw("AVG(" . $this->sqlHourDiff('actual_resolution_date','received_date') . ") as avg_h")
            ->value('avg_h') ?? 0, 1);

        $auditTotal = Audit::whereBetween('planned_start_date', [$from, $to])->count();
        $auditDone  = Audit::whereBetween('planned_start_date', [$from, $to])
                        ->whereIn('status',['completed','report_issued'])->count();
        $auditRate  = $auditTotal > 0 ? round($auditDone / $auditTotal * 100, 1) : 0;

        $docTotal    = DB::table('documents')->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $docApproved = DB::table('documents')->where('status','approved')
                        ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $docRate     = $docTotal > 0 ? round($docApproved / $docTotal * 100, 1) : 0;

        $slaMeasured   = SlaMeasurement::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $slaMet        = SlaMeasurement::where('status','met')
                           ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $slaCompliance = $slaMeasured > 0 ? round($slaMet / $slaMeasured * 100, 1) : 0;

        $riskTotal   = Risk::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $riskTreated = Risk::whereIn('status',['treatment_in_progress','monitored','closed'])
                         ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count();
        $riskRate    = $riskTotal > 0 ? round($riskTreated / $riskTotal * 100, 1) : 0;

        return response()->json([
            'period'         => ['from' => $from, 'to' => $to],
            'period_summary' => [
                'requests'   => QmsRequest::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count(),
                'ncs'        => $ncTotal,
                'complaints' => Complaint::whereBetween('received_date', [$from, $to])->count(),
            ],
            'kpis' => [
                ['key'=>'nc_closure_rate',      'label'=>'NC Closure Rate',          'value'=>$ncRate,        'unit'=>'%','target'=>90,  'icon'=>'fas fa-triangle-exclamation','color'=>'danger'],
                ['key'=>'capa_on_time',         'label'=>'CAPA On-Time Rate',         'value'=>$capaRate,      'unit'=>'%','target'=>85,  'icon'=>'fas fa-circle-check',        'color'=>'warning'],
                ['key'=>'audit_completion',     'label'=>'Audit Completion Rate',     'value'=>$auditRate,     'unit'=>'%','target'=>100, 'icon'=>'fas fa-magnifying-glass-chart','color'=>'purple'],
                ['key'=>'document_compliance',  'label'=>'Document Compliance',       'value'=>$docRate,       'unit'=>'%','target'=>95,  'icon'=>'fas fa-file-shield',         'color'=>'green'],
                ['key'=>'sla_compliance',       'label'=>'SLA Compliance',            'value'=>$slaCompliance, 'unit'=>'%','target'=>95,  'icon'=>'fas fa-file-contract',       'color'=>'blue'],
                ['key'=>'risk_treatment',       'label'=>'Risk Treatment Rate',       'value'=>$riskRate,      'unit'=>'%','target'=>80,  'icon'=>'fas fa-fire-flame-curved',   'color'=>'danger'],
                ['key'=>'avg_resolution_hours', 'label'=>'Avg Complaint Resolution',  'value'=>$avgResH,       'unit'=>'h','target'=>72,  'icon'=>'fas fa-comment-exclamation', 'color'=>'orange'],
            ],
        ]);
    }

    // ── NC Trend ───────────────────────────────────────────────────────────
    public function ncTrend(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $start  = new \DateTime($from);
        $end    = new \DateTime($to);
        $months = [];
        $cur    = clone $start;
        $cur->modify('first day of this month');
        while ($cur <= $end) {
            $months[] = clone $cur;
            $cur->modify('+1 month');
        }
        if (count($months) > 12) $months = array_slice($months, -12);

        return response()->json([
            'monthly' => array_values(array_map(fn($m) => [
                'month'  => $m->format('M Y'),
                'raised' => Nonconformance::whereYear('created_at', $m->format('Y'))->whereMonth('created_at', $m->format('n'))->count(),
                // FIX: Use actual_closure_date instead of updated_at for closure month
                'closed' => Nonconformance::where('status','closed')
                                ->whereNotNull('actual_closure_date')
                                ->whereYear('actual_closure_date', $m->format('Y'))
                                ->whereMonth('actual_closure_date', $m->format('n'))->count(),
            ], $months)),
            'by_severity'      => Nonconformance::select('severity', DB::raw('count(*) as total'))
                                    ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->groupBy('severity')->get(),
            'by_source'        => Nonconformance::select('source', DB::raw('count(*) as total'))
                                    ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->groupBy('source')->get(),
            'by_department'    => Nonconformance::join('departments','departments.id','=','nonconformances.department_id')
                                    ->select('departments.name', DB::raw('count(*) as total'))
                                    ->whereBetween('nonconformances.created_at', [$from.' 00:00:00', $to.' 23:59:59'])
                                    ->groupBy('departments.name')->get(),
            'status_breakdown' => Nonconformance::select('status', DB::raw('count(*) as total'))
                                    ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->groupBy('status')->get(),
            // FIX: Use actual_closure_date for accurate closure duration
            'avg_closure_days' => round(Nonconformance::where('status','closed')
                ->whereNotNull('actual_closure_date')
                ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
                ->selectRaw("AVG(" . $this->sqlDateDiff('actual_closure_date','created_at') . ") as d")->value('d') ?? 0),
        ]);
    }

    // ── CAPA Effectiveness ────────────────────────────────────────────────
    public function capaEffectiveness(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $base   = Capa::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59']);
        $total  = (clone $base)->count();
        $open   = (clone $base)->where('status','open')->count();
        $closed = (clone $base)->where('status','closed')->count();
        $overdue= (clone $base)->where('status','!=','closed')->whereNotNull('target_date')->whereDate('target_date','<',now())->count();
        $capaCl = (clone $base)->where('status','closed')->whereNotNull('actual_completion_date')->count();
        $onTime = (clone $base)->where('status','closed')->whereNotNull('actual_completion_date')->whereColumn('actual_completion_date','<=','target_date')->count();

        $start  = new \DateTime($from);
        $months = [];
        $cur    = clone $start;
        $cur->modify('first day of this month');
        $endDt  = new \DateTime($to);
        while ($cur <= $endDt) { $months[] = clone $cur; $cur->modify('+1 month'); }
        if (count($months) > 12) $months = array_slice($months, -12);

        return response()->json([
            'summary' => ['total'=>$total,'open'=>$open,'closed'=>$closed,'overdue'=>$overdue,
                          'on_time_rate'=>$capaCl>0?round($onTime/$capaCl*100,1):0],
            'monthly' => array_values(array_map(fn($m) => [
                'month'  => $m->format('M Y'),
                'opened' => Capa::whereYear('created_at',$m->format('Y'))->whereMonth('created_at',$m->format('n'))->count(),
                // FIX: Use actual_completion_date for accurate closure month
                'closed' => Capa::where('status','closed')
                                ->whereNotNull('actual_completion_date')
                                ->whereYear('actual_completion_date',$m->format('Y'))
                                ->whereMonth('actual_completion_date',$m->format('n'))->count(),
            ], $months)),
            'by_type'     => (clone $base)->select('type',DB::raw('count(*) as total'))->groupBy('type')->get(),
            'by_status'   => (clone $base)->select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'by_priority' => (clone $base)->select('priority',DB::raw('count(*) as total'))->groupBy('priority')->get(),
            'avg_days_to_close' => round((clone $base)->where('status','closed')->whereNotNull('actual_completion_date')
                ->selectRaw("AVG(" . $this->sqlDateDiff('actual_completion_date','created_at') . ") as d")->value('d') ?? 0),
        ]);
    }

    // ── Risk Heat Map ─────────────────────────────────────────────────────
    public function riskHeatMap(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $risks = Risk::with(['owner','department','category'])
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->get();

        $matrix = [];
        foreach ($risks as $r) {
            $l = $r->likelihood; $i = $r->impact;
            if ($l && $i) {
                $matrix[$l][$i][] = ['id'=>$r->id,'title'=>$r->title,'reference_no'=>$r->reference_no,'risk_level'=>$r->risk_level,'status'=>$r->status];
            }
        }

        return response()->json([
            'matrix'       => $matrix,
            'by_level'     => Risk::select('risk_level',DB::raw('count(*) as total'))
                                ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])->groupBy('risk_level')->get(),
            'by_category'  => DB::table('risks')->join('risk_categories','risk_categories.id','=','risks.category_id')
                                ->whereBetween('risks.created_at',[$from.' 00:00:00',$to.' 23:59:59'])
                                ->select('risk_categories.name',DB::raw('count(*) as total'))->groupBy('risk_categories.name')->get(),
            'by_treatment' => Risk::select('treatment_strategy',DB::raw('count(*) as total'))
                                ->whereNotNull('treatment_strategy')
                                ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])->groupBy('treatment_strategy')->get(),
            'by_status'    => Risk::select('status',DB::raw('count(*) as total'))
                                ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])->groupBy('status')->get(),
            'top_risks'    => $risks->sortByDesc(fn($r) => $r->likelihood * $r->impact)->take(10)
                ->map(fn($r) => ['id'=>$r->id,'reference_no'=>$r->reference_no,'title'=>$r->title,'risk_level'=>$r->risk_level,
                    'likelihood'=>$r->likelihood,'impact'=>$r->impact,'score'=>$r->likelihood*$r->impact,
                    'treatment_strategy'=>$r->treatment_strategy,'owner'=>$r->owner?->name,
                    'department'=>$r->department?->name,'status'=>$r->status])->values(),
        ]);
    }

    // ── Complaint Trend ───────────────────────────────────────────────────
    public function complaintTrend(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $start  = new \DateTime($from);
        $months = [];
        $cur    = clone $start;
        $cur->modify('first day of this month');
        $endDt  = new \DateTime($to);
        while ($cur <= $endDt) { $months[] = clone $cur; $cur->modify('+1 month'); }
        if (count($months) > 12) $months = array_slice($months, -12);

        return response()->json([
            'monthly' => array_values(array_map(fn($m) => [
                'month'    => $m->format('M Y'),
                'received' => Complaint::whereYear('received_date',$m->format('Y'))->whereMonth('received_date',$m->format('n'))->count(),
                'resolved' => Complaint::whereIn('status',['resolved','closed'])
                                ->whereNotNull('actual_resolution_date')
                                ->whereYear('actual_resolution_date',$m->format('Y'))
                                ->whereMonth('actual_resolution_date',$m->format('n'))->count(),
            ], $months)),
            'by_severity'      => Complaint::select('severity',DB::raw('count(*) as total'))
                                    ->whereBetween('received_date',[$from,$to])->groupBy('severity')->get(),
            'by_source'        => Complaint::select('source',DB::raw('count(*) as total'))
                                    ->whereBetween('received_date',[$from,$to])->groupBy('source')->get(),
            'by_status'        => Complaint::select('status',DB::raw('count(*) as total'))
                                    ->whereBetween('received_date',[$from,$to])->groupBy('status')->get(),
            'avg_resolution_h' => round(Complaint::whereIn('status',['resolved','closed'])->whereNotNull('actual_resolution_date')
                ->whereBetween('received_date',[$from,$to])
                ->selectRaw("AVG(" . $this->sqlHourDiff('actual_resolution_date','received_date') . ") as h")->value('h') ?? 0, 1),
            'avg_satisfaction' => round(Complaint::whereNotNull('customer_satisfaction')
                ->whereBetween('received_date',[$from,$to])->avg('customer_satisfaction') ?? 0, 1),
            'top_clients'      => DB::table('complaints')->join('clients','clients.id','=','complaints.client_id')
                ->whereBetween('complaints.received_date',[$from,$to])
                ->select('clients.name',DB::raw('count(*) as total'))->groupBy('clients.name')
                ->orderByDesc('total')->limit(5)->get(),
        ]);
    }

    // ── Audit Summary ──────────────────────────────────────────────────────
    public function auditSummary(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $auditTotal = Audit::whereBetween('planned_start_date', [$from, $to])->count();
        $auditDone  = Audit::whereBetween('planned_start_date', [$from, $to])
                        ->whereIn('status',['completed','report_issued'])->count();

        return response()->json([
            'by_type'   => Audit::select('type',DB::raw('count(*) as total'))
                            ->whereBetween('planned_start_date',[$from,$to])->groupBy('type')->get(),
            'by_status' => Audit::select('status',DB::raw('count(*) as total'))
                            ->whereBetween('planned_start_date',[$from,$to])->groupBy('status')->get(),
            'findings'  => [
                'total'       => DB::table('audit_findings')->join('audits','audits.id','=','audit_findings.audit_id')
                                    ->whereBetween('audits.planned_start_date',[$from,$to])->count(),
                'open'        => DB::table('audit_findings')->join('audits','audits.id','=','audit_findings.audit_id')
                                    ->whereBetween('audits.planned_start_date',[$from,$to])->where('audit_findings.status','open')->count(),
                'closed'      => DB::table('audit_findings')->join('audits','audits.id','=','audit_findings.audit_id')
                                    ->whereBetween('audits.planned_start_date',[$from,$to])->where('audit_findings.status','closed')->count(),
                'by_type'     => DB::table('audit_findings')->join('audits','audits.id','=','audit_findings.audit_id')
                                    ->whereBetween('audits.planned_start_date',[$from,$to])
                                    ->select('finding_type',DB::raw('count(*) as total'))->groupBy('finding_type')->get(),
                'by_priority' => DB::table('audit_findings')->join('audits','audits.id','=','audit_findings.audit_id')
                                    ->whereBetween('audits.planned_start_date',[$from,$to])
                                    ->select('priority',DB::raw('count(*) as total'))->groupBy('priority')->get(),
            ],
            'completion_rate' => $auditTotal > 0 ? round($auditDone / $auditTotal * 100, 1) : 0,
            'recent' => Audit::with('leadAuditor')->whereBetween('planned_start_date',[$from,$to])
                ->orderByDesc('planned_start_date')->limit(10)->get()
                ->map(fn($a) => ['id'=>$a->id,'reference_no'=>$a->reference_no,'title'=>$a->title,'type'=>$a->type,
                    'status'=>$a->status,'planned_start_date'=>$a->planned_start_date,
                    'overall_result'=>$a->overall_result,'lead_auditor'=>$a->leadAuditor?->name]),
        ]);
    }

    // ── SLA Compliance ────────────────────────────────────────────────────
    public function slaCompliance(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $defs = SlaDefinition::with(['client','department'])->where('is_active',true)->get();
        $slas = $defs->map(function($def) use ($from, $to) {
            $measurements = SlaMeasurement::where('sla_definition_id', $def->id)
                ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->get();
            $total    = $measurements->count();
            $met      = $measurements->where('status','met')->count();
            $warning  = $measurements->where('status','warning')->count();
            $breached = $measurements->where('status','breached')->count();
            $rate     = $total > 0 ? round($met / $total * 100, 1) : null;
            $status   = $rate === null ? 'no_data' : ($rate >= 90 ? 'good' : ($rate >= 70 ? 'warning' : 'critical'));
            return ['id'=>$def->id,'name'=>$def->name,'client'=>$def->client?->name,'department'=>$def->department?->name,
                    'compliance_rate'=>$rate,'met'=>$met,'warning'=>$warning,'breached'=>$breached,'status'=>$status];
        });

        $overall = $slas->whereNotNull('compliance_rate');
        return response()->json([
            'slas'         => $slas->values(),
            'overall_rate' => $overall->count() > 0 ? round($overall->avg('compliance_rate'), 1) : null,
            'total_active' => $defs->count(),
            'breaches_30d' => SlaMeasurement::where('status','breached')
                ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count(),
        ]);
    }

    // ── OKR Progress ──────────────────────────────────────────────────────
    public function okrProgress(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $objectives = Objective::with(['keyResults','owner','department'])
            ->where(fn($q) => $q->whereBetween('period_start', [$from, $to])
                               ->orWhereBetween('period_end', [$from, $to])
                               ->orWhere(fn($q) => $q->where('period_start','<=',$from)->where('period_end','>=',$to)))
            ->get();

        $active = $objectives->where('status','active');
        return response()->json([
            'summary' => [
                'total'        => $objectives->count(),
                'completed'    => $objectives->where('status','completed')->count(),
                'avg_progress' => round($active->avg('progress_percent') ?? 0),
                'on_track'     => $active->where('progress_percent','>=',70)->count(),
                'at_risk'      => $active->filter(fn($o) => $o->progress_percent < 70 && $o->progress_percent >= 30)->count(),
                'behind'       => $active->where('progress_percent','<',30)->count(),
            ],
            'by_type'       => Objective::select('type',DB::raw('count(*) as total'))
                                ->where(fn($q) => $q->whereBetween('period_start',[$from,$to])->orWhereBetween('period_end',[$from,$to]))
                                ->groupBy('type')->get(),
            'by_department' => Objective::join('departments','departments.id','=','objectives.department_id')
                                ->where(fn($q) => $q->whereBetween('objectives.period_start',[$from,$to])->orWhereBetween('objectives.period_end',[$from,$to]))
                                ->select('departments.name',DB::raw('count(*) as total'),DB::raw('AVG(progress_percent) as avg_progress'))
                                ->groupBy('departments.name')->get(),
            'objectives' => $objectives->map(fn($o) => [
                'id'=>$o->id,'title'=>$o->title,'type'=>$o->type,'status'=>$o->status,
                'progress_percent'=>(int)($o->progress_percent ?? 0),
                'period_start'=>$o->period_start,'period_end'=>$o->period_end,
                'owner'=>$o->owner?->name,'department'=>$o->department?->name,
                'key_results_count'=>$o->keyResults->count(),
                'key_results_done'=>$o->keyResults->where('status','completed')->count(),
            ])->values(),
        ]);
    }

    // ── Vendor Performance ────────────────────────────────────────────────
    public function vendorPerformance(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $vendors = Vendor::with([
            'evaluations' => fn($q) => $q->whereBetween('evaluation_date', [$from, $to]),
            'contracts'   => fn($q) => $q->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59']),
        ])->get();

        return response()->json([
            'vendors' => $vendors->map(fn($v) => [
                'id'=>$v->id,'code'=>$v->code ?? $v->vendor_code,'name'=>$v->name,
                'category'=>$v->category?->name ?? $v->category,
                'status'=>$v->status,'qualification_status'=>$v->qualification_status,
                'avg_eval_score'=>$v->evaluations->count() > 0
                    ? round($v->evaluations->avg('overall_score') ?? $v->evaluations->avg('total_score') ?? null, 1)
                    : null,
                'eval_count'=>$v->evaluations->count(),
                'active_contracts'=>$v->contracts->where('status','active')->count(),
                'expiring_contracts'=>$v->contracts->where('status','active')
                    ->filter(fn($c)=>$c->end_date && \Carbon\Carbon::parse($c->end_date)->diffInDays(now()) <= 60
                                     && \Carbon\Carbon::parse($c->end_date)->isFuture())->count(),
            ])->values(),
            'by_category'      => Vendor::join('vendor_categories','vendor_categories.id','=','vendors.category_id')
                                    ->select('vendor_categories.name',DB::raw('count(*) as total'))
                                    ->groupBy('vendor_categories.name')->get(),
            'by_status'        => Vendor::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'by_qualification' => Vendor::select('qualification_status',DB::raw('count(*) as total'))->groupBy('qualification_status')->get(),
            'contract_summary' => [
                'active'      => VendorContract::where('status','active')->count(),
                'expiring'    => VendorContract::where('status','active')
                                    ->whereDate('end_date','<=',now()->addDays(60))
                                    ->whereDate('end_date','>=',now())->count(),
                'total_value' => VendorContract::where('status','active')->sum('value'),
            ],
        ]);
    }

    // ── Full Record Lists ─────────────────────────────────────────────────

    public function recordsComplaints(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $q = Complaint::with(['client','assignee','department'])
            ->when($request->status,   fn($q,$v) => $q->where('status',$v))
            ->when($request->severity, fn($q,$v) => $q->where('severity',$v))
            ->when($request->search,   fn($q,$v) => $q->where(fn($q) => $q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('received_date', [$from, $to])
            ->orderByDesc('received_date');
        $rows = $q->paginate((int)$request->get('per_page', 50));

        // Summary totals across entire filtered dataset (not just current page)
        $baseQ = Complaint::when($request->status, fn($q,$v)=>$q->where('status',$v))
            ->when($request->severity, fn($q,$v)=>$q->where('severity',$v))
            ->whereBetween('received_date', [$from, $to]);

        return response()->json([
            'data'  => collect($rows->items())->map(fn($c) => [
                'id'=>$c->id,'reference_no'=>$c->reference_no,'title'=>$c->title,
                'severity'=>$c->severity,'status'=>$c->status,'source'=>$c->source,
                'client'=>$c->client?->name,'department'=>$c->department?->name,'assignee'=>$c->assignee?->name,
                'received_date'=>$c->received_date?->toDateString(),
                'target_resolution'=>$c->target_resolution_date?->toDateString(),
                'actual_resolution'=>$c->actual_resolution_date?->toDateString(),
                'customer_satisfaction'=>$c->customer_satisfaction,'is_regulatory'=>$c->is_regulatory,
            ]),
            'total'        => $rows->total(),
            'current_page' => $rows->currentPage(),
            'last_page'    => $rows->lastPage(),
            // Summary totals for chip display — from full dataset, not just current page
            'summary'      => [
                'total'    => (clone $baseQ)->count(),
                'critical' => (clone $baseQ)->where('severity','critical')->count(),
                'open'     => (clone $baseQ)->whereNotIn('status',['resolved','closed','withdrawn'])->count(),
                'resolved' => (clone $baseQ)->whereIn('status',['resolved','closed'])->count(),
            ],
            'filters' => [
                'statuses'   => Complaint::whereBetween('received_date',[$from,$to])->distinct()->pluck('status'),
                'severities' => Complaint::whereBetween('received_date',[$from,$to])->distinct()->pluck('severity'),
            ],
        ]);
    }

    public function recordsNcs(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $q = Nonconformance::with(['assignedTo','department'])
            ->when($request->status,   fn($q,$v) => $q->where('status',$v))
            ->when($request->severity, fn($q,$v) => $q->where('severity',$v))
            ->when($request->search,   fn($q,$v) => $q->where(fn($q) => $q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->orderByDesc('created_at');
        $rows = $q->paginate((int)$request->get('per_page', 50));

        $baseQ = Nonconformance::when($request->status,fn($q,$v)=>$q->where('status',$v))
            ->when($request->severity,fn($q,$v)=>$q->where('severity',$v))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59']);

        return response()->json([
            'data'  => collect($rows->items())->map(fn($n) => [
                'id'=>$n->id,'reference_no'=>$n->reference_no,'title'=>$n->title,
                'severity'=>$n->severity,'status'=>$n->status,'source'=>$n->source,
                'department'=>$n->department?->name,'assigned_to'=>$n->assignedTo?->name,
                'detection_date'=>$n->detection_date?->toDateString(),
                'target_closure'=>$n->target_closure_date?->toDateString(),
                'actual_closure'=>$n->actual_closure_date?->toDateString(),
            ]),
            'total'=>$rows->total(),'current_page'=>$rows->currentPage(),'last_page'=>$rows->lastPage(),
            'summary' => [
                'total'    => (clone $baseQ)->count(),
                'critical' => (clone $baseQ)->where('severity','critical')->count(),
                'open'     => (clone $baseQ)->where('status','open')->count(),
                'closed'   => (clone $baseQ)->where('status','closed')->count(),
            ],
            'filters'=>['statuses'=>Nonconformance::distinct()->pluck('status'),'severities'=>Nonconformance::distinct()->pluck('severity')],
        ]);
    }

    public function recordsCapas(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $q = Capa::with(['owner','department'])
            ->when($request->status,   fn($q,$v) => $q->where('status',$v))
            ->when($request->type,     fn($q,$v) => $q->where('type',$v))
            ->when($request->priority, fn($q,$v) => $q->where('priority',$v))
            ->when($request->search,   fn($q,$v) => $q->where(fn($q) => $q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->orderByDesc('created_at');
        $rows = $q->paginate((int)$request->get('per_page', 50));

        $baseQ = Capa::when($request->status,fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,fn($q,$v)=>$q->where('type',$v))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59']);

        return response()->json([
            'data'  => collect($rows->items())->map(fn($c) => [
                'id'=>$c->id,'reference_no'=>$c->reference_no,'title'=>$c->title,
                'type'=>$c->type,'priority'=>$c->priority,'status'=>$c->status,
                'owner'=>$c->owner?->name,'department'=>$c->department?->name,
                'target_date'=>$c->target_date?->toDateString(),
                'actual_completion'=>$c->actual_completion_date?->toDateString(),
                'is_overdue'=>$c->status!=='closed'&&$c->target_date&&$c->target_date->isPast(),
                'days_open'=>$c->created_at->diffInDays(now()),
            ]),
            'total'=>$rows->total(),'current_page'=>$rows->currentPage(),'last_page'=>$rows->lastPage(),
            'summary' => [
                'total'   => (clone $baseQ)->count(),
                'overdue' => (clone $baseQ)->where('status','!=','closed')->whereNotNull('target_date')->whereDate('target_date','<',now())->count(),
                'open'    => (clone $baseQ)->where('status','!=','closed')->count(),
                'closed'  => (clone $baseQ)->where('status','closed')->count(),
            ],
            'filters'=>['statuses'=>Capa::distinct()->pluck('status'),'types'=>Capa::distinct()->pluck('type'),'priorities'=>Capa::distinct()->pluck('priority')],
        ]);
    }

    public function recordsRisks(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $q = Risk::with(['owner','department','category'])
            ->when($request->status, fn($q,$v) => $q->where('status',$v))
            ->when($request->level,  fn($q,$v) => $q->where('risk_level',$v))
            ->when($request->search, fn($q,$v) => $q->where(fn($q) => $q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->orderByDesc(DB::raw('likelihood * impact'));
        $rows = $q->paginate((int)$request->get('per_page', 50));

        $baseQ = Risk::when($request->status,fn($q,$v)=>$q->where('status',$v))
            ->when($request->level,fn($q,$v)=>$q->where('risk_level',$v))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59']);

        return response()->json([
            'data'  => collect($rows->items())->map(fn($r) => [
                'id'=>$r->id,'reference_no'=>$r->reference_no,'title'=>$r->title,
                'risk_level'=>$r->risk_level,'status'=>$r->status,'type'=>$r->type,
                'likelihood'=>$r->likelihood,'impact'=>$r->impact,'score'=>$r->likelihood*$r->impact,
                'treatment_strategy'=>$r->treatment_strategy,
                'owner'=>$r->owner?->name,'department'=>$r->department?->name,'category'=>$r->category?->name,
                'next_review_date'=>$r->next_review_date?->toDateString(),
            ]),
            'total'=>$rows->total(),'current_page'=>$rows->currentPage(),'last_page'=>$rows->lastPage(),
            'summary' => [
                'total'    => (clone $baseQ)->count(),
                'critical' => (clone $baseQ)->where('risk_level','critical')->count(),
                'high'     => (clone $baseQ)->where('risk_level','high')->count(),
                'low_med'  => (clone $baseQ)->whereIn('risk_level',['low','medium'])->count(),
            ],
            'filters'=>['statuses'=>Risk::distinct()->pluck('status'),'levels'=>['critical','high','medium','low']],
        ]);
    }

    public function recordsAudits(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $q = Audit::with(['leadAuditor','department'])
            ->withCount(['findings', 'findings as open_findings_count' => fn($q) => $q->where('status','open')])
            ->when($request->status, fn($q,$v) => $q->where('status',$v))
            ->when($request->type,   fn($q,$v) => $q->where('type',$v))
            ->when($request->search, fn($q,$v) => $q->where(fn($q) => $q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('planned_start_date', [$from, $to])
            ->orderByDesc('planned_start_date');
        $rows = $q->paginate((int)$request->get('per_page', 50));

        $baseQ = Audit::when($request->status,fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,fn($q,$v)=>$q->where('type',$v))
            ->whereBetween('planned_start_date',[$from,$to]);

        return response()->json([
            'data'  => collect($rows->items())->map(fn($a) => [
                'id'=>$a->id,'reference_no'=>$a->reference_no,'title'=>$a->title,
                'type'=>$a->type,'status'=>$a->status,'overall_result'=>$a->overall_result,
                'lead_auditor'=>$a->leadAuditor?->name,'department'=>$a->department?->name,
                'planned_start_date'=>$a->planned_start_date?->toDateString(),
                'planned_end_date'=>$a->planned_end_date?->toDateString(),
                'findings_count'=>$a->findings_count ?? 0,'open_findings'=>$a->open_findings_count ?? 0,
            ]),
            'total'=>$rows->total(),'current_page'=>$rows->currentPage(),'last_page'=>$rows->lastPage(),
            'summary' => [
                'total'         => (clone $baseQ)->count(),
                'completed'     => (clone $baseQ)->whereIn('status',['completed','report_issued'])->count(),
                'in_progress'   => (clone $baseQ)->where('status','in_progress')->count(),
                // open_findings is expensive here - fetch from findings table
                'open_findings' => DB::table('audit_findings')->join('audits','audits.id','=','audit_findings.audit_id')
                                    ->whereBetween('audits.planned_start_date',[$from,$to])->where('audit_findings.status','open')->count(),
            ],
            'filters'=>['statuses'=>Audit::distinct()->pluck('status'),'types'=>Audit::distinct()->pluck('type')],
        ]);
    }

    public function recordsRequests(Request $request)
    {
        [$from, $to] = $this->dateRange($request);
        $q = QmsRequest::with(['requester','assignee','department'])
            ->when($request->status,   fn($q,$v) => $q->where('status',$v))
            ->when($request->priority, fn($q,$v) => $q->where('priority',$v))
            ->when($request->search,   fn($q,$v) => $q->where(fn($q) => $q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->orderByDesc('created_at');
        $rows = $q->paginate((int)$request->get('per_page', 50));

        $baseQ = QmsRequest::when($request->status,fn($q,$v)=>$q->where('status',$v))
            ->when($request->priority,fn($q,$v)=>$q->where('priority',$v))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59']);

        return response()->json([
            'data'  => collect($rows->items())->map(fn($r) => [
                'id'=>$r->id,'reference_no'=>$r->reference_no,'title'=>$r->title,
                'type'=>$r->type,'priority'=>$r->priority,'status'=>$r->status,
                'requester'=>$r->requester?->name,'assignee'=>$r->assignee?->name,'department'=>$r->department?->name,
                'due_date'=>$r->due_date,'closed_at'=>$r->closed_at,
                'is_overdue'=>$r->status!=='closed'&&$r->due_date&&now()->isAfter($r->due_date),
            ]),
            'total'=>$rows->total(),'current_page'=>$rows->currentPage(),'last_page'=>$rows->lastPage(),
            'summary' => [
                'total'   => (clone $baseQ)->count(),
                'overdue' => (clone $baseQ)->where('status','!=','closed')->whereNotNull('due_date')->whereDate('due_date','<',now())->count(),
                'open'    => (clone $baseQ)->whereNotIn('status',['closed','rejected'])->count(),
                'closed'  => (clone $baseQ)->where('status','closed')->count(),
            ],
            'filters'=>['statuses'=>QmsRequest::distinct()->pluck('status'),'priorities'=>QmsRequest::distinct()->pluck('priority')],
        ]);
    }

    // ── Visit Summary ─────────────────────────────────────────────────────
    public function visitSummary(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $base = Visit::whereBetween('visit_date', [$from, $to]);

        // Monthly trend
        $start  = new \DateTime($from);
        $months = [];
        $cur    = clone $start;
        $cur->modify('first day of this month');
        $endDt  = new \DateTime($to);
        while ($cur <= $endDt) { $months[] = clone $cur; $cur->modify('+1 month'); }
        if (count($months) > 12) $months = array_slice($months, -12);

        $total     = (clone $base)->count();
        $completed = (clone $base)->where('status', 'completed')->count();
        $cancelled = (clone $base)->where('status', 'cancelled')->count();
        $avgRating = round((clone $base)->whereNotNull('rating')->avg('rating') ?? 0, 1);
        $virtual   = (clone $base)->where('is_virtual', true)->count();

        // Open findings across visits in range
        $openFindings = DB::table('visit_findings')
            ->join('visits', 'visits.id', '=', 'visit_findings.visit_id')
            ->whereBetween('visits.visit_date', [$from, $to])
            ->where('visit_findings.status', 'open')
            ->count();

        return response()->json([
            'summary' => [
                'total'        => $total,
                'completed'    => $completed,
                'cancelled'    => $cancelled,
                'completion_rate' => $total > 0 ? round($completed / $total * 100, 1) : 0,
                'avg_rating'   => $avgRating,
                'virtual'      => $virtual,
                'open_findings'=> $openFindings,
            ],
            'monthly' => array_values(array_map(fn($m) => [
                'month'     => $m->format('M Y'),
                'scheduled' => Visit::whereYear('visit_date', $m->format('Y'))->whereMonth('visit_date', $m->format('n'))->count(),
                'completed' => Visit::where('status', 'completed')->whereYear('visit_date', $m->format('Y'))->whereMonth('visit_date', $m->format('n'))->count(),
            ], $months)),
            'by_type'   => (clone $base)->select('type', DB::raw('count(*) as total'))->groupBy('type')->get(),
            'by_status' => (clone $base)->select('status', DB::raw('count(*) as total'))->groupBy('status')->get(),
            'by_client' => Visit::join('clients', 'clients.id', '=', 'visits.client_id')
                            ->whereBetween('visits.visit_date', [$from, $to])
                            ->select('clients.name', DB::raw('count(*) as total'))
                            ->groupBy('clients.name')->orderByDesc('total')->limit(10)->get(),
            'findings_by_type' => DB::table('visit_findings')
                ->join('visits', 'visits.id', '=', 'visit_findings.visit_id')
                ->whereBetween('visits.visit_date', [$from, $to])
                ->select('finding_type', DB::raw('count(*) as total'))
                ->groupBy('finding_type')->get(),
            'recent' => Visit::with(['client', 'host'])
                ->whereBetween('visit_date', [$from, $to])
                ->orderByDesc('visit_date')->limit(10)->get()
                ->map(fn($v) => [
                    'id'           => $v->id,
                    'reference_no' => $v->reference_no,
                    'client'       => $v->client?->name,
                    'type'         => $v->type,
                    'status'       => $v->status,
                    'visit_date'   => $v->visit_date?->toDateString(),
                    'host'         => $v->host?->name,
                    'rating'       => $v->rating,
                    'is_virtual'   => $v->is_virtual,
                ]),
        ]);
    }

    // ── Visit Records ─────────────────────────────────────────────────────
    public function recordsVisits(Request $request)
    {
        [$from, $to] = $this->dateRange($request);

        $q = Visit::with(['client', 'host'])
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->type,   fn($q, $v) => $q->where('type', $v))
            ->when($request->search, fn($q, $v) => $q->where(fn($q) =>
                $q->where('reference_no', 'like', "%$v%")
                  ->orWhere('purpose', 'like', "%$v%")
                  ->orWhereHas('client', fn($q) => $q->where('name', 'like', "%$v%"))))
            ->whereBetween('visit_date', [$from, $to])
            ->orderByDesc('visit_date');

        $rows = $q->paginate((int)$request->get('per_page', 50));

        $baseQ = Visit::when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->type, fn($q, $v) => $q->where('type', $v))
            ->whereBetween('visit_date', [$from, $to]);

        return response()->json([
            'data' => collect($rows->items())->map(fn($v) => [
                'id'             => $v->id,
                'reference_no'   => $v->reference_no,
                'client'         => $v->client?->name,
                'type'           => $v->type,
                'purpose'        => $v->purpose,
                'visit_date'     => $v->visit_date?->toDateString(),
                'visit_time'     => $v->visit_time,
                'duration_hours' => $v->duration_hours,
                'location'       => $v->location,
                'is_virtual'     => $v->is_virtual,
                'status'         => $v->status,
                'host'           => $v->host?->name,
                'rating'         => $v->rating,
                'follow_up_date' => $v->follow_up_date?->toDateString(),
                'findings_count' => $v->findings()->count(),
                'open_findings'  => $v->findings()->where('status', 'open')->count(),
            ]),
            'total'        => $rows->total(),
            'current_page' => $rows->currentPage(),
            'last_page'    => $rows->lastPage(),
            'summary' => [
                'total'     => (clone $baseQ)->count(),
                'completed' => (clone $baseQ)->where('status', 'completed')->count(),
                'cancelled' => (clone $baseQ)->where('status', 'cancelled')->count(),
                'virtual'   => (clone $baseQ)->where('is_virtual', true)->count(),
            ],
            'filters' => [
                'statuses' => Visit::distinct()->pluck('status'),
                'types'    => Visit::distinct()->pluck('type'),
            ],
        ]);
    }


    // ── Export ────────────────────────────────────────────────────────────
    // Simple CSV export — calls the relevant recordsXxx method and returns data
    public function export(Request $request)
    {
        $module = $request->input('module', 'ncs');
        $method = 'records' . ucfirst($module);

        if (!method_exists($this, $method)) {
            return response()->json(['message' => 'Unknown module: ' . $module], 422);
        }

        $result = $this->$method($request);
        $data   = json_decode($result->getContent(), true);

        return response()->json([
            'success' => true,
            'module'  => $module,
            'count'   => $data['total'] ?? count($data['data'] ?? []),
            'data'    => $data['data'] ?? [],
        ]);
    }
}
