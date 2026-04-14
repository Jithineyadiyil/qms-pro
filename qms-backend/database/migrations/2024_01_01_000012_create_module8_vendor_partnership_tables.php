<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
        });

        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique()->nullable();
            $table->foreignId('category_id')->nullable()->constrained('vendor_categories');
            $table->enum('type', ['supplier', 'service_provider', 'contractor', 'partner', 'consultant'])->default('supplier');
            $table->string('registration_no', 100)->nullable();
            $table->string('tax_no', 100)->nullable();
            $table->string('contact_name', 200)->nullable();
            $table->string('contact_email', 200)->nullable();
            $table->string('contact_phone', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('country', 100)->nullable();
            $table->string('website')->nullable();
            $table->foreignId('account_manager_id')->nullable()->constrained('users');
            $table->enum('status', ['prospect', 'active', 'approved', 'suspended', 'blacklisted', 'inactive'])->default('prospect');
            $table->enum('risk_level', ['low', 'medium', 'high', 'critical'])->default('low');
            $table->enum('qualification_status', ['not_qualified', 'pending', 'qualified', 'expired'])->default('not_qualified');
            $table->date('qualification_date')->nullable();
            $table->date('qualification_expiry')->nullable();
            $table->decimal('overall_rating', 3, 1)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('vendors');
            $table->foreignId('evaluated_by_id')->constrained('users');
            $table->date('evaluation_date');
            $table->string('period', 50)->nullable();
            $table->decimal('quality_score', 4, 2)->nullable();
            $table->decimal('delivery_score', 4, 2)->nullable();
            $table->decimal('price_score', 4, 2)->nullable();
            $table->decimal('service_score', 4, 2)->nullable();
            $table->decimal('compliance_score', 4, 2)->nullable();
            $table->decimal('overall_score', 4, 2)->storedAs('(quality_score + delivery_score + price_score + service_score + compliance_score) / 5');
            $table->text('comments')->nullable();
            $table->text('recommendations')->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('vendor_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('vendors');
            $table->string('contract_no', 100)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['service', 'supply', 'nda', 'partnership', 'maintenance', 'other'])->default('service');
            $table->decimal('value', 15, 2)->nullable();
            $table->string('currency', 10)->default('SAR');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('auto_renewal')->default(false);
            $table->integer('renewal_notice_days')->default(30);
            $table->enum('status', ['draft', 'active', 'expired', 'terminated', 'suspended'])->default('draft');
            $table->foreignId('owner_id')->constrained('users');
            $table->string('file_path')->nullable();
            $table->timestamps();
        });

        Schema::create('partnerships', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('partner_type', ['strategic', 'technology', 'channel', 'referral', 'joint_venture', 'other'])->default('strategic');
            $table->foreignId('vendor_id')->nullable()->constrained('vendors');
            $table->foreignId('client_id')->nullable()->constrained('clients');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'negotiating', 'terminated'])->default('negotiating');
            $table->foreignId('owner_id')->constrained('users');
            $table->text('value_proposition')->nullable();
            $table->json('kpis')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partnerships');
        Schema::dropIfExists('vendor_contracts');
        Schema::dropIfExists('vendor_evaluations');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('vendor_categories');
    }
};
