# Validation Fix — Deployment

## Copy this file

```
app/Http/Requests/StoreRequestForm.php
→ D:\xamp new\htdocs\qms-pro\qms-backend\app\Http\Requests\StoreRequestForm.php
```

## Then clear cache

```bash
php artisan cache:clear
php artisan config:clear
```

## What was fixed

### Bug 1 — `risk_level` rejected 'critical'
Old: `'risk_level' => 'required|in:low,medium,high'`
New: `'risk_level' => 'required|in:low,medium,high,critical'`

The form offered 'critical' as an option but the server rejected it.

### Bug 2 — `required_if` fired even when field was absent (draft saves)
Old: `'dynamic_fields.policy_name' => 'required_if:request_sub_type,new_policy|...'`
New: `'dynamic_fields.policy_name' => 'sometimes|required_if:request_sub_type,new_policy|...'`

`required_if` without `sometimes` means: "this field is required when condition is met,
REGARDLESS of whether the key is present in the request body."

`sometimes|required_if` means: "only validate this field IF it appears in the request.
If dynamic_fields:{} is sent (draft save), skip validation entirely."

This allows:
- Draft save → `dynamic_fields: {}` → all dynamic rules skipped ✓
- Full submit with policy sub-type → `dynamic_fields.policy_name` present and non-empty ✓
- Full submit with policy sub-type → `dynamic_fields.policy_name` missing → FAILS (correct) ✓
