<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Complaint, ComplaintCategory, ComplaintUpdate, User, Department, Client};
use Illuminate\Http\Request;

class ComplaintController extends Controller {
    public function index(Request $request) {
        $q = Complaint::with(['category','assignee','client','department'])
            ->when($request->status,      fn($q,$v)=>$q->where('status',$v))
            ->when($request->severity,    fn($q,$v)=>$q->where('severity',$v))
            ->when($request->client_id,   fn($q,$v)=>$q->where('client_id',$v))
            ->when($request->department_id,fn($q,$v)=>$q->where('department_id',$v))
            ->when($request->search,      fn($q,$v)=>$q->where(fn($s)=>$s->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")->orWhere('complainant_name','like',"%$v%")));
        return response()->json($q->orderByDesc('received_date')->paginate(15));
    }
    public function store(Request $request) {
        $data = $request->validate(['title'=>'required','description'=>'required','category_id'=>'nullable|exists:complaint_categories,id','complainant_type'=>'nullable|in:client,vendor,employee,public,regulator,other','complainant_name'=>'nullable','complainant_email'=>'nullable|email','complainant_phone'=>'nullable','client_id'=>'nullable|exists:clients,id','department_id'=>'nullable|exists:departments,id','severity'=>'nullable|in:low,medium,high,critical','source'=>'nullable|in:email,phone,web_form,in_person,social_media,regulator,other','priority'=>'nullable|in:low,medium,high,critical','received_date'=>'nullable|date','is_regulatory'=>'boolean']);
        $data['complainant_type'] ??= 'other';
        $data['complainant_name'] ??= 'Unknown';
        $data['severity'] = $data['severity'] ?? $data['priority'] ?? 'medium';
        $data['source'] ??= 'other';
        unset($data['priority']);
        $data['reference_no'] = 'CMP-' . date('Y') . '-' . str_pad(Complaint::count()+1,4,'0',STR_PAD_LEFT);
        $data['received_date'] ??= now();
        // auto-set SLA from category
        if (!empty($data['category_id'])) {
            $cat = ComplaintCategory::find($data['category_id']);
            if ($cat) $data['target_resolution_date'] = now()->addHours($cat->sla_hours);
        }
        $complaint = Complaint::create($data);
        return response()->json($complaint->load(['category','client']),201);
    }
    public function storeExternal(Request $request) { return $this->store($request); } // public endpoint
    public function show($id) { return response()->json(Complaint::with(['category','assignee','client','department','updates.user','escalatedTo','capa'])->findOrFail($id)); }
    public function update(Request $request, $id) {
        $complaint = Complaint::findOrFail($id);
        $old = $complaint->status;
        $complaint->update($request->only(['status','assignee_id','root_cause','resolution','customer_satisfaction','capa_required','capa_id']));
        if ($request->status && $request->status !== $old) {
            $complaint->updates()->create(['user_id'=>$request->user()->id,'update_type'=>'status_change','previous_status'=>$old,'new_status'=>$request->status,'comment'=>$request->comment,'notify_complainant'=>$request->notify_complainant??false]);
        }
        return response()->json($complaint->fresh(['category','assignee']));
    }
    public function destroy($id) { Complaint::findOrFail($id)->delete(); return response()->json(['message'=>'Complaint deleted.']); }
    public function acknowledge(Request $request, $id) {
        $c = Complaint::findOrFail($id);
        $c->update(['status'=>'acknowledged','acknowledged_date'=>now()]);
        $c->updates()->create(['user_id'=>$request->user()->id,'update_type'=>'status_change','previous_status'=>'received','new_status'=>'acknowledged','comment'=>'Complaint acknowledged.','notify_complainant'=>true]);
        return response()->json($c->fresh());
    }
    public function escalate(Request $request, $id) {
        $request->validate(['escalated_to_id'=>'required|exists:users,id','reason'=>'required']);
        $c = Complaint::findOrFail($id);
        $c->update(['status'=>'escalated','escalation_level'=>$c->escalation_level+1,'escalated_to_id'=>$request->escalated_to_id]);
        $c->updates()->create(['user_id'=>$request->user()->id,'update_type'=>'escalation','previous_status'=>$c->status,'new_status'=>'escalated','comment'=>$request->reason,'notify_complainant'=>true]);
        return response()->json($c->fresh());
    }
    public function resolve(Request $request, $id) {
        $request->validate(['resolution'=>'required']);
        $c = Complaint::findOrFail($id);
        $c->update(['status'=>'resolved','resolution'=>$request->resolution,'actual_resolution_date'=>now(),'customer_satisfaction'=>$request->customer_satisfaction]);
        $c->updates()->create(['user_id'=>$request->user()->id,'update_type'=>'resolution','previous_status'=>$c->status,'new_status'=>'resolved','comment'=>$request->resolution,'notify_complainant'=>true]);
        return response()->json($c->fresh());
    }
    public function categories() { return response()->json(ComplaintCategory::orderBy('name')->get()); }
    public function stats() {
        $byStatus   = Complaint::selectRaw('status, count(*) as total')->groupBy('status')->get();
        $bySeverity = Complaint::selectRaw('severity, count(*) as total')->groupBy('severity')->get();
        $avgSat     = Complaint::whereNotNull('customer_satisfaction')->avg('customer_satisfaction');
        $avgDays    = Complaint::whereNotNull('actual_resolution_date')
            ->selectRaw('AVG(DATEDIFF(actual_resolution_date, received_date)) as avg_days')
            ->value('avg_days');
        $overdue = Complaint::whereNotIn('status',['resolved','closed','withdrawn'])
            ->whereNotNull('target_resolution_date')
            ->where('target_resolution_date','<',now())
            ->count();
        return response()->json([
            'by_status'        => $byStatus,
            'by_severity'      => $bySeverity,
            'avg_satisfaction' => $avgSat ? round($avgSat, 1) : null,
            'avg_days'         => $avgDays ? round($avgDays, 1) : null,
            'overdue'          => $overdue,
        ]);
    }

    public function assign(Request $request, $id) {
        $request->validate(['assignee_id' => 'required|exists:users,id']);
        $c = Complaint::findOrFail($id);
        $prev = $c->assignee_id;
        $c->update(['assignee_id' => $request->assignee_id, 'status' => $c->status === 'received' ? 'acknowledged' : $c->status]);
        $c->updates()->create(['user_id' => $request->user()->id, 'update_type' => 'comment', 'previous_status' => $c->status, 'new_status' => $c->status, 'comment' => 'Complaint assigned to ' . optional(User::find($request->assignee_id))->name, 'notify_complainant' => false]);
        return response()->json($c->fresh(['assignee','category']));
    }
    public function close(Request $request, $id) {
        $c = Complaint::findOrFail($id);
        $old = $c->status;
        $c->update(['status' => 'closed', 'customer_satisfaction' => $request->customer_satisfaction]);
        $c->updates()->create(['user_id' => $request->user()->id, 'update_type' => 'closure', 'previous_status' => $old, 'new_status' => 'closed', 'comment' => $request->comment ?? 'Complaint closed.', 'notify_complainant' => true]);
        return response()->json($c->fresh());
    }
    public function withdraw(Request $request, $id) {
        $c = Complaint::findOrFail($id);
        $old = $c->status;
        $c->update(['status' => 'withdrawn']);
        $c->updates()->create(['user_id' => $request->user()->id, 'update_type' => 'status_change', 'previous_status' => $old, 'new_status' => 'withdrawn', 'comment' => $request->reason ?? 'Complaint withdrawn.', 'notify_complainant' => false]);
        return response()->json($c->fresh());
    }
    public function raiseCapa(Request $request, $id) {
        $c = Complaint::findOrFail($id);
        $capa = \App\Models\Capa::create([
            'reference_no'  => 'CAPA-' . date('Y') . '-' . str_pad(\App\Models\Capa::count()+1, 4, '0', STR_PAD_LEFT),
            'title'         => 'CAPA for Complaint: ' . $c->title,
            'description'   => $c->description,
            'type'          => 'corrective',
            'priority'      => $c->severity ?? 'medium',
            'target_date'   => now()->addDays(30)->toDateString(),
            'owner_id'      => $request->user()->id,
            'status'        => 'open',
        ]);
        $c->update(['capa_id' => $capa->id, 'capa_required' => true]);
        $c->updates()->create(['user_id' => $request->user()->id, 'update_type' => 'comment', 'previous_status' => $c->status, 'new_status' => $c->status, 'comment' => 'CAPA raised: ' . $capa->reference_no, 'notify_complainant' => false]);
        return response()->json(['capa' => $capa, 'complaint' => $c->fresh()]);
    }
    public function updates($id) {
        Complaint::findOrFail($id);
        return response()->json(ComplaintUpdate::with('user')->where('complaint_id', $id)->orderByDesc('created_at')->get());
    }
    public function addUpdate(Request $request, $id) {
        $c = Complaint::findOrFail($id);
        $update = $c->updates()->create([
            'user_id'           => $request->user()->id,
            'update_type'       => $request->update_type ?? 'comment',
            'previous_status'   => $c->status,
            'new_status'        => $c->status,
            'comment'           => $request->validate(['comment' => 'required'])['comment'],
            'notify_complainant'=> $request->notify_complainant ?? false,
        ]);
        return response()->json($update->load('user'), 201);
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
    public function investigate(Request $request, $id) {
        $c = Complaint::findOrFail($id);
        $old = $c->status;
        $c->update(['status' => 'under_investigation', 'root_cause' => $request->root_cause]);
        $c->updates()->create(['user_id' => $request->user()->id, 'update_type' => 'status_change', 'previous_status' => $old, 'new_status' => 'under_investigation', 'comment' => 'Investigation started.', 'notify_complainant' => false]);
        return response()->json($c->fresh());
    }
    
}