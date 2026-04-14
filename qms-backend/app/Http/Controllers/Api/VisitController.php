<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Visit, Client, VisitFinding, User, Department};
use Illuminate\Http\Request;

class VisitController extends Controller {
    public function index(Request $request) {
        $q = Visit::with(['client','host'])
            ->when($request->status,   fn($q,$v)=>$q->where('status',$v))
            ->when($request->type,     fn($q,$v)=>$q->where('type',$v))
            ->when($request->client_id,fn($q,$v)=>$q->where('client_id',$v))
            ->when($request->search,   fn($q,$v)=>$q->where(fn($s)=>$s->where('reference_no','like',"%$v%")));
        return response()->json($q->orderByDesc('visit_date')->paginate(15));
    }
    public function store(Request $request) {
        $data = $request->validate(['client_id'=>'required|exists:clients,id','type'=>'required','purpose'=>'required','visit_date'=>'required|date','visit_time'=>'nullable','duration_hours'=>'nullable|numeric','location'=>'nullable','is_virtual'=>'boolean','meeting_link'=>'nullable','agenda'=>'nullable','participants'=>'nullable|array']);
        $data['host_id'] = $request->user()->id;
        $data['reference_no'] = 'VIS-' . date('Y') . '-' . str_pad(Visit::count()+1,4,'0',STR_PAD_LEFT);
        $participants = $data['participants'] ?? []; unset($data['participants']);
        $visit = Visit::create($data);
        foreach ($participants as $p) $visit->participants()->create($p);
        return response()->json($visit->load(['client','host','participants']),201);
    }
    public function show($id) { return response()->json(Visit::with(['client','host','participants.user','findings.responsible'])->findOrFail($id)); }
    public function update(Request $request, $id) {
        $visit = Visit::findOrFail($id);
        $visit->update($request->only(['status','agenda','minutes','outcome','rating','rating_comments','follow_up_date','actual_start_date']));
        return response()->json($visit->fresh(['client','host']));
    }
    public function destroy($id) { Visit::findOrFail($id)->delete(); return response()->json(['message'=>'Visit deleted.']); }
    public function addFinding(Request $request, $id) {
        Visit::findOrFail($id);
        $finding = VisitFinding::create(array_merge($request->validate(['finding_type'=>'required','description'=>'required','priority'=>'nullable|in:low,medium,high,critical','responsible_id'=>'nullable|exists:users,id','due_date'=>'nullable|date']),['visit_id'=>$id]));
        return response()->json($finding->load('responsible'),201);
    }
    public function clients() { return response()->json(Client::orderBy('name')->get(['id','name','type','status','contact_name','contact_email'])); }
    public function stats() { return response()->json(['by_status'=>Visit::selectRaw('status,count(*) as total')->groupBy('status')->get(),'by_type'=>Visit::selectRaw('type,count(*) as total')->groupBy('type')->get()]); }

    public function confirm($id) {
        $visit = Visit::findOrFail($id);
        $visit->update(['status' => 'confirmed']);
        return response()->json($visit->fresh(['client','host']));
    }
    public function start($id) {
        $visit = Visit::findOrFail($id);
        $visit->update(['status' => 'in_progress', 'actual_start_date' => now()]);
        return response()->json($visit->fresh(['client','host']));
    }
    public function complete(Request $request, $id) {
        $visit = Visit::findOrFail($id);
        $data = $request->only(['minutes','outcome','rating','rating_comments','follow_up_date','action_items']);
        $data['status'] = 'completed';
        $visit->update($data);
        return response()->json($visit->fresh(['client','host']));
    }
    public function rate(Request $request, $id) {
        $visit = Visit::findOrFail($id);
        $visit->update($request->validate(['rating' => 'required|integer|between:1,5', 'rating_comments' => 'nullable|string']));
        return response()->json($visit->fresh());
    }
    public function addParticipant(Request $request, $id) {
        $visit = Visit::findOrFail($id);
        $p = $visit->participants()->create($request->validate([
            'user_id'       => 'nullable|exists:users,id',
            'external_name' => 'nullable|string|max:200',
            'external_email'=> 'nullable|email',
            'external_role' => 'nullable|string|max:100',
            'is_internal'   => 'boolean',
        ]));
        return response()->json($p->load('user'), 201);
    }
    public function calendar() {
        $visits = Visit::with(['client'])->whereMonth('visit_date', now()->month)->get();
        return response()->json($visits);
    }
    public function storeClient(Request $request) {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'type'          => 'nullable|in:client,insurer,regulator,partner,prospect',
            'industry'      => 'nullable|string',
            'contact_name'  => 'nullable|string|max:200',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'country'       => 'nullable|string',
        ]);
        $data['code'] = 'CLT' . str_pad(Client::count()+1, 3, '0', STR_PAD_LEFT);
        $client = Client::create($data);
        return response()->json($client, 201);
    }
    public function showClient($id) {
        return response()->json(Client::with(['visits'])->findOrFail($id));
    }
    public function updateClient(Request $request, $id) {
        $client = Client::findOrFail($id);
        $client->update($request->only(['name','type','industry','contact_name','contact_email','contact_phone','status','country']));
        return response()->json($client->fresh());
    }
    public function clientVisits($id) {
        return response()->json(Visit::with(['host'])->where('client_id', $id)->orderByDesc('visit_date')->get());
    }


    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }
    public function destroyClient($id) {
        Client::findOrFail($id)->delete();
        return response()->json(['message' => 'Client deleted.']);
    }
    public function allClients(Request $request) {
        $q = Client::withCount('visits')->with('accountManager')
            ->when($request->type,   fn($q,$v)=>$q->where('type',$v))
            ->when($request->status, fn($q,$v)=>$q->where('status',$v))
            ->when($request->search, fn($q,$v)=>$q->where('name','like',"%$v%"));
        return response()->json($q->orderBy('name')->paginate(20));
    }
    public function clientStats() {
        return response()->json([
            'total'    => Client::count(),
            'active'   => Client::where('status','active')->count(),
            'insurers' => Client::where('type','insurer')->count(),
            'prospects'=> Client::where('status','prospect')->count(),
        ]);
    }

}