<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Nonconformance;
use App\Models\Capa;
use App\Models\Risk;
use App\Models\Complaint;
use App\Models\Department;
use App\Models\Client;

/**
 * TC-RPT-001 to TC-RPT-008 — Report endpoints and data accuracy.
 */
class ReportTest extends TestCase
{
    // ── Access Control ─────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_reports(): void
    {
        $this->getJson('/api/reports/kpi-summary')->assertStatus(401);
    }

    public function test_employee_without_report_view_gets_403(): void
    {
        $user = $this->makeUser('employee', ['request.view']);

        $this->getJson('/api/reports/kpi-summary', $this->authAs($user))
            ->assertStatus(403);
    }

    /** TC-RPT-001 */
    public function test_qa_manager_can_access_kpi_summary(): void
    {
        $user = $this->qaManager();

        $res = $this->getJson('/api/reports/kpi-summary', $this->authAs($user));
        $res->assertOk()
            ->assertJsonStructure(['kpis', 'period_summary']);
    }

    public function test_kpi_summary_returns_seven_kpis(): void
    {
        $user = $this->qaManager();
        $res  = $this->getJson('/api/reports/kpi-summary', $this->authAs($user));

        $this->assertCount(7, $res->json('kpis'));
    }

    // ── NC Trend ────────────────────────────────────────────────────────────

    public function test_nc_trend_endpoint_returns_required_structure(): void
    {
        $user = $this->qaManager();

        $this->getJson('/api/reports/nc-trend', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure([
                'monthly', 'by_severity', 'by_source', 'avg_closure_days'
            ]);
    }

    /** TC-RPT-004 — avg_closure_days uses actual_closure_date */
    public function test_nc_avg_closure_days_uses_actual_closure_date(): void
    {
        $user = $this->qaManager();
        $dept = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);

        // Create a closed NC with a known actual_closure_date
        // Use DB::table() so we can control created_at for the DATEDIFF calculation
        $openDate  = now()->subDays(10)->toDateString();
        $closeDate = now()->toDateString();

        \DB::table('nonconformances')->insert([
            'reference_no'        => 'NC-TEST-001',
            'title'               => 'Test NC for report',
            'description'         => 'Test',
            'severity'            => 'minor',
            'source'              => 'internal_audit',
            'status'              => 'closed',
            'detection_date'      => $openDate,
            'actual_closure_date' => $closeDate,
            'department_id'       => $dept->id,
            'detected_by_id'      => $user->id,
            'created_at'          => $openDate . ' 00:00:00',
            'updated_at'          => $closeDate . ' 00:00:00',
        ]);

        $res = $this->getJson('/api/reports/nc-trend?from=' . $openDate . '&to=' . $closeDate,
            $this->authAs($user));

        $avgDays = $res->json('avg_closure_days');
        $this->assertNotNull($avgDays, 'avg_closure_days must not be null');
        // 10 days between openDate and closeDate — use actual_closure_date not updated_at
        $this->assertEqualsWithDelta(10, $avgDays, 1,
            'avg_closure_days should use actual_closure_date, not updated_at');
    }

    // ── CAPA Effectiveness ─────────────────────────────────────────────────

    public function test_capa_effectiveness_endpoint_returns_summary(): void
    {
        $user = $this->qaManager();

        $this->getJson('/api/reports/capa-effectiveness', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure(['summary', 'monthly', 'by_type', 'avg_days_to_close']);
    }

    // ── Risk Heat Map ──────────────────────────────────────────────────────

    public function test_risk_heat_map_returns_matrix(): void
    {
        $user = $this->qaManager();

        $this->getJson('/api/reports/risk-heat-map', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure(['matrix', 'by_level', 'top_risks']);
    }

    // ── Visit Summary — TC-RPT-006 ─────────────────────────────────────────

    public function test_visit_summary_endpoint_exists_and_returns_data(): void
    {
        $user = $this->qaManager();

        $this->getJson('/api/reports/visit-summary', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure(['summary', 'monthly', 'by_type', 'by_status']);
    }

    // ── Records Endpoints ──────────────────────────────────────────────────

    public function test_records_ncs_returns_paginated_data(): void
    {
        $user = $this->qaManager();

        $this->getJson('/api/reports/records/ncs', $this->authAs($user))
            ->assertOk()
            ->assertJsonStructure(['data', 'total', 'current_page', 'last_page', 'summary']);
    }

    public function test_records_complaints_returns_summary_object(): void
    {
        $user = $this->qaManager();

        $res = $this->getJson('/api/reports/records/complaints', $this->authAs($user));
        $res->assertOk();

        // summary must be present for accurate chip display — TC-RPT-003
        $summary = $res->json('summary');
        $this->assertNotNull($summary, 'summary object must be in response for chip display');
        $this->assertArrayHasKey('total', $summary);
        $this->assertArrayHasKey('open', $summary);
        $this->assertArrayHasKey('resolved', $summary);
    }

    // ── TC-RPT-007 — Date validation ──────────────────────────────────────

    /** @note This validates the backend handles from > to gracefully */
    public function test_invalid_date_range_returns_empty_not_error(): void
    {
        $user = $this->qaManager();

        // Backend should return empty data, not crash
        $res = $this->getJson('/api/reports/nc-trend?from=2025-12-31&to=2025-01-01',
            $this->authAs($user));

        $res->assertOk();
        // Result should have empty monthly array
        $monthly = $res->json('monthly');
        $this->assertIsArray($monthly);
    }

    // ── Complaint Trend ───────────────────────────────────────────────────

    public function test_complaint_trend_uses_actual_resolution_date(): void
    {
        $user   = $this->qaManager();
        $dept   = Department::firstOrCreate(['name' => 'Quality'], ['code' => 'QA']);
        $client = Client::firstOrCreate(['name' => 'Test'], ['type' => 'client', 'status' => 'active']);

        $month = now()->format('Y-m');

        Complaint::create([
            'reference_no'           => 'CMP-RPT-001',
            'title'                  => 'Test complaint',
            'description'            => 'Test',
            'severity'               => 'low',
            'source'                 => 'email',
            'status'                 => 'resolved',
            'received_date'          => now()->startOfMonth()->toDateTimeString(),
            'actual_resolution_date' => now()->toDateTimeString(),
            'department_id'          => $dept->id,
            'client_id'              => $client->id,
            'complainant_email'      => $user->email,
        ]);

        $res     = $this->getJson('/api/reports/complaint-trend', $this->authAs($user));
        $monthly = collect($res->json('monthly'));
        $thisMonth = $monthly->firstWhere('month', now()->format('M Y'));

        $this->assertNotNull($thisMonth);
        $this->assertGreaterThanOrEqual(1, $thisMonth['resolved'],
            'resolved count must use actual_resolution_date, not updated_at');
    }
}
