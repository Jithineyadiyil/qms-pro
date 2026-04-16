<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * RequestAttachmentController
 *
 * Handles file uploads for requests.
 * Files are stored in storage/app/public/requests/{year}/{month}/
 * and served via the public disk (symlinked by php artisan storage:link).
 *
 * POST /api/requests/upload-attachment
 *   Body:  multipart/form-data  { file: File }
 *   Returns: { path: "requests/2026/05/uuid.pdf", url: "http://..." }
 *
 * DELETE /api/requests/delete-attachment
 *   Body:  { path: "requests/2026/05/uuid.pdf" }
 *   Returns: { deleted: true }
 */
class RequestAttachmentController extends BaseController
{
    private const ALLOWED_MIME = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'text/csv',
    ];

    private const MAX_SIZE_KB = 20480; // 20 MB

    /**
     * Upload a single attachment file and return its storage path.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:' . self::MAX_SIZE_KB,
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,txt,csv',
            ],
        ]);

        $file      = $request->file('file');
        $folder    = 'requests/' . date('Y') . '/' . date('m');
        $extension = $file->getClientOriginalExtension();
        $filename  = Str::uuid() . '.' . $extension;

        // Store in public disk — accessible via /storage/requests/...
        $path = $file->storeAs($folder, $filename, 'public');

        return $this->success([
            'path'         => $path,
            'url'          => asset('storage/' . $path),
            'original_name'=> $file->getClientOriginalName(),
            'size'         => $file->getSize(),
            'mime'         => $file->getMimeType(),
        ], 'File uploaded successfully', 201);
    }

    /**
     * Delete a previously uploaded attachment by path.
     */
    public function delete(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);

        $path = $request->path;

        // Security: ensure the path stays within the requests folder
        if (!str_starts_with($path, 'requests/')) {
            return $this->error('Invalid file path.', 422);
        }

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($path);
        }

        return $this->success(['deleted' => true], 'File deleted');
    }
}
