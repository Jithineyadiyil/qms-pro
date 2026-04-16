import { Component, OnDestroy, OnInit, signal, Pipe, PipeTransform } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../core/services/audit.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Pipe({ name: 'checkedCount', standalone: true })
export class CheckedCountPipe implements PipeTransform {
  transform(items: any[]): number {
    return (items || []).filter((i: any) => i.response && i.response !== 'not_checked').length;
  }
}

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckedCountPipe],
  template: `
<div class="stats-row">
  @for (s of stats(); track s.label) {
    <div class="stat-card">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" [placeholder]="lang.t('Search audits…')">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="planned">Planned</option>
      <option value="notified">Notified</option>
      <option value="in_progress">In Progress</option>
      <option value="draft_report">Draft Report</option>
      <option value="report_issued">Report Issued</option>
      <option value="closed">Closed</option>
      <option value="cancelled">Cancelled</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">{{ lang.t('All Types') }}</option>
      <option value="internal">Internal</option>
      <option value="external">External</option>
      <option value="surveillance">Surveillance</option>
      <option value="certification">Certification</option>
      <option value="supplier">Supplier</option>
      <option value="process">Process</option>
      <option value="system">System</option>
      <option value="compliance">Compliance</option>
    </select>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openSchedule()">
    <i class="fas fa-plus"></i> Schedule Audit
  </button>
</div>

@if (loading()) {
  <div class="card"><div style="display:flex;flex-direction:column;gap:12px;padding:16px">
    @for (i of [1,2,3]; track i) { <div class="skeleton-row" style="height:72px;border-radius:10px"></div> }
  </div></div>
} @else if (items().length === 0) {
  <div class="card"><div class="empty-row">No audits found. <a style="cursor:pointer;color:var(--accent)" (click)="openSchedule()">Schedule one</a></div></div>
} @else {
  <div style="display:flex;flex-direction:column;gap:12px">
    @for (a of items(); track a.id) {
      <div class="card audit-card" (click)="openDetail(a)">
        <div class="card-body" style="display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center">
          <div class="audit-icon" [class]="typeIconClass(a.type)">
            <i class="fas fa-clipboard-check"></i>
          </div>
          <div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
              <span class="mono-ref">{{ a.reference_no }}</span>
              <span class="badge" [class]="typeClass(a.type)">{{ fmt(a.type) }}</span>
              <span class="badge" [class]="statusClass(a.status)">{{ fmt(a.status) }}</span>
              @if (a.open_findings_count > 0) {
                <span class="badge badge-red">{{ a.open_findings_count }} open findings</span>
              }
            </div>
            <div style="font-size:15px;font-weight:600;color:var(--text1);margin-bottom:3px">{{ a.title }}</div>
            <div style="font-size:12px;color:var(--text3);display:flex;gap:14px;flex-wrap:wrap">
              @if (a.department) { <span><i class="fas fa-building"></i> {{ a.department.name }}</span> }
              <span><i class="fas fa-calendar-alt"></i> {{ a.planned_start_date | date:'dd MMM yyyy' }} – {{ a.planned_end_date | date:'dd MMM yyyy' }}</span>
              @if (a.lead_auditor) { <span><i class="fas fa-user-tie"></i> {{ a.lead_auditor.name }}</span> }
            </div>
          </div>
          <i class="fas fa-chevron-right" style="color:var(--text3);font-size:12px"></i>
        </div>
      </div>
    }
  </div>
  <div class="pagination">
    <span class="page-info">{{ total() }} total audits</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
    <span style="font-size:12px">{{ page() }} / {{ totalPages() }}</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
  </div>
}

@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-clipboard-list" style="color:var(--accent)"></i> Schedule Audit</div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-row-2">
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Audit Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="e.g. ISO 9001:2015 Internal Audit Q1 2025">
          </div>
          <div class="form-group">
            <label class="form-label">Audit Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="internal">Internal</option><option value="external">External</option>
              <option value="surveillance">Surveillance</option><option value="certification">Certification</option>
              <option value="supplier">Supplier</option><option value="process">Process</option>
              <option value="system">System</option><option value="compliance">Compliance</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <select class="form-control" [(ngModel)]="form.department_id">
              <option value="">— All Departments —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Planned Start Date *</label>
            <input type="date" class="form-control" [(ngModel)]="form.planned_start_date">
          </div>
          <div class="form-group">
            <label class="form-label">Planned End Date *</label>
            <input type="date" class="form-control" [(ngModel)]="form.planned_end_date">
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Scope</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.scope" placeholder="What is the scope of this audit?"></textarea>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Audit Criteria / Standards</label>
            <input class="form-control" [(ngModel)]="form.criteria" placeholder="e.g. ISO 9001:2015 Clauses 4-10">
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Audit Program</label>
            <select class="form-control" [(ngModel)]="form.program_id">
              <option value="">— No Program —</option>
              @for (p of programs(); track p.id) { <option [value]="p.id">{{ p.name }} ({{ p.year }})</option> }
            </select>
          </div>
        </div>
        @if (formError()) { <div class="alert-error" style="margin-top:8px">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-calendar-check"></i> {{ saving() ? 'Scheduling...' : 'Schedule Audit' }}
        </button>
      </div>
    </div>
  </div>
}

@if (detailAudit()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header">
        <div>
          <div class="modal-title">
            <i class="fas fa-clipboard-check" style="color:var(--accent)"></i> {{ detailAudit()!.title }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            {{ detailAudit()!.reference_no }} · {{ fmt(detailAudit()!.type) }}
            @if (detailAudit()!.department) { · {{ detailAudit()!.department.name }} }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="statusClass(detailAudit()!.status)">{{ fmt(detailAudit()!.status) }}</span>
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <div class="tab-bar">
        @for (t of tabs; track t.key) {
          <button class="tab-btn" [class.active]="activeTab===t.key" (click)="activeTab=t.key">
            <i [class]="t.icon"></i> {{ t.label }}
          </button>
        }
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        @if (activeTab === 'overview') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
              <div class="detail-section">
                <div class="detail-section-title">Audit Information</div>
                <div class="detail-row"><span>Reference</span><span class="mono-ref">{{ detailAudit()!.reference_no }}</span></div>
                <div class="detail-row"><span>Type</span><span>{{ fmt(detailAudit()!.type) }}</span></div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detailAudit()!.status)">{{ fmt(detailAudit()!.status) }}</span></span></div>
                <div class="detail-row"><span>Department</span><span>{{ detailAudit()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Lead Auditor</span><span>{{ detailAudit()!.lead_auditor?.name || '—' }}</span></div>
                <div class="detail-row"><span>Planned Start</span><span>{{ detailAudit()!.planned_start_date | date:'dd MMM yyyy' }}</span></div>
                <div class="detail-row"><span>Planned End</span><span>{{ detailAudit()!.planned_end_date | date:'dd MMM yyyy' }}</span></div>
                <div class="detail-row"><span>Actual Start</span><span>{{ detailAudit()!.actual_start_date ? (detailAudit()!.actual_start_date | date:'dd MMM yyyy') : '—' }}</span></div>
                <div class="detail-row"><span>Actual End</span><span>{{ detailAudit()!.actual_end_date ? (detailAudit()!.actual_end_date | date:'dd MMM yyyy') : '—' }}</span></div>
                <div class="detail-row"><span>Report Date</span><span>{{ detailAudit()!.report_date ? (detailAudit()!.report_date | date:'dd MMM yyyy') : '—' }}</span></div>
                @if (detailAudit()!.overall_result) {
                  <div class="detail-row"><span>Overall Result</span><span><span class="badge" [class]="resultClass(detailAudit()!.overall_result)">{{ fmt(detailAudit()!.overall_result) }}</span></span></div>
                }
              </div>
              @if (detailAudit()!.scope) {
                <div class="detail-section" style="margin-top:14px">
                  <div class="detail-section-title">Scope</div>
                  <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6">{{ detailAudit()!.scope }}</p>
                </div>
              }
              @if (detailAudit()!.criteria) {
                <div class="detail-section" style="margin-top:14px">
                  <div class="detail-section-title">Criteria / Standards</div>
                  <p style="font-size:13px;color:var(--text2);margin:0">{{ detailAudit()!.criteria }}</p>
                </div>
              }
            </div>
            <div>
              @if (detailAudit()!.executive_summary) {
                <div class="detail-section" style="margin-bottom:14px">
                  <div class="detail-section-title">Executive Summary</div>
                  <pre style="font-size:13px;color:var(--text2);white-space:pre-wrap;font-family:inherit;margin:0;line-height:1.6">{{ detailAudit()!.executive_summary }}</pre>
                </div>
              }
              @if (detailAudit()!.status === 'in_progress' || detailAudit()!.status === 'draft_report') {
                <div class="detail-section">
                  <div class="detail-section-title">Issue Audit Report</div>
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px">Overall Result</label>
                    <select class="form-control" [(ngModel)]="reportForm.overall_result">
                      <option value="satisfactory">Satisfactory</option>
                      <option value="minor_findings">Minor Findings</option>
                      <option value="major_findings">Major Findings</option>
                      <option value="critical_findings">Critical Findings</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-size:11px">Executive Summary</label>
                    <textarea class="form-control" rows="4" [(ngModel)]="reportForm.executive_summary" placeholder="Summarise audit findings and conclusions…"></textarea>
                  </div>
                  <button class="btn btn-primary btn-sm" (click)="doIssueReport()">
                    <i class="fas fa-paper-plane"></i> Issue Report
                  </button>
                </div>
              }
            </div>
          </div>
        }

        @if (activeTab === 'team') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="detail-section">
              <div class="detail-section-title">Audit Team ({{ detailAudit()!.team?.length || 0 }} members)</div>
              @if (detailAudit()!.team?.length) {
                @for (m of detailAudit()!.team; track m.id) {
                  <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light)">
                    <div class="avatar-sm">{{ (m.name || '?').charAt(0) }}</div>
                    <div style="flex:1">
                      <div style="font-size:13px;font-weight:600">{{ m.name }}</div>
                      <div style="font-size:11px;color:var(--text3)">{{ m.pivot?.role ? fmt(m.pivot.role) : 'Auditor' }}</div>
                    </div>
                    <button class="btn btn-secondary btn-xs" (click)="removeMember(m)"><i class="fas fa-times"></i></button>
                  </div>
                }
              } @else {
                <div style="font-size:13px;color:var(--text3);padding:8px 0">No team members added yet.</div>
              }
            </div>
            <div class="detail-section">
              <div class="detail-section-title">Add Team Member</div>
              <div class="form-group">
                <label class="form-label" style="font-size:11px">Select User</label>
                <select class="form-control" [(ngModel)]="newMember.user_id">
                  <option value="">— Select user —</option>
                  @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:11px">Role</label>
                <select class="form-control" [(ngModel)]="newMember.role">
                  <option value="auditor">Auditor</option>
                  <option value="lead_auditor">Lead Auditor</option>
                  <option value="observer">Observer</option>
                  <option value="technical_expert">Technical Expert</option>
                </select>
              </div>
              <button class="btn btn-primary btn-sm" (click)="addMember()" [disabled]="!newMember.user_id">
                <i class="fas fa-user-plus"></i> Add Member
              </button>
            </div>
          </div>
        }

        @if (activeTab === 'checklist') {
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-size:13px;color:var(--text2)">
              {{ checklistItems().length }} items · {{ checklistItems() | checkedCount }} answered
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" (click)="showAddChecklist=!showAddChecklist"><i class="fas fa-plus"></i> Add Item</button>
              <button class="btn btn-secondary btn-sm" (click)="loadDefaultChecklist()"><i class="fas fa-magic"></i> ISO 9001 Template</button>
            </div>
          </div>
          @if (showAddChecklist) {
            <div class="detail-section" style="margin-bottom:16px">
              <div class="detail-section-title">Add Checklist Item</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <input class="form-control" [(ngModel)]="newCheckItem.section" placeholder="Section (e.g. Clause 4)">
                <input class="form-control" [(ngModel)]="newCheckItem.requirement_ref" placeholder="Ref (e.g. ISO 9001:4.1)">
                <textarea class="form-control" style="grid-column:span 2" [(ngModel)]="newCheckItem.question" rows="2" placeholder="Checklist question *"></textarea>
                <button class="btn btn-primary btn-sm" (click)="addChecklistItem()">Add</button>
              </div>
            </div>
          }
          @if (checklistItems().length === 0) {
            <div class="empty-row">No checklist items. Load the ISO 9001 template or add items manually.</div>
          }
          @for (section of checklistSections(); track section) {
            <div style="margin-bottom:20px">
              @if (section) {
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:8px;padding:6px 10px;background:var(--surface-2,#f7f7fc);border-radius:6px">{{ section }}</div>
              }
              @for (item of checklistBySection(section); track item.id) {
                <div class="checklist-item" [class]="responseClass(item.response)">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:500;margin-bottom:2px">{{ item.question }}</div>
                    @if (item.requirement_ref) { <div style="font-size:11px;color:var(--text3)">Ref: {{ item.requirement_ref }}</div> }
                  </div>
                  <div style="display:flex;gap:4px;flex-shrink:0">
                    @for (r of responses; track r.value) {
                      <button class="resp-btn" [class.selected]="item.response===r.value" [style.--rc]="r.color" (click)="setResponse(item, r.value)" [title]="r.label">{{ r.label }}</button>
                    }
                  </div>
                  <div style="width:100%;display:flex;gap:8px;margin-top:6px">
                    <input class="form-control" style="flex:1;font-size:12px" [(ngModel)]="item._evidenceDraft" (blur)="saveEvidence(item)" placeholder="Evidence / observations / notes…">
                    <select class="form-control" style="width:155px;font-size:12px" [(ngModel)]="item._findingDraft" (change)="saveFindingType(item)">
                      <option value="">No finding</option>
                      <option value="conformity">Conformity</option>
                      <option value="minor_nc">Minor NC</option>
                      <option value="major_nc">Major NC</option>
                      <option value="observation">Observation</option>
                      <option value="opportunity">Opportunity</option>
                    </select>
                  </div>
                </div>
              }
            </div>
          }
        }

        @if (activeTab === 'report') {
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div>
              @if (detailAudit()!.overall_result) {
                <span class="badge" style="font-size:13px;padding:6px 14px" [class]="resultClass(detailAudit()!.overall_result)">
                  Overall Result: {{ fmt(detailAudit()!.overall_result) }}
                </span>
              } @else {
                <span style="font-size:13px;color:var(--text3)">Report not yet issued</span>
              }
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" (click)="previewReport()">
                <i class="fas fa-eye"></i> Preview Report
              </button>
              <button class="btn btn-primary btn-sm" (click)="downloadReport()">
                <i class="fas fa-file-pdf" style="color:#ef4444"></i> Download PDF
              </button>
            </div>
          </div>

          <!-- Report Preview Card -->
          <div class="detail-section" style="margin-bottom:14px">
            <div class="detail-section-title">Audit Summary</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div class="detail-row"><span>Reference No</span><span class="mono-ref">{{ detailAudit()!.reference_no }}</span></div>
              <div class="detail-row"><span>Audit Type</span><span>{{ fmt(detailAudit()!.type) }}</span></div>
              <div class="detail-row"><span>Department</span><span>{{ detailAudit()!.department?.name || '—' }}</span></div>
              <div class="detail-row"><span>Lead Auditor</span><span>{{ detailAudit()!.lead_auditor?.name || '—' }}</span></div>
              <div class="detail-row"><span>Planned Period</span><span>{{ detailAudit()!.planned_start_date | date:'dd MMM yyyy' }} – {{ detailAudit()!.planned_end_date | date:'dd MMM yyyy' }}</span></div>
              <div class="detail-row"><span>Report Date</span><span>{{ detailAudit()!.report_date ? (detailAudit()!.report_date | date:'dd MMM yyyy') : '—' }}</span></div>
              <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detailAudit()!.status)">{{ fmt(detailAudit()!.status) }}</span></span></div>
              @if (detailAudit()!.overall_result) {
                <div class="detail-row"><span>Overall Result</span><span><span class="badge" [class]="resultClass(detailAudit()!.overall_result)">{{ fmt(detailAudit()!.overall_result) }}</span></span></div>
              }
            </div>
          </div>

          @if (detailAudit()!.scope) {
            <div class="detail-section" style="margin-bottom:14px">
              <div class="detail-section-title">Scope</div>
              <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6">{{ detailAudit()!.scope }}</p>
            </div>
          }

          @if (detailAudit()!.criteria) {
            <div class="detail-section" style="margin-bottom:14px">
              <div class="detail-section-title">Audit Criteria / Standards</div>
              <p style="font-size:13px;color:var(--text2);margin:0">{{ detailAudit()!.criteria }}</p>
            </div>
          }

          @if (detailAudit()!.executive_summary) {
            <div class="detail-section" style="margin-bottom:14px">
              <div class="detail-section-title">Executive Summary</div>
              <pre style="font-size:13px;color:var(--text2);white-space:pre-wrap;font-family:inherit;margin:0;line-height:1.6">{{ detailAudit()!.executive_summary }}</pre>
            </div>
          }

          <!-- Findings Summary -->
          @if (detailAudit()!.findings?.length) {
            <div class="detail-section" style="margin-bottom:14px">
              <div class="detail-section-title">Findings Summary ({{ detailAudit()!.findings.length }} total)</div>
              <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                @for (fc of findingCounts(); track fc.type) {
                  <span class="badge" [class]="findingClass(fc.type)">{{ fmt(fc.type) }}: {{ fc.count }}</span>
                }
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                @for (f of detailAudit()!.findings; track f.id) {
                  <div style="padding:10px;border:1px solid var(--border);border-left:3px solid var(--border);border-radius:6px" [class]="findingBorderClass(f.finding_type)">
                    <div style="display:flex;gap:6px;margin-bottom:4px">
                      <span class="mono-ref">{{ f.reference_no }}</span>
                      <span class="badge" [class]="findingClass(f.finding_type)">{{ fmt(f.finding_type) }}</span>
                      <span class="badge" [class]="findingStatusClass(f.status)">{{ fmt(f.status) }}</span>
                    </div>
                    <div style="font-size:13px">{{ f.description }}</div>
                    @if (f.requirement_ref) { <div style="font-size:12px;color:var(--text3)">Ref: {{ f.requirement_ref }}</div> }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Checklist Summary -->
          @if (checklistItems().length) {
            <div class="detail-section">
              <div class="detail-section-title">Checklist Summary ({{ checklistItems().length }} items)</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="badge badge-green">Yes: {{ checklistCount('yes') }}</span>
                <span class="badge badge-red">No: {{ checklistCount('no') }}</span>
                <span class="badge badge-yellow">Partial: {{ checklistCount('partial') }}</span>
                <span class="badge badge-draft">N/A: {{ checklistCount('na') }}</span>
                <span class="badge badge-draft">Pending: {{ checklistCount('not_checked') + checklistCount('') }}</span>
              </div>
            </div>
          }
        }

                @if (activeTab === 'findings') {
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              @for (fc of findingCounts(); track fc.type) {
                <span class="badge" [class]="findingClass(fc.type)">{{ fmt(fc.type) }}: {{ fc.count }}</span>
              }
              @if (!detailAudit()!.findings?.length) { <span style="font-size:13px;color:var(--text3)">No findings recorded</span> }
            </div>
            <button class="btn btn-primary btn-sm" (click)="showAddFinding=!showAddFinding"><i class="fas fa-plus"></i> Add Finding</button>
          </div>
          @if (showAddFinding) {
            <div class="detail-section" style="margin-bottom:16px">
              <div class="detail-section-title">Record Finding</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <select class="form-control" [(ngModel)]="newFinding.finding_type">
                  <option value="minor_nc">Minor NC</option><option value="major_nc">Major NC</option>
                  <option value="observation">Observation</option><option value="opportunity">Opportunity</option>
                  <option value="positive">Positive Finding</option>
                </select>
                <input class="form-control" [(ngModel)]="newFinding.requirement_ref" placeholder="Requirement reference">
                <textarea class="form-control" style="grid-column:span 2" [(ngModel)]="newFinding.description" rows="2" placeholder="Finding description *"></textarea>
                <textarea class="form-control" [(ngModel)]="newFinding.evidence" rows="2" placeholder="Evidence observed…"></textarea>
                <select class="form-control" [(ngModel)]="newFinding.assignee_id">
                  <option value="">— Assign to —</option>
                  @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
              </div>
              <div style="margin-top:8px">
                <button class="btn btn-primary btn-sm" (click)="submitFinding()">Add Finding</button>
                <button class="btn btn-secondary btn-sm" style="margin-left:8px" (click)="showAddFinding=false">Cancel</button>
              </div>
            </div>
          }
          @if (detailAudit()!.findings?.length) {
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (f of detailAudit()!.findings; track f.id) {
                <div class="finding-card" [class]="findingBorderClass(f.finding_type)">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;flex-wrap:wrap;gap:6px">
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <span class="mono-ref">{{ f.reference_no }}</span>
                      <span class="badge" [class]="findingClass(f.finding_type)">{{ fmt(f.finding_type) }}</span>
                      <span class="badge" [class]="findingStatusClass(f.status)">{{ fmt(f.status) }}</span>
                    </div>
                    <div style="display:flex;gap:6px">
                      @if (f.status === 'open' && (f.finding_type === 'minor_nc' || f.finding_type === 'major_nc')) {
                        <button class="btn btn-sm" style="background:var(--accent);color:#fff;font-size:11px" (click)="doRaiseCapa(f)"><i class="fas fa-wrench"></i> Raise CAPA</button>
                      }
                      @if (f.status !== 'closed') {
                        <button class="btn btn-secondary btn-xs" (click)="closeFinding(f)">Close</button>
                      }
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text1);margin-bottom:4px">{{ f.description }}</div>
                  @if (f.evidence) { <div style="font-size:12px;color:var(--text2)"><b>Evidence:</b> {{ f.evidence }}</div> }
                  @if (f.requirement_ref) { <div style="font-size:12px;color:var(--text3)">Ref: {{ f.requirement_ref }}</div> }
                  @if (f.assignee) { <div style="font-size:12px;color:var(--text3);margin-top:4px"><i class="fas fa-user"></i> {{ f.assignee.name }}</div> }
                  @if (f.capa_id) { <div style="font-size:12px;color:var(--accent);margin-top:4px"><i class="fas fa-link"></i> CAPA raised</div> }
                </div>
              }
            </div>
          } @else if (!showAddFinding) {
            <div class="empty-row">No findings recorded yet.</div>
          }
        }

      </div>

      <div class="modal-footer" style="justify-content:space-between;border-top:1px solid var(--border)">
        <div style="display:flex;gap:8px">
          @if (detailAudit()!.status === 'planned') {
            <button class="btn btn-secondary btn-sm" (click)="doNotify()"><i class="fas fa-bell"></i> Notify</button>
            <button class="btn btn-primary btn-sm" (click)="doStart()"><i class="fas fa-play"></i> Start Audit</button>
          }
          @if (detailAudit()!.status === 'notified') {
            <button class="btn btn-primary btn-sm" (click)="doStart()"><i class="fas fa-play"></i> Start Audit</button>
          }
          @if (detailAudit()!.status === 'report_issued') {
            <button class="btn btn-success btn-sm" (click)="doClose()"><i class="fas fa-lock"></i> Close Audit</button>
          }
        </div>
        <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
      </div>
    </div>
  </div>
}
@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    .stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:110px;text-align:center}
    .stat-num{font-family:'Inter',sans-serif;font-size:26px;font-weight:800}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .audit-card{cursor:pointer;transition:box-shadow .2s}
    .audit-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.1)}
    .audit-icon{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;font-size:18px;flex-shrink:0}
    .icon-internal{background:rgba(79,70,229,.12);color:#4f46e5}
    .icon-external{background:rgba(245,158,11,.12);color:#d97706}
    .icon-supplier{background:rgba(16,185,129,.12);color:#059669}
    .icon-certification{background:rgba(139,92,246,.12);color:#7c3aed}
    .icon-surveillance{background:rgba(14,165,233,.12);color:#0284c7}
    .icon-compliance{background:rgba(239,68,68,.12);color:#dc2626}
    .icon-default{background:rgba(107,114,128,.12);color:#6b7280}
    .mono-ref{font-family:monospace;font-size:11px;color:var(--text3)}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 0}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:48px}
    .form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    .modal-lg{max-width:700px}
    .modal-xl{max-width:960px;width:95vw}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface);flex-shrink:0}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s;white-space:nowrap}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-light,rgba(0,0,0,.04));font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .avatar-sm{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
    .checklist-item{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-left:3px solid var(--border);border-radius:8px;margin-bottom:6px;transition:background .15s}
    .resp-yes{border-left-color:#10b981;background:rgba(16,185,129,.03)}
    .resp-no{border-left-color:#ef4444;background:rgba(239,68,68,.03)}
    .resp-partial{border-left-color:#f59e0b;background:rgba(245,158,11,.03)}
    .resp-na{border-left-color:#9ca3af;background:rgba(156,163,175,.03)}
    .resp-btn{padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:var(--surface);font-size:11px;cursor:pointer;transition:all .15s;white-space:nowrap}
    .resp-btn.selected{background:var(--rc,#4f46e5);color:#fff;border-color:var(--rc,#4f46e5)}
    .finding-card{padding:12px;border:1px solid var(--border);border-left:4px solid var(--border);border-radius:8px}
    .border-minor{border-left-color:#f59e0b}
    .border-major{border-left-color:#ef4444}
    .border-obs{border-left-color:#4f46e5}
    .border-opp{border-left-color:#10b981}
    .border-pos{border-left-color:#8b5cf6}
    .btn-success{background:var(--success,#10b981);color:#fff}
  `]
})
export class AuditListComponent implements OnInit, OnDestroy {
  items       = signal<any[]>([]);
  loading     = signal(true);
  total       = signal(0);
  page        = signal(1);
  totalPages  = signal(1);
  stats       = signal<any[]>([]);
  detailAudit = signal<any>(null);
  toast = signal<{msg:string,type:string}|null>(null);
  programs    = signal<any[]>([]);
  users       = signal<any[]>([]);
  departments = signal<any[]>([]);
  checklistItems = signal<any[]>([]);

  filterStatus = ''; filterType = ''; search = '';
  showForm = false; saving = signal(false); formError = signal('');
  activeTab = 'overview';
  showAddChecklist = false; showAddFinding = false;

  form:         any = { title:'', type:'internal', planned_start_date:'', planned_end_date:'', scope:'', criteria:'', department_id:'', program_id:'' };
  reportForm:   any = { overall_result:'satisfactory', executive_summary:'' };
  newMember:    any = { user_id:'', role:'auditor' };
  newCheckItem: any = { section:'', question:'', requirement_ref:'' };
  newFinding:   any = { finding_type:'minor_nc', description:'', requirement_ref:'', evidence:'', assignee_id:'' };

  tabs = [
    { key:'overview',  label:'Overview',   icon:'fas fa-info-circle' },
    { key:'team',      label:'Audit Team', icon:'fas fa-users' },
    { key:'checklist', label:'Checklist',  icon:'fas fa-tasks' },
    { key:'findings',  label:'Findings',   icon:'fas fa-flag' },
    { key:'report',    label:'Report',     icon:'fas fa-file-alt' },
  ];

  responses = [
    { value:'yes',         label:'Yes',     color:'#10b981' },
    { value:'no',          label:'No',      color:'#ef4444' },
    { value:'partial',     label:'Partial', color:'#f59e0b' },
    { value:'na',          label:'N/A',     color:'#9ca3af' },
    { value:'not_checked', label:'—',       color:'#d1d5db' },
  ];

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private svc: AuditService, private uiEvents: UiEventService, public lang: LanguageService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openSchedule());
    this.load(); this.loadStats(); this.loadPrograms(); this.loadUsers(); this.loadDepartments();
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.filterType)   p.type   = this.filterType;
    if (this.search)       p.search = this.search;
    this.svc.list(p).subscribe({
      next: (r: any) => { this.items.set(r.data||[]); this.total.set(r.total||0); this.totalPages.set(r.last_page||1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }

  loadStats() {
    this.svc.stats().subscribe({ next: (r: any) => {
      const bs: any[] = r.by_status || [];
      const get = (s: string) => Number(bs.find((x:any) => x.status===s)?.total || 0);
      const total = bs.reduce((sum:number,x:any) => sum+Number(x.total||0), 0);
      this.stats.set([
        { label:'Total',        value:total,              color:'var(--text1)' },
        { label:'Planned',      value:get('planned'),     color:'var(--accent)' },
        { label:'In Progress',  value:get('in_progress'), color:'#f59e0b' },
        { label:'Report Issued',value:get('report_issued'),color:'#8b5cf6' },
        { label:'Closed',       value:get('closed'),      color:'#10b981' },
      ]);
    }});
  }

  loadPrograms()    { this.svc.programs().subscribe({    next: (r:any) => this.programs.set(r||[]) }); }
  loadUsers()       { this.svc.users().subscribe({       next: (r:any) => this.users.set(r||[]) }); }
  loadDepartments() { this.svc.departments().subscribe({ next: (r:any) => this.departments.set(r||[]) }); }

  openSchedule() {
    this.form = { title:'', type:'internal', planned_start_date:'', planned_end_date:'', scope:'', criteria:'', department_id:'', program_id:'' };
    this.formError.set(''); this.showForm = true;
  }

  submit() {
    if (!this.form.title)              { this.formError.set('Audit title is required.'); return; }
    if (!this.form.planned_start_date) { this.formError.set('Start date is required.'); return; }
    if (!this.form.planned_end_date)   { this.formError.set('End date is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.department_id) delete payload.department_id;
    if (!payload.program_id)    delete payload.program_id;
    this.svc.create(payload).subscribe({
      next: () => { this.saving.set(false); this.showForm=false; this.load(); this.loadStats(); },
      error: (e:any) => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors||{}).flat()[0] as string || 'Failed.'); }
    });
  }

  openDetail(a: any) {
    this.svc.get(a.id).subscribe({ next: (r:any) => {
      this.detailAudit.set(r);
      this.activeTab = 'overview';
      this.showAddChecklist = false; this.showAddFinding = false;
      this.reportForm = { overall_result: r.overall_result||'satisfactory', executive_summary: r.executive_summary||'' };
      this.checklistItems.set((r.checklists||[]).map((c:any) => ({ ...c, _evidenceDraft:c.evidence||'', _findingDraft:c.finding_type||'' })));
    }});
  }

  closeDetail() { this.detailAudit.set(null); }

  reloadDetail() {
    const id = this.detailAudit()?.id;
    if (id) this.svc.get(id).subscribe({ next: (r:any) => {
      this.detailAudit.set(r);
      this.checklistItems.set((r.checklists||[]).map((c:any) => ({ ...c, _evidenceDraft:c.evidence||'', _findingDraft:c.finding_type||'' })));
    }});
  }

  doNotify()      { this.svc.notify(this.detailAudit()!.id).subscribe({     next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') }); }
  doStart()       { this.svc.start(this.detailAudit()!.id).subscribe({      next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') }); }
  doIssueReport() { this.svc.issueReport(this.detailAudit()!.id, this.reportForm).subscribe({ next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') }); }
  doClose()       {  this.svc.close(this.detailAudit()!.id).subscribe({ next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') }); }

  addMember() {
    const v = this.detailAudit(); if(!v||!this.newMember.user_id) return;
    this.svc.addTeamMember(v.id, this.newMember).subscribe({ next: () => { this.newMember={user_id:'',role:'auditor'}; this.reloadDetail(); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') });
  }

  removeMember(m: any) {
    const v = this.detailAudit(); if(!v) return;
    this.svc.removeTeamMember(v.id, m.id).subscribe({ next: () => this.reloadDetail() });
  }

  checklistSections(): string[] {
    return [...new Set(this.checklistItems().map((c:any) => c.section||''))];
  }

  checklistBySection(section: string): any[] {
    return this.checklistItems().filter((c:any) => (c.section||'') === section);
  }

  setResponse(item: any, val: string) {
    item.response = val;
    this.svc.updateChecklistItem(this.detailAudit().id, item.id, { response: val }).subscribe({ next: (r:any) => item.response = r.response });
  }

  saveEvidence(item: any) {
    if (item._evidenceDraft === item.evidence) return;
    this.svc.updateChecklistItem(this.detailAudit().id, item.id, { evidence: item._evidenceDraft }).subscribe({ next: (r:any) => item.evidence = r.evidence });
  }

  saveFindingType(item: any) {
    this.svc.updateChecklistItem(this.detailAudit().id, item.id, { finding_type: item._findingDraft||null }).subscribe({ next: (r:any) => item.finding_type = r.finding_type });
  }

  addChecklistItem() {
    const v = this.detailAudit(); if(!v||!this.newCheckItem.question.trim()) return;
    this.svc.addChecklist(v.id, { items:[{...this.newCheckItem}] }).subscribe({ next:(r:any) => {
      const arr = Array.isArray(r) ? r : [r];
      this.checklistItems.update(ci => [...ci, ...arr.map((c:any) => ({...c,_evidenceDraft:c.evidence||'',_findingDraft:c.finding_type||''}))]);
      this.newCheckItem={section:'',question:'',requirement_ref:''}; this.showAddChecklist=false;
    }});
  }

  loadDefaultChecklist() {
    const v = this.detailAudit(); if(!v) return;
    const items = [
      {section:'Clause 4 — Context',question:'Has the organisation determined external and internal issues relevant to its purpose?',requirement_ref:'ISO 9001:2015 4.1',sequence:1},
      {section:'Clause 4 — Context',question:'Are the needs and expectations of interested parties identified and monitored?',requirement_ref:'ISO 9001:2015 4.2',sequence:2},
      {section:'Clause 4 — Context',question:'Is the scope of the QMS defined and documented?',requirement_ref:'ISO 9001:2015 4.3',sequence:3},
      {section:'Clause 5 — Leadership',question:'Does top management demonstrate commitment to the QMS?',requirement_ref:'ISO 9001:2015 5.1',sequence:4},
      {section:'Clause 5 — Leadership',question:'Is there an established quality policy and is it communicated?',requirement_ref:'ISO 9001:2015 5.2',sequence:5},
      {section:'Clause 6 — Planning',question:'Are risks and opportunities identified and addressed?',requirement_ref:'ISO 9001:2015 6.1',sequence:6},
      {section:'Clause 6 — Planning',question:'Are quality objectives established with plans to achieve them?',requirement_ref:'ISO 9001:2015 6.2',sequence:7},
      {section:'Clause 7 — Support',question:'Are necessary resources provided and maintained?',requirement_ref:'ISO 9001:2015 7.1',sequence:8},
      {section:'Clause 7 — Support',question:'Is staff competence determined and documented?',requirement_ref:'ISO 9001:2015 7.2',sequence:9},
      {section:'Clause 7 — Support',question:'Are documented information requirements met and controlled?',requirement_ref:'ISO 9001:2015 7.5',sequence:10},
      {section:'Clause 8 — Operations',question:'Are operational plans and controls implemented effectively?',requirement_ref:'ISO 9001:2015 8.1',sequence:11},
      {section:'Clause 8 — Operations',question:'Are customer requirements determined and reviewed?',requirement_ref:'ISO 9001:2015 8.2',sequence:12},
      {section:'Clause 9 — Performance',question:'Are monitoring, measurement, analysis and evaluation processes in place?',requirement_ref:'ISO 9001:2015 9.1',sequence:13},
      {section:'Clause 9 — Performance',question:'Are internal audits conducted at planned intervals?',requirement_ref:'ISO 9001:2015 9.2',sequence:14},
      {section:'Clause 9 — Performance',question:'Is management review conducted and documented?',requirement_ref:'ISO 9001:2015 9.3',sequence:15},
      {section:'Clause 10 — Improvement',question:'Are nonconformities identified and corrective actions taken?',requirement_ref:'ISO 9001:2015 10.2',sequence:16},
      {section:'Clause 10 — Improvement',question:'Is continual improvement demonstrated?',requirement_ref:'ISO 9001:2015 10.3',sequence:17},
    ];
    this.svc.addChecklist(v.id, { items }).subscribe({ next:(r:any) => {
      const arr = Array.isArray(r) ? r : [r];
      this.checklistItems.update(ci => [...ci, ...arr.map((c:any) => ({...c,_evidenceDraft:c.evidence||'',_findingDraft:c.finding_type||''}))]);
    }});
  }

  findingCounts() {
    const counts: Record<string,number> = {};
    (this.detailAudit()?.findings||[]).forEach((f:any) => { counts[f.finding_type]=(counts[f.finding_type]||0)+1; });
    return Object.entries(counts).map(([type,count]) => ({ type, count }));
  }

  submitFinding() {
    const v = this.detailAudit(); if(!v||!this.newFinding.description.trim()) return;
    const payload = {...this.newFinding};
    if(!payload.assignee_id) delete payload.assignee_id;
    this.svc.addFinding(v.id, payload).subscribe({ next: () => { this.newFinding={finding_type:'minor_nc',description:'',requirement_ref:'',evidence:'',assignee_id:''}; this.showAddFinding=false; this.reloadDetail(); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') });
  }

  closeFinding(f: any) {
    this.svc.updateFinding(this.detailAudit()!.id, f.id, {status:'closed'}).subscribe({ next: () => this.reloadDetail() });
  }

  doRaiseCapa(f: any) {
    
    this.svc.raiseCapa(this.detailAudit()!.id, f.id).subscribe({ next: () => { this.reloadDetail(); this.showToast('CAPA created successfully.', 'success'); }, error:(e:any)=>this.showToast(e?.error?.message||'Failed','error') });
  }

  responseClass(r: string) { return {yes:'resp-yes',no:'resp-no',partial:'resp-partial',na:'resp-na'}[r]||''; }
  prevPage() { if(this.page()>1){this.page.update(p=>p-1);this.load();} }
  nextPage() { if(this.page()<this.totalPages()){this.page.update(p=>p+1);this.load();} }
  typeIconClass(t:string) { return {internal:'icon-internal',external:'icon-external',supplier:'icon-supplier',certification:'icon-certification',surveillance:'icon-surveillance',compliance:'icon-compliance'}[t]||'icon-default'; }
  typeClass(t:string) { return {internal:'badge-blue',external:'badge-yellow',surveillance:'badge-purple',certification:'badge-green',supplier:'badge-orange',process:'badge-blue',system:'badge-blue',compliance:'badge-red'}[t]||'badge-draft'; }
  statusClass(s:string) { return {planned:'badge-blue',notified:'badge-yellow',in_progress:'badge-orange',draft_report:'badge-purple',report_issued:'badge-purple',closed:'badge-green',cancelled:'badge-draft'}[s]||'badge-draft'; }
  resultClass(r:string) { return {satisfactory:'badge-green',minor_findings:'badge-yellow',major_findings:'badge-orange',critical_findings:'badge-red'}[r]||'badge-draft'; }
  findingClass(t:string) { return {minor_nc:'badge-yellow',major_nc:'badge-red',observation:'badge-blue',opportunity:'badge-green',positive:'badge-purple'}[t]||'badge-draft'; }
  findingBorderClass(t:string) { return {minor_nc:'border-minor',major_nc:'border-major',observation:'border-obs',opportunity:'border-opp',positive:'border-pos'}[t]||''; }
  findingStatusClass(s:string) { return {open:'badge-red',capa_raised:'badge-orange',closed:'badge-green'}[s]||'badge-draft'; }
  fmt(s:string|null|undefined) { return (s||'').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()); }
  checklistCount(response: string): number {
    return this.checklistItems().filter((i:any) => (i.response||'') === response).length;
  }

  previewReport() {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) { win.document.write(this.buildReportHtml(false)); win.document.close(); }
  }

  downloadReport() {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) { win.document.write(this.buildReportHtml(true)); win.document.close(); }
  }

  buildReportHtml(autoPrint: boolean): string {
    const a = this.detailAudit();
    if (!a) return '';
    const fd = (d: string|null) => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—';
    const fmt = (s: string) => (s||'').replace(/_/g,' ').replace(/\w/g,(c:string)=>c.toUpperCase());

    const findings = (a.findings||[]).map((f:any) => `
      <tr>
        <td style="font-family:monospace;font-size:10pt">${f.reference_no}</td>
        <td><span class="badge-${f.finding_type?.includes('nc')?'nc':(f.finding_type==='positive'?'pos':'obs')}">${fmt(f.finding_type)}</span></td>
        <td>${f.description}</td>
        <td>${f.requirement_ref||'—'}</td>
        <td>${f.evidence||'—'}</td>
        <td>${fmt(f.status)}</td>
        <td>${f.assignee?.name||'—'}</td>
      </tr>`).join('');

    const team = (a.team||[]).map((m:any) => `
      <tr>
        <td>${m.name||'—'}</td>
        <td>${fmt(m.pivot?.role||'auditor')}</td>
      </tr>`).join('');

    const checklist = this.checklistItems().map((item:any) => {
      const respColor: Record<string,string> = { yes:'#10b981', no:'#ef4444', partial:'#f59e0b', na:'#9ca3af', not_checked:'#d1d5db', '':'#d1d5db' };
      const col = respColor[item.response||''] || '#d1d5db';
      return `<tr>
        <td>${item.section||'—'}</td>
        <td>${item.question}</td>
        <td>${item.requirement_ref||'—'}</td>
        <td style="color:${col};font-weight:700">${fmt(item.response||'Pending')}</td>
        <td>${item.evidence||'—'}</td>
        <td>${item.finding_type ? fmt(item.finding_type) : '—'}</td>
      </tr>`;
    }).join('');

    const findingStats: Record<string,number> = {};
    (a.findings||[]).forEach((f:any) => { findingStats[f.finding_type]=(findingStats[f.finding_type]||0)+1; });
    const statBadges = Object.entries(findingStats).map(([t,n]) => `<span style="background:#f3f4f6;border-radius:4px;padding:3px 10px;font-size:10pt;font-weight:600">${fmt(t)}: ${n}</span>`).join(' ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Audit Report — ${a.reference_no}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1a1a2e;background:#fff;padding:0}
    .page{max-width:850px;margin:0 auto;padding:40px 48px}
    .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #4f46e5}
    .doc-title{font-size:22pt;font-weight:800;color:#1a1a2e}
    .doc-sub{font-size:12pt;color:#4f46e5;font-weight:600;margin-top:2px}
    .org{font-size:10pt;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
    .ref-block{text-align:right}
    .ref-no{font-size:14pt;font-weight:700;color:#4f46e5;font-family:monospace}
    .ref-date{font-size:10pt;color:#6b7280;margin-top:4px}
    .status-badge{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:9pt;font-weight:700;text-transform:uppercase;background:#dcfce7;color:#15803d}
    .section{margin-bottom:24px}
    .section-title{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4f46e5;margin-bottom:10px;padding-bottom:5px;border-bottom:1.5px solid #e0e7ff}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
    .info-row{display:flex;gap:8px;font-size:10.5pt;padding:4px 0}
    .info-label{color:#6b7280;min-width:120px;flex-shrink:0}
    .info-value{font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:10pt;margin-top:4px}
    th{background:#f0f0ff;color:#4f46e5;font-weight:700;font-size:9pt;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left;border:1px solid #e0e7ff}
    td{padding:7px 10px;border:1px solid #e9e9f5;vertical-align:top}
    tr:nth-child(even) td{background:#fafafe}
    .text-block{background:#f9f9ff;border-left:3px solid #4f46e5;padding:12px 16px;border-radius:0 6px 6px 0;white-space:pre-wrap;font-size:10.5pt;line-height:1.6;color:#374151}
    .badge-nc{color:#dc2626;font-weight:700}
    .badge-obs{color:#4f46e5;font-weight:700}
    .badge-pos{color:#7c3aed;font-weight:700}
    .result-box{padding:12px 20px;border-radius:8px;text-align:center;margin-bottom:16px}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e7ff;display:flex;justify-content:space-between;font-size:9pt;color:#9ca3af}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;margin-top:16px}
    .sig-line{border-top:1px solid #374151;padding-top:8px;margin-top:50px;font-size:10pt}
    @media print{body{padding:0}.page{padding:20px 30px;max-width:100%}@page{margin:15mm;size:A4}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="org">Quality Management System</div>
      <div class="doc-title">Audit Report</div>
      <div class="doc-sub">${fmt(a.type)} Audit</div>
    </div>
    <div class="ref-block">
      <div class="ref-no">${a.reference_no}</div>
      <div class="ref-date">Report Date: ${fd(a.report_date)}</div>
      <div class="status-badge">${fmt(a.status)}</div>
    </div>
  </div>

  ${a.overall_result ? `<div class="result-box" style="background:${a.overall_result==='satisfactory'?'#dcfce7':a.overall_result==='critical_findings'?'#fee2e2':'#fef9c3'};border:1px solid ${a.overall_result==='satisfactory'?'#bbf7d0':a.overall_result==='critical_findings'?'#fecaca':'#fde68a'}">
    <div style="font-size:14pt;font-weight:800;color:${a.overall_result==='satisfactory'?'#15803d':a.overall_result==='critical_findings'?'#dc2626':'#92400e'}">${fmt(a.overall_result)}</div>
    <div style="font-size:10pt;color:#6b7280;margin-top:2px">Overall Audit Result</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Audit Information</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Reference No</span><span class="info-value">${a.reference_no}</span></div>
      <div class="info-row"><span class="info-label">Audit Type</span><span class="info-value">${fmt(a.type)}</span></div>
      <div class="info-row"><span class="info-label">Department</span><span class="info-value">${a.department?.name||'—'}</span></div>
      <div class="info-row"><span class="info-label">Lead Auditor</span><span class="info-value">${a.lead_auditor?.name||'—'}</span></div>
      <div class="info-row"><span class="info-label">Planned Start</span><span class="info-value">${fd(a.planned_start_date)}</span></div>
      <div class="info-row"><span class="info-label">Planned End</span><span class="info-value">${fd(a.planned_end_date)}</span></div>
      <div class="info-row"><span class="info-label">Actual Start</span><span class="info-value">${fd(a.actual_start_date)}</span></div>
      <div class="info-row"><span class="info-label">Actual End</span><span class="info-value">${fd(a.actual_end_date)}</span></div>
      <div class="info-row"><span class="info-label">Report Date</span><span class="info-value">${fd(a.report_date)}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value">${fmt(a.status)}</span></div>
    </div>
  </div>

  ${a.scope ? `<div class="section"><div class="section-title">Scope</div><div class="text-block">${a.scope}</div></div>` : ''}
  ${a.criteria ? `<div class="section"><div class="section-title">Audit Criteria / Standards</div><div class="text-block">${a.criteria}</div></div>` : ''}
  ${a.executive_summary ? `<div class="section"><div class="section-title">Executive Summary</div><div class="text-block">${a.executive_summary}</div></div>` : ''}

  ${team ? `<div class="section">
    <div class="section-title">Audit Team</div>
    <table><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody>${team}</tbody></table>
  </div>` : ''}

  ${findings ? `<div class="section">
    <div class="section-title">Findings (${(a.findings||[]).length} total) &nbsp; ${statBadges}</div>
    <table>
      <thead><tr><th>Ref</th><th>Type</th><th>Description</th><th>Requirement</th><th>Evidence</th><th>Status</th><th>Assignee</th></tr></thead>
      <tbody>${findings}</tbody>
    </table>
  </div>` : '<div class="section"><div class="section-title">Findings</div><p style="color:#9ca3af;font-style:italic">No findings recorded.</p></div>'}

  ${checklist ? `<div class="section">
    <div class="section-title">Checklist Results</div>
    <table>
      <thead><tr><th>Section</th><th>Question</th><th>Ref</th><th>Response</th><th>Evidence</th><th>Finding Type</th></tr></thead>
      <tbody>${checklist}</tbody>
    </table>
  </div>` : ''}

  <div class="section" style="margin-top:40px">
    <div class="section-title">Signatures</div>
    <div class="sig-grid">
      <div><div class="sig-line"><div style="font-weight:600">Lead Auditor: ${a.lead_auditor?.name||'_______________'}</div><div style="font-size:9pt;color:#6b7280;margin-top:2px">Date: _______________</div></div></div>
      <div><div class="sig-line"><div style="font-weight:600">Department Head: _______________</div><div style="font-size:9pt;color:#6b7280;margin-top:2px">Date: _______________</div></div></div>
      <div><div class="sig-line"><div style="font-weight:600">Management Rep: _______________</div><div style="font-size:9pt;color:#6b7280;margin-top:2px">Date: _______________</div></div></div>
    </div>
  </div>

  <div class="footer">
    <span>QMS Pro — Confidential</span>
    <span>Generated: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</span>
    <span>${a.reference_no}</span>
  </div>
</div>
${autoPrint ? '<script>window.onload=()=>window.print();<\/script>' : ''}
</body></html>`;
  }

    
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
