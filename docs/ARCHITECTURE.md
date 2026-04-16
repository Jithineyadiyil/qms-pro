# QDM Request Management — Architecture v2.0

## Overview

Extends the QMS Pro Request module to fully implement the Diamond Insurance Brokers
Quality & Development Management (QDM) request lifecycle as defined in:
- **Appendix A** — Request Fields, 14 Request Types, Dynamic Fields, Escalation Rules, Document Types
- **QDM Workflow PDF** — Full status state machine with email notifications

---

## Files Changed / Created

### Backend (Laravel)

| File | Action | Purpose |
|---|---|---|
| `database/migrations/2026_05_01_add_qdm_fields_to_requests_table.php` | NEW | Adds 15 new columns + expands status ENUM to 12 values |
| `app/Http/Controllers/Api/RequestController.php` | REPLACE | All new workflow action methods |
| `app/Services/RequestService.php` | REPLACE | Full QDM business logic, ETA, cycle time, email sending |
| `app/Http/Requests/StoreRequestForm.php` | REPLACE | 40+ validation rules for all 14 request sub-types |
| `app/Http/Requests/AcknowledgeRequestForm.php` | NEW | Validates ETA (estimated_completion_days) |
| `app/Jobs/RequestEscalationJob.php` | NEW | 8-rule automated escalation checker (runs every 5 min) |
| `routes/api_request_additions.php` | ADD | 7 new route endpoints |

### Frontend (Angular)

| File | Action | Purpose |
|---|---|---|
| `request.model.ts` | REPLACE | New types: RequestSubType (19 values), RequestStatus (12), full dynamic field interfaces |
| `request-form.component.ts` | REPLACE | Signal-based dynamic form with 14 type-specific sections |
| `request-form.component.html` | REPLACE | Conditional sections per Appendix A (Pages 3-6) |
| `request.service.ts` | REPLACE | All new workflow API calls |

---

## New Status Flow

```
draft → submitted → pending_clarification ─┐
                  ↓                         │ (clarification submitted)
              acknowledged ←───────────────┘
                  ↓ (assign)
              under_review
                  ↓ (start)
              in_progress
                  ↓ (complete — sends email)
              completed
                  ↓ (confirm_receipt — requester clicks)
              closed

Any non-terminal → cancelled
Any active → rejected
```

---

## Escalation Rules (RequestEscalationJob)

| Rule | Trigger | Threshold | Target |
|---|---|---|---|
| 1 | Not acknowledged | 1h from submission | QDM Manager |
| 2 | Not assigned | 1h from acknowledgement | QDM Manager |
| 3 | No activity | 2h from assignment | QDM Manager |
| 4 | Extended inactivity | 4h from assignment | CEO |
| 5 | ETA 75% elapsed | ETA × 0.75 | Assigned Staff |
| 6 | ETA 90% elapsed | ETA × 0.90 | QDM Manager |
| 7 | ETA breached | ETA + 0h | QDM Manager |
| 8 | Extended breach | ETA + 2h | CEO |

Schedule in `app/Console/Kernel.php`:
```php
$schedule->job(new \App\Jobs\RequestEscalationJob)->everyFiveMinutes();
```

---

## New API Endpoints

| Method | Endpoint | Action | Auth |
|---|---|---|---|
| POST | /api/requests/{id}/acknowledge | Set ETA, transition → acknowledged | qa_manager |
| POST | /api/requests/{id}/request-clarification | Ask requester for info | qa_manager |
| POST | /api/requests/{id}/submit-clarification | Requester responds | requester |
| POST | /api/requests/{id}/start-progress | → in_progress | assignee |
| POST | /api/requests/{id}/complete | → completed + send email | assignee |
| POST | /api/requests/{id}/confirm-receipt | → closed, calc cycle_time_hours | requester |
| POST | /api/requests/{id}/cancel | → cancelled | requester/manager |

---

## Request Sub-Types (14, from Appendix A Page 2)

Policy (Update/New) · Procedure (Update/New) · SLA (Update/New) · Form (Update/New) ·
Unregulated Work · Document Review · Quality Review · Issue Analysis · KPI Measurement ·
Manual (Update/New) · New Project · New Development · Quality Note · External Audit Prep · Other

Each sub-type reveals a specific set of dynamic form fields (stored as JSON in `dynamic_fields`).

---

## New DB Columns (requests table)

| Column | Type | Purpose |
|---|---|---|
| `risk_level` | ENUM(low,medium,high) | QDM risk classification |
| `request_sub_type` | VARCHAR(100) | One of 19 sub-type values |
| `dynamic_fields` | JSON | Type-specific question answers |
| `estimated_completion_days` | SMALLINT | ETA set by QDM Manager |
| `eta_set_at` | TIMESTAMP | When ETA was confirmed |
| `acknowledged_at` | TIMESTAMP | When request was acknowledged |
| `clarification_requested_at` | TIMESTAMP | When clarification was asked |
| `clarification_submitted_at` | TIMESTAMP | When requester responded |
| `clarification_notes` | TEXT | Requester's clarification content |
| `completed_at` | TIMESTAMP | When QDM staff marked complete |
| `receipt_confirmed_at` | TIMESTAMP | When requester confirmed receipt |
| `cancelled_at` | TIMESTAMP | When cancelled |
| `cycle_time_hours` | DECIMAL(10,2) | Total handling time (submission→close) |
| `delay_reason` | TEXT | Required when actual > ETA |
| `status_updated_by` | FK → users | Who last changed the status |
| `status_updated_at` | TIMESTAMP | Most recent status change time |
