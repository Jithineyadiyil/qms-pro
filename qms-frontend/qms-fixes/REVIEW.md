# Build Error Fix Report — Diamond-QMS Angular 18
**Date:** 2026-04-01

## Root Causes (3 issues causing all 35 errors)

| # | Root Cause | Files Affected |
|---|---|---|
| 1 | `@angular/material/*` imported but **not in package.json** | `dashboard.module.ts`, `main-layout.component.ts/html` |
| 2 | `@ngrx/store` imported but **not in package.json** | `dashboard.component.ts` |
| 3 | `auth.getUser()` called — method does not exist; `AuthService` exposes `currentUser` **signal** | `main-layout.component.ts` |

## Fixes Applied

### dashboard.component.ts
- ❌ Removed `import { Store } from '@ngrx/store'`
- ✅ Replaced with Angular `signal()` + `computed()` (already the pattern in this project)
- ✅ Added `RouterLink`, `DatePipe`, `NgFor`, `NgIf`, `NgClass` to standalone `imports[]`
- ✅ Component is now `standalone: true` — no NgModule needed

### dashboard.module.ts
- ❌ Removed all `@angular/material/*` imports (MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule)
- ✅ Converted to thin shim that just imports/exports the standalone DashboardComponent

### main-layout.component.ts
- ❌ Removed all `@angular/material/*` imports
- ✅ Fixed `this.auth.getUser()` → `this.auth.currentUser()` (signal accessor)
- ✅ Added `RouterOutlet`, `RouterLink`, `RouterLinkActive`, `NgFor`, `NgIf`, `NgClass` to standalone `imports[]`
- ✅ User menu is now a CSS dropdown with `@HostListener('document:click')` to close on outside click

### main-layout.component.html
- ❌ Removed: `mat-sidenav-container`, `mat-sidenav`, `mat-sidenav-content`, `mat-toolbar`, `mat-nav-list`, `mat-icon`, `mat-menu`, `mat-divider`, `[matMenuTriggerFor]`
- ✅ Replaced with semantic HTML + CSS-only sidebar, toolbar, and dropdown
- ✅ `<router-outlet>` now works (RouterOutlet imported in component)

## Drop-in Instructions
1. Copy `src/` folder contents into your project — overwrite the 4 affected files
2. Run `ng serve` — all 35 errors are resolved
3. No `npm install` needed (no new packages)
