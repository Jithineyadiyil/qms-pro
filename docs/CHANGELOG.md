# Changelog — QMS Pro Request Module

## v2.0.0 — May 2026 (QDM Alignment)

### Added
- 14 request sub-types per Appendix A Page 2 (policy, procedure, SLA, form, manual, project, etc.)
- Dynamic form fields per request type — 14 distinct field sets (Appendix A Pages 3–6)
- `risk_level` field (High/Medium/Low) on all requests
- `estimated_completion_days` (ETA) set by QDM Manager on acknowledgement
- New status values: `pending_clarification`, `acknowledged`, `under_review`, `completed`, `cancelled`
- `acknowledge()` action — QDM Manager sets ETA, triggers email notification
- `requestClarification()` + `submitClarification()` — back-and-forth clarification workflow
- `startProgress()` — explicit in_progress transition
- `complete()` — QDM staff marks done; triggers "Confirm Receipt" email to requester
- `confirmReceipt()` — requester confirms delivery; status → closed; calculates cycle_time_hours
- `cancel()` — cancels any non-terminal request
- `RequestEscalationJob` — 8-rule automated escalation with QDM Manager + CEO notifications
- `status_updated_by` + `status_updated_at` on every status change (Appendix A field requirement)
- `cycle_time_hours` auto-calculated from submission to closure
- `delay_reason` required when completion exceeds ETA
- Acknowledgement email (Subject: Request #[ID] – Acknowledged) with ETA per workflow PDF
- Completion email (Subject: Request #[ID] – Completed) with Confirm Receipt button per workflow PDF

### Changed
- Status ENUM expanded from 8 to 12 values
- `StoreRequestForm` validation covers all 14 type-specific dynamic field sections
- `RequestService` split into distinct, documented methods (one per business action)
- Angular `RequestFormComponent` rebuilt with computed signals per sub-type
- All 8 escalation rules from Appendix A Page 7 implemented in `RequestEscalationJob`

### Deployment Steps
1. `php artisan migrate` — runs the new migration
2. Copy `RequestEscalationJob.php` to `app/Jobs/`
3. Add `$schedule->job(new RequestEscalationJob)->everyFiveMinutes()` to Kernel.php
4. Copy new Angular files to `qms-frontend/src/app/features/requests/`
5. `ng build --configuration=production`
