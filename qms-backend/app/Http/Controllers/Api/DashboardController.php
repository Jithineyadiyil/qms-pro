<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{QmsRequest, Nonconformance, Capa, Risk, Audit, Complaint, Document,
                Vendor, VendorContract, Visit, Survey, Objective, ActivityLog, User, Client,
                SlaDefinition, SlaMeasurement};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    // ─── Role resolution ────────────────────────────────────────────────
    private function slug():   string  { return auth()->user()->role?->slug ?? ''; }
    private function uid():    int     { return auth()->id(); }
    private function deptId(): ?int    { return auth()->user()->department_id; }

    private function isQAFull():    bool { return in_array($this->slug(), ['super_admin','qa_manager']); }
    private function isDeptMgr():   bool { return $this->slug() === 'dept_manager'; }
    private function isQAOfficer(): bool { return $this->slug() === 'qa_officer'; }
    private function isEmployee():  bool { return !$this->isQAFull() && !$this->isDeptMgr() && !$this->isQAOfficer(); }

    // ─── Scoped base queries — called fresh each time (no clone risk) ───

    private function reqQ() {
        $q = QmsRequest::query();
        if ($this->isQAFull())       return $q;                                        // all
        if ($this->isDeptMgr())      return $q->where('department_id', $this->deptId()); // own dept
        if ($this->isQAOfficer())    return $q->where(function($s) {                  // assigned + queue
            $s->where('assignee_id', $this->uid())->orWhere('status','approved');
        });
        return $q->where('requester_id', $this->uid());                                // own requests
    }

    private function ncQ() {
        $q = Nonconformance::query();
        if ($this->isQAFull() || $this->isQAOfficer()) return $q;
        return $q->where('department_id', $this->deptId());
    }

    private function capaQ() {
        $q = Capa::query();
        if ($this->isQAFull() || $this->isQAOfficer()) return $q;
        return $q->where('department_id', $this->deptId());
    }

    private function compQ() {
        $q = Complaint::query();
        if ($this->isQAFull() || $this->isQAOfficer()) return $q;
        if ($this->isDeptMgr()) return $q->where('department_id', $this->deptId());
        return $q;  // employees see org-wide complaint count (informational)
    }

    private function riskQ() {
        $q = Risk::query();
        if ($this->isQAFull() || $this->isQAOfficer()) return $q;
        if ($this->isDeptMgr()) return $q->where('department_id', $this->deptId());
        return $q;  // employees see org-wide risk count
    }

    // ─── GET /api/dashboard/stats ────────────────────────────────────────
    public function stats() {

        // SLA — always org-wide strategic KPI
        $slaTotal = SlaDefinition::where('status','active')->count();
        $slaAvg   = null;
        if ($slaTotal > 0) {
            $vals = SlaDefinition::where('status','active')->get()
                ->map(function($s) {
                    $t = $s->measurements->count();
                    $m = $s->measurements->where('status','met')->count();
                    return $t > 0 ? round($m / $t * 100, 1) : null;
                })->filter()->values();
            $slaAvg = $vals->count() > 0 ? round($vals->avg(), 1) : null;
        }
        $slaBreached = DB::table('sla_measurements')
            ->where('status','breached')
            ->where('created_at','>=',now()->subDays(30))->count();

        return response()->json([

            'requests' => [
                'total'       => $this->reqQ()->count(),
                'open'        => $this->reqQ()->whereNotIn('status',['closed','rejected'])->count(),
                'overdue'     => $this->reqQ()->whereNotIn('status',['closed','rejected'])->whereNotNull('due_date')->where('due_date','<',now())->count(),
                'submitted'   => $this->reqQ()->where('status','submitted')->count(),
                'approved'    => $this->reqQ()->where('status','approved')->count(),
                'in_progress' => $this->reqQ()->where('status','in_progress')->count(),
                'closed'      => $this->reqQ()->where('status','closed')->count(),
            ],

            'nc_capa' => [
                'open_ncs'    => $this->ncQ()->whereNotIn('status',['closed','cancelled'])->count(),
                'open_capas'  => $this->capaQ()->whereNotIn('status',['closed','cancelled'])->count(),
                'overdue'     => $this->capaQ()->whereNotIn('status',['closed','cancelled'])->whereNotNull('target_date')->where('target_date','<',now())->count(),
                'closed_ncs'  => $this->ncQ()->where('status','closed')->count(),
                'total_ncs'   => $this->ncQ()->count(),
                'total_capas' => $this->capaQ()->count(),
            ],

            'risks' => [
                'total'    => $this->riskQ()->count(),
                'critical' => $this->riskQ()->where('risk_level','critical')->count(),
                'high'     => $this->riskQ()->where('risk_level','high')->count(),
                'medium'   => $this->riskQ()->where('risk_level','medium')->count(),
                'low'      => $this->riskQ()->where('risk_level','low')->count(),
                'open'     => $this->riskQ()->whereNotIn('status',['closed'])->count(),
            ],

            // Audits are org-wide (cross-department)
            'audits' => [
                'total'           => Audit::count(),
                'planned'         => Audit::where('status','planned')->count(),
                'in_progress'     => Audit::where('status','in_progress')->count(),
                'completed'       => Audit::where('status','completed')->count(),
                'open_findings'   => DB::table('audit_findings')->where('status','open')->count(),
                'closed_findings' => DB::table('audit_findings')->where('status','closed')->count(),
                'total_findings'  => DB::table('audit_findings')->count(),
            ],

            'complaints' => [
                'total'      => $this->compQ()->count(),
                'open'       => $this->compQ()->whereNotIn('status',['closed','resolved','withdrawn'])->count(),
                'overdue'    => $this->compQ()->whereNotIn('status',['closed','resolved','withdrawn'])->whereNotNull('target_resolution_date')->where('target_resolution_date','<',now())->count(),
                'resolved'   => $this->compQ()->whereIn('status',['closed','resolved'])->count(),
                'this_month' => $this->compQ()->whereMonth('received_date',now()->month)->whereYear('received_date',now()->year)->count(),
            ],

            'documents' => $this->docStats(),

            // Vendors, visits, surveys, OKR, clients — always org-wide (strategic)
            'vendors' => [
                'total'     => Vendor::count(),
                'active'    => Vendor::where('status','active')->count(),
                'qualified' => Vendor::where('qualification_status','qualified')->count(),
                'contracts' => VendorContract::where('status','active')->count(),
                'expiring'  => VendorContract::where('status','active')->where('end_date','<=',now()->addDays(60))->count(),
            ],
            'visits' => [
                'total'      => Visit::count(),
                'scheduled'  => Visit::whereIn('status',['confirmed','planned'])->count(),
                'completed'  => Visit::where('status','completed')->count(),
                'this_month' => Visit::whereMonth('visit_date',now()->month)->whereYear('visit_date',now()->year)->count(),
            ],
            'surveys' => [
                'active'    => Survey::where('status','active')->count(),
                'total'     => Survey::count(),
                'responses' => DB::table('survey_responses')->count(),
                'avg_score' => round(Survey::whereNotNull('avg_score')->avg('avg_score') ?? 0, 1),
                'nps'       => round(Survey::whereNotNull('nps_score')->avg('nps_score') ?? 0),
            ],
            'okr' => [
                'total'        => Objective::count(),
                'on_track'     => Objective::where('status','active')->where('progress_percent','>=',70)->count(),
                'at_risk'      => Objective::where('status','active')->where('progress_percent','<',70)->where('progress_percent','>=',30)->count(),
                'behind'       => Objective::where('status','active')->where('progress_percent','<',30)->count(),
                'avg_progress' => round(Objective::where('status','active')->avg('progress_percent') ?? 0),
                'completed'    => Objective::where('status','completed')->count(),
            ],
            'clients' => [
                'total'  => Client::count(),
                'active' => Client::where('status','active')->count(),
            ],
            'users' => $this->userStats(),
            'sla'   => [
                'total'          => $slaTotal,
                'avg_compliance' => $slaAvg,
                'breached_30d'   => $slaBreached,
            ],

            // Role context sent to frontend for display decisions
            '_role' => [
                'slug'       => $this->slug(),
                'dept_id'    => $this->deptId(),
                'is_qa'      => $this->isQAFull(),
                'is_dept_mgr'=> $this->isDeptMgr(),
                'is_officer' => $this->isQAOfficer(),
                'is_employee'=> $this->isEmployee(),
            ],
        ]);
    }

    private function docStats(): array {
        if ($this->isQAFull() || $this->isQAOfficer()) {
            return [
                'total'        => Document::count(),
                'approved'     => Document::where('status','approved')->count(),
                'draft'        => Document::where('status','draft')->count(),
                'under_review' => Document::where('status','under_review')->count(),
                'expiring'     => Document::where('status','approved')->whereNotNull('expiry_date')->where('expiry_date','<=',now()->addDays(30))->count(),
                'expired'      => Document::whereNotNull('expiry_date')->where('expiry_date','<',now())->count(),
            ];
        }
        // Dept Manager / Employee: only approved docs distributed to their dept
        $d = $this->deptId();
        $base = Document::where('status','approved')
            ->where(fn($q) => $q->where('department_id',$d)
                ->orWhereHas('distributedDepartments', fn($s) => $s->where('department_id',$d)));
        return [
            'total'        => $base->count(),
            'approved'     => $base->count(),
            'draft'        => 0,
            'under_review' => 0,
            'expiring'     => (clone $base)->whereNotNull('expiry_date')->where('expiry_date','<=',now()->addDays(30))->count(),
            'expired'      => 0,
        ];
    }

    private function userStats(): array {
        if ($this->isQAFull())   return ['total' => User::count(),       'active' => User::where('is_active',true)->count()];
        if ($this->isDeptMgr())  return ['total' => User::where('department_id',$this->deptId())->count(), 'active' => User::where('department_id',$this->deptId())->where('is_active',true)->count()];
        return ['total' => null, 'active' => null];
    }

    // ─── GET /api/dashboard/charts ───────────────────────────────────────
    public function charts() {
        $months = collect(range(5,0))->map(fn($m) => now()->subMonths($m));

        return response()->json([
            'requests_by_status'     => $this->reqQ()->select('status', DB::raw('count(*) as total'))->groupBy('status')->get(),
            'risks_by_level'         => $this->riskQ()->select('risk_level', DB::raw('count(*) as total'))->groupBy('risk_level')->get(),
            'complaints_trend'       => $months->map(fn($m) => ['month'=>$m->format('M'), 'count'=>$this->compQ()->whereYear('received_date',$m->year)->whereMonth('received_date',$m->month)->count()])->values(),
            'nc_trend'               => $months->map(fn($m) => ['month'=>$m->format('M'), 'count'=>$this->ncQ()->whereYear('created_at',$m->year)->whereMonth('created_at',$m->month)->count()])->values(),
            'requests_trend'         => $months->map(fn($m) => ['month'=>$m->format('M'), 'count'=>$this->reqQ()->whereYear('created_at',$m->year)->whereMonth('created_at',$m->month)->count()])->values(),
            'capa_by_status'         => $this->capaQ()->select('status', DB::raw('count(*) as total'))->groupBy('status')->get(),
            'complaints_by_severity' => $this->compQ()->select('severity', DB::raw('count(*) as total'))->groupBy('severity')->get(),
            // Org-wide strategic data
            'vendor_by_category'     => DB::table('vendors')->join('vendor_categories','vendor_categories.id','=','vendors.category_id')->select('vendor_categories.name', DB::raw('count(*) as total'))->groupBy('vendor_categories.name')->get(),
            'audit_by_type'          => Audit::select('type', DB::raw('count(*) as total'))->groupBy('type')->get(),
            'okr_by_status'          => collect([
                ['track'=>'on_track','total'=>Objective::where('status','active')->where('progress_percent','>=',70)->count()],
                ['track'=>'at_risk',  'total'=>Objective::where('status','active')->where('progress_percent','<',70)->where('progress_percent','>=',30)->count()],
                ['track'=>'behind',   'total'=>Objective::where('status','active')->where('progress_percent','<',30)->count()],
            ])->filter(fn($r)=>$r['total']>0)->values(),
            'documents_by_status'    => Document::select('status', DB::raw('count(*) as total'))->groupBy('status')->get(),
        ]);
    }

    // ─── GET /api/dashboard/recent-activities ────────────────────────────
    public function recentActivities() {
        $q = ActivityLog::with('user')->orderByDesc('created_at');
        if ($this->isDeptMgr()) {
            $ids = User::where('department_id',$this->deptId())->pluck('id');
            $q->whereIn('user_id', $ids);
        } elseif ($this->isEmployee()) {
            $q->where('user_id', $this->uid());
        }
        return response()->json($q->limit(15)->get());
    }

    // ─── GET /api/dashboard/my-tasks ────────────────────────────────────
    public function myTasks() {
        $uid = $this->uid();

        if ($this->isQAFull()) {
            $requests = QmsRequest::where(fn($q) => $q->where('assignee_id',$uid)->orWhere('status','approved'))
                ->whereNotIn('status',['closed','rejected'])
                ->with(['requester','department','category'])
                ->orderByRaw("FIELD(status,'approved','in_progress','submitted') DESC")
                ->limit(8)->get();
        } elseif ($this->isDeptMgr()) {
            $requests = QmsRequest::where('department_id',$this->deptId())
                ->where('status','submitted')
                ->with(['requester','department','category'])
                ->limit(8)->get();
        } elseif ($this->isQAOfficer()) {
            $requests = QmsRequest::where('assignee_id',$uid)
                ->whereNotIn('status',['closed','rejected'])
                ->with(['requester','department','category'])
                ->limit(8)->get();
        } else {
            $requests = QmsRequest::where('requester_id',$uid)
                ->whereNotIn('status',['closed','rejected'])
                ->with(['requester','department','category'])
                ->limit(8)->get();
        }

        $capa_tasks = DB::table('capa_tasks')
            ->where('responsible_id',$uid)
            ->whereIn('capa_tasks.status',['pending','in_progress'])
            ->join('capas','capas.id','=','capa_tasks.capa_id')
            ->select('capa_tasks.*','capas.reference_no as capa_ref','capas.title as capa_title')
            ->limit(5)->get();

        $nc_tasks = ($this->isQAFull() || $this->isQAOfficer())
            ? Nonconformance::where('assigned_to_id',$uid)->whereNotIn('status',['closed','cancelled'])->limit(5)->get()
            : [];

        return response()->json(['requests'=>$requests, 'capa_tasks'=>$capa_tasks, 'nc_tasks'=>$nc_tasks]);
    }

    // ─── GET /api/dashboard/overdue ─────────────────────────────────────
    public function overdueItems() {
        return response()->json([
            'requests'   => $this->reqQ()->whereNotIn('status',['closed','rejected','approved'])->whereNotNull('due_date')->where('due_date','<',now())->with(['requester','assignee'])->limit(10)->get(),
            'capas'      => $this->capaQ()->whereNotIn('status',['closed','cancelled'])->whereNotNull('target_date')->where('target_date','<',now())->limit(10)->get(),
            'complaints' => $this->compQ()->whereNotIn('status',['closed','resolved','withdrawn'])->whereNotNull('target_resolution_date')->where('target_resolution_date','<',now())->with(['assignee','client'])->limit(10)->get(),
        ]);
    }
}
