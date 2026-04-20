<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * AdminController
 *
 * Handles: Categories (all types), Email Templates, System Settings.
 * All endpoints require super_admin or qa_manager role.
 */
class AdminController extends BaseController
{
    private function guardAdmin(): void
    {
        $slug = optional(optional(auth()->user())->role)->slug ?? '';
        if (!in_array($slug, ['super_admin', 'qa_manager'], true)) {
            abort(403, 'Admin privileges required.');
        }
    }

    // ── CATEGORIES ────────────────────────────────────────────────────────────

    /**
     * Maps frontend category type strings to actual DB table names.
     */
    private function catTable(string $type): ?string
    {
        return [
            'nc'          => 'nc_categories',
            'risk'        => 'risk_categories',
            'document'    => 'document_categories',
            'complaint'   => 'complaint_categories',
            'vendor'      => 'vendor_categories',
            'request'     => 'request_categories',
            'audit'       => 'audit_categories',
        ][$type] ?? null;
    }

    public function categoriesIndex(Request $request, string $type): JsonResponse
    {
        $this->guardAdmin();
        $table = $this->catTable($type);
        if (!$table) return $this->error("Unknown category type: {$type}", 422);
        return $this->success(DB::table($table)->orderBy('name')->get());
    }

    public function storeCategory(Request $request, string $type): JsonResponse
    {
        $this->guardAdmin();
        $table = $this->catTable($type);
        if (!$table) return $this->error("Unknown category type: {$type}", 422);

        $validated = $request->validate([
            'name'             => "required|string|max:150|unique:{$table},name",
            'description'      => 'nullable|string',
            'sla_hours'        => 'nullable|integer|min:1',
            'severity_default' => 'nullable|string',
            'code'             => 'nullable|string|max:20',
        ]);

        $id = DB::table($table)->insertGetId(array_filter([
            'name'             => $validated['name'],
            'description'      => $validated['description'] ?? null,
            'sla_hours'        => $validated['sla_hours'] ?? null,
            'severity_default' => $validated['severity_default'] ?? null,
            'code'             => $validated['code'] ?? null,
        ], fn($v) => $v !== null));

        return $this->success(DB::table($table)->find($id), 'Category created', 201);
    }

    public function updateCategory(Request $request, string $type, int $id): JsonResponse
    {
        $this->guardAdmin();
        $table = $this->catTable($type);
        if (!$table) return $this->error("Unknown category type: {$type}", 422);

        $validated = $request->validate([
            'name'             => "sometimes|string|max:150|unique:{$table},name,{$id}",
            'description'      => 'nullable|string',
            'sla_hours'        => 'nullable|integer|min:1',
            'severity_default' => 'nullable|string',
            'code'             => 'nullable|string|max:20',
        ]);

        DB::table($table)->where('id', $id)->update(array_filter($validated, fn($v) => $v !== null));
        return $this->success(DB::table($table)->find($id), 'Category updated');
    }

    public function destroyCategory(Request $request, string $type, int $id): JsonResponse
    {
        $this->guardAdmin();
        $table = $this->catTable($type);
        if (!$table) return $this->error("Unknown category type: {$type}", 422);
        DB::table($table)->where('id', $id)->delete();
        return $this->success(null, 'Category deleted');
    }

    // ── EMAIL TEMPLATES ───────────────────────────────────────────────────────

    public function emailTemplates(Request $request): JsonResponse
    {
        $this->guardAdmin();
        $q = DB::table('email_templates')->orderBy('module')->orderBy('name');
        if ($request->filled('module')) $q->where('module', $request->module);
        return $this->success($q->get());
    }

    public function storeEmailTemplate(Request $request): JsonResponse
    {
        $this->guardAdmin();
        $validated = $request->validate([
            'slug'          => 'required|string|max:100|unique:email_templates,slug',
            'name'          => 'required|string|max:255',
            'module'        => 'required|string|max:50',
            'trigger_event' => 'required|string|max:100',
            'subject'       => 'required|string|max:255',
            'body_html'     => 'required|string',
            'variables'     => 'nullable|array',
            'is_active'     => 'boolean',
        ]);
        $id = DB::table('email_templates')->insertGetId(array_merge($validated, [
            'created_at' => now(), 'updated_at' => now(),
        ]));
        return $this->success(DB::table('email_templates')->find($id), 'Template created', 201);
    }

    public function updateEmailTemplate(Request $request, int $id): JsonResponse
    {
        $this->guardAdmin();
        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'subject'       => 'sometimes|string|max:255',
            'body_html'     => 'sometimes|string',
            'variables'     => 'nullable|array',
            'is_active'     => 'boolean',
            'trigger_event' => 'sometimes|string|max:100',
        ]);
        DB::table('email_templates')->where('id', $id)->update(array_merge($validated, ['updated_at' => now()]));
        return $this->success(DB::table('email_templates')->find($id), 'Template updated');
    }

    public function destroyEmailTemplate(int $id): JsonResponse
    {
        $this->guardAdmin();
        DB::table('email_templates')->where('id', $id)->delete();
        return $this->success(null, 'Template deleted');
    }

    // ── SYSTEM SETTINGS ───────────────────────────────────────────────────────

    public function settings(): JsonResponse
    {
        $this->guardAdmin();
        $rows = DB::table('system_settings')->orderBy('group')->orderBy('label')->get();
        return $this->success($rows);  // flat array — frontend iterates directly
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $this->guardAdmin();
        $settings = $request->validate(['settings' => 'required|array'])['settings'];

        foreach ($settings as $key => $value) {
            DB::table('system_settings')
                ->where('key', $key)
                ->update(['value' => $value, 'updated_at' => now()]);
        }

        $this->logActivity('admin', 'settings_updated', null);
        return $this->success(null, 'Settings saved successfully');
    }
}
