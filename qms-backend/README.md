# QMS Pro — Quick Start Guide

## ⚠️ Most Common Login Issue
The Angular frontend proxies API calls to Laravel.
**You MUST start the frontend with `--proxy-config proxy.conf.json`**
or all login/API calls will fail with 404/network errors.

---

## Step 1 — Configure the Database (.env)

Go into `qms-backend/` and create your `.env`:

```
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

Open `.env` and set:
```
DB_DATABASE=qms_db
DB_USERNAME=root
DB_PASSWORD=yourpassword      # ← set your MySQL password
```

---

## Step 2 — Start the Backend

Open **Terminal 1** in `qms-backend/`:

```bash
composer install
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

Backend will run at: **http://localhost:8000**

---

## Step 3 — Start the Frontend

Open **Terminal 2** in `qms-frontend/`:

```bash
npm install
npx ng serve --proxy-config proxy.conf.json
```

> ⚠️ The `--proxy-config proxy.conf.json` flag is REQUIRED.
> Without it, the login button will always say "Invalid email or password".

Frontend will run at: **http://localhost:4200**

---

## Step 4 — Login

Open http://localhost:4200 in your browser.

| Email | Password | Role |
|-------|----------|------|
| admin@qms.com | password | Super Admin |
| fatima.h@qms.com | password | QA Manager |
| yusuf.a@qms.com | password | Auditor |

---

## If Login Still Fails

Run this from `qms-backend/`:
```bash
php fix-login.php
```

This resets all user passwords to `password` and shows all email addresses.

---

## Or Use the Startup Scripts

**Windows:**
- Backend: double-click `qms-backend/setup.bat`
- Frontend: double-click `qms-frontend/start.bat`

**Mac/Linux:**
- Backend: `./qms-backend/setup.sh`
- Frontend: `./qms-frontend/start.sh`
