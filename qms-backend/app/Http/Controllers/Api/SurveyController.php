<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Survey, SurveyQuestion, SurveyResponse, SurveyAnswer, User, Client, Department};
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SurveyController extends Controller
{
    // GET /api/surveys
    public function index(Request $request)
    {
        $q = Survey::with(['createdBy','department'])
            ->withCount('responses')
            ->when($request->status,      fn($q,$v) => $q->where('status', $v))
            ->when($request->type,        fn($q,$v) => $q->where('type', $v))
            ->when($request->target_type, fn($q,$v) => $q->where('target_type', $v))
            ->when($request->search,      fn($q,$v) => $q->where('title','like',"%$v%"));

        return response()->json($q->orderByDesc('created_at')->paginate((int)$request->get('per_page', 15)));
    }

    // POST /api/surveys
    public function store(Request $request)
    {
        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'type'             => 'required|in:csat,nps,ces,custom',
            'target_type'      => 'in:client,complaint,visit,general',
            'target_id'        => 'nullable|integer',
            'send_date'        => 'nullable|date',
            'close_date'       => 'nullable|date|after_or_equal:send_date',
            'department_id'    => 'nullable|exists:departments,id',
            'thank_you_message'=> 'nullable|string',
            'is_anonymous'     => 'boolean',
            'questions'        => 'nullable|array',
            'questions.*.question_text' => 'required|string',
            'questions.*.question_type' => 'required|in:rating,nps,text,choice,checkbox,yes_no',
            'questions.*.rating_max'    => 'nullable|integer|in:5,10',
            'questions.*.options'       => 'nullable|array',
            'questions.*.is_required'   => 'nullable|boolean',
        ]);

        $questions = $data['questions'] ?? [];
        unset($data['questions']);

        $ref = 'CSAT-' . date('Y') . '-' . str_pad(Survey::count() + 1, 4, '0', STR_PAD_LEFT);
        $data['reference_no']  = $ref;
        $data['created_by_id'] = auth()->id();
        $data['status']        = 'draft';

        $survey = Survey::create($data);

        foreach ($questions as $i => $q) {
            $survey->questions()->create([
                'question_text' => $q['question_text'],
                'question_type' => $q['question_type'],
                'rating_max'    => $q['rating_max'] ?? ($q['question_type'] === 'nps' ? 10 : 5),
                'options'       => $q['options'] ?? null,
                'is_required'   => $q['is_required'] ?? true,
                'sort_order'    => $i,
            ]);
        }

        return response()->json($survey->load(['createdBy','department','questions']), 201);
    }

    // GET /api/surveys/{id}
    public function show($id)
    {
        return response()->json(
            Survey::with(['createdBy','department','questions'])
                ->withCount('responses')
                ->findOrFail($id)
        );
    }

    // PUT /api/surveys/{id}
    public function update(Request $request, $id)
    {
        $survey = Survey::findOrFail($id);
        $data = $request->validate([
            'title'             => 'sometimes|required|string|max:255',
            'description'       => 'nullable|string',
            'type'              => 'sometimes|in:csat,nps,ces,custom',
            'status'            => 'sometimes|in:draft,active,paused,closed',
            'target_type'       => 'nullable|in:client,complaint,visit,general',
            'target_id'         => 'nullable|integer',
            'send_date'         => 'nullable|date',
            'close_date'        => 'nullable|date',
            'department_id'     => 'nullable|exists:departments,id',
            'thank_you_message' => 'nullable|string',
            'is_anonymous'      => 'boolean',
        ]);
        $survey->update($data);
        return response()->json($survey->fresh(['createdBy','department','questions']));
    }

    // DELETE /api/surveys/{id}
    public function destroy($id)
    {
        $survey = Survey::findOrFail($id);
        if ($survey->response_count > 0) {
            return response()->json(['message' => 'Cannot delete a survey with responses.'], 422);
        }
        $survey->delete();
        return response()->json(['message' => 'Survey deleted.']);
    }

    // POST /api/surveys/{id}/activate
    public function activate($id)
    {
        $survey = Survey::findOrFail($id);
        if ($survey->questions()->count() === 0) {
            return response()->json(['message' => 'Add at least one question before activating.'], 422);
        }
        $survey->update(['status' => 'active', 'send_date' => $survey->send_date ?? now()]);
        return response()->json($survey->fresh());
    }

    // POST /api/surveys/{id}/close
    public function close($id)
    {
        $survey = Survey::findOrFail($id);
        $survey->update(['status' => 'closed', 'close_date' => now()]);
        return response()->json($survey->fresh());
    }

    // POST /api/surveys/{id}/pause
    public function pause($id)
    {
        $survey = Survey::findOrFail($id);
        $survey->update(['status' => 'paused']);
        return response()->json($survey->fresh());
    }

    // --- Questions ---
    // POST /api/surveys/{id}/questions
    public function addQuestion(Request $request, $id)
    {
        $survey = Survey::findOrFail($id);
        $data = $request->validate([
            'question_text' => 'required|string',
            'question_type' => 'required|in:rating,nps,text,choice,checkbox,yes_no',
            'rating_max'    => 'nullable|integer|in:5,10',
            'options'       => 'nullable|array',
            'is_required'   => 'nullable|boolean',
        ]);
        $data['sort_order'] = $survey->questions()->count();
        $data['rating_max'] = $data['rating_max'] ?? ($data['question_type'] === 'nps' ? 10 : 5);
        $q = $survey->questions()->create($data);
        return response()->json($q, 201);
    }

    // PUT /api/surveys/{id}/questions/{qid}
    public function updateQuestion(Request $request, $id, $qid)
    {
        $q = SurveyQuestion::where('survey_id', $id)->findOrFail($qid);
        $q->update($request->validate([
            'question_text' => 'sometimes|required|string',
            'question_type' => 'sometimes|in:rating,nps,text,choice,checkbox,yes_no',
            'rating_max'    => 'nullable|integer|in:5,10',
            'options'       => 'nullable|array',
            'is_required'   => 'nullable|boolean',
            'sort_order'    => 'nullable|integer',
        ]));
        return response()->json($q->fresh());
    }

    // DELETE /api/surveys/{id}/questions/{qid}
    public function deleteQuestion($id, $qid)
    {
        $q = SurveyQuestion::where('survey_id', $id)->findOrFail($qid);
        $q->delete();
        return response()->json(['message' => 'Question deleted.']);
    }

    // --- Responses ---
    // GET /api/surveys/{id}/responses
    public function responses(Request $request, $id)
    {
        Survey::findOrFail($id);
        $responses = SurveyResponse::with(['answers.question','client'])
            ->where('survey_id', $id)
            ->whereNotNull('submitted_at')
            ->orderByDesc('submitted_at')
            ->paginate((int)$request->get('per_page', 20));
        return response()->json($responses);
    }

    // POST /api/surveys/{id}/responses  (submit a response)
    public function submitResponse(Request $request, $id)
    {
        $survey = Survey::with('questions')->findOrFail($id);

        if ($survey->status !== 'active') {
            return response()->json(['message' => 'This survey is not currently active.'], 422);
        }

        $data = $request->validate([
            'respondent_name'  => 'nullable|string|max:150',
            'respondent_email' => 'nullable|email',
            'respondent_type'  => 'in:client,staff,anonymous',
            'client_id'        => 'nullable|exists:clients,id',
            'answers'          => 'required|array',
            'answers.*.question_id'   => 'required|exists:survey_questions,id',
            'answers.*.answer_text'   => 'nullable|string',
            'answers.*.answer_rating' => 'nullable|integer',
            'answers.*.answer_choices'=> 'nullable|array',
        ]);

        $response = SurveyResponse::create([
            'survey_id'       => $id,
            'respondent_name' => $data['respondent_name'] ?? null,
            'respondent_email'=> $data['respondent_email'] ?? null,
            'respondent_type' => $data['respondent_type'] ?? 'anonymous',
            'client_id'       => $data['client_id'] ?? null,
            'user_id'         => auth()->id() ?? null,
            'token'           => Str::random(48),
            'submitted_at'    => now(),
            'ip_address'      => $request->ip(),
        ]);

        foreach ($data['answers'] as $ans) {
            SurveyAnswer::create([
                'response_id'    => $response->id,
                'question_id'    => $ans['question_id'],
                'answer_text'    => $ans['answer_text'] ?? null,
                'answer_rating'  => $ans['answer_rating'] ?? null,
                'answer_choices' => $ans['answer_choices'] ?? null,
            ]);
        }

        // Recalculate aggregates
        $this->recalcAggregates($survey);

        return response()->json(['message' => 'Response submitted. Thank you!'], 201);
    }

    private function recalcAggregates(Survey $survey)
    {
        $count = $survey->responses()->whereNotNull('submitted_at')->count();

        // Average score across all rating answers for this survey
        $avgScore = SurveyAnswer::whereHas('response', fn($q) => $q->where('survey_id', $survey->id)->whereNotNull('submitted_at'))
            ->whereHas('question', fn($q) => $q->whereIn('question_type', ['rating','nps']))
            ->avg('answer_rating');

        // NPS: promoters (9-10) - detractors (0-6) / total * 100
        $npsQuestion = $survey->questions()->where('question_type', 'nps')->first();
        $npsScore = null;
        if ($npsQuestion) {
            $answers = SurveyAnswer::where('question_id', $npsQuestion->id)->whereNotNull('answer_rating')->pluck('answer_rating');
            $total = $answers->count();
            if ($total > 0) {
                $promoters  = $answers->filter(fn($r) => $r >= 9)->count();
                $detractors = $answers->filter(fn($r) => $r <= 6)->count();
                $npsScore = round((($promoters - $detractors) / $total) * 100, 1);
            }
        }

        $survey->update([
            'response_count' => $count,
            'avg_score'      => $avgScore ? round($avgScore, 2) : null,
            'nps_score'      => $npsScore,
        ]);
    }

    // GET /api/surveys/{id}/analytics
    public function analytics($id)
    {
        $survey = Survey::with('questions')->findOrFail($id);
        $responses = SurveyResponse::where('survey_id', $id)->whereNotNull('submitted_at')->get();
        $total = $responses->count();

        $questionAnalytics = $survey->questions->map(function ($q) use ($total) {
            $answers = SurveyAnswer::where('question_id', $q->id)->get();

            $data = ['question_id' => $q->id, 'question_text' => $q->question_text, 'question_type' => $q->question_type, 'answered' => $answers->count()];

            if (in_array($q->question_type, ['rating', 'nps'])) {
                $ratings = $answers->whereNotNull('answer_rating')->pluck('answer_rating');
                $data['avg']        = $ratings->count() ? round($ratings->avg(), 2) : null;
                $data['min']        = $ratings->count() ? $ratings->min() : null;
                $data['max']        = $ratings->count() ? $ratings->max() : null;
                $data['distribution'] = [];
                $rmax = $q->rating_max ?? 5;
                for ($i = 1; $i <= $rmax; $i++) {
                    $data['distribution'][] = ['value' => $i, 'count' => $ratings->filter(fn($r) => $r == $i)->count()];
                }
                // NPS breakdown
                if ($q->question_type === 'nps') {
                    $data['promoters']  = $ratings->filter(fn($r) => $r >= 9)->count();
                    $data['passives']   = $ratings->filter(fn($r) => $r >= 7 && $r <= 8)->count();
                    $data['detractors'] = $ratings->filter(fn($r) => $r <= 6)->count();
                    $data['nps']        = $total > 0 ? round((($data['promoters'] - $data['detractors']) / max(1, $ratings->count())) * 100, 1) : null;
                }
            } elseif (in_array($q->question_type, ['choice', 'checkbox', 'yes_no'])) {
                $choiceCounts = [];
                foreach ($answers as $a) {
                    $choices = $a->answer_choices ?? ($a->answer_text ? [$a->answer_text] : []);
                    foreach ((array)$choices as $c) {
                        $choiceCounts[$c] = ($choiceCounts[$c] ?? 0) + 1;
                    }
                }
                $data['choice_counts'] = $choiceCounts;
            } elseif ($q->question_type === 'text') {
                $data['responses'] = $answers->whereNotNull('answer_text')->pluck('answer_text')->take(20)->values();
            }

            return $data;
        });

        // Trend: responses per day over last 30 days
        $trend = SurveyResponse::where('survey_id', $id)
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(submitted_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // NPS breakdown for survey level
        $npsBreakdown = null;
        $npsQ = $survey->questions->where('question_type', 'nps')->first();
        if ($npsQ) {
            $ratings = SurveyAnswer::where('question_id', $npsQ->id)->whereNotNull('answer_rating')->pluck('answer_rating');
            $t = $ratings->count();
            $npsBreakdown = [
                'promoters'  => ['count' => $ratings->filter(fn($r) => $r >= 9)->count(), 'pct' => $t ? round($ratings->filter(fn($r) => $r >= 9)->count()/$t*100,1) : 0],
                'passives'   => ['count' => $ratings->filter(fn($r) => $r >= 7 && $r <= 8)->count(), 'pct' => $t ? round($ratings->filter(fn($r) => $r >= 7 && $r <= 8)->count()/$t*100,1) : 0],
                'detractors' => ['count' => $ratings->filter(fn($r) => $r <= 6)->count(), 'pct' => $t ? round($ratings->filter(fn($r) => $r <= 6)->count()/$t*100,1) : 0],
            ];
        }

        return response()->json([
            'total_responses'  => $total,
            'avg_score'        => $survey->avg_score,
            'nps_score'        => $survey->nps_score,
            'nps_breakdown'    => $npsBreakdown,
            'response_trend'   => $trend,
            'questions'        => $questionAnalytics,
        ]);
    }

    // GET /api/surveys/stats
    public function stats()
    {
        return response()->json([
            'total'         => Survey::count(),
            'active'        => Survey::where('status','active')->count(),
            'draft'         => Survey::where('status','draft')->count(),
            'closed'        => Survey::where('status','closed')->count(),
            'total_responses'=> SurveyResponse::whereNotNull('submitted_at')->count(),
            'avg_score'     => Survey::whereNotNull('avg_score')->avg('avg_score'),
            'avg_nps'       => Survey::whereNotNull('nps_score')->avg('nps_score'),
        ]);
    }

    // GET /api/surveys/users
    public function users()
    {
        return response()->json(User::select('id','name','email')->where('is_active',1)->orderBy('name')->get());
    }

    // GET /api/surveys/clients
    public function clients()
    {
        return response()->json(Client::where('status','active')->select('id','name')->orderBy('name')->get());
    }

    // GET /api/surveys/departments
    public function departments()
    {
        return response()->json(Department::orderBy('name')->get());
    }
}
