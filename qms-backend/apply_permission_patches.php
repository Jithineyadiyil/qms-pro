<?php
/**
 * apply_permission_patches.php
 * Run from qms-backend root: php apply_permission_patches.php
 *
 * Injects $this->requirePermission('X') as the FIRST line inside each
 * controller's store() method. Safe to run multiple times (idempotent).
 */

$base = __DIR__ . '/app/Http/Controllers/Api/';

$patches = [
    'NonconformanceController.php' => ['store'  => 'nc.create'],
    'CapaController.php'           => ['store'  => 'capa.create'],
    'AuditController.php'          => ['store'  => 'audit.create'],
    'ComplaintController.php'      => ['store'  => 'complaint.create'],
    'RiskController.php'           => ['store'  => 'risk.create'],
    'VendorController.php'         => ['store'  => 'vendor.create'],
    'ReportController.php'         => [
        'kpiSummary'        => 'report.view',
        'ncTrend'           => 'report.view',
        'capaEffectiveness' => 'report.view',
        'riskHeatMap'       => 'report.view',
        'complaintTrend'    => 'report.view',
        'visitSummary'      => 'report.view',
        'recordsNcs'        => 'report.view',
        'recordsComplaints' => 'report.view',
    ],
];

foreach ($patches as $file => $methods) {
    $path = $base . $file;
    if (!file_exists($path)) {
        echo "  SKIP (not found): $file\n";
        continue;
    }

    $code    = file_get_contents($path);
    $changed = false;

    foreach ($methods as $method => $permission) {
        $guard = "\$this->requirePermission('{$permission}');";

        // Already patched?
        if (str_contains($code, $guard)) {
            echo "  ALREADY PATCHED: {$file}::{$method}()\n";
            continue;
        }

        // Match: public function methodName(... anything ...)\n    {
        $pattern = '/(public function ' . preg_quote($method, '/') . '\s*\([^)]*\)[^{]*\{)/';
        $replace = '$1' . "\n        " . $guard;

        $new = preg_replace($pattern, $replace, $code, 1, $count);
        if ($count === 0) {
            echo "  WARNING: method '{$method}' not found in {$file}\n";
            continue;
        }

        $code    = $new;
        $changed = true;
        echo "  PATCHED: {$file}::{$method}() → requirePermission('{$permission}')\n";
    }

    if ($changed) {
        file_put_contents($path, $code);
    }
}

echo "\nDone. Run: php artisan cache:clear && php artisan test\n";
