<?php
/**
 * patch_permissions.php
 * Run from qms-backend root: php patch_permissions.php
 *
 * Adds a hasPermission() guard to each controller's store() and report methods.
 * Uses direct string injection — more reliable than regex.
 */

function patchMethod(string $file, string $method, string $guardCode): void
{
    if (!file_exists($file)) {
        echo "  SKIP (missing): " . basename($file) . "\n";
        return;
    }

    $code = file_get_contents($file);
    $guard = trim($guardCode);

    // Already patched?
    if (str_contains($code, $guard)) {
        echo "  ALREADY DONE: " . basename($file) . "::{$method}()\n";
        return;
    }

    // Find: "public function METHOD(..." then the first "{"
    $searchFor = "public function {$method}(";
    $pos = strpos($code, $searchFor);
    if ($pos === false) {
        echo "  WARNING: method '{$method}' not found in " . basename($file) . "\n";
        return;
    }

    // Find the opening brace after the method signature
    $bracePos = strpos($code, '{', $pos);
    if ($bracePos === false) {
        echo "  WARNING: opening brace not found for {$method} in " . basename($file) . "\n";
        return;
    }

    // Insert the guard on the next line after the opening brace
    $before = substr($code, 0, $bracePos + 1);
    $after  = substr($code, $bracePos + 1);
    $code   = $before . "\n        " . $guard . $after;

    file_put_contents($file, $code);
    echo "  PATCHED: " . basename($file) . "::{$method}()\n";
}

$base = __DIR__ . '/app/Http/Controllers/Api/';

// ── Permission guards ──────────────────────────────────────────────────────
$guards = [
    'NonconformanceController.php' => [
        'store' => "if (!auth()->user()->hasPermission('nc.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
    'CapaController.php' => [
        'store' => "if (!auth()->user()->hasPermission('capa.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
    'AuditController.php' => [
        'store' => "if (!auth()->user()->hasPermission('audit.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
    'ComplaintController.php' => [
        'store' => "if (!auth()->user()->hasPermission('complaint.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
    'RiskController.php' => [
        'store' => "if (!auth()->user()->hasPermission('risk.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
    'VendorController.php' => [
        'store' => "if (!auth()->user()->hasPermission('vendor.create')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
    'ReportController.php' => [
        'kpiSummary'        => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'ncTrend'           => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'capaEffectiveness' => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'riskHeatMap'       => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'complaintTrend'    => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'visitSummary'      => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'recordsNcs'        => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
        'recordsComplaints' => "if (!auth()->user()->hasPermission('report.view')) { return response()->json(['success'=>false,'message'=>'Forbidden'],403); }",
    ],
];

foreach ($guards as $file => $methods) {
    foreach ($methods as $method => $guard) {
        patchMethod($base . $file, $method, $guard);
    }
}

echo "\nDone! Run: php artisan cache:clear && php artisan test\n";
