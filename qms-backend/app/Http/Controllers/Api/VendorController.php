<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Vendor, VendorCategory, VendorEvaluation, VendorContract, Partnership, User};
use Illuminate\Http\Request;

class VendorController extends Controller {
    public function index(Request $request) {
        $q = Vendor::with(['category','accountManager'])
            ->when($request->status,              fn($q,$v)=>$q->where('status',$v))
            ->when($request->risk_level,          fn($q,$v)=>$q->where('risk_level',$v))
            ->when($request->qualification_status,fn($q,$v)=>$q->where('qualification_status',$v))
            ->when($request->search,              fn($q,$v)=>$q->where(fn($s)=>$s->where('name','like',"%$v%")->orWhere('code','like',"%$v%")));
        return response()->json($q->orderBy('name')->paginate(15));
    }
    public function store(Request $request) {
        if (!auth()->user()->hasPermission('vendor.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }
        $data = $request->validate(['name'=>'required','category_id'=>'nullable|exists:vendor_categories,id','type'=>'required','contact_name'=>'nullable','contact_email'=>'nullable|email','contact_phone'=>'nullable','country'=>'nullable','website'=>'nullable','risk_level'=>'in:low,medium,high,critical','registration_no'=>'nullable','tax_no'=>'nullable']);
        $data['code']   = 'VND' . str_pad(Vendor::count()+1,3,'0',STR_PAD_LEFT);
        $data['status'] = $data['status'] ?? 'prospect';
        $vendor = Vendor::create($data);
        return response()->json($vendor->load(['category']),201);
    }
    public function show($id) { return response()->json(Vendor::with(['category','accountManager','evaluations','contracts'])->findOrFail($id)); }
    public function update(Request $request, $id) {
        $vendor = Vendor::findOrFail($id);
        $vendor->update($request->only(['name','status','risk_level','qualification_status','qualification_date','qualification_expiry','contact_name','contact_email','contact_phone','overall_rating']));
        return response()->json($vendor->fresh(['category']));
    }
    public function destroy($id) { Vendor::findOrFail($id)->delete(); return response()->json(['message'=>'Vendor deleted.']); }
    public function addEvaluation(Request $request, $id) {
        Vendor::findOrFail($id);
        $validated = $request->validate(['evaluation_date'=>'required|date','period'=>'nullable','quality_score'=>'nullable|numeric|between:0,10','delivery_score'=>'nullable|numeric|between:0,10','price_score'=>'nullable|numeric|between:0,10','service_score'=>'nullable|numeric|between:0,10','compliance_score'=>'nullable|numeric|between:0,10','comments'=>'nullable','recommendations'=>'nullable']);
        $scores = array_filter([$validated['quality_score']??null,$validated['delivery_score']??null,$validated['price_score']??null,$validated['service_score']??null,$validated['compliance_score']??null], fn($v) => !is_null($v));
        $validated['overall_score'] = count($scores) > 0 ? round(array_sum($scores)/count($scores), 2) : null;
        $eval = VendorEvaluation::create(array_merge($validated,['vendor_id'=>$id,'evaluated_by_id'=>$request->user()->id]));
        // Update vendor overall rating
        $avgScore = VendorEvaluation::where('vendor_id',$id)->where('status','approved')->avg('overall_score');
        if ($avgScore) Vendor::find($id)->update(['overall_rating'=>round($avgScore,1)]);
        return response()->json($eval->load('evaluatedBy'),201);
    }
    public function addContract(Request $request, $id) {
        Vendor::findOrFail($id);
        $contract = VendorContract::create(array_merge($request->validate(['title'=>'required','description'=>'nullable','type'=>'required|in:service,supply,nda,partnership,maintenance,other','value'=>'nullable|numeric','currency'=>'nullable|string|max:10','start_date'=>'required|date','end_date'=>'nullable|date','auto_renewal'=>'boolean','renewal_notice_days'=>'nullable|integer']),['vendor_id'=>$id,'owner_id'=>$request->user()->id,'contract_no'=>'CON-'.date('Y').'-'.str_pad(VendorContract::count()+1,3,'0',STR_PAD_LEFT)]));
        return response()->json($contract,201);
    }
    public function qualify(Request $request, $id) {
        $vendor = Vendor::findOrFail($id);
        $vendor->update(['qualification_status'=>'qualified','qualification_date'=>now()->toDateString(),'qualification_expiry'=>now()->addYear()->toDateString(),'status'=>'approved']);
        return response()->json($vendor->fresh());
    }
    public function categories() { return response()->json(VendorCategory::orderBy('name')->get()); }
    public function stats() { return response()->json(['by_status'=>Vendor::selectRaw('status,count(*) as total')->groupBy('status')->get(),'by_qualification'=>Vendor::selectRaw('qualification_status,count(*) as total')->groupBy('qualification_status')->get()]); }
    // Partnerships
    public function partnerships(Request $request) { return response()->json(Partnership::with(['vendor','client','owner'])->paginate(15)); }
    public function storePartnership(Request $request) {
        $partnership = Partnership::create(array_merge($request->validate(['name'=>'required','partner_type'=>'required','vendor_id'=>'nullable|exists:vendors,id','client_id'=>'nullable|exists:clients,id','description'=>'nullable','start_date'=>'required|date','end_date'=>'nullable|date','value_proposition'=>'nullable']),['owner_id'=>$request->user()->id]));
        return response()->json($partnership->load(['vendor','client','owner']),201);
    }

    public function allContracts(Request $request) {
        $q = \App\Models\VendorContract::with(['vendor','owner'])
            ->when($request->status, fn($q,$v) => $q->where('status',$v))
            ->when($request->type,   fn($q,$v) => $q->where('type',$v))
            ->when($request->search, fn($q,$v) => $q->where(fn($s) => $s->where('title','like',"%$v%")->orWhere('contract_no','like',"%$v%")));
        return response()->json($q->orderByDesc('created_at')->paginate($request->per_page ?? 15));
    }
    public function storeContract(Request $request) {
        $data = $request->validate(['vendor_id'=>'required|exists:vendors,id','title'=>'required','type'=>'required','value'=>'nullable|numeric','start_date'=>'required|date','end_date'=>'nullable|date','status'=>'in:draft,active,expired,terminated']);
        $data['contract_no'] = 'CON-'.date('Y').'-'.str_pad(\App\Models\VendorContract::count()+1,4,'0',STR_PAD_LEFT);
        $data['status']      = $data['status'] ?? 'draft';
        $data['owner_id']    = $request->user()->id;
        $contract = \App\Models\VendorContract::create($data);
        return response()->json($contract->load(['vendor','owner']), 201);
    }
    public function showContract($id) {
        return response()->json(\App\Models\VendorContract::with(['vendor','owner'])->findOrFail($id));
    }
    public function updateContract(Request $request, $id) {
        $contract = \App\Models\VendorContract::findOrFail($id);
        $contract->update($request->only(['title','type','value','start_date','end_date','status']));
        return response()->json($contract->fresh(['vendor','owner']));
    }

    public function suspend(Request $request, $id) {
        $vendor = Vendor::findOrFail($id);
        $vendor->update(['status' => 'suspended']);
        return response()->json($vendor->fresh());
    }
    public function evaluations($id) {
        return response()->json(VendorEvaluation::with('evaluatedBy')->where('vendor_id',$id)->orderByDesc('evaluation_date')->get());
    }
    public function expiringContracts(Request $request) {
        $days = $request->days ?? 30;
        $contracts = VendorContract::with(['vendor','owner'])
            ->whereNotNull('end_date')
            ->where('end_date','>=',now())
            ->where('end_date','<=',now()->addDays($days))
            ->where('status','active')
            ->orderBy('end_date')
            ->get();
        return response()->json($contracts);
    }
    public function activateContract($id) {
        $c = VendorContract::findOrFail($id);
        $c->update(['status' => 'active']);
        return response()->json($c->fresh(['vendor','owner']));
    }
    public function terminateContract(Request $request, $id) {
        $c = VendorContract::findOrFail($id);
        $c->update(['status' => 'terminated']);
        return response()->json($c->fresh(['vendor','owner']));
    }
    public function users() {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }
    public function vendorsList() {
        return response()->json(Vendor::whereIn('status',['active','approved'])->select('id','name','code','type')->orderBy('name')->get());
    }
    public function contractStats() {
        $now = now();
        return response()->json([
            'total'    => VendorContract::count(),
            'active'   => VendorContract::where('status','active')->count(),
            'draft'    => VendorContract::where('status','draft')->count(),
            'expiring' => VendorContract::where('status','active')->whereNotNull('end_date')->where('end_date','>=',$now)->where('end_date','<=',$now->copy()->addDays(30))->count(),
            'expired'  => VendorContract::where('status','expired')->orWhere(fn($q)=>$q->whereNotNull('end_date')->where('end_date','<',$now)->where('status','active'))->count(),
            'total_value' => VendorContract::where('status','active')->sum('value'),
        ]);
    }
    public function vendorStats() {
        return response()->json([
            'total'       => Vendor::count(),
            'active'      => Vendor::where('status','active')->orWhere('status','approved')->count(),
            'qualified'   => Vendor::where('qualification_status','qualified')->count(),
            'high_risk'   => Vendor::whereIn('risk_level',['high','critical'])->count(),
            'suspended'   => Vendor::where('status','suspended')->count(),
        ]);
    }

}