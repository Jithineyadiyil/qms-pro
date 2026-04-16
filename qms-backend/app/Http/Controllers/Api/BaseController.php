<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * BaseController — shared helpers for all QMS API controllers.
 * Adds: success(), error(), paginated(), logActivity(), generateRef(),
 *       requirePermission(), sendNotification().
 */
class BaseController extends Controller
{
    protected function success($data, string $message = 'Success', int $code = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data], $code);
    }

    protected function error(string $message, int $code = 400, $data = null)
    {
        return response()->json(['success' => false, 'message' => $message, 'data' => $data], $code);
    }

    protected function paginated(Builder $query, int $perPage = 15)
    {
        $perPage   = request()->integer('per_page', $perPage);
        $paginated = $query->paginate($perPage);
        return response()->json([
            'success'      => true,
            'data'         => $paginated->items(),
            'total'        => $paginated->total(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
        ]);
    }

    protected function generateRef(string $prefix): string
    {
        $year    = date('Y');
        $last    = DB::table(match ($prefix) {
            'REQ'  => 'requests',
            'NC'   => 'nonconformances',
            'CAP'  => 'capas',
            'RSK'  => 'risks',
            'AUD'  => 'audits',
            'CMP'  => 'complaints',
            'VND'  => 'vendors',
            'CON'  => 'vendor_contracts',
            default => 'requests',
        })->whereYear('created_at', $year)->count();
        return "{$prefix}-{$year}-" . str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }

    protected function logActivity(string $module, string $action, $record, array $before = [], array $after = []): void
    {
        try {
            DB::table('activity_logs')->insert([
                'user_id'    => auth()->id(),
                'module'     => $module,
                'action'     => $action,
                'record_id'  => $record->id ?? null,
                'before'     => $before ? json_encode($before) : null,
                'after'      => $after ? json_encode($after) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable) {
            // Non-fatal — don't break the request if activity_logs table is missing
        }
    }

    /**
     * Abort with 403 if the authenticated user lacks the given permission.
     * Super-admin always passes.
     */
    protected function requirePermission(string $permission): void
    {
        $user = auth()->user();
        if (!$user) {
            abort(401);
        }
        $slug = optional($user->role)->slug ?? '';
        if ($slug === 'super_admin') {
            return; // super_admin bypasses all checks
        }
        if (!$user->hasPermission($permission)) {
            abort(403, "Permission '{$permission}' required.");
        }
    }

    protected function addStatusUpdate($record, string $from, string $to, string $notes): void
    {
        try {
            $table = match (true) {
                property_exists($record, 'getTable') => $record->getTable() . '_updates',
                default                              => 'complaint_updates',
            };
            // silently skip if table doesn't exist
        } catch (\Throwable) {}
    }

    protected function sendNotification(int $userId, string $type, string $title, string $message, array $data = []): void
    {
        try {
            DB::table('notifications')->insert([
                'user_id'    => $userId,
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'data'       => json_encode($data),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {}
    }
}
