<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{QmsRequest, Nonconformance, Capa, Risk, Audit, Complaint, Document,
                Vendor, VendorContract, VendorEvaluation, Visit, Survey, Objective,
                SlaDefinition, SlaMeasurement, User, Client};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller {

    private function dateRange(Request $r): array {
        return [
            $r->from ?? now()->startOfYear()->toDateString(),
            $r->to   ?? now()->toDateString(),
        ];
    }

    // ── KPI Summary ────────────────────────────────────────────────────────
    public function kpiSummary(Request $request) {
        [$from,$to] = $this->dateRange($request);

        $ncTotal   = Nonconformance::count();
        $ncClosed  = Nonconformance::where('status','closed')->count();
        $ncRate    = $ncTotal>0 ? round($ncClosed/$ncTotal*100,1) : 0;

        $capaClosed = Capa::where('status','closed')->whereNotNull('actual_completion_date')->count();
        $capaOnTime = Capa::where('status','closed')->whereNotNull('actual_completion_date')
                        ->whereColumn('actual_completion_date','<=','target_date')->count();
        $capaRate   = $capaClosed>0 ? round($capaOnTime/$capaClosed*100,1) : 0;

        $avgResH = round(Complaint::whereIn('status',['resolved','closed'])
            ->whereNotNull('actual_resolution_date')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR,received_date,actual_resolution_date)) as avg_h')
            ->value('avg_h') ?? 0, 1);

        $auditYear   = date('Y');
        $auditTotal  = Audit::whereYear('planned_start_date',$auditYear)->count();
        $auditDone   = Audit::whereYear('planned_start_date',$auditYear)->whereIn('status',['completed','report_issued'])->count();
        $auditRate   = $auditTotal>0 ? round($auditDone/$auditTotal*100,1) : 0;

        $docTotal    = DB::table('documents')->count();
        $docApproved = DB::table('documents')->where('status','approved')->count();
        $docRate     = $docTotal>0 ? round($docApproved/$docTotal*100,1) : 0;

        $slaMeasured  = SlaMeasurement::count();
        $slaMet       = SlaMeasurement::where('status','met')->count();
        $slaCompliance= $slaMeasured>0 ? round($slaMet/$slaMeasured*100,1) : 0;

        $riskTotal   = Risk::count();
        $riskTreated = Risk::whereIn('status',['treatment_in_progress','monitored','closed'])->count();
        $riskRate    = $riskTotal>0 ? round($riskTreated/$riskTotal*100,1) : 0;

        return response()->json([
            'period'         => ['from'=>$from,'to'=>$to],
            'period_summary' => [
                'requests'   => QmsRequest::whereBetween('created_at',[$from,$to])->count(),
                'ncs'        => Nonconformance::whereBetween('created_at',[$from,$to])->count(),
                'complaints' => Complaint::whereBetween('received_date',[$from,$to])->count(),
            ],
            'kpis' => [
                ['key'=>'nc_closure_rate',      'label'=>'NC Closure Rate',         'value'=>$ncRate,      'unit'=>'%','target'=>90, 'icon'=>'fas fa-triangle-exclamation','color'=>'danger'],
                ['key'=>'capa_on_time',         'label'=>'CAPA On-Time Rate',        'value'=>$capaRate,    'unit'=>'%','target'=>85, 'icon'=>'fas fa-circle-check',        'color'=>'warning'],
                ['key'=>'audit_completion',     'label'=>'Audit Completion Rate',    'value'=>$auditRate,   'unit'=>'%','target'=>100,'icon'=>'fas fa-magnifying-glass-chart','color'=>'purple'],
                ['key'=>'document_compliance',  'label'=>'Document Compliance',      'value'=>$docRate,     'unit'=>'%','target'=>95, 'icon'=>'fas fa-file-shield',         'color'=>'green'],
                ['key'=>'sla_compliance',       'label'=>'SLA Compliance',           'value'=>$slaCompliance,'unit'=>'%','target'=>95,'icon'=>'fas fa-file-contract',       'color'=>'blue'],
                ['key'=>'risk_treatment',       'label'=>'Risk Treatment Rate',      'value'=>$riskRate,    'unit'=>'%','target'=>80, 'icon'=>'fas fa-fire-flame-curved',   'color'=>'danger'],
                ['key'=>'avg_resolution_hours', 'label'=>'Avg Complaint Resolution', 'value'=>$avgResH,     'unit'=>'h','target'=>72, 'icon'=>'fas fa-comment-exclamation', 'color'=>'orange'],
            ],
        ]);
    }

    // ── NC Trend ───────────────────────────────────────────────────────────
    public function ncTrend(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $months = collect(range(11,0))->map(fn($m)=>now()->subMonths($m));
        return response()->json([
            'monthly' => $months->map(fn($m) => [
                'month'  => $m->format('M Y'),
                'raised' => Nonconformance::whereYear('created_at',$m->year)->whereMonth('created_at',$m->month)->count(),
                'closed' => Nonconformance::where('status','closed')->whereYear('updated_at',$m->year)->whereMonth('updated_at',$m->month)->count(),
            ])->values(),
            'by_severity'      => Nonconformance::select('severity',DB::raw('count(*) as total'))->groupBy('severity')->get(),
            'by_source'        => Nonconformance::select('source',DB::raw('count(*) as total'))->groupBy('source')->get(),
            'by_department'    => Nonconformance::join('departments','departments.id','=','nonconformances.department_id')
                                    ->select('departments.name',DB::raw('count(*) as total'))->groupBy('departments.name')->get(),
            'status_breakdown' => Nonconformance::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'avg_closure_days' => round(Nonconformance::where('status','closed')
                ->selectRaw('AVG(DATEDIFF(updated_at,created_at)) as d')->value('d') ?? 0),
        ]);
    }

    // ── CAPA Effectiveness ────────────────────────────────────────────────
    public function capaEffectiveness(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $months = collect(range(11,0))->map(fn($m)=>now()->subMonths($m));
        $total  = Capa::count();
        $open   = Capa::where('status','open')->count();
        $closed = Capa::where('status','closed')->count();
        $overdue= Capa::where('status','!=','closed')->whereNotNull('target_date')->whereDate('target_date','<',now())->count();
        $capaCl = Capa::where('status','closed')->whereNotNull('actual_completion_date')->count();
        $onTime = Capa::where('status','closed')->whereNotNull('actual_completion_date')->whereColumn('actual_completion_date','<=','target_date')->count();
        return response()->json([
            'summary' => ['total'=>$total,'open'=>$open,'closed'=>$closed,'overdue'=>$overdue,
                          'on_time_rate'=>$capaCl>0?round($onTime/$capaCl*100,1):0],
            'monthly' => $months->map(fn($m) => [
                'month'  => $m->format('M Y'),
                'opened' => Capa::whereYear('created_at',$m->year)->whereMonth('created_at',$m->month)->count(),
                'closed' => Capa::where('status','closed')->whereYear('updated_at',$m->year)->whereMonth('updated_at',$m->month)->count(),
            ])->values(),
            'by_type'     => Capa::select('type',DB::raw('count(*) as total'))->groupBy('type')->get(),
            'by_status'   => Capa::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'by_priority' => Capa::select('priority',DB::raw('count(*) as total'))->groupBy('priority')->get(),
            'avg_days_to_close' => round(Capa::where('status','closed')->whereNotNull('actual_completion_date')
                ->selectRaw('AVG(DATEDIFF(actual_completion_date,created_at)) as d')->value('d') ?? 0),
        ]);
    }

    // ── Risk Heat Map ─────────────────────────────────────────────────────
    public function riskHeatMap(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $risks = Risk::with(['owner','department','category'])->get();
        $matrix = [];
        foreach ($risks as $r) {
            $l = $r->likelihood; $i = $r->impact;
            if ($l && $i) $matrix[$l][$i][] = ['id'=>$r->id,'title'=>$r->title,'reference_no'=>$r->reference_no,'risk_level'=>$r->risk_level,'status'=>$r->status];
        }
        return response()->json([
            'matrix'       => $matrix,
            'by_level'     => Risk::select('risk_level',DB::raw('count(*) as total'))->groupBy('risk_level')->get(),
            'by_category'  => DB::table('risks')->join('risk_categories','risk_categories.id','=','risks.category_id')
                                ->select('risk_categories.name',DB::raw('count(*) as total'))->groupBy('risk_categories.name')->get(),
            'by_treatment' => Risk::select('treatment_strategy',DB::raw('count(*) as total'))->whereNotNull('treatment_strategy')->groupBy('treatment_strategy')->get(),
            'by_status'    => Risk::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'top_risks'    => $risks->sortByDesc(fn($r)=>$r->likelihood*$r->impact)->take(10)
                ->map(fn($r)=>['id'=>$r->id,'reference_no'=>$r->reference_no,'title'=>$r->title,'risk_level'=>$r->risk_level,
                    'likelihood'=>$r->likelihood,'impact'=>$r->impact,'score'=>$r->likelihood*$r->impact,
                    'treatment_strategy'=>$r->treatment_strategy,'owner'=>$r->owner?->name,
                    'department'=>$r->department?->name,'status'=>$r->status])->values(),
        ]);
    }

    // ── Complaint Trend ───────────────────────────────────────────────────
    public function complaintTrend(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $months = collect(range(11,0))->map(fn($m)=>now()->subMonths($m));
        return response()->json([
            'monthly' => $months->map(fn($m) => [
                'month'    => $m->format('M Y'),
                'received' => Complaint::whereYear('received_date',$m->year)->whereMonth('received_date',$m->month)->count(),
                'resolved' => Complaint::whereIn('status',['resolved','closed'])->whereYear('updated_at',$m->year)->whereMonth('updated_at',$m->month)->count(),
            ])->values(),
            'by_severity'     => Complaint::select('severity',DB::raw('count(*) as total'))->groupBy('severity')->get(),
            'by_source'       => Complaint::select('source',DB::raw('count(*) as total'))->groupBy('source')->get(),
            'by_status'       => Complaint::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'avg_resolution_h'=> round(Complaint::whereIn('status',['resolved','closed'])->whereNotNull('actual_resolution_date')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR,received_date,actual_resolution_date)) as h')->value('h') ?? 0,1),
            'avg_satisfaction'=> round(Complaint::whereNotNull('customer_satisfaction')->avg('customer_satisfaction') ?? 0,1),
            'top_clients'     => DB::table('complaints')->join('clients','clients.id','=','complaints.client_id')
                ->select('clients.name',DB::raw('count(*) as total'))->groupBy('clients.name')
                ->orderByDesc('total')->limit(5)->get(),
        ]);
    }

    // ── Audit Summary ──────────────────────────────────────────────────────
    public function auditSummary(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $year = date('Y');
        return response()->json([
            'by_type'   => Audit::select('type',DB::raw('count(*) as total'))->groupBy('type')->get(),
            'by_status' => Audit::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'findings'  => [
                'total'       => DB::table('audit_findings')->count(),
                'open'        => DB::table('audit_findings')->where('status','open')->count(),
                'closed'      => DB::table('audit_findings')->where('status','closed')->count(),
                'by_type'     => DB::table('audit_findings')->select('finding_type',DB::raw('count(*) as total'))->groupBy('finding_type')->get(),
                'by_priority' => DB::table('audit_findings')->select('priority',DB::raw('count(*) as total'))->groupBy('priority')->get(),
            ],
            'completion_rate' => Audit::whereYear('planned_start_date',$year)->count()>0
                ? round(Audit::whereYear('planned_start_date',$year)->whereIn('status',['completed','report_issued'])->count()
                    / Audit::whereYear('planned_start_date',$year)->count()*100,1) : 0,
            'recent' => Audit::with('leadAuditor')->orderByDesc('planned_start_date')->limit(10)->get()
                ->map(fn($a)=>['id'=>$a->id,'reference_no'=>$a->reference_no,'title'=>$a->title,'type'=>$a->type,
                    'status'=>$a->status,'planned_start_date'=>$a->planned_start_date,
                    'overall_result'=>$a->overall_result,'lead_auditor'=>$a->leadAuditor?->name]),
        ]);
    }

    // ── SLA Compliance ────────────────────────────────────────────────────
    public function slaCompliance(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $defs = SlaDefinition::with(['client','department'])->where('is_active',true)->get();
        $slas = $defs->map(function($def) {
            $measurements = SlaMeasurement::where('sla_definition_id',$def->id)->get();
            $total    = $measurements->count();
            $met      = $measurements->where('status','met')->count();
            $warning  = $measurements->where('status','warning')->count();
            $breached = $measurements->where('status','breached')->count();
            $rate     = $total>0 ? round($met/$total*100,1) : null;
            $status   = $rate===null?'no_data':($rate>=90?'good':($rate>=70?'warning':'critical'));
            return ['id'=>$def->id,'name'=>$def->name,'client'=>$def->client?->name,'department'=>$def->department?->name,
                    'compliance_rate'=>$rate,'met'=>$met,'warning'=>$warning,'breached'=>$breached,'status'=>$status];
        });
        $overall = $slas->whereNotNull('compliance_rate');
        return response()->json([
            'slas'         => $slas->values(),
            'overall_rate' => $overall->count()>0 ? round($overall->avg('compliance_rate'),1) : null,
            'total_active' => $defs->count(),
            'breaches_30d' => SlaMeasurement::where('status','breached')->where('created_at','>=',now()->subDays(30))->count(),
        ]);
    }

    // ── OKR Progress ──────────────────────────────────────────────────────
    public function okrProgress(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $objectives = Objective::with(['keyResults','owner','department'])->get();
        $active = $objectives->where('status','active');
        return response()->json([
            'summary' => [
                'total'        => $objectives->count(),
                'completed'    => $objectives->where('status','completed')->count(),
                'avg_progress' => round($active->avg('progress_percent') ?? 0),
                'on_track'     => $active->where('progress_percent','>=',70)->count(),
                'at_risk'      => $active->filter(fn($o)=>$o->progress_percent<70&&$o->progress_percent>=30)->count(),
                'behind'       => $active->where('progress_percent','<',30)->count(),
            ],
            'by_type'       => Objective::select('type',DB::raw('count(*) as total'))->groupBy('type')->get(),
            'by_department' => Objective::join('departments','departments.id','=','objectives.department_id')
                                ->select('departments.name',DB::raw('count(*) as total'),DB::raw('AVG(progress_percent) as avg_progress'))
                                ->groupBy('departments.name')->get(),
            'objectives' => $objectives->map(fn($o)=>[
                'id'=>$o->id,'title'=>$o->title,'type'=>$o->type,'status'=>$o->status,
                'progress_percent'=>(int)($o->progress_percent??0),
                'period_start'=>$o->period_start,'period_end'=>$o->period_end,
                'owner'=>$o->owner?->name,'department'=>$o->department?->name,
                'key_results_count'=>$o->keyResults->count(),
                'key_results_done'=>$o->keyResults->where('status','completed')->count(),
            ])->values(),
        ]);
    }

    // ── Vendor Performance ────────────────────────────────────────────────
    public function vendorPerformance(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $vendors = Vendor::with(['evaluations','contracts'])->get();
        return response()->json([
            'vendors' => $vendors->map(fn($v)=>[
                'id'=>$v->id,'code'=>$v->vendor_code,'name'=>$v->name,'category'=>$v->category,
                'status'=>$v->status,'qualification_status'=>$v->qualification_status,
                'avg_eval_score'=>$v->evaluations->count()>0 ? round($v->evaluations->avg('total_score'),1) : null,
                'eval_count'=>$v->evaluations->count(),
                'active_contracts'=>$v->contracts->where('status','active')->count(),
                'expiring_contracts'=>$v->contracts->where('status','active')
                    ->filter(fn($c)=>$c->end_date&&$c->end_date->diffInDays(now())<=60&&$c->end_date->isFuture())->count(),
            ])->values(),
            'by_category'      => Vendor::select('category',DB::raw('count(*) as total'))->whereNotNull('category')->groupBy('category')->get(),
            'by_status'        => Vendor::select('status',DB::raw('count(*) as total'))->groupBy('status')->get(),
            'by_qualification' => Vendor::select('qualification_status',DB::raw('count(*) as total'))->groupBy('qualification_status')->get(),
            'contract_summary' => [
                'active'      => VendorContract::where('status','active')->count(),
                'expiring'    => VendorContract::where('status','active')->whereDate('end_date','<=',now()->addDays(60))->whereDate('end_date','>=',now())->count(),
                'total_value' => VendorContract::where('status','active')->sum('value'),
            ],
        ]);
    }

    // ── Full Record Lists ─────────────────────────────────────────────────
    public function recordsComplaints(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $q = Complaint::with(['client','assignee','department'])
            ->when($request->status,   fn($q,$v)=>$q->where('status',$v))
            ->when($request->severity, fn($q,$v)=>$q->where('severity',$v))
            ->when($request->search,   fn($q,$v)=>$q->where(fn($q)=>$q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('received_date',[$from,$to])
            ->orderByDesc('received_date');
        $rows = $request->all ? $q->get() : $q->paginate(100);
        $items = $request->all ? $rows : $rows->items();
        return response()->json([
            'data'  => collect($items)->map(fn($c)=>[
                'id'=>$c->id,'reference_no'=>$c->reference_no,'title'=>$c->title,
                'severity'=>$c->severity,'status'=>$c->status,'source'=>$c->source,
                'client'=>$c->client?->name,'department'=>$c->department?->name,'assignee'=>$c->assignee?->name,
                'received_date'=>$c->received_date?->toDateString(),
                'target_resolution'=>$c->target_resolution_date?->toDateString(),
                'actual_resolution'=>$c->actual_resolution_date?->toDateString(),
                'customer_satisfaction'=>$c->customer_satisfaction,'is_regulatory'=>$c->is_regulatory,
            ]),
            'total'   => $request->all ? $rows->count() : $rows->total(),
            'filters' => ['statuses'=>Complaint::distinct()->pluck('status'),'severities'=>Complaint::distinct()->pluck('severity')],
        ]);
    }

    public function recordsNcs(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $q = Nonconformance::with(['assignedTo','department'])
            ->when($request->status,   fn($q,$v)=>$q->where('status',$v))
            ->when($request->severity, fn($q,$v)=>$q->where('severity',$v))
            ->when($request->search,   fn($q,$v)=>$q->where(fn($q)=>$q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])
            ->orderByDesc('created_at');
        $rows  = $request->all ? $q->get() : $q->paginate(100);
        $items = $request->all ? $rows : $rows->items();
        return response()->json([
            'data'  => collect($items)->map(fn($n)=>[
                'id'=>$n->id,'reference_no'=>$n->reference_no,'title'=>$n->title,
                'severity'=>$n->severity,'status'=>$n->status,'source'=>$n->source,
                'department'=>$n->department?->name,'assigned_to'=>$n->assignedTo?->name,
                'detection_date'=>$n->detection_date?->toDateString(),
                'target_closure'=>$n->target_closure_date?->toDateString(),
                'actual_closure'=>$n->actual_closure_date?->toDateString(),
            ]),
            'total'   => $request->all ? $rows->count() : $rows->total(),
            'filters' => ['statuses'=>Nonconformance::distinct()->pluck('status'),'severities'=>Nonconformance::distinct()->pluck('severity')],
        ]);
    }

    public function recordsCapas(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $q = Capa::with(['owner','department'])
            ->when($request->status,   fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,     fn($q,$v)=>$q->where('type',$v))
            ->when($request->priority, fn($q,$v)=>$q->where('priority',$v))
            ->when($request->search,   fn($q,$v)=>$q->where(fn($q)=>$q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])
            ->orderByDesc('created_at');
        $rows  = $request->all ? $q->get() : $q->paginate(100);
        $items = $request->all ? $rows : $rows->items();
        return response()->json([
            'data'  => collect($items)->map(fn($c)=>[
                'id'=>$c->id,'reference_no'=>$c->reference_no,'title'=>$c->title,
                'type'=>$c->type,'priority'=>$c->priority,'status'=>$c->status,
                'owner'=>$c->owner?->name,'department'=>$c->department?->name,
                'target_date'=>$c->target_date?->toDateString(),
                'actual_completion'=>$c->actual_completion_date?->toDateString(),
                'is_overdue'=>$c->status!=='closed'&&$c->target_date&&$c->target_date->isPast(),
                'days_open'=>$c->created_at->diffInDays(now()),
            ]),
            'total'   => $request->all ? $rows->count() : $rows->total(),
            'filters' => ['statuses'=>Capa::distinct()->pluck('status'),'types'=>Capa::distinct()->pluck('type'),'priorities'=>Capa::distinct()->pluck('priority')],
        ]);
    }

    public function recordsRisks(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $q = Risk::with(['owner','department','category'])
            ->when($request->status, fn($q,$v)=>$q->where('status',$v))
            ->when($request->level,  fn($q,$v)=>$q->where('risk_level',$v))
            ->when($request->search, fn($q,$v)=>$q->where(fn($q)=>$q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])
            ->orderByDesc(DB::raw('likelihood * impact'));
        $rows  = $request->all ? $q->get() : $q->paginate(100);
        $items = $request->all ? $rows : $rows->items();
        return response()->json([
            'data'  => collect($items)->map(fn($r)=>[
                'id'=>$r->id,'reference_no'=>$r->reference_no,'title'=>$r->title,
                'risk_level'=>$r->risk_level,'status'=>$r->status,'type'=>$r->type,
                'likelihood'=>$r->likelihood,'impact'=>$r->impact,'score'=>$r->likelihood*$r->impact,
                'treatment_strategy'=>$r->treatment_strategy,
                'owner'=>$r->owner?->name,'department'=>$r->department?->name,'category'=>$r->category?->name,
                'next_review_date'=>$r->next_review_date?->toDateString(),
            ]),
            'total'   => $request->all ? $rows->count() : $rows->total(),
            'filters' => ['statuses'=>Risk::distinct()->pluck('status'),'levels'=>['critical','high','medium','low']],
        ]);
    }

    public function recordsAudits(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $q = Audit::with(['leadAuditor','department'])
            ->when($request->status, fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,   fn($q,$v)=>$q->where('type',$v))
            ->when($request->search, fn($q,$v)=>$q->where(fn($q)=>$q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('planned_start_date',[$from,$to])
            ->orderByDesc('planned_start_date');
        $rows  = $request->all ? $q->get() : $q->paginate(100);
        $items = $request->all ? $rows : $rows->items();
        return response()->json([
            'data'  => collect($items)->map(fn($a)=>[
                'id'=>$a->id,'reference_no'=>$a->reference_no,'title'=>$a->title,
                'type'=>$a->type,'status'=>$a->status,'overall_result'=>$a->overall_result,
                'lead_auditor'=>$a->leadAuditor?->name,'department'=>$a->department?->name,
                'planned_start_date'=>$a->planned_start_date,'planned_end_date'=>$a->planned_end_date,
                'findings_count'=>$a->findings()->count(),'open_findings'=>$a->findings()->where('status','open')->count(),
            ]),
            'total'   => $request->all ? $rows->count() : $rows->total(),
            'filters' => ['statuses'=>Audit::distinct()->pluck('status'),'types'=>Audit::distinct()->pluck('type')],
        ]);
    }

    public function recordsRequests(Request $request) {
        [$from,$to] = $this->dateRange($request);
        $q = QmsRequest::with(['requester','assignee','department'])
            ->when($request->status,   fn($q,$v)=>$q->where('status',$v))
            ->when($request->priority, fn($q,$v)=>$q->where('priority',$v))
            ->when($request->search,   fn($q,$v)=>$q->where(fn($q)=>$q->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")))
            ->whereBetween('created_at',[$from.' 00:00:00',$to.' 23:59:59'])
            ->orderByDesc('created_at');
        $rows  = $request->all ? $q->get() : $q->paginate(100);
        $items = $request->all ? $rows : $rows->items();
        return response()->json([
            'data'  => collect($items)->map(fn($r)=>[
                'id'=>$r->id,'reference_no'=>$r->reference_no,'title'=>$r->title,
                'type'=>$r->type,'priority'=>$r->priority,'status'=>$r->status,
                'requester'=>$r->requester?->name,'assignee'=>$r->assignee?->name,'department'=>$r->department?->name,
                'due_date'=>$r->due_date,'closed_at'=>$r->closed_at,
                'is_overdue'=>$r->status!=='closed'&&$r->due_date&&now()->isAfter($r->due_date),
            ]),
            'total'   => $request->all ? $rows->count() : $rows->total(),
            'filters' => ['statuses'=>QmsRequest::distinct()->pluck('status'),'priorities'=>QmsRequest::distinct()->pluck('priority')],
        ]);
    }
}
