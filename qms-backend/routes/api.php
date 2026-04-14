<?php

// ============================================================
// routes/api.php - Complete QMS API Routes
// ============================================================

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\SurveyController;
use App\Http\Controllers\Api\NonconformanceController;
use App\Http\Controllers\Api\CapaController;
use App\Http\Controllers\Api\RiskController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\SlaController;
use App\Http\Controllers\Api\OkrController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NotificationController;

// ============================================================
// PUBLIC ROUTES
// ============================================================
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/complaints/external', [ComplaintController::class, 'storeExternal']);
Route::get('/complaints/getname', [ComplaintController::class, 'getDocname']);

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/charts', [DashboardController::class, 'charts']);
    Route::get('/dashboard/recent-activities', [DashboardController::class, 'recentActivities']);
    Route::get('/dashboard/my-tasks', [DashboardController::class, 'myTasks']);
    Route::get('/dashboard/overdue', [DashboardController::class, 'overdueItems']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Users & Departments
    Route::apiResource('users', UserController::class);
    Route::get('/departments', [UserController::class, 'departments']);
    Route::get('/roles', [UserController::class, 'roles']);

    // ============================================================
    // MODULE 1: REQUEST MANAGEMENT
    // ============================================================
    Route::prefix('requests')->middleware('permission:request.view,request.create,request.view_own')->group(function () {
        Route::get('/',              [RequestController::class, 'index']);
        Route::post('/',             [RequestController::class, 'store']);
        Route::get('/categories',    [RequestController::class, 'categories']);
        Route::get('/stats',         [RequestController::class, 'stats']);
        Route::get('/users',         [RequestController::class, 'users']);
        Route::get('/departments',   [RequestController::class, 'departments']);
        Route::get('/{id}',          [RequestController::class, 'show']);
        Route::put('/{id}',          [RequestController::class, 'update']);
        Route::delete('/{id}',       [RequestController::class, 'destroy']);
        Route::post('/{id}/submit',  [RequestController::class, 'submit']);
        Route::post('/{id}/assign',  [RequestController::class, 'assign']);
        Route::post('/{id}/approve', [RequestController::class, 'approve']);
        Route::post('/{id}/reject',  [RequestController::class, 'reject']);
        Route::post('/{id}/close',   [RequestController::class, 'close']);
        Route::get('/{id}/comments', [RequestController::class, 'comments']);
        Route::post('/{id}/comments',[RequestController::class, 'addComment']);
        Route::get('/{id}/approvals',[RequestController::class, 'approvals']);
    });

    // ============================================================
    // MODULE 2: NON-CONFORMANCE & CAPA
    // ============================================================
    Route::prefix('nonconformances')->middleware('permission:nc.view,nc.create')->group(function () {
        Route::get('/',           [NonconformanceController::class, 'index']);
        Route::post('/',          [NonconformanceController::class, 'store']);
        Route::get('/stats',      [NonconformanceController::class, 'stats']);
        Route::get('/categories', [NonconformanceController::class, 'categories']);
        Route::get('/users',      [NonconformanceController::class, 'users']);
        Route::get('/departments',[NonconformanceController::class, 'departments']);
        Route::get('/{id}',       [NonconformanceController::class, 'show']);
        Route::put('/{id}',       [NonconformanceController::class, 'update']);
        Route::delete('/{id}',    [NonconformanceController::class, 'destroy']);
        Route::post('/{id}/assign',      [NonconformanceController::class, 'assign']);
        Route::post('/{id}/investigate', [NonconformanceController::class, 'startInvestigation']);
        Route::post('/{id}/close',       [NonconformanceController::class, 'close']);
        Route::post('/{id}/raise-capa',  [NonconformanceController::class, 'raiseCapa']);
    });

    Route::prefix('capas')->middleware('permission:capa.view,capa.create')->group(function () {
        Route::get('/',          [CapaController::class, 'index']);
        Route::post('/',         [CapaController::class, 'store']);
        Route::get('/stats',     [CapaController::class, 'stats']);
        Route::get('/users',     [CapaController::class, 'users']);
        Route::get('/departments',[CapaController::class, 'departments']);
        Route::get('/open-ncs',  [CapaController::class, 'openNcs']);
        Route::get('/{id}',      [CapaController::class, 'show']);
        Route::put('/{id}',      [CapaController::class, 'update']);
        Route::delete('/{id}',   [CapaController::class, 'destroy']);
        Route::post('/{id}/tasks',                      [CapaController::class, 'addTask']);
        Route::put('/{id}/tasks/{taskId}',              [CapaController::class, 'updateTask']);
        Route::post('/{id}/tasks/{taskId}/complete',    [CapaController::class, 'completeTask']);
        Route::post('/{id}/effectiveness-review',       [CapaController::class, 'effectivenessReview']);
        Route::post('/{id}/close',                      [CapaController::class, 'close']);
    });

    // ============================================================
    // MODULE 3: RISK MANAGEMENT
    // ============================================================
    Route::prefix('risks')->middleware('permission:risk.view,risk.create')->group(function () {
        Route::get('/',                              [RiskController::class, 'index']);
        Route::post('/',                             [RiskController::class, 'store']);
        Route::get('/stats',                         [RiskController::class, 'stats']);
        Route::get('/matrix',                        [RiskController::class, 'matrix']);
        Route::get('/categories',                    [RiskController::class, 'categories']);
        Route::get('/owners',                        [RiskController::class, 'owners']);
        Route::get('/departments',                   [RiskController::class, 'departments']);
        Route::get('/{id}',                          [RiskController::class, 'show']);
        Route::put('/{id}',                          [RiskController::class, 'update']);
        Route::delete('/{id}',                       [RiskController::class, 'destroy']);
        Route::put('/{id}/assess',                   [RiskController::class, 'assess']);
        Route::post('/{id}/controls',                [RiskController::class, 'addControl']);
        Route::put('/{id}/controls/{controlId}',     [RiskController::class, 'updateControl']);
        Route::delete('/{id}/controls/{controlId}',  [RiskController::class, 'deleteControl']);
        Route::post('/{id}/reviews',                 [RiskController::class, 'addReview']);
    });

    // ============================================================
    // MODULE 4: DOCUMENT CONTROL
    // ============================================================
    Route::prefix('documents')->middleware('permission:document.view,document.create')->group(function () {
        Route::get('/',                              [DocumentController::class, 'index']);
        Route::post('/',                             [DocumentController::class, 'store']);
        Route::get('/stats',                         [DocumentController::class, 'stats']);
        Route::get('/categories',                    [DocumentController::class, 'categories']);
        Route::get('/users',                         [DocumentController::class, 'users']);
        Route::get('/departments',                   [DocumentController::class, 'departments']);
        Route::get('/expiring',                      [DocumentController::class, 'expiring']);
        Route::get('/{id}',                          [DocumentController::class, 'show']);
        Route::put('/{id}',                          [DocumentController::class, 'update']);
        Route::delete('/{id}',                       [DocumentController::class, 'destroy']);
        Route::post('/{id}/submit-review',           [DocumentController::class, 'submitForReview']);
        Route::post('/{id}/approve',                 [DocumentController::class, 'approve']);
        Route::post('/{id}/reject',                  [DocumentController::class, 'reject']);
        Route::post('/{id}/obsolete',                [DocumentController::class, 'markObsolete']);
        Route::post('/{id}/new-version',             [DocumentController::class, 'newVersion']);
        Route::post('/{id}/distribute',              [DocumentController::class, 'distribute']);
        Route::get('/{id}/versions',                 [DocumentController::class, 'versions']);
        Route::get('/{id}/access-log',               [DocumentController::class, 'accessLog']);
        Route::get('/{id}/download',                 [DocumentController::class, 'download']);
        Route::get('/{id}/preview',                 [DocumentController::class, 'preview']);
    });

    // ============================================================
    // MODULE 5: AUDIT MANAGEMENT
    // ============================================================
    Route::prefix('audits')->middleware('permission:audit.view,audit.create')->group(function () {
        Route::get('/',                                [AuditController::class, 'index']);
        Route::post('/',                               [AuditController::class, 'store']);
        Route::get('/stats',                           [AuditController::class, 'stats']);
        Route::get('/programs',                        [AuditController::class, 'programs']);
        Route::post('/programs',                       [AuditController::class, 'createProgram']);
        Route::get('/users',                           [AuditController::class, 'users']);
        Route::get('/departments',                     [AuditController::class, 'departments']);
        Route::get('/{id}',                            [AuditController::class, 'show']);
        Route::put('/{id}',                            [AuditController::class, 'update']);
        Route::delete('/{id}',                         [AuditController::class, 'destroy']);
        Route::post('/{id}/notify',                    [AuditController::class, 'notify']);
        Route::post('/{id}/start',                     [AuditController::class, 'start']);
        Route::post('/{id}/team',                      [AuditController::class, 'addTeamMember']);
        Route::delete('/{id}/team',                    [AuditController::class, 'removeTeamMember']);
        Route::get('/{id}/checklist',                  [AuditController::class, 'checklist']);
        Route::post('/{id}/checklist',                 [AuditController::class, 'addChecklist']);
        Route::put('/{id}/checklist/{itemId}',         [AuditController::class, 'updateChecklist']);
        Route::get('/{id}/findings',                   [AuditController::class, 'findings']);
        Route::post('/{id}/findings',                  [AuditController::class, 'addFinding']);
        Route::put('/{id}/findings/{findingId}',       [AuditController::class, 'updateFinding']);
        Route::post('/{id}/findings/{findingId}/capa', [AuditController::class, 'raiseCapa']);
        Route::post('/{id}/issue-report',              [AuditController::class, 'issueReport']);
        Route::post('/{id}/close',                     [AuditController::class, 'close']);
    });

    // ============================================================
    // MODULE 6: CLIENT & VISIT MANAGEMENT
    // ============================================================
    Route::prefix('clients')->middleware('permission:visit.view')->group(function () {
        Route::get('/',         [VisitController::class, 'allClients']);
        Route::post('/',        [VisitController::class, 'storeClient']);
        Route::get('/stats',    [VisitController::class, 'clientStats']);
        Route::get('/users',    [VisitController::class, 'users']);
        Route::get('/{id}',     [VisitController::class, 'showClient']);
        Route::put('/{id}',     [VisitController::class, 'updateClient']);
        Route::delete('/{id}',  [VisitController::class, 'destroyClient']);
        Route::get('/{id}/visits', [VisitController::class, 'clientVisits']);
    });

    Route::prefix('visits')->middleware('permission:visit.view,visit.create')->group(function () {
        Route::get('/', [VisitController::class, 'index']);
        Route::post('/', [VisitController::class, 'store']);
        Route::get('/stats', [VisitController::class, 'stats']);
        Route::get('/clients', [VisitController::class, 'clients']);
        Route::get('/calendar', [VisitController::class, 'calendar']);
        Route::get('/{id}', [VisitController::class, 'show']);
        Route::put('/{id}', [VisitController::class, 'update']);
        Route::delete('/{id}', [VisitController::class, 'destroy']);
        Route::post('/{id}/confirm', [VisitController::class, 'confirm']);
        Route::post('/{id}/start', [VisitController::class, 'start']);
        Route::post('/{id}/complete', [VisitController::class, 'complete']);
        Route::post('/{id}/participants', [VisitController::class, 'addParticipant']);
        Route::post('/{id}/findings', [VisitController::class, 'addFinding']);
        Route::post('/{id}/rate', [VisitController::class, 'rate']);
    });

    // ============================================================
    // MODULE 7: SLA & OKR MANAGEMENT
    // ============================================================
    // SLA Management
    Route::prefix('sla')->middleware('permission:sla.view')->group(function () {
        Route::get('/',                         [SlaController::class, 'index']);
        Route::post('/',                        [SlaController::class, 'store']);
        Route::get('/stats',                    [SlaController::class, 'stats']);
        Route::get('/dashboard',                [SlaController::class, 'dashboard']);
        Route::get('/users',                    [SlaController::class, 'users']);
        Route::get('/clients',                  [SlaController::class, 'clients']);
        Route::get('/departments',              [SlaController::class, 'departments']);
        Route::get('/{id}',                     [SlaController::class, 'show']);
        Route::put('/{id}',                     [SlaController::class, 'update']);
        Route::delete('/{id}',                  [SlaController::class, 'destroy']);
        Route::post('/{id}/activate',           [SlaController::class, 'activate']);
        Route::post('/{id}/suspend',            [SlaController::class, 'suspend']);
        Route::get('/{id}/metrics',             [SlaController::class, 'metrics']);
        Route::post('/{id}/metrics',            [SlaController::class, 'addMetric']);
        Route::get('/{id}/measurements',        [SlaController::class, 'measurements']);
        Route::post('/{id}/measurements',       [SlaController::class, 'recordMeasurement']);
    });

    // OKR Management
    Route::prefix('objectives')->middleware('permission:okr.view')->group(function () {
        Route::get('/',                             [OkrController::class, 'index']);
        Route::post('/',                            [OkrController::class, 'store']);
        Route::get('/stats',                        [OkrController::class, 'stats']);
        Route::get('/tree',                         [OkrController::class, 'tree']);
        Route::get('/users',                        [OkrController::class, 'users']);
        Route::get('/departments',                  [OkrController::class, 'departments']);
        Route::get('/{id}',                         [OkrController::class, 'show']);
        Route::put('/{id}',                         [OkrController::class, 'update']);
        Route::delete('/{id}',                      [OkrController::class, 'destroy']);
        Route::get('/{id}/key-results',             [OkrController::class, 'keyResults']);
        Route::post('/{id}/key-results',            [OkrController::class, 'addKeyResult']);
        Route::put('/{id}/key-results/{krId}',      [OkrController::class, 'updateKeyResult']);
        Route::post('/{id}/key-results/{krId}/check-in', [OkrController::class, 'checkIn']);
    });

    // ============================================================
    // MODULE 8: VENDOR MANAGEMENT
    // ============================================================
    Route::prefix('vendors')->middleware('permission:vendor.view,vendor.create')->group(function () {
        Route::get('/', [VendorController::class, 'index']);
        Route::post('/', [VendorController::class, 'store']);
        Route::get('/stats', [VendorController::class, 'vendorStats']);
        Route::get('/list', [VendorController::class, 'vendorsList']);
        Route::get('/users', [VendorController::class, 'users']);
        Route::get('/categories', [VendorController::class, 'categories']);
        Route::get('/expiring-contracts', [VendorController::class, 'expiringContracts']);
        Route::get('/{id}', [VendorController::class, 'show']);
        Route::put('/{id}', [VendorController::class, 'update']);
        Route::delete('/{id}', [VendorController::class, 'destroy']);
        Route::post('/{id}/qualify', [VendorController::class, 'qualify']);
        Route::post('/{id}/suspend', [VendorController::class, 'suspend']);
        Route::get('/{id}/evaluations', [VendorController::class, 'evaluations']);
        Route::post('/{id}/evaluations', [VendorController::class, 'addEvaluation']);
        Route::get('/{id}/contracts', [VendorController::class, 'contracts']);
        Route::post('/{id}/contracts', [VendorController::class, 'addContract']);
    });

    Route::prefix('partnerships')->middleware('permission:vendor.view')->group(function () {
        Route::get('/', [VendorController::class, 'partnerships']);
        Route::post('/', [VendorController::class, 'storePartnership']);
        Route::get('/{id}', [VendorController::class, 'showPartnership']);
        Route::put('/{id}', [VendorController::class, 'updatePartnership']);
    });

    // ============================================================
    // MODULE 9: COMPLAINTS MANAGEMENT
    // ============================================================

    // ============================================================
    // CONTRACTS (standalone listing)
    // ============================================================
    Route::prefix('contracts')->middleware('permission:vendor.view')->group(function () {
        Route::get('/',                 [VendorController::class, 'allContracts']);
        Route::post('/',                [VendorController::class, 'storeContract']);
        Route::get('/stats',            [VendorController::class, 'contractStats']);
        Route::get('/{id}',             [VendorController::class, 'showContract']);
        Route::put('/{id}',             [VendorController::class, 'updateContract']);
        Route::post('/{id}/activate',   [VendorController::class, 'activateContract']);
        Route::post('/{id}/terminate',  [VendorController::class, 'terminateContract']);
    });

    Route::prefix('complaints')->middleware('permission:complaint.view,complaint.create')->group(function () {
        Route::get('/',                      [ComplaintController::class, 'index']);
        Route::post('/',                     [ComplaintController::class, 'store']);
        Route::get('/stats',                 [ComplaintController::class, 'stats']);
        Route::get('/categories',            [ComplaintController::class, 'categories']);
        Route::get('/users',                 [ComplaintController::class, 'users']);
        Route::get('/clients',               [ComplaintController::class, 'clients']);
        Route::get('/departments',           [ComplaintController::class, 'departments']);
        Route::get('/{id}',                  [ComplaintController::class, 'show']);
        Route::put('/{id}',                  [ComplaintController::class, 'update']);
        Route::delete('/{id}',               [ComplaintController::class, 'destroy']);
        Route::post('/{id}/acknowledge',     [ComplaintController::class, 'acknowledge']);
        Route::post('/{id}/assign',          [ComplaintController::class, 'assign']);
        Route::post('/{id}/investigate',     [ComplaintController::class, 'investigate']);
        Route::post('/{id}/escalate',        [ComplaintController::class, 'escalate']);
        Route::post('/{id}/resolve',         [ComplaintController::class, 'resolve']);
        Route::post('/{id}/close',           [ComplaintController::class, 'close']);
        Route::post('/{id}/withdraw',        [ComplaintController::class, 'withdraw']);
        Route::post('/{id}/raise-capa',      [ComplaintController::class, 'raiseCapa']);
        Route::get('/{id}/updates',          [ComplaintController::class, 'updates']);
        Route::post('/{id}/updates',         [ComplaintController::class, 'addUpdate']);
    });

    // ============================================================
    // REPORTS
    // ============================================================
    Route::prefix('reports')->middleware('permission:report.view')->group(function () {
        Route::get('/kpi-summary', [ReportController::class, 'kpiSummary']);
        Route::get('/nc-trend', [ReportController::class, 'ncTrend']);
        Route::get('/capa-effectiveness', [ReportController::class, 'capaEffectiveness']);
        Route::get('/risk-heat-map', [ReportController::class, 'riskHeatMap']);
        Route::get('/complaint-trend', [ReportController::class, 'complaintTrend']);
        Route::get('/audit-summary', [ReportController::class, 'auditSummary']);
        Route::get('/sla-compliance', [ReportController::class, 'slaCompliance']);
        Route::get('/okr-progress', [ReportController::class, 'okrProgress']);
        Route::get('/vendor-performance', [ReportController::class, 'vendorPerformance']);
        Route::get('/records/complaints', [ReportController::class, 'recordsComplaints']);
        Route::get('/records/ncs',        [ReportController::class, 'recordsNcs']);
        Route::get('/records/capas',      [ReportController::class, 'recordsCapas']);
        Route::get('/records/risks',      [ReportController::class, 'recordsRisks']);
        Route::get('/records/audits',     [ReportController::class, 'recordsAudits']);
        Route::get('/records/requests',   [ReportController::class, 'recordsRequests']);
    });
    // ============================================================
    // MODULE 10: CUSTOMER SATISFACTION SURVEYS
    // ============================================================
    Route::prefix('surveys')->middleware('permission:survey.view')->group(function () {
        Route::get('/',                         [SurveyController::class, 'index']);
        Route::post('/',                        [SurveyController::class, 'store']);
        Route::get('/stats',                    [SurveyController::class, 'stats']);
        Route::get('/users',                    [SurveyController::class, 'users']);
        Route::get('/clients',                  [SurveyController::class, 'clients']);
        Route::get('/departments',              [SurveyController::class, 'departments']);
        Route::get('/{id}',                     [SurveyController::class, 'show']);
        Route::put('/{id}',                     [SurveyController::class, 'update']);
        Route::delete('/{id}',                  [SurveyController::class, 'destroy']);
        Route::post('/{id}/activate',           [SurveyController::class, 'activate']);
        Route::post('/{id}/close',              [SurveyController::class, 'close']);
        Route::post('/{id}/pause',              [SurveyController::class, 'pause']);
        Route::post('/{id}/questions',          [SurveyController::class, 'addQuestion']);
        Route::put('/{id}/questions/{qid}',     [SurveyController::class, 'updateQuestion']);
        Route::delete('/{id}/questions/{qid}',  [SurveyController::class, 'deleteQuestion']);
        Route::get('/{id}/responses',           [SurveyController::class, 'responses']);
        Route::post('/{id}/responses',          [SurveyController::class, 'submitResponse']);
        Route::get('/{id}/analytics',           [SurveyController::class, 'analytics']);
    });

});

// ── ADMINISTRATION (outside auth group to allow import) ──────────────────
Route::middleware(['auth:sanctum', 'permission:admin.access'])->prefix('admin')->group(function () {
    Route::get('/users',              [\App\Http\Controllers\Api\AdminController::class, 'users']);
    Route::post('/users',             [\App\Http\Controllers\Api\AdminController::class, 'storeUser']);
    Route::put('/users/{id}',         [\App\Http\Controllers\Api\AdminController::class, 'updateUser']);
    Route::post('/users/{id}/toggle', [\App\Http\Controllers\Api\AdminController::class, 'toggleUser']);
    Route::post('/users/{id}/reset-password', [\App\Http\Controllers\Api\AdminController::class, 'resetPassword']);
    Route::get('/departments',        [\App\Http\Controllers\Api\AdminController::class, 'departments']);
    Route::post('/departments',       [\App\Http\Controllers\Api\AdminController::class, 'storeDepartment']);
    Route::put('/departments/{id}',   [\App\Http\Controllers\Api\AdminController::class, 'updateDepartment']);
    Route::delete('/departments/{id}',[\App\Http\Controllers\Api\AdminController::class, 'destroyDepartment']);
    Route::get('/roles',              [\App\Http\Controllers\Api\AdminController::class, 'roles']);
    Route::post('/roles',             [\App\Http\Controllers\Api\AdminController::class, 'storeRole']);
    Route::put('/roles/{id}',         [\App\Http\Controllers\Api\AdminController::class, 'updateRole']);
    Route::delete('/roles/{id}',      [\App\Http\Controllers\Api\AdminController::class, 'destroyRole']);
    Route::get('/categories/{type}',         [\App\Http\Controllers\Api\AdminController::class, 'categories']);
    Route::post('/categories/{type}',        [\App\Http\Controllers\Api\AdminController::class, 'storeCategory']);
    Route::put('/categories/{type}/{id}',    [\App\Http\Controllers\Api\AdminController::class, 'updateCategory']);
    Route::delete('/categories/{type}/{id}', [\App\Http\Controllers\Api\AdminController::class, 'destroyCategory']);
    Route::get('/email-templates',        [\App\Http\Controllers\Api\AdminController::class, 'emailTemplates']);
    Route::post('/email-templates',       [\App\Http\Controllers\Api\AdminController::class, 'storeEmailTemplate']);
    Route::get('/email-templates/{id}',   [\App\Http\Controllers\Api\AdminController::class, 'showEmailTemplate']);
    Route::put('/email-templates/{id}',   [\App\Http\Controllers\Api\AdminController::class, 'updateEmailTemplate']);
    Route::delete('/email-templates/{id}',[\App\Http\Controllers\Api\AdminController::class, 'destroyEmailTemplate']);
    Route::get('/settings',  [\App\Http\Controllers\Api\AdminController::class, 'settings']);
    Route::post('/settings', [\App\Http\Controllers\Api\AdminController::class, 'updateSettings']);
    Route::get('/activity-log', [\App\Http\Controllers\Api\AdminController::class, 'activityLog']);
});
