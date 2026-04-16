# Vendor Category Fix — Full

## Step 1 — Copy 3 files

Backend:
  database/seeders/VendorCategorySeeder.php

Frontend:
  src/app/features/vendors/vendor-list/vendor-list.component.ts
  src/app/features/vendors/partnership-list/partnership-list.component.ts

## Step 2 — Seed the categories (run this if not done yet)

```bash
php artisan db:seed --class=VendorCategorySeeder
php artisan route:clear
php artisan cache:clear
```

## Step 3 — Open browser DevTools > Network tab

Open the vendor form (Add Vendor) and look for the request to:
  GET /api/vendors/categories

Check the response tab — if it returns [] then the seeder didn't run.
If it returns a 4xx/5xx, check the Laravel log.
