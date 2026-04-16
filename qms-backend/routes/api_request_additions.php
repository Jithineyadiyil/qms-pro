<?php
// ============================================================
// ADD THESE ROUTES to routes/api.php inside the
// authenticated middleware group, replacing the existing
// requests prefix block entirely.
// ============================================================

Route::prefix('requests')->group(function () {
    // ── CRUD ──────────────────────────────────────────────────────────────
    Route::get('/',             [RequestController::class, 'index']);
    Route::post('/',            [RequestController::class, 'store']);
    Route::get('/categories',   [RequestController::class, 'categories']);
    Route::get('/stats',        [RequestController::class, 'stats']);
    Route::get('/{id}',         [RequestController::class, 'show']);
    Route::put('/{id}',         [RequestController::class, 'update']);
    Route::delete('/{id}',      [RequestController::class, 'destroy']);

    // ── QDM Workflow Actions ───────────────────────────────────────────────
    Route::post('/{id}/submit',               [RequestController::class, 'submit']);
    Route::post('/{id}/acknowledge',          [RequestController::class, 'acknowledge']);
    Route::post('/{id}/request-clarification',[RequestController::class, 'requestClarification']);
    Route::post('/{id}/submit-clarification', [RequestController::class, 'submitClarification']);
    Route::post('/{id}/assign',               [RequestController::class, 'assign']);
    Route::post('/{id}/start-progress',       [RequestController::class, 'startProgress']);
    Route::post('/{id}/complete',             [RequestController::class, 'complete']);
    Route::post('/{id}/confirm-receipt',      [RequestController::class, 'confirmReceipt']);
    Route::post('/{id}/approve',              [RequestController::class, 'approve']);
    Route::post('/{id}/reject',               [RequestController::class, 'reject']);
    Route::post('/{id}/cancel',               [RequestController::class, 'cancel']);
    Route::post('/{id}/close',                [RequestController::class, 'close']);

    // ── Comments & Approvals ──────────────────────────────────────────────
    Route::get('/{id}/comments',   [RequestController::class, 'comments']);
    Route::post('/{id}/comments',  [RequestController::class, 'addComment']);
    Route::get('/{id}/approvals',  [RequestController::class, 'approvals']);
});

// ── Add to app/Console/Kernel.php schedule() method: ──────────────────────────
// $schedule->job(new \App\Jobs\RequestEscalationJob)->everyFiveMinutes();
