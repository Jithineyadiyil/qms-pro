<?php

// ============================================================
// routes/api.php — Complete QMS API Routes
// Version 2.1 — QDM workflow + admin + missing audit/capa/report/vendor routes
// ============================================================

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\RequestAttachmentController;
use App\Http\Controllers\Api\AttachmentController;
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

// ── PUBLIC ──────────────────────────────────────────────────────────────────
Route::post('/auth/login',           [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password',  [AuthController::class, 'resetPassword']);
Route::post('/complaints/external',  [ComplaintController::class, 'storeExternal']);

// ── AUTHENTICATED ────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    // ── Generic attachments (all modules) ─────────────────────────────────


    // Auth
    Route::post('/auth/logout',          [AuthController::class, 'logout']);
    Route::get('/auth/me',               [AuthController::class, 'me']);
    Route::put('/auth/profile',          [AuthController::class, 'updateProfile']);
    Route::put('/auth/change-password',  [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard/stats',              [DashboardController::class, 'stats']);
    Route::get('/dashboard/charts',             [DashboardController::class, 'charts']);
    Route::get('/dashboard/recent-activities',  [DashboardController::class, 'recentActivities']);
    Route::get('/dashboard/my-tasks',           [DashboardController::class, 'myTasks']);
    Route::get('/dashboard/overdue',            [DashboardController::class, 'overdueItems']);

    // Notifications
    Route::get('/notifications',                [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read',      [NotificationController::class, 'markRead']);
    Route::put('/notifications/read-all',       [NotificationController::class, 'markAllRead']);

    // Users & Departments (standard)
    Route::apiResource('users', UserController::class);
    Route::get('/departments', [UserController::class, 'departments']);
    Route::get('/roles',       [UserController::class, 'roles']);

    // ── ADMIN ROUTES ────────────────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        // Users
        Route::get('/users',                      [UserController::class, 'adminIndex']);
        Route::post('/users',                     [UserController::class, 'store']);
        Route::post('/users/{id}/toggle',         [UserController::class, 'toggleActive']);
        Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);

        // Roles
        Route::get('/roles',       [UserController::class, 'rolesIndex']);
        Route::post('/roles',      [UserController::class, 'storeRole']);
        Route::delete('/roles/{id}', [UserController::class, 'destroyRole']);

        // Departments
        Route::get('/departments',       [UserController::class, 'departmentsIndex']);
        Route::post('/departments',      [UserController::class, 'storeDepartment']);
        Route::delete('/departments/{id}', [UserController::class, 'destroyDepartment']);

        // Activity log
        Route::get('/activity-log', [UserController::class, 'activityLog']);
    });

    // ── MODULE 1: REQUEST MANAGEMENT (QDM v2) ────────────────────────────────

    // ── GENERAL ATTACHMENTS (NC, CAPA, Documents, etc.) ────────────────────
    Route::post('/attachments/upload',  [AttachmentController::class, 'upload']);
    Route::delete('/attachments/delete',[AttachmentController::class, 'delete']);

    // Attachment upload/delete — must be BEFORE the requests/{id} prefix block
    Route::post('/requests/upload-attachment',  [RequestAttachmentController::class, 'upload']);
    Route::delete('/requests/delete-attachment',[RequestAttachmentController::class, 'delete']);

    Route::prefix('requests')->group(function () {
        Route::get('/',            [RequestController::class, 'index']);
        Route::post('/',           [RequestController::class, 'store']);
        Route::get('/categories',  [RequestController::class, 'categories']);
        Route::get('/stats',       [RequestController::class, 'stats']);
        Route::get('/{id}',        [RequestController::class, 'show']);
        Route::put('/{id}',        [RequestController::class, 'update']);
        Route::delete('/{id}',     [RequestController::class, 'destroy']);

        // Workflow
        Route::post('/{id}/submit',               [RequestController::class, 'submit']);
        Route::post('/{id}/assign',               [RequestController::class, 'assign']);
        Route::post('/{id}/approve',              [RequestController::class, 'approve']);
        Route::post('/{id}/reject',               [RequestController::class, 'reject']);
        Route::post('/{id}/close',                [RequestController::class, 'close']);

        // QDM v2
        Route::post('/{id}/acknowledge',           [RequestController::class, 'acknowledge']);
        Route::post('/{id}/request-clarification', [RequestController::class, 'requestClarification']);
        Route::post('/{id}/submit-clarification',  [RequestController::class, 'submitClarification']);
        Route::post('/{id}/start-progress',        [RequestController::class, 'startProgress']);
        Route::post('/{id}/complete',              [RequestController::class, 'complete']);
        Route::post('/{id}/confirm-receipt',       [RequestController::class, 'confirmReceipt']);
        Route::post('/{id}/cancel',                [RequestController::class, 'cancel']);

        Route::get('/{id}/comments',   [RequestController::class, 'comments']);
        Route::post('/{id}/comments',  [RequestController::class, 'addComment']);
        Route::get('/{id}/approvals',  [RequestController::class, 'approvals']);
    });

    // ── MODULE 2: NC & CAPA ──────────────────────────────────────────────────
    Route::prefix('nonconformances')->group(function () {
        Route::get('/',              [NonconformanceController::class, 'index']);
        Route::post('/',             [NonconformanceController::class, 'store']);
        Route::get('/stats',         [NonconformanceController::class, 'stats']);
        Route::get('/categories',    [NonconformanceController::class, 'categories']);
        Route::get('/{id}',          [NonconformanceController::class, 'show']);
        Route::put('/{id}',          [NonconformanceController::class, 'update']);
        Route::delete('/{id}',       [NonconformanceController::class, 'destroy']);
        Route::post('/{id}/assign',       [NonconformanceController::class, 'assign']);
        Route::post('/{id}/investigate',  [NonconformanceController::class, 'startInvestigation']);
        Route::post('/{id}/close',        [NonconformanceController::class, 'close']);
        Route::post('/{id}/raise-capa',   [NonconformanceController::class, 'raiseCapa']);
    });

    Route::prefix('capas')->group(function () {
        Route::get('/',     [CapaController::class, 'index']);
        Route::post('/',    [CapaController::class, 'store']);
        Route::get('/stats',[CapaController::class, 'stats']);
        Route::get('/{id}', [CapaController::class, 'show']);
        Route::put('/{id}', [CapaController::class, 'update']);
        Route::delete('/{id}', [CapaController::class, 'destroy']);
        Route::post('/{id}/tasks',                       [CapaController::class, 'addTask']);
        Route::put('/{id}/tasks/{taskId}',               [CapaController::class, 'updateTask']);
        Route::post('/{id}/tasks/{taskId}/complete',     [CapaController::class, 'completeTask']);
        Route::post('/{id}/effectiveness-review',        [CapaController::class, 'effectivenessReview']);
        Route::post('/{id}/close',                       [CapaController::class, 'close']);
    });

    // ── MODULE 3: RISK ───────────────────────────────────────────────────────
    Route::prefix('risks')->group(function () {
        Route::get('/',            [RiskController::class, 'index']);
        Route::post('/',           [RiskController::class, 'store']);
        Route::get('/stats',       [RiskController::class, 'stats']);
        Route::get('/matrix',      [RiskController::class, 'matrix']);
        Route::get('/categories',  [RiskController::class, 'categories']);
        Route::get('/{id}',        [RiskController::class, 'show']);
        Route::put('/{id}',        [RiskController::class, 'update']);
        Route::delete('/{id}',     [RiskController::class, 'destroy']);
        Route::post('/{id}/controls',              [RiskController::class, 'addControl']);
        Route::put('/{id}/controls/{controlId}',   [RiskController::class, 'updateControl']);
        Route::post('/{id}/review',                [RiskController::class, 'addReview']);
        Route::put('/{id}/assess',                 [RiskController::class, 'assess']);
    });

    // ── MODULE 4: DOCUMENT CONTROL ───────────────────────────────────────────
    Route::prefix('documents')->group(function () {
        Route::get('/',             [DocumentController::class, 'index']);
        Route::post('/',            [DocumentController::class, 'store']);
        Route::get('/stats',        [DocumentController::class, 'stats']);
        Route::get('/categories',   [DocumentController::class, 'categories']);
        Route::get('/expiring',     [DocumentController::class, 'expiring']);
        Route::get('/{id}',         [DocumentController::class, 'show']);
        Route::put('/{id}',         [DocumentController::class, 'update']);
        Route::delete('/{id}',      [DocumentController::class, 'destroy']);
        Route::post('/{id}/submit-review', [DocumentController::class, 'submitForReview']);
        Route::post('/{id}/approve',       [DocumentController::class, 'approve']);
        Route::post('/{id}/reject',        [DocumentController::class, 'reject']);
        Route::post('/{id}/obsolete',      [DocumentController::class, 'markObsolete']);
        Route::post('/{id}/new-version',   [DocumentController::class, 'newVersion']);
        Route::post('/{id}/distribute',    [DocumentController::class, 'distribute']);
        Route::get('/{id}/versions',       [DocumentController::class, 'versions']);
        Route::get('/{id}/access-log',     [DocumentController::class, 'accessLog']);
        Route::get('/{id}/download',       [DocumentController::class, 'download']);
    });

    // ── MODULE 5: AUDITS ─────────────────────────────────────────────────────
    Route::prefix('audits')->group(function () {
        Route::get('/',             [AuditController::class, 'index']);
        Route::post('/',            [AuditController::class, 'store']);
        Route::get('/stats',        [AuditController::class, 'stats']);
        Route::get('/programs',     [AuditController::class, 'programs']);
        Route::post('/programs',    [AuditController::class, 'createProgram']);
        Route::get('/{id}',         [AuditController::class, 'show']);
        Route::put('/{id}',         [AuditController::class, 'update']);
        Route::delete('/{id}',      [AuditController::class, 'destroy']);
        Route::post('/{id}/notify',             [AuditController::class, 'notify']);
        Route::post('/{id}/start',              [AuditController::class, 'start']);
        Route::post('/{id}/team',               [AuditController::class, 'addTeamMember']);
        Route::get('/{id}/checklist',           [AuditController::class, 'checklist']);
        Route::put('/{id}/checklist/{itemId}',  [AuditController::class, 'updateChecklist']);
        Route::get('/{id}/findings',            [AuditController::class, 'findings']);
        Route::post('/{id}/findings',           [AuditController::class, 'addFinding']);
        Route::put('/{id}/findings/{findingId}',[AuditController::class, 'updateFinding']);
        Route::post('/{id}/issue-report',       [AuditController::class, 'issueReport']);
        Route::post('/{id}/close',              [AuditController::class, 'close']);
    });

    // ── MODULE 6: VISITS & CLIENTS ───────────────────────────────────────────
    Route::prefix('clients')->group(function () {
        Route::get('/',        [VisitController::class, 'clients']);
        Route::post('/',       [VisitController::class, 'storeClient']);
        Route::get('/{id}',    [VisitController::class, 'showClient']);
        Route::put('/{id}',    [VisitController::class, 'updateClient']);
        Route::get('/{id}/visits', [VisitController::class, 'clientVisits']);
    });

    Route::prefix('visits')->group(function () {
        Route::get('/',          [VisitController::class, 'index']);
        Route::post('/',         [VisitController::class, 'store']);
        Route::get('/stats',     [VisitController::class, 'stats']);
        Route::get('/calendar',  [VisitController::class, 'calendar']);
        Route::get('/{id}',      [VisitController::class, 'show']);
        Route::put('/{id}',      [VisitController::class, 'update']);
        Route::delete('/{id}',   [VisitController::class, 'destroy']);
        Route::post('/{id}/confirm',      [VisitController::class, 'confirm']);
        Route::post('/{id}/start',        [VisitController::class, 'start']);
        Route::post('/{id}/complete',     [VisitController::class, 'complete']);
        Route::post('/{id}/participants', [VisitController::class, 'addParticipant']);
        Route::post('/{id}/findings',     [VisitController::class, 'addFinding']);
        Route::post('/{id}/rate',         [VisitController::class, 'rate']);
    });

    // ── MODULE 7: SLA & OKR ──────────────────────────────────────────────────
    Route::prefix('sla')->group(function () {
        Route::get('/',           [SlaController::class, 'index']);
        Route::post('/',          [SlaController::class, 'store']);
        Route::get('/stats',      [SlaController::class, 'stats']);
        Route::get('/dashboard',  [SlaController::class, 'dashboard']);
        Route::get('/clients',    [SlaController::class, 'clients']);
        Route::get('/departments',[SlaController::class, 'departments']);
        Route::get('/{id}',       [SlaController::class, 'show']);
        Route::put('/{id}',       [SlaController::class, 'update']);
        Route::delete('/{id}',    [SlaController::class, 'destroy']);
        Route::post('/{id}/activate',        [SlaController::class, 'activate']);
        Route::post('/{id}/suspend',         [SlaController::class, 'suspend']);
        Route::get('/{id}/metrics',          [SlaController::class, 'metrics']);
        Route::post('/{id}/metrics',         [SlaController::class, 'addMetric']);
        Route::post('/{id}/measurements',    [SlaController::class, 'recordMeasurement']);
        Route::get('/{id}/measurements',     [SlaController::class, 'measurements']);
    });

    Route::prefix('objectives')->group(function () {
        Route::get('/',       [OkrController::class, 'index']);
        Route::post('/',      [OkrController::class, 'store']);
        Route::get('/stats',  [OkrController::class, 'stats']);
        Route::get('/tree',   [OkrController::class, 'tree']);
        Route::get('/{id}',   [OkrController::class, 'show']);
        Route::put('/{id}',   [OkrController::class, 'update']);
        Route::delete('/{id}',[OkrController::class, 'destroy']);
        Route::get('/{id}/key-results',               [OkrController::class, 'keyResults']);
        Route::post('/{id}/key-results',              [OkrController::class, 'addKeyResult']);
        Route::put('/{id}/key-results/{krId}',        [OkrController::class, 'updateKeyResult']);
        Route::post('/{id}/key-results/{krId}/check-in', [OkrController::class, 'checkIn']);
    });

    // ── MODULE 8: VENDORS & CONTRACTS ────────────────────────────────────────
    Route::prefix('vendors')->group(function () {
        Route::get('/',                    [VendorController::class, 'index']);
        Route::post('/',                   [VendorController::class, 'store']);
        Route::get('/stats',               [VendorController::class, 'stats']);
        Route::get('/categories',          [VendorController::class, 'categories']);
        Route::get('/expiring-contracts',  [VendorController::class, 'expiringContracts']);
        Route::get('/list',                [VendorController::class, 'listDropdown']);  // dropdown
        Route::get('/users',               [VendorController::class, 'users']);          // owner dropdown
        Route::get('/{id}',                [VendorController::class, 'show']);
        Route::put('/{id}',                [VendorController::class, 'update']);
        Route::delete('/{id}',             [VendorController::class, 'destroy']);
        Route::post('/{id}/qualify',       [VendorController::class, 'qualify']);
        Route::post('/{id}/suspend',       [VendorController::class, 'suspend']);
        Route::get('/{id}/evaluations',    [VendorController::class, 'evaluations']);
        Route::post('/{id}/evaluations',   [VendorController::class, 'addEvaluation']);
        Route::get('/{id}/contracts',      [VendorController::class, 'contracts']);
        Route::post('/{id}/contracts',     [VendorController::class, 'addContract']);
    });

    Route::prefix('partnerships')->group(function () {
        Route::get('/',       [VendorController::class, 'partnerships']);
        Route::post('/',      [VendorController::class, 'storePartnership']);
        Route::get('/{id}',   [VendorController::class, 'showPartnership']);
        Route::put('/{id}',   [VendorController::class, 'updatePartnership']);
    });

    // Contracts (standalone prefix, used by VendorContractTest)
    Route::prefix('contracts')->group(function () {
        Route::get('/',        [VendorController::class, 'contractsIndex']);
        Route::post('/',       [VendorController::class, 'storeContract']);
        Route::get('/{id}',    [VendorController::class, 'showContract']);
        Route::put('/{id}',    [VendorController::class, 'updateContract']);
        Route::post('/{id}/activate',  [VendorController::class, 'activateContract']);
        Route::post('/{id}/terminate', [VendorController::class, 'terminateContract']);
    });

    // ── MODULE 9: COMPLAINTS ─────────────────────────────────────────────────
    Route::prefix('complaints')->group(function () {
        Route::get('/',             [ComplaintController::class, 'index']);
        Route::post('/',            [ComplaintController::class, 'store']);
        Route::get('/stats',        [ComplaintController::class, 'stats']);
        Route::get('/categories',   [ComplaintController::class, 'categories']);
        Route::get('/{id}',         [ComplaintController::class, 'show']);
        Route::put('/{id}',         [ComplaintController::class, 'update']);
        Route::delete('/{id}',      [ComplaintController::class, 'destroy']);
        Route::post('/{id}/acknowledge', [ComplaintController::class, 'acknowledge']);
        Route::post('/{id}/assign',      [ComplaintController::class, 'assign']);
        Route::post('/{id}/escalate',    [ComplaintController::class, 'escalate']);
        Route::post('/{id}/resolve',     [ComplaintController::class, 'resolve']);
        Route::post('/{id}/close',       [ComplaintController::class, 'close']);
        Route::post('/{id}/withdraw',    [ComplaintController::class, 'withdraw']);
        Route::post('/{id}/raise-capa',  [ComplaintController::class, 'raiseCapa']);
        Route::get('/{id}/updates',      [ComplaintController::class, 'updates']);
        Route::post('/{id}/updates',     [ComplaintController::class, 'addUpdate']);
    });

    // ── REPORTS ──────────────────────────────────────────────────────────────
    Route::prefix('reports')->group(function () {
        Route::get('/kpi-summary',        [ReportController::class, 'kpiSummary']);
        Route::get('/nc-trend',           [ReportController::class, 'ncTrend']);
        Route::get('/capa-effectiveness', [ReportController::class, 'capaEffectiveness']);
        Route::get('/risk-heat-map',      [ReportController::class, 'riskHeatMap']);
        Route::get('/complaint-trend',    [ReportController::class, 'complaintTrend']);
        Route::get('/audit-summary',      [ReportController::class, 'auditSummary']);
        Route::get('/sla-compliance',     [ReportController::class, 'slaCompliance']);
        Route::get('/okr-progress',       [ReportController::class, 'okrProgress']);
        Route::get('/vendor-performance', [ReportController::class, 'vendorPerformance']);
        Route::get('/visit-summary',      [ReportController::class, 'visitSummary']);
        Route::get('/records/ncs',        [ReportController::class, 'recordsNcs']);
        Route::get('/records/complaints', [ReportController::class, 'recordsComplaints']);
        Route::post('/export',            [ReportController::class, 'export']);
    });
});
