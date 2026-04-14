<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('surveys', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['csat', 'nps', 'ces', 'custom'])->default('csat');
            $table->enum('status', ['draft', 'active', 'paused', 'closed'])->default('draft');
            // Linking: can be linked to a client, complaint, visit, or standalone
            $table->enum('target_type', ['client', 'complaint', 'visit', 'general'])->default('general');
            $table->unsignedBigInteger('target_id')->nullable();
            // Scheduling
            $table->date('send_date')->nullable();
            $table->date('close_date')->nullable();
            // Ownership
            $table->foreignId('created_by_id')->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            // Cached aggregates (updated on new response)
            $table->unsignedInteger('response_count')->default(0);
            $table->decimal('avg_score', 5, 2)->nullable();
            $table->decimal('nps_score', 6, 2)->nullable();
            $table->text('thank_you_message')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->timestamps();
        });

        Schema::create('survey_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained('surveys')->cascadeOnDelete();
            $table->text('question_text');
            $table->enum('question_type', ['rating', 'nps', 'text', 'choice', 'checkbox', 'yes_no'])->default('rating');
            $table->integer('rating_max')->default(5);  // for rating: 5 or 10
            $table->json('options')->nullable();         // for choice/checkbox
            $table->boolean('is_required')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('survey_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained('surveys')->cascadeOnDelete();
            $table->string('respondent_name')->nullable();
            $table->string('respondent_email')->nullable();
            $table->enum('respondent_type', ['client', 'staff', 'anonymous'])->default('anonymous');
            $table->foreignId('client_id')->nullable()->constrained('clients');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('token', 64)->unique()->nullable(); // for email link access
            $table->timestamp('submitted_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('survey_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('response_id')->constrained('survey_responses')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('survey_questions')->cascadeOnDelete();
            $table->text('answer_text')->nullable();
            $table->tinyInteger('answer_rating')->nullable();   // 1–5 or 0–10
            $table->json('answer_choices')->nullable();         // for multi-choice
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_answers');
        Schema::dropIfExists('survey_responses');
        Schema::dropIfExists('survey_questions');
        Schema::dropIfExists('surveys');
    }
};
