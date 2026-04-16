<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Audit, AuditProgram, AuditChecklist, AuditFinding, Capa, User, Department};
use Illuminate\Http\Request;

class AuditController extends Controller {

    public function index(Request $request) {
        $q = Audit::with(['leadAuditor','department','program'])
            ->withCount(['findings as open_findings_count' => fn($q) => $q->where('status','open')])
            ->when($request->status, fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,   fn($q,$v)=>$q->where('type',$v))
            ->when($request->year,   fn($q,$v)=>$q->whereYear('planned_start_date',$v))
            ->when($request->search, fn($q,$v)=>$q->where(fn($s)=>$s->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")));
        return response()->json($q->orderByDesc('planned_start_date')->paginate(15));
    }

    public function store(Request $request) {
        if (!auth()->user()->hasPermission('audit.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }
        $data = $request->validate([
            'program_id'         => 'nullable|exists:audit_programs,id',
            'title'              => 'required|max:255',
            'description'        => 'nullable',
            'type'               => 'required',
            'scope'              => 'nullable',
            'criteria'           => 'nullable',
            'department_id'      => 'nullable|exists:departments,id',
            'planned_start_date' => 'required|date',
            'planned_end_date'   => 'required|date',
        ]);
        $data['lead_auditor_id'] = $request->user()->id;
        $data['status']         = 'planned';
        $data['reference_no']   = 'AUD-' . date('Y') . '-' . str_pad(Audit::count()+1,4,'0',STR_PAD_LEFT);
        $audit = Audit::create($data);
        $audit->team()->syncWithoutDetaching([$request->user()->id => ['role' => 'lead_auditor']]);
        return response()->json($audit->load(['leadAuditor','department','team']),201);
    }

    public function show($id) {
        return response()->json(
            Audit::with(['leadAuditor','department','program','team','checklists','findings.assignee','findings.department'])
                 ->withCount(['findings as open_findings_count' => fn($q) => $q->where('status','open')])
                 ->findOrFail($id)
        );
    }

    public function update(Request $request, $id) {
        $audit = Audit::findOrFail($id);
        $audit->update($request->only([
            'title','status','actual_start_date','actual_end_date',
            'report_date','overall_result','executive_summary','scope','criteria','description'
        ]));
        return response()->json($audit->fresh(['leadAuditor','department']));
    }

    public function destroy($id) {
        Audit::findOrFail($id)->delete();
        return response()->json(['message' => 'Audit deleted.']);
    }

    public function start(Request $request, $id) {
        $audit = Audit::findOrFail($id);
        $audit->update(['status' => 'in_progress', 'actual_start_date' => now()]);
        return response()->json($audit->fresh(['leadAuditor','department']));
    }

    public function notify($id) {
        $audit = Audit::findOrFail($id);
        $audit->update(['status' => 'notified']);
        return response()->json($audit->fresh());
    }

    public function addTeamMember(Request $request, $id) {
        $audit = Audit::findOrFail($id);
        $data  = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|in:lead_auditor,auditor,observer,technical_expert',
        ]);
        $audit->team()->syncWithoutDetaching([$data['user_id'] => ['role' => $data['role'] ?? 'auditor']]);
        return response()->json($audit->load('team'));
    }

    public function removeTeamMember(Request $request, $id) {
        $audit = Audit::findOrFail($id);
        $audit->team()->detach($request->user_id);
        return response()->json(['message' => 'Member removed.']);
    }

    public function checklist($id) {
        Audit::findOrFail($id);
        return response()->json(AuditChecklist::where('audit_id',$id)->orderBy('sequence')->orderBy('id')->get());
    }

    public function addChecklist(Request $request, $id) {
        Audit::findOrFail($id);
        $items = $request->validate([
            'items'                   => 'required|array',
            'items.*.section'         => 'nullable|string',
            'items.*.question'        => 'required|string',
            'items.*.requirement_ref' => 'nullable|string',
            'items.*.sequence'        => 'nullable|integer',
        ])['items'];
        $created = collect($items)->map(fn($item) => AuditChecklist::create(array_merge($item,['audit_id'=>$id])));
        return response()->json($created,201);
    }

    public function updateChecklist(Request $request, $id, $itemId) {
        $item = AuditChecklist::where('audit_id',$id)->findOrFail($itemId);
        $item->update($request->only(['response','evidence','finding_type','notes']));
        return response()->json($item);
    }

    public function findings($id) {
        Audit::findOrFail($id);
        return response()->json(AuditFinding::with(['assignee','department'])->where('audit_id',$id)->get());
    }

    public function addFinding(Request $request, $id) {
        Audit::findOrFail($id);
        $data = $request->validate([
            'finding_type'    => 'required|in:minor_nc,major_nc,observation,opportunity,positive',
            'description'     => 'required',
            'requirement_ref' => 'nullable|string',
            'evidence'        => 'nullable|string',
            'department_id'   => 'nullable|exists:departments,id',
            'assignee_id'     => 'nullable|exists:users,id',
        ]);
        $data['audit_id']     = $id;
        $data['reference_no'] = 'AUD-'.$id.'-F'.str_pad(AuditFinding::where('audit_id',$id)->count()+1,2,'0',STR_PAD_LEFT);
        $finding = AuditFinding::create($data);
        return response()->json($finding->load(['assignee','department']),201);
    }

    public function updateFinding(Request $request, $id, $findingId) {
        $finding = AuditFinding::where('audit_id',$id)->findOrFail($findingId);
        $finding->update($request->only(['status','description','evidence','finding_type','assignee_id','capa_id']));
        return response()->json($finding->fresh(['assignee','department']));
    }

    public function raiseCapa(Request $request, $id, $findingId) {
        $finding = AuditFinding::where('audit_id',$id)->findOrFail($findingId);
        $capa = Capa::create([
            'reference_no' => 'CAPA-' . date('Y') . '-' . str_pad(Capa::count()+1,4,'0',STR_PAD_LEFT),
            'title'        => 'CAPA for ' . $finding->reference_no . ': ' . substr($finding->description,0,100),
            'description'  => $finding->description,
            'type'         => 'corrective',
            'priority'     => $finding->finding_type === 'major_nc' ? 'high' : 'medium',
            'status'       => 'open',
            'source'       => 'audit',
            'source_ref'   => $finding->reference_no,
            'owner_id'     => $finding->assignee_id ?? $request->user()->id,
            'target_date'  => now()->addDays(30)->toDateString(),
        ]);
        $finding->update(['capa_id' => $capa->id, 'status' => 'capa_raised']);
        return response()->json($capa, 201);
    }

    public function issueReport(Request $request, $id) {
        $audit = Audit::findOrFail($id);
        $audit->update([
            'status'            => 'report_issued',
            'report_date'       => now(),
            'overall_result'    => $request->overall_result ?? 'satisfactory',
            'executive_summary' => $request->executive_summary,
        ]);
        return response()->json($audit->fresh());
    }

    public function close($id) {
        $audit = Audit::findOrFail($id);
        $audit->update(['status' => 'closed', 'actual_end_date' => now()]);
        return response()->json($audit->fresh());
    }

    public function programs() {
        return response()->json(AuditProgram::withCount('audits')->orderByDesc('year')->get());
    }

    public function createProgram(Request $request) {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'year'        => 'required|integer',
        ]);
        $data['created_by_id'] = $request->user()->id;
        return response()->json(AuditProgram::create($data), 201);
    }

    public function stats() {
        return response()->json([
            'by_status' => Audit::selectRaw('status,count(*) as total')->groupBy('status')->get(),
            'by_type'   => Audit::selectRaw('type,count(*) as total')->groupBy('type')->get(),
            'findings'  => AuditFinding::selectRaw('finding_type,count(*) as total')->groupBy('finding_type')->get(),
        ]);
    }

    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }

    public function departments() {
        return response()->json(Department::select('id','name')->orderBy('name')->get());
    }
}
