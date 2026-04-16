<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Risk, RiskCategory, RiskControl, RiskReview, User, Department};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RiskController extends Controller {


    private function calcRiskLevel(int $likelihood, int $impact): array
    {
        $score = $likelihood * $impact;
        $level = match(true) {
            $score >= 20 => 'critical',
            $score >= 12 => 'high',
            $score >= 6  => 'medium',
            default      => 'low',
        };
        return ['score' => $score, 'risk_level' => $level];
    }

    public function index(Request $request) {
        $q = Risk::with(['category','owner','department'])
            ->when($request->status,       fn($q,$v)=>$q->where('status',$v))
            ->when($request->risk_level,   fn($q,$v)=>$q->where('risk_level',$v))
            ->when($request->type,         fn($q,$v)=>$q->where('type',$v))
            ->when($request->owner_id,     fn($q,$v)=>$q->where('owner_id',$v))
            ->when($request->department_id,fn($q,$v)=>$q->where('department_id',$v))
            ->when($request->likelihood,   fn($q,$v)=>$q->where('likelihood',$v))
            ->when($request->impact,       fn($q,$v)=>$q->where('impact',$v))
            ->when($request->search,       fn($q,$v)=>$q->where(fn($s)=>
                $s->where('title','like',"%$v%")->orWhere('reference_no','like',"%$v%")
            ));
        return response()->json($q->orderByDesc(DB::raw('likelihood * impact'))
                                  ->orderByDesc('created_at')
                                  ->paginate((int)($request->per_page ?? 15)));
    }

    public function store(Request $request) {
        if (!auth()->user()->hasPermission('risk.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }
        $data = $request->validate([
            'title'              => 'required|max:255',
            'description'        => 'required',
            'category_id'        => 'nullable|exists:risk_categories,id',
            'department_id'      => 'nullable|exists:departments,id',
            'type'               => 'required',
            'likelihood'         => 'required|integer|between:1,5',
            'impact'             => 'required|integer|between:1,5',
            'treatment_strategy' => 'nullable|in:avoid,mitigate,transfer,accept',
            'treatment_plan'     => 'nullable|string',
            'next_review_date'   => 'nullable|date',
            'status'             => 'nullable|string',
        ]);
        $data['owner_id']     = $request->user()->id;
        $data['status']       = $data['status'] ?? 'identified';
        $data['reference_no'] = 'RSK-'.date('Y').'-'.str_pad(Risk::count()+1,4,'0',STR_PAD_LEFT);
        $calc = $this->calcRiskLevel((int)$data['likelihood'], (int)$data['impact']);
        $data['risk_score'] = $calc['score'];
        $data['risk_level'] = $calc['risk_level'];
        $risk = Risk::create($data);
        return response()->json($risk->load(['category','owner','department']), 201);
    }

    public function show($id) {
        $risk = Risk::with([
            'category','owner','department',
            'controls.owner',
            'reviews' => fn($q) => $q->orderByDesc('review_date'),
            'reviews.reviewedBy',
        ])->findOrFail($id);
        return response()->json($risk);
    }

    public function update(Request $request, $id) {
        $risk = Risk::findOrFail($id);
        if ($request->has('likelihood') || $request->has('impact')) {
            $l = $request->get('likelihood', $risk->likelihood);
            $i = $request->get('impact', $risk->impact);
            $calc = $this->calcRiskLevel((int)$l, (int)$i);
            $risk->score      = $calc['score'];
            $risk->risk_level = $calc['risk_level'];
        }
        $risk->update($request->only([
            'title','description','likelihood','impact','status',
            'treatment_strategy','treatment_plan',
            'residual_likelihood','residual_impact',
            'next_review_date','category_id','department_id','type',
        ]));
        return response()->json($risk->fresh(['category','owner','department','controls.owner','reviews.reviewedBy']));
    }

    public function destroy($id) {
        Risk::findOrFail($id)->delete();
        return response()->json(['message' => 'Risk deleted.']);
    }

    public function assess(Request $request, $id) {
        $risk = Risk::findOrFail($id);
        if ($request->has('likelihood') || $request->has('impact')) {
            $l = $request->get('likelihood', $risk->likelihood);
            $i = $request->get('impact', $risk->impact);
            $calc = $this->calcRiskLevel((int)$l, (int)$i);
            $risk->score      = $calc['score'];
            $risk->risk_level = $calc['risk_level'];
        }
        $risk->update($request->only([
            'likelihood','impact','residual_likelihood','residual_impact',
            'status','treatment_strategy','treatment_plan','next_review_date',
        ]));
        return response()->json($risk->fresh(['category','owner','department']));
    }

    public function addControl(Request $request, $id) {
        $risk = Risk::findOrFail($id);
        $ctrl = $risk->controls()->create(
            $request->validate([
                'control_description' => 'required',
                'control_type'        => 'required|in:preventive,detective,corrective',
                'effectiveness'       => 'nullable|in:effective,partially_effective,ineffective,not_tested',
                'last_tested_date'    => 'nullable|date',
                'next_test_date'      => 'nullable|date',
            ]) + ['owner_id' => $request->user()->id]
        );
        return response()->json($ctrl->load('owner'), 201);
    }

    public function updateControl(Request $request, $id, $controlId) {
        $ctrl = RiskControl::where('risk_id',$id)->findOrFail($controlId);
        $ctrl->update($request->only(['control_description','control_type','effectiveness','last_tested_date','next_test_date']));
        return response()->json($ctrl->load('owner'));
    }

    public function deleteControl($id, $controlId) {
        RiskControl::where('risk_id',$id)->findOrFail($controlId)->delete();
        return response()->json(['message' => 'Control deleted.']);
    }

    public function addReview(Request $request, $id) {
        $risk = Risk::findOrFail($id);
        $review = $risk->reviews()->create(
            $request->validate([
                'review_date'         => 'required|date',
                'likelihood_reviewed' => 'nullable|integer|between:1,5',
                'impact_reviewed'     => 'nullable|integer|between:1,5',
                'status_after'        => 'nullable|string',
                'comments'            => 'nullable|string',
                'next_review_date'    => 'nullable|date',
            ]) + ['reviewed_by_id' => $request->user()->id]
        );
        $risk->update([
            'review_date'      => $request->review_date,
            'next_review_date' => $request->next_review_date ?? $risk->next_review_date,
            'status'           => $request->status_after    ?? $risk->status,
            'likelihood'       => $request->likelihood_reviewed ?? $risk->likelihood,
            'impact'           => $request->impact_reviewed     ?? $risk->impact,
        ]);
        return response()->json($review->load('reviewedBy'), 201);
    }

    public function categories() { return response()->json(RiskCategory::orderBy('name')->get()); }
    public function owners()     { return response()->json(User::select('id','name')->orderBy('name')->get()); }
    public function departments(){ return response()->json(Department::select('id','name')->orderBy('name')->get()); }

    public function stats() {
        return response()->json([
            'total'           => Risk::count(),
            'by_level'        => Risk::selectRaw('risk_level, count(*) as total')->groupBy('risk_level')->get(),
            'by_status'       => Risk::selectRaw('status, count(*) as total')->groupBy('status')->get(),
            'by_type'         => Risk::selectRaw('type, count(*) as total')->groupBy('type')->get(),
            'by_treatment'    => Risk::whereNotNull('treatment_strategy')
                                     ->selectRaw('treatment_strategy, count(*) as total')
                                     ->groupBy('treatment_strategy')->get(),
            'overdue_reviews' => Risk::whereNotNull('next_review_date')
                                     ->whereDate('next_review_date','<',now())
                                     ->whereNotIn('status',['closed'])->count(),
        ]);
    }

    public function matrix() {
        $risks = Risk::with(['owner','department','category'])->get();
        $matrix = [];
        foreach ($risks as $r) {
            $l = $r->likelihood; $i = $r->impact;
            if ($l && $i) {
                $matrix[$l][$i][] = [
                    'id'         => $r->id,
                    'reference_no'=> $r->reference_no,
                    'title'      => $r->title,
                    'risk_level' => $r->risk_level,
                    'status'     => $r->status,
                    'type'       => $r->type,
                    'owner'      => $r->owner?->name,
                    'department' => $r->department?->name,
                    'score'      => $l * $i,
                ];
            }
        }
        return response()->json([
            'matrix'   => $matrix,
            'total'    => $risks->count(),
            'by_level' => Risk::selectRaw('risk_level, count(*) as total')->groupBy('risk_level')->get(),
            'by_status'=> Risk::selectRaw('status, count(*) as total')->groupBy('status')->get(),
        ]);
    }
}
