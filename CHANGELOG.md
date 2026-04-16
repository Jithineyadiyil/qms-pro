# Diamond-QMS — Fix Changelog

**Version:** 1.1.0  
**Date:** 2026-04-14  
**Author:** Jithin Varkey (IT Supervisor)

---

## 🔴 Security Fixes (P0)

### `.gitignore` — Protect Secrets from Version Control
- **Root `.gitignore`** — excludes `qms-backend/.env` and all `.env.*` variants
- **`qms-backend/.gitignore`** — excludes `.env`, `/vendor`, `/nbproject`, log files, utility scripts
- **Action required:** Remove existing `.env` from git history:
  ```bash
  git rm --cached qms-backend/.env
  git commit -m "chore: remove .env from tracking"
  ```

### `qms-backend/routes/api.php` — Rate Limiting on Auth Routes
- Login, forgot-password, and reset-password wrapped in `throttle:5,1` middleware
- Limits to 5 attempts per minute per IP — prevents brute-force attacks

---

## 🔴 Stub Component Implementations (P1)

All 15 components were previously 22-line placeholder stubs (`🚧 Under Construction`).
Each is now a fully implemented Angular 18 standalone component.

### `requests/request-detail`
- Full request detail view: title, status, priority, SLA, metadata
- **Comments:** thread view + add comment with internal/external toggle
- **Approval chain:** visual sequential approver steps with status icons
- **Workflow actions:** Submit → Assign → Approve/Reject → Close (role-scoped)

### `requests/request-form`
- Create and edit request forms
- Category selector with SLA hours preview
- Priority, type, due-date fields

### `nc-capa/nc-detail`
- NC header with severity badge and overdue detection
- Root cause investigation form (inline)
- Assign, Start Investigation, Raise CAPA, Close NC actions
- Role-scoped action visibility

### `nc-capa/nc-form`
- Record and edit Non-Conformances
- Source, severity, category, detection date, immediate action fields

### `nc-capa/capa-detail`
- Task list with per-task completion (completion notes inline)
- Progress bar computed from task completion ratio
- Effectiveness review submission
- Close CAPA action

### `nc-capa/capa-form`
- Create and edit CAPAs with linked NC selector (open NCs only)
- Root cause analysis, action plan, effectiveness criteria fields

### `audits/audit-detail`
- Audit team management (add members with role selection)
- Findings list with type colour-coding (Minor NC / Major NC / Observation etc.)
- Add finding form (in-progress audits only)
- Raise CAPA from individual findings
- Issue Report modal with executive summary + overall result
- Notify / Start / Close workflow buttons

### `audits/audit-form`
- Plan new audits with type, program, lead auditor, department
- Planned start/end dates, scope, criteria, description fields

### `complaints/complaint-detail`
- Full activity timeline with status-change tracking
- Acknowledge → Assign → Investigate → Escalate → Resolve → Close workflow
- Escalation modal with escalate-to user selection and reason
- Resolve with customer satisfaction rating (1–5)
- Raise CAPA button
- Withdraw complaint
- Add note/comment

### `complaints/complaint-form`
- Log and edit complaints
- Complainant type, name, email, phone, source fields
- Client linkage dropdown
- Regulatory complaint checkbox

### `documents/document-detail`
- Version history list with current version highlight
- Recent access log (user, action, timestamp)
- Submit for Review → Approve (with comments) → Reject → Mark Obsolete workflow
- Download button

### `documents/document-form`
- Upload new documents with **drag-and-drop file input** (FormData)
- Owner, reviewer, approver, department selectors
- Effective date, review date, controlled document toggle

### `risk/risk-form`
- **Live 5×5 risk score calculator** using Angular `computed()` signals
- Likelihood and Impact button selectors (1–5) with descriptive labels
- Real-time risk level display (Low / Medium / High / Critical) with colour
- Treatment strategy and treatment plan fields

### `vendors/vendor-detail`
- **Tabbed layout:** Overview / Evaluations / Contracts
- Overview: company details, qualification status, contact info
- Evaluations: scored bar chart per dimension (Quality/Delivery/Price/Service/Compliance)
- Add evaluation form with per-dimension 1–10 sliders
- Contracts: list with status badges
- Add contract form
- Qualify and Suspend action buttons

### `visits/visit-detail`
- Participants list with internal/external distinction and attendance tracking
- Add external participant form
- Findings/Action Items with type colour-coding
- Add finding form (in-progress visits only)
- Confirm → Start → Complete (with outcome + minutes) workflow
- **Star rating widget** (1–5) post-completion
- Client info sidebar panel

---

## Deployment Instructions

### Drop-in replacement — copy files to your project:
```
diamond-qms-fixes/
├── .gitignore                                    → project root
├── qms-backend/
│   ├── .gitignore                                → qms-backend/
│   └── routes/api.php                            → qms-backend/routes/
└── qms-frontend/src/app/features/
    ├── requests/{request-detail,request-form}/   → replace existing
    ├── nc-capa/{nc-detail,nc-form,capa-detail,capa-form}/
    ├── audits/{audit-detail,audit-form}/
    ├── complaints/{complaint-detail,complaint-form}/
    ├── documents/{document-detail,document-form}/
    ├── risk/risk-form/
    ├── vendors/vendor-detail/
    └── visits/visit-detail/
```

### After copying:
```bash
# Frontend — verify build
cd qms-frontend && ng build --configuration=production

# Backend — clear config cache
cd qms-backend && php artisan config:clear && php artisan route:clear

# Commit
git add . && git commit -m "fix: implement all stub components + security hardening"
```

---

## Standards Compliance
- Angular 18 standalone components ✅
- Angular signals + computed (no NgRx) ✅
- OnDestroy + takeUntil memory leak prevention ✅
- Role-scoped action visibility ✅
- UiEventService toast pattern (no browser alert/confirm) ✅
- Responsive two-column layout ✅
- CSS variables for theming (dark/light) ✅
