<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Complaint, ComplaintCategory, ComplaintUpdate, User, Department, Client};
use Illuminate\Http\Request;

/**
 * ComplaintController
 *
 * Manages the full complaint lifecycle with proper role scoping and
 * permission guards on every workflow action.
 *
 * Visibility rules:
 *   super_admin / qa_manager         → all complaints
 *   quality_supervisor / qa_officer  → all complaints (QA team works them)
 *   compliance_manager               → all complaints
 *   compliance_officer               → all complaints
 *   dept_manager                     → complaints from their department
 *   employee / client                → complaints they created
 */
class ComplaintController extends Controller
{
    // ── Role helpers ────────────────────────────────────────────────────
    private function slug(): string { return auth()->user()->role?->slug ?? ''; }
    private function isQATeam(): bool {
        return in_array($this->slug(), ['super_admin','qa_manager','quality_supervisor','qa_officer']);
    }
    private function isComplianceTeam(): bool {
        return in_array($this->slug(), ['compliance_manager','compliance_officer']);
    }
    private function canManage(): bool {
        return in_array($this->slug(), ['super_admin','qa_manager','quality_supervisor','compliance_manager','compliance_officer']);
    }
    private function isDeptMgr(): bool { return $this->slug() === 'dept_manager'; }

    // ── GET /api/complaints ──────────────────────────────────────────────
    public function index(Request $request)
    {
        $user = auth()->user();
        $q = Complaint::with(['category','assignee','client','department'])
            ->when($request->status,       fn($q,$v) => $q->where('status', $v))
            ->when($request->severity,     fn($q,$v) => $q->where('severity', $v))
            ->when($request->client_id,    fn($q,$v) => $q->where('client_id', $v))
            ->when($request->department_id,fn($q,$v) => $q->where('department_id', $v))
            ->when($request->search,       fn($q,$v) => $q->where(fn($s) =>
                $s->where('title','like',"%$v%")
                  ->orWhere('reference_no','like',"%$v%")
                  ->orWhere('complainant_name','like',"%$v%")));

        // Visibility scoping
        if ($this->isQATeam() || $this->isComplianceTeam()) {
            // QA + Compliance teams see all complaints
        } elseif ($this->isDeptMgr()) {
            $q->where('department_id', $user->department_id);
        } else {
            // Employee / Client — own only (by complainant_email or created_by if available)
            $q->where(fn($s) => $s->where('complainant_email', $user->email)
                                  ->orWhere('created_by', $user->id));
        }

        return response()->json($q->orderByDesc('received_date')->paginate((int)$request->get('per_page',15)));
    }

    // ── POST /api/complaints ─────────────────────────────────────────────
    public function store(Request $request)
    {
        if (!auth()->user()->hasPermission('complaint.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }
        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'required|string',
            'category_id'      => 'nullable|exists:complaint_categories,id',
            'complainant_type' => 'nullable|in:client,vendor,employee,public,regulator,other',
            'complainant_name' => 'nullable|string|max:255',
            'complainant_email'=> 'nullable|email',
            'complainant_phone'=> 'nullable|string|max:50',
            'client_id'        => 'nullable|exists:clients,id',
            'department_id'    => 'nullable|exists:departments,id',
            'severity'         => 'nullable|in:low,medium,high,critical',
            'source'           => 'nullable|in:email,phone,web_form,in_person,social_media,regulator,other',
            'priority'         => 'nullable|in:low,medium,high,critical',
            'received_date'    => 'nullable|date',
            'is_regulatory'    => 'boolean',
        ]);

        $data['complainant_type'] ??= 'other';
        $data['complainant_name'] ??= 'Unknown';
        $data['severity']          = $data['severity'] ?? $data['priority'] ?? 'medium';
        $data['source']           ??= 'other';
        unset($data['priority']);

        $data['status']        = 'received';
        $data['reference_no']  = 'CMP-' . date('Y') . '-' . str_pad(Complaint::count()+1, 4, '0', STR_PAD_LEFT);
        $data['received_date'] ??= now();

        // Auto SLA from category
        if (!empty($data['category_id'])) {
            $cat = ComplaintCategory::find($data['category_id']);
            if ($cat) $data['target_resolution_date'] = now()->addHours($cat->sla_hours);
        }

        $complaint = Complaint::create($data);
        return response()->json($complaint->load(['category','client']), 201);
    }

    // Public endpoint (no auth) — rate-limited in routes
    public function storeExternal(Request $request) { return $this->store($request); }

    // ── GET /api/complaints/{id} ─────────────────────────────────────────
    public function show($id)
    {
        $c    = Complaint::with(['category','assignee','client','department','updates.user','escalatedTo','capa'])->findOrFail($id);
        $user = auth()->user();

        if (!$this->isQATeam() && !$this->isComplianceTeam()) {
            if ($this->isDeptMgr() && $c->department_id !== $user->department_id) abort(403);
            if (!$this->isDeptMgr()) {
                if ($c->complainant_email !== $user->email && $c->created_by !== $user->id) abort(403);
            }
        }

        return response()->json($c);
    }

    // ── PUT /api/complaints/{id} ─────────────────────────────────────────
    public function update(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can update complaints.');
        $complaint = Complaint::findOrFail($id);
        $old       = $complaint->status;
        $complaint->update($request->only(['status','assignee_id','root_cause','resolution',
                                           'customer_satisfaction','capa_required','capa_id']));
        if ($request->status && $request->status !== $old) {
            $complaint->updates()->create([
                'user_id'            => auth()->id(),
                'update_type'        => 'status_change',
                'previous_status'    => $old,
                'new_status'         => $request->status,
                'comment'            => $request->comment,
                'notify_complainant' => $request->notify_complainant ?? false,
            ]);
        }
        return response()->json($complaint->fresh(['category','assignee']));
    }

    // ── DELETE /api/complaints/{id} ──────────────────────────────────────
    public function destroy($id)
    {
        if (!in_array($this->slug(), ['super_admin','qa_manager'])) abort(403);
        Complaint::findOrFail($id)->delete();
        return response()->json(['message' => 'Complaint deleted.']);
    }

    // ── POST /api/complaints/{id}/acknowledge ────────────────────────────
    public function acknowledge(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can acknowledge complaints.');
        $c = Complaint::findOrFail($id);
        if ($c->status !== 'received') {
            return response()->json(['message' => 'Only received complaints can be acknowledged.'], 422);
        }
        $c->update(['status' => 'acknowledged', 'acknowledged_date' => now()]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'status_change',
            'previous_status'    => 'received',
            'new_status'         => 'acknowledged',
            'comment'            => 'Complaint acknowledged by ' . auth()->user()->name,
            'notify_complainant' => true,
        ]);
        return response()->json($c->fresh());
    }

    // ── POST /api/complaints/{id}/assign ─────────────────────────────────
    public function assign(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can assign complaints.');
        $request->validate(['assignee_id' => 'required|exists:users,id']);
        $c = Complaint::findOrFail($id);
        $c->update([
            'assignee_id' => $request->assignee_id,
            'status'      => $c->status === 'received' ? 'acknowledged' : $c->status,
        ]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'comment',
            'previous_status'    => $c->status,
            'new_status'         => $c->status,
            'comment'            => 'Complaint assigned to ' . optional(User::find($request->assignee_id))->name,
            'notify_complainant' => false,
        ]);
        return response()->json($c->fresh(['assignee','category']));
    }

    // ── POST /api/complaints/{id}/investigate ────────────────────────────
    public function investigate(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can start investigations.');
        $c = Complaint::findOrFail($id);
        if (!in_array($c->status, ['received','acknowledged'])) {
            return response()->json(['message' => 'Complaint must be received or acknowledged first.'], 422);
        }
        $old = $c->status;
        $c->update(['status' => 'under_investigation', 'root_cause' => $request->root_cause]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'status_change',
            'previous_status'    => $old,
            'new_status'         => 'under_investigation',
            'comment'            => 'Investigation started by ' . auth()->user()->name,
            'notify_complainant' => false,
        ]);
        return response()->json($c->fresh());
    }

    // ── POST /api/complaints/{id}/escalate ───────────────────────────────
    public function escalate(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can escalate complaints.');
        $request->validate(['escalated_to_id' => 'required|exists:users,id', 'reason' => 'required|string']);
        $c = Complaint::findOrFail($id);
        if (in_array($c->status, ['resolved','closed','withdrawn'])) {
            return response()->json(['message' => 'Cannot escalate a closed or resolved complaint.'], 422);
        }
        $old = $c->status;
        $c->update(['status' => 'escalated', 'escalation_level' => $c->escalation_level + 1, 'escalated_to_id' => $request->escalated_to_id]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'escalation',
            'previous_status'    => $old,
            'new_status'         => 'escalated',
            'comment'            => $request->reason,
            'notify_complainant' => true,
        ]);
        return response()->json($c->fresh());
    }

    // ── POST /api/complaints/{id}/resolve ────────────────────────────────
    public function resolve(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can resolve complaints.');
        $request->validate(['resolution' => 'required|string']);
        $c = Complaint::findOrFail($id);
        if (in_array($c->status, ['resolved','closed','withdrawn'])) {
            return response()->json(['message' => 'Complaint is already resolved or closed.'], 422);
        }
        $old = $c->status;
        $c->update([
            'status'                => 'resolved',
            'resolution'            => $request->resolution,
            'actual_resolution_date'=> now(),
            'customer_satisfaction' => $request->customer_satisfaction,
        ]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'resolution',
            'previous_status'    => $old,
            'new_status'         => 'resolved',
            'comment'            => $request->resolution,
            'notify_complainant' => true,
        ]);
        return response()->json($c->fresh());
    }

    // ── POST /api/complaints/{id}/close ──────────────────────────────────
    public function close(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can close complaints.');
        $c = Complaint::findOrFail($id);
        if ($c->status === 'closed') {
            return response()->json(['message' => 'Complaint is already closed.'], 422);
        }
        $old = $c->status;
        $c->update(['status' => 'closed', 'customer_satisfaction' => $request->customer_satisfaction]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'closure',
            'previous_status'    => $old,
            'new_status'         => 'closed',
            'comment'            => $request->comment ?? 'Complaint closed.',
            'notify_complainant' => true,
        ]);
        return response()->json($c->fresh());
    }

    // ── POST /api/complaints/{id}/withdraw ───────────────────────────────
    public function withdraw(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can withdraw complaints.');
        $c = Complaint::findOrFail($id);
        if (in_array($c->status, ['resolved','closed','withdrawn'])) {
            return response()->json(['message' => 'Complaint cannot be withdrawn in its current state.'], 422);
        }
        $old = $c->status;
        $c->update(['status' => 'withdrawn']);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'status_change',
            'previous_status'    => $old,
            'new_status'         => 'withdrawn',
            'comment'            => $request->reason ?? 'Complaint withdrawn.',
            'notify_complainant' => false,
        ]);
        return response()->json($c->fresh());
    }

    // ── POST /api/complaints/{id}/raise-capa ─────────────────────────────
    public function raiseCapa(Request $request, $id)
    {
        if (!$this->canManage()) abort(403, 'Only QA/Compliance team can raise CAPAs.');
        $c = Complaint::findOrFail($id);
        if ($c->capa_id) {
            return response()->json(['message' => 'A CAPA is already linked to this complaint.'], 422);
        }
        $capa = \App\Models\Capa::create([
            'reference_no' => 'CAPA-' . date('Y') . '-' . str_pad(\App\Models\Capa::count()+1, 4, '0', STR_PAD_LEFT),
            'title'        => 'CAPA for Complaint: ' . $c->title,
            'description'  => $c->description,
            'type'         => 'corrective',
            'priority'     => $c->severity ?? 'medium',
            'target_date'  => now()->addDays(30)->toDateString(),
            'owner_id'     => auth()->id(),
            'status'       => 'open',
        ]);
        $c->update(['capa_id' => $capa->id, 'capa_required' => true]);
        $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => 'comment',
            'previous_status'    => $c->status,
            'new_status'         => $c->status,
            'comment'            => 'CAPA raised: ' . $capa->reference_no,
            'notify_complainant' => false,
        ]);
        return response()->json(['capa' => $capa, 'complaint' => $c->fresh()]);
    }

    // ── GET /api/complaints/{id}/updates ─────────────────────────────────
    public function updates($id)
    {
        Complaint::findOrFail($id);
        return response()->json(ComplaintUpdate::with('user')
            ->where('complaint_id', $id)->orderByDesc('created_at')->get());
    }

    // ── POST /api/complaints/{id}/updates ────────────────────────────────
    public function addUpdate(Request $request, $id)
    {
        $c = Complaint::findOrFail($id);
        $update = $c->updates()->create([
            'user_id'            => auth()->id(),
            'update_type'        => $request->update_type ?? 'comment',
            'previous_status'    => $c->status,
            'new_status'         => $c->status,
            'comment'            => $request->validate(['comment' => 'required|string'])['comment'],
            'notify_complainant' => $request->notify_complainant ?? false,
        ]);
        return response()->json($update->load('user'), 201);
    }

    // ── Stats ─────────────────────────────────────────────────────────────
    public function stats()
    {
        $user  = auth()->user();
        $base  = Complaint::query();

        // Scope stats to same visibility as index
        if (!$this->isQATeam() && !$this->isComplianceTeam()) {
            if ($this->isDeptMgr()) {
                $base->where('department_id', $user->department_id);
            } else {
                $base->where(fn($s) => $s->where('complainant_email', $user->email)
                                         ->orWhere('created_by', $user->id));
            }
        }

        $byStatus   = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->get();
        $bySeverity = (clone $base)->selectRaw('severity, count(*) as total')->groupBy('severity')->get();
        $avgSat     = (clone $base)->whereNotNull('customer_satisfaction')->avg('customer_satisfaction');
        $avgDays    = (clone $base)->whereNotNull('actual_resolution_date')
            ->selectRaw('AVG(DATEDIFF(actual_resolution_date, received_date)) as avg_days')
            ->value('avg_days');
        $overdue = (clone $base)->whereNotIn('status',['resolved','closed','withdrawn'])
            ->whereNotNull('target_resolution_date')
            ->where('target_resolution_date','<',now())->count();

        return response()->json([
            'by_status'        => $byStatus,
            'by_severity'      => $bySeverity,
            'avg_satisfaction' => $avgSat ? round($avgSat, 1) : null,
            'avg_days'         => $avgDays ? round($avgDays, 1) : null,
            'overdue'          => $overdue,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    public function categories()  { return response()->json(ComplaintCategory::orderBy('name')->get()); }
    public function clients()     { return response()->json(Client::where('status','active')->select('id','name','type')->orderBy('name')->get()); }
    public function departments() { return response()->json(Department::orderBy('name')->get()); }

    /**
     * Users for assignment dropdown — returns QA team + Compliance team only.
     */
    public function users()
    {
        $assignableSlugs = ['qa_manager','quality_supervisor','qa_officer','compliance_manager','compliance_officer'];
        $roleIds = \Illuminate\Support\Facades\DB::table('roles')->whereIn('slug', $assignableSlugs)->pluck('id');
        return response()->json(
            User::select('id','name','email','role_id')
                ->where('is_active', 1)
                ->whereIn('role_id', $roleIds)
                ->with('role:id,name,slug')
                ->orderBy('name')
                ->get()
        );
    }

    public function getDocname() { return response()->json(['name' => 'Diamond Insurance Broker']); }
}
