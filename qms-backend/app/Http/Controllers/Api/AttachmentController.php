<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * AttachmentController — general-purpose file upload for all QMS modules.
 *
 * Used by the shared AttachmentUploadComponent in the Angular frontend.
 * Files are stored in storage/app/public/{module}/{year}/{month}/
 * and served via the public disk (php artisan storage:link).
 *
 * POST   /api/attachments/upload   { file: File, module?: string }
 * DELETE /api/attachments/delete   { path: string }
 */
class AttachmentController extends BaseController
{
    private const ALLOWED_MIMES = 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,txt,csv';
    private const MAX_SIZE_KB   = 20480; // 20 MB

    /** Upload a single file and return its storage path + public URL. */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'   => ['required', 'file', 'max:' . self::MAX_SIZE_KB, 'mimes:' . self::ALLOWED_MIMES],
            'module' => 'nullable|string|max:50|alpha_dash',
        ]);

        $module    = $request->input('module', 'general');
        $folder    = "{$module}/" . date('Y') . '/' . date('m');
        $file      = $request->file('file');
        $extension = $file->getClientOriginalExtension();
        $filename  = Str::uuid() . '.' . $extension;

        $path = $file->storeAs($folder, $filename, 'public');

        return $this->success([
            'path'          => $path,
            'url'           => asset('storage/' . $path),
            'original_name' => $file->getClientOriginalName(),
            'size'          => $file->getSize(),
            'mime'          => $file->getMimeType(),
            'module'        => $module,
        ], 'File uploaded successfully', 201);
    }

    /** Delete a previously uploaded file by its storage path. */
    public function delete(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);

        $path = $request->input('path');

        // Security: only allow deletion within known module folders
        $allowedPrefixes = ['general/', 'nc/', 'capa/', 'requests/', 'documents/',
                            'risks/', 'audits/', 'complaints/', 'vendors/', 'visits/',
                            'contracts/'];   // vendor contract documents

        $safe = collect($allowedPrefixes)->contains(fn ($p) => str_starts_with($path, $p));

        if (!$safe) {
            return $this->error('Invalid file path.', 422);
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        return $this->success(['deleted' => true, 'path' => $path], 'File deleted');
    }
}
