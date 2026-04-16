# Login Fix — Deployment Guide

## Root Causes of "Invalid Email Error"

### Cause 1 — AuthController returned 422 (ValidationException) instead of 401
The old controller used `throw ValidationException::withMessages(['email' => ['Invalid credentials.']])` 
which sends HTTP 422 with a `The given data was invalid.` message — not the actual credential error.
The Angular login component only checked for status 0 and 403, so this fell through as a generic error.

**Fixed:** `AuthController.php` now returns `response()->json(['message' => '...'], 401)` for wrong 
credentials and `403` for disabled accounts. The login component now handles all status codes correctly.

### Cause 2 — Users not seeded in the database
All user accounts (admin@qms.com, etc.) are created by `php artisan db:seed`.
If the seeder hasn't run, no users exist → every login attempt fails.

### Cause 3 — RequestCategorySeeder had old 7 categories
The seeder still had the original 7 categories (IT Support, HR Request, etc.) instead 
of the 10 Diamond-QMS categories. Fixed in the new seeder.

---

## Files to Copy

```
qms-backend/app/Http/Controllers/Api/AuthController.php
qms-backend/database/seeders/RequestCategorySeeder.php
qms-frontend/src/app/features/auth/login/login.component.ts
```

---

## Deploy Steps

### Step 1 — Copy the 3 files above

### Step 2 — Run migrations + seeder
```bash
cd D:\xamp new\htdocs\qms-pro\qms-backend

php artisan migrate
php artisan db:seed
php artisan cache:clear
```

> If the DB already has data and you only want to re-seed categories:
> ```bash
> php artisan db:seed --class=RequestCategorySeeder
> ```

### Step 3 — Restart Angular
```bash
cd D:\xamp new\htdocs\qms-pro\qms-frontend
ng serve --proxy-config proxy.conf.json --port 4200 --open
```

### Step 4 — Login with any of these credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@qms.com | password |
| QA Manager | fatima.h@qms.com | password |
| QA Supervisor | shaden.a@qms.com | password |
| Quality Officer | yusuf.a@qms.com | password |
| Compliance Manager | turki.a@qms.com | password |
| Compliance Officer | j.mani@dbroker.com.sa | 12345678 |
| Dept Manager | omar.f@qms.com | password |
| Employee | mohammed.g@qms.com | password |

---

## Quick Diagnostic

If login still fails, open **DevTools → Network → the /api/auth/login request → Preview tab**:

| Response | Meaning |
|---|---|
| `{"message":"Invalid email or password."}` HTTP 401 | Wrong credentials or user not seeded → run `php artisan db:seed` |
| `{"message":"Account is disabled."}` HTTP 403 | User exists but `is_active = 0` in DB |
| `net::ERR_CONNECTION_REFUSED` | Laravel/XAMPP not running |
| `{"message":"Unauthenticated."}` | Token expired → clear localStorage |
| HTML response (404 page) | Proxy not routing — check proxy.conf.json target |
