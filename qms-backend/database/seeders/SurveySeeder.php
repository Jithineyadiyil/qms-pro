<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SurveySeeder extends Seeder {
    public function run(): void {
        $now = Carbon::now();

        // Survey 1: CSAT - Q1 Client Satisfaction (active, 18 responses)
        DB::table('surveys')->insertOrIgnore([
            'id' => 1, 'reference_no' => 'CSAT-2024-0001',
            'title' => 'Q1 2024 Client Satisfaction Survey',
            'description' => 'Quarterly satisfaction assessment for all active clients to gauge service quality and identify improvement areas.',
            'type' => 'csat', 'status' => 'active', 'target_type' => 'client',
            'created_by_id' => 2, 'department_id' => 1,
            'send_date' => '2024-01-15', 'close_date' => '2024-03-31',
            'response_count' => 18, 'avg_score' => 4.20, 'nps_score' => null,
            'thank_you_message' => 'Thank you for your valuable feedback. We are committed to continuously improving our services.',
            'is_anonymous' => false, 'created_at' => $now->copy()->subDays(45), 'updated_at' => $now,
        ]);

        // Survey 2: NPS - Annual NPS (active, 42 responses)
        DB::table('surveys')->insertOrIgnore([
            'id' => 2, 'reference_no' => 'CSAT-2024-0002',
            'title' => '2024 Annual Net Promoter Score',
            'description' => 'Annual NPS measurement to benchmark client loyalty and likelihood to recommend our services.',
            'type' => 'nps', 'status' => 'active', 'target_type' => 'general',
            'created_by_id' => 2, 'department_id' => 1,
            'send_date' => '2024-01-01', 'close_date' => '2024-12-31',
            'response_count' => 42, 'avg_score' => 8.10, 'nps_score' => 47.6,
            'thank_you_message' => 'Thank you for helping us improve. Your feedback drives our success.',
            'is_anonymous' => true, 'created_at' => $now->copy()->subDays(60), 'updated_at' => $now,
        ]);

        // Survey 3: CES - Claims Process (closed, 31 responses)
        DB::table('surveys')->insertOrIgnore([
            'id' => 3, 'reference_no' => 'CSAT-2024-0003',
            'title' => 'Claims Process Effort Score',
            'description' => 'Measure customer effort in our claims handling process to identify friction points.',
            'type' => 'ces', 'status' => 'closed', 'target_type' => 'complaint',
            'created_by_id' => 2, 'department_id' => 1,
            'send_date' => '2024-01-05', 'close_date' => '2024-02-28',
            'response_count' => 31, 'avg_score' => 3.80, 'nps_score' => null,
            'thank_you_message' => 'Thank you for helping us make our processes simpler.',
            'is_anonymous' => true, 'created_at' => $now->copy()->subDays(75), 'updated_at' => $now,
        ]);

        // Survey 4: Draft
        DB::table('surveys')->insertOrIgnore([
            'id' => 4, 'reference_no' => 'CSAT-2024-0004',
            'title' => 'Policy Renewal Experience Survey',
            'description' => 'Evaluate the client experience during the policy renewal process.',
            'type' => 'csat', 'status' => 'draft', 'target_type' => 'client',
            'created_by_id' => 2, 'department_id' => 1,
            'send_date' => '2024-04-01', 'close_date' => '2024-04-30',
            'response_count' => 0, 'avg_score' => null, 'nps_score' => null,
            'thank_you_message' => null,
            'is_anonymous' => false, 'created_at' => $now->copy()->subDays(5), 'updated_at' => $now,
        ]);

        // Questions for Survey 1 (CSAT)
        DB::table('survey_questions')->insertOrIgnore([
            ['survey_id'=>1,'question_text'=>'Overall, how satisfied are you with our services?','question_type'=>'rating','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>1,'question_text'=>'How would you rate the responsiveness of our team?','question_type'=>'rating','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>1,'question_text'=>'How would you rate the clarity of our communication?','question_type'=>'rating','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>2,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>1,'question_text'=>'Which area needs the most improvement?','question_type'=>'choice','rating_max'=>5,'options'=>json_encode(['Response Time','Policy Clarity','Claims Process','Customer Support','Digital Tools']),'is_required'=>0,'sort_order'=>3,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>1,'question_text'=>'Any additional comments or suggestions?','question_type'=>'text','rating_max'=>5,'options'=>null,'is_required'=>0,'sort_order'=>4,'created_at'=>$now,'updated_at'=>$now],
        ]);

        // Questions for Survey 2 (NPS)
        DB::table('survey_questions')->insertOrIgnore([
            ['survey_id'=>2,'question_text'=>'How likely are you to recommend Diamond Insurance Broker to a friend or colleague? (0 = Not at all likely, 10 = Extremely likely)','question_type'=>'nps','rating_max'=>10,'options'=>null,'is_required'=>1,'sort_order'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>2,'question_text'=>'What is the primary reason for your score?','question_type'=>'text','rating_max'=>5,'options'=>null,'is_required'=>0,'sort_order'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>2,'question_text'=>'Which of our services do you use most?','question_type'=>'checkbox','rating_max'=>5,'options'=>json_encode(['Motor Insurance','Health Insurance','Property Insurance','Life Insurance','Marine Insurance','Liability Insurance']),'is_required'=>0,'sort_order'=>2,'created_at'=>$now,'updated_at'=>$now],
        ]);

        // Questions for Survey 3 (CES)
        DB::table('survey_questions')->insertOrIgnore([
            ['survey_id'=>3,'question_text'=>'How easy was it to get your claim handled?','question_type'=>'rating','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>3,'question_text'=>'How many contacts did it take to resolve your claim?','question_type'=>'choice','rating_max'=>5,'options'=>json_encode(['1 contact','2 contacts','3 contacts','4+ contacts']),'is_required'=>0,'sort_order'=>1,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>3,'question_text'=>'Was your claim resolved to your satisfaction?','question_type'=>'yes_no','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>2,'created_at'=>$now,'updated_at'=>$now],
        ]);

        // Questions for Survey 4 (Draft)
        DB::table('survey_questions')->insertOrIgnore([
            ['survey_id'=>4,'question_text'=>'How satisfied are you with the renewal process?','question_type'=>'rating','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>0,'created_at'=>$now,'updated_at'=>$now],
            ['survey_id'=>4,'question_text'=>'Was the renewal documentation clear and easy to understand?','question_type'=>'yes_no','rating_max'=>5,'options'=>null,'is_required'=>1,'sort_order'=>1,'created_at'=>$now,'updated_at'=>$now],
        ]);

        // Sample responses for Survey 1
        $resp1Scores = [[4,4,5,'Response Time','Great service overall.'],[5,5,4,null,'Very professional team.'],[3,3,3,'Claims Process','Took too long to respond.'],[5,4,5,null,null],[4,5,4,'Digital Tools','App could be improved.'],[5,5,5,null,'Excellent experience!'],[4,4,4,'Response Time',null],[3,4,3,'Policy Clarity','Policy documents are confusing.'],[5,5,5,null,'Very happy with the service.'],[4,3,4,'Customer Support',null]];
        $qIds1 = DB::table('survey_questions')->where('survey_id',1)->orderBy('sort_order')->pluck('id')->toArray();
        foreach ($resp1Scores as $i => $scores) {
            $rid = DB::table('survey_responses')->insertGetId(['survey_id'=>1,'respondent_type'=>'client','submitted_at'=>$now->copy()->subDays(rand(1,40)),'created_at'=>$now->copy()->subDays(rand(1,40))]);
            DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds1[0],'answer_rating'=>$scores[0],'created_at'=>$now]);
            DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds1[1],'answer_rating'=>$scores[1],'created_at'=>$now]);
            DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds1[2],'answer_rating'=>$scores[2],'created_at'=>$now]);
            if ($scores[3]) DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds1[3],'answer_text'=>$scores[3],'answer_choices'=>json_encode([$scores[3]]),'created_at'=>$now]);
            if ($scores[4]) DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds1[4],'answer_text'=>$scores[4],'created_at'=>$now]);
        }

        // Sample NPS responses for Survey 2
        $npsScores = [10,9,8,10,7,6,9,10,8,5,9,10,7,8,10,9,6,10,8,9];
        $qIds2 = DB::table('survey_questions')->where('survey_id',2)->orderBy('sort_order')->pluck('id')->toArray();
        $npsReasons = ['Outstanding service and expertise','Very knowledgeable team','Good service but room for improvement','Claims process was slow','Excellent claims handling','Need better digital tools','Always responsive and helpful',null,'Good overall experience','Pricing could be more competitive'];
        foreach ($npsScores as $i => $score) {
            $rid = DB::table('survey_responses')->insertGetId(['survey_id'=>2,'respondent_type'=>'anonymous','submitted_at'=>$now->copy()->subDays(rand(1,60)),'created_at'=>$now->copy()->subDays(rand(1,60))]);
            DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds2[0],'answer_rating'=>$score,'created_at'=>$now]);
            $reason = $npsReasons[$i % count($npsReasons)];
            if ($reason) DB::table('survey_answers')->insertOrIgnore(['response_id'=>$rid,'question_id'=>$qIds2[1],'answer_text'=>$reason,'created_at'=>$now]);
        }

        $this->command->info('✅ Survey data seeded');
    }
}
