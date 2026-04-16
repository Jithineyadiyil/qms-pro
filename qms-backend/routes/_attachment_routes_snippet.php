<?php
// ── ADD THESE 2 LINES inside the Route::middleware('auth:sanctum')->group() ──
// Place them BEFORE the requests/{id} route block so they are not swallowed
// by the wildcard /{id} parameter:

use App\Http\Controllers\Api\RequestAttachmentController;

Route::post('/requests/upload-attachment',  [RequestAttachmentController::class, 'upload']);
Route::delete('/requests/delete-attachment',[RequestAttachmentController::class, 'delete']);
