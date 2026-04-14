import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplaintService } from '../../../core/services/complaint.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-complaint-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FormsModule],
  template: `
<!-- Stats Row -->
<div class="stats-row">
  @for (s of statsCards(); track s.label) {
    <div class="stat-card" [style.border-top]="'3px solid ' + s.color">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" placeholder="&#xe002; Search complaints…" style="font-family:sans-serif">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="received">Received</option>
      <option value="acknowledged">Acknowledged</option>
      <option value="under_investigation">Under Investigation</option>
      <option value="pending_resolution">Pending Resolution</option>
      <option value="resolved">Resolved</option>
      <option value="closed">Closed</option>
      <option value="escalated">Escalated</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterSeverity" (change)="load()">
      <option value="">{{ lang.t('All Severities') }}</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openCreate()">
    <i class="fas fa-plus"></i> Log Complaint
  </button>
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">Complaints <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>{{ lang.t('REFERENCE') }}</th>
          <th>SUBJECT</th>
          <th>COMPLAINANT</th>
          <th>TYPE</th>
          <th>{{ lang.t('CATEGORY') }}</th>
          <th>{{ lang.t('SEVERITY') }}</th>
          <th>{{ lang.t('STATUS') }}</th>
          <th>ASSIGNEE</th>
          <th>RECEIVED</th>
          <th>DAYS</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <tr><td colspan="10"><div class="skeleton-row"></div></td></tr>
          }
        }
        @for (c of items(); track c.id) {
          <tr class="row-hover" (click)="openDetail(c)">
            <td>
              <span class="mono-ref">{{ c.reference_no }}</span>
              @if (c.is_regulatory) {
                <span class="badge badge-red" style="font-size:9px;padding:1px 5px;margin-left:4px;vertical-align:middle">REG</span>
              }
            </td>
            <td style="max-width:200px">
              <div class="text-truncate font-medium">{{ c.title }}</div>
              @if (c.capa_id) {
                <div style="font-size:10px;color:#8b5cf6;margin-top:1px"><i class="fas fa-shield-alt"></i> CAPA linked</div>
              }
            </td>
            <td>
              <div style="font-size:13px">{{ c.complainant_name || 'Anonymous' }}</div>
              @if (c.client) {
                <div style="font-size:11px;color:var(--text3)"><i class="fas fa-building" style="font-size:9px"></i> {{ c.client.name }}</div>
              }
            </td>
            <td>
              <span class="badge badge-draft" style="text-transform:capitalize">{{ fmt(c.complainant_type) }}</span>
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ c.category?.name || '—' }}</td>
            <td><span class="badge" [class]="severityClass(c.severity)">{{ c.severity }}</span></td>
            <td><span class="badge" [class]="statusClass(c.status)">{{ fmt(c.status) }}</span></td>
            <td>
              @if (c.assignee) {
                <div style="display:flex;align-items:center;gap:5px">
                  <div class="avatar-xs">{{ c.assignee.name?.charAt(0) }}</div>
                  <span style="font-size:12px">{{ c.assignee.name }}</span>
                </div>
              } @else {
                <span style="font-size:12px;color:var(--text3)">{{ lang.t('Unassigned') }}</span>
              }
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ c.received_date | date:'dd MMM' }}</td>
            <td>
              <span class="days-badge" [class]="daysClass(c)">{{ ageOf(c) }}d</span>
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="10" class="empty-row">No complaints found. <span style="color:var(--accent);cursor:pointer" (click)="openCreate()">Log one.</span></td></tr>
        }
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <span class="page-info">{{ total() }} total · Page {{ page() }} of {{ totalPages() }}</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
    <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
  </div>
</div>

<!-- ====== LOG COMPLAINT MODAL ====== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-comment-exclamation" style="color:var(--danger)"></i> Log Complaint
        </div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-section-title">Complaint Details</div>
        <div class="form-grid">
          <div class="form-group fg-2col">
            <label class="form-label">Subject / Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="Brief description of the complaint">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="form.category_id">
              <option value="">— Select —</option>
              @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Severity *</label>
            <select class="form-control" [(ngModel)]="form.severity">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Source / Channel</label>
            <select class="form-control" [(ngModel)]="form.source">
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="web_form">Web Portal</option>
              <option value="in_person">In Person</option>
              <option value="social_media">Social Media</option>
              <option value="regulator">Regulator</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <select class="form-control" [(ngModel)]="form.department_id">
              <option value="">— Select —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Received Date</label>
            <input type="date" class="form-control" [(ngModel)]="form.received_date">
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:8px;padding-top:26px">
            <input type="checkbox" id="isReg" [(ngModel)]="form.is_regulatory" style="width:15px;height:15px;cursor:pointer">
            <label for="isReg" style="font-size:13px;cursor:pointer">Regulatory complaint</label>
          </div>
        </div>

        <div class="form-section-title mt16">Complainant</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Complainant Type</label>
            <select class="form-control" [(ngModel)]="form.complainant_type">
              <option value="client">Client</option>
              <option value="employee">Employee</option>
              <option value="vendor">Vendor</option>
              <option value="public">Public</option>
              <option value="regulator">Regulator</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Client (if applicable)</label>
            <select class="form-control" [(ngModel)]="form.client_id">
              <option value="">— Select —</option>
              @for (cl of clients(); track cl.id) { <option [value]="cl.id">{{ cl.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-control" [(ngModel)]="form.complainant_name" placeholder="Full name">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" [(ngModel)]="form.complainant_email">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input class="form-control" [(ngModel)]="form.complainant_phone" placeholder="+966 5X XXX XXXX">
          </div>
        </div>

        <div class="form-section-title mt16">Description *</div>
        <div class="form-group">
          <textarea class="form-control" rows="4" [(ngModel)]="form.description"
            placeholder="Full description — what happened, when, and what impact it had…"></textarea>
        </div>

        @if (formError()) {
          <div class="alert-error mt8">{{ formError() }}</div>
        }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-save"></i> {{ saving() ? 'Logging…' : 'Log Complaint' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== DETAIL MODAL ====== -->
@if (detail()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:92vh;overflow:hidden;display:flex;flex-direction:column">

      <!-- Header -->
      <div class="modal-header" style="flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div class="modal-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <i class="fas fa-comment-exclamation" style="color:var(--danger)"></i>
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ detail()!.title }}</span>
            @if (detail()!.is_regulatory) {
              <span class="badge badge-red" style="font-size:10px;flex-shrink:0">REGULATORY</span>
            }
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="mono-ref">{{ detail()!.reference_no }}</span>
            <span>·</span>
            <span>Received {{ detail()!.received_date | date:'dd MMM yyyy' }}</span>
            @if (detail()!.category) { <span>· {{ detail()!.category.name }}</span> }
            <span>·</span>
            <span style="font-weight:700" [style.color]="ageOf(detail()!.received_date|date:'yyyy-MM-dd') > 3 ? 'var(--danger)' : 'var(--text2)'">
              Age: {{ ageOf(detail()) }}d
            </span>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;flex-wrap:wrap">
          <span class="badge" [class]="severityClass(detail()!.severity)">{{ detail()!.severity }}</span>
          <span class="badge" [class]="statusClass(detail()!.status)">{{ fmt(detail()!.status) }}</span>
          @if (isOverdue(detail()!.target_resolution_date, detail()!.status)) {
            <span class="badge badge-red"><i class="fas fa-clock"></i> Overdue</span>
          }
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar" style="flex-shrink:0">
        <button class="tab-btn" [class.active]="activeTab==='details'" (click)="activeTab='details'">
          <i class="fas fa-info-circle"></i> Details
        </button>
        <button class="tab-btn" [class.active]="activeTab==='investigation'" (click)="activeTab='investigation'">
          <i class="fas fa-search"></i> Investigation
        </button>
        <button class="tab-btn" [class.active]="activeTab==='timeline'" (click)="activeTab='timeline';loadUpdates()">
          <i class="fas fa-history"></i> Timeline
          @if (updates().length) {
            <span class="badge badge-blue" style="font-size:10px;padding:1px 6px;margin-left:4px">{{ updates().length }}</span>
          }
        </button>
      </div>

      <!-- Scrollable content -->
      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- ── TAB: Details ─────────────────────────────── -->
        @if (activeTab === 'details') {
          <div class="two-col-grid">
            <!-- Left col -->
            <div style="display:flex;flex-direction:column;gap:14px">

              <div class="detail-section">
                <div class="detail-section-title">Complaint Information</div>
                <div class="detail-row"><span>Reference</span><span class="mono-ref">{{ detail()!.reference_no }}</span></div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detail()!.status)">{{ fmt(detail()!.status) }}</span></span></div>
                <div class="detail-row"><span>Severity</span><span><span class="badge" [class]="severityClass(detail()!.severity)">{{ detail()!.severity }}</span></span></div>
                <div class="detail-row"><span>Category</span><span>{{ detail()!.category?.name || '—' }}</span></div>
                <div class="detail-row"><span>Source</span><span>{{ fmt(detail()!.source) }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detail()!.department?.name || '—' }}</span></div>
                <div class="detail-row">
                  <span>Assigned To</span>
                  <span>
                    @if (detail()!.assignee) {
                      <div style="display:flex;align-items:center;gap:6px">
                        <div class="avatar-xs">{{ detail()!.assignee.name?.charAt(0) }}</div>
                        {{ detail()!.assignee.name }}
                        <button class="btn btn-secondary btn-xs" style="font-size:10px" (click)="showAssignForm=!showAssignForm">Change</button>
                      </div>
                    } @else {
                      <button class="btn btn-secondary btn-xs" (click)="showAssignForm=true">Assign</button>
                    }
                  </span>
                </div>
                <div class="detail-row"><span>Received</span><span>{{ detail()!.received_date | date:'dd MMM yyyy, HH:mm' }}</span></div>
                <div class="detail-row"><span>Acknowledged</span><span>{{ detail()!.acknowledged_date ? (detail()!.acknowledged_date | date:'dd MMM yyyy, HH:mm') : '—' }}</span></div>
                <div class="detail-row">
                  <span>SLA Due</span>
                  <span [style.color]="isOverdue(detail()!.target_resolution_date, detail()!.status) ? 'var(--danger)' : ''">
                    {{ detail()!.target_resolution_date ? (detail()!.target_resolution_date | date:'dd MMM yyyy') : '—' }}
                    @if (isOverdue(detail()!.target_resolution_date, detail()!.status)) {
                      <span style="font-size:11px"> (OVERDUE)</span>
                    }
                  </span>
                </div>
                @if (detail()!.actual_resolution_date) {
                  <div class="detail-row"><span>Resolved</span><span style="color:#10b981">{{ detail()!.actual_resolution_date | date:'dd MMM yyyy' }}</span></div>
                }
              </div>

              @if (showAssignForm) {
                <div class="inline-form-card">
                  <div class="form-section-title">{{ detail()!.assignee ? 'Reassign' : 'Assign' }} Complaint</div>
                  <div class="form-group" style="margin-bottom:10px">
                    <select class="form-control" [(ngModel)]="assigneeId">
                      <option value="">— Select user —</option>
                      @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                    </select>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-primary btn-sm" (click)="doAssign()" [disabled]="!assigneeId || savingAction()">
                      {{ savingAction() ? '…' : 'Assign' }}
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="showAssignForm=false">Cancel</button>
                  </div>
                </div>
              }

              @if (detail()!.capa_id) {
                <div class="detail-section" style="border-color:rgba(139,92,246,.3);background:rgba(139,92,246,.04)">
                  <div class="detail-section-title" style="color:#7c3aed"><i class="fas fa-shield-alt"></i> Linked CAPA</div>
                  <div class="detail-row"><span>Reference</span><span class="mono-ref">{{ detail()!.capa?.reference_no || ('CAPA #' + detail()!.capa_id) }}</span></div>
                  <div class="detail-row"><span>Status</span><span class="badge badge-blue" style="font-size:11px">{{ detail()!.capa?.status || 'open' }}</span></div>
                </div>
              }
            </div>

            <!-- Right col -->
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Complainant</div>
                <div style="display:flex;gap:12px;align-items:flex-start;padding:6px 0">
                  <div class="contact-avatar">{{ (detail()!.complainant_name || '?').charAt(0).toUpperCase() }}</div>
                  <div>
                    <div style="font-weight:600;font-size:14px">{{ detail()!.complainant_name || 'Anonymous' }}</div>
                    <div style="font-size:12px;color:var(--text3)">{{ fmt(detail()!.complainant_type) }}</div>
                    @if (detail()!.client) {
                      <div style="font-size:12px;color:var(--accent);margin-top:3px">
                        <i class="fas fa-building"></i> {{ detail()!.client.name }}
                      </div>
                    }
                    @if (detail()!.complainant_email) {
                      <div style="font-size:12px;color:var(--text2);margin-top:2px">
                        <i class="fas fa-envelope"></i> {{ detail()!.complainant_email }}
                      </div>
                    }
                    @if (detail()!.complainant_phone) {
                      <div style="font-size:12px;color:var(--text2)">
                        <i class="fas fa-phone"></i> {{ detail()!.complainant_phone }}
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <div class="detail-section-title">Description</div>
                <p style="font-size:13px;color:var(--text2);margin:6px 0 0;line-height:1.7;white-space:pre-wrap">{{ detail()!.description }}</p>
              </div>

              @if (detail()!.resolution) {
                <div class="detail-section" style="border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.04)">
                  <div class="detail-section-title" style="color:#065f46"><i class="fas fa-check-circle"></i> Resolution</div>
                  <p style="font-size:13px;color:var(--text2);margin:6px 0;line-height:1.7;white-space:pre-wrap">{{ detail()!.resolution }}</p>
                  @if (detail()!.customer_satisfaction) {
                    <div style="font-size:13px;margin-top:6px">
                      Satisfaction:
                      <span style="color:#f59e0b;font-size:16px">
                        {{ '★'.repeat(detail()!.customer_satisfaction) }}{{ '☆'.repeat(5 - detail()!.customer_satisfaction) }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- ── TAB: Investigation ─────────────────────── -->
        @if (activeTab === 'investigation') {
          <div class="two-col-grid">
            <!-- Left -->
            <div style="display:flex;flex-direction:column;gap:14px">

              <!-- Root Cause -->
              <div class="detail-section">
                <div class="detail-section-title" style="display:flex;justify-content:space-between;align-items:center">
                  Root Cause Analysis
                  @if (!editRootCause) {
                    <button class="btn btn-secondary btn-xs" (click)="editRootCause=true;rootCauseDraft=detail()!.root_cause||''">
                      <i class="fas fa-edit"></i>
                    </button>
                  }
                </div>
                @if (editRootCause) {
                  <textarea class="form-control" rows="5" [(ngModel)]="rootCauseDraft"
                    placeholder="Describe the root cause of this complaint…" style="margin-top:8px"></textarea>
                  <div style="display:flex;gap:6px;margin-top:8px">
                    <button class="btn btn-primary btn-sm" (click)="saveRootCause()" [disabled]="savingAction()">Save</button>
                    <button class="btn btn-secondary btn-sm" (click)="editRootCause=false">Cancel</button>
                  </div>
                } @else {
                  <p style="font-size:13px;color:var(--text2);margin:8px 0 0;line-height:1.6;white-space:pre-wrap;min-height:40px">
                    {{ detail()!.root_cause || 'No root cause recorded yet. Click edit to add.' }}
                  </p>
                }
              </div>

              <!-- Resolve -->
              @if (['acknowledged','under_investigation','pending_resolution','escalated'].includes(detail()!.status)) {
                <div class="detail-section" style="border-color:rgba(16,185,129,.35)">
                  <div class="form-section-title" style="color:#065f46"><i class="fas fa-check-circle"></i> Resolve Complaint</div>
                  <div class="form-group">
                    <label class="form-label">Resolution *</label>
                    <textarea class="form-control" rows="3" [(ngModel)]="resolveForm.resolution"
                      placeholder="Describe how the complaint was addressed and resolved…"></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Customer Satisfaction</label>
                    <div style="display:flex;gap:2px;margin-top:4px">
                      @for (i of [1,2,3,4,5]; track i) {
                        <button class="star-btn" [class.active]="resolveForm.customer_satisfaction >= i"
                          (click)="resolveForm.customer_satisfaction=i" type="button">★</button>
                      }
                      @if (resolveForm.customer_satisfaction) {
                        <span style="font-size:12px;color:var(--text2);margin-left:8px;align-self:center">
                          {{ resolveForm.customer_satisfaction }}/5
                        </span>
                      }
                    </div>
                  </div>
                  @if (resolveError()) { <div class="alert-error" style="margin-top:6px;font-size:12px">{{ resolveError() }}</div> }
                  <button class="btn btn-sm" style="background:#10b981;color:#fff;margin-top:10px"
                    (click)="doResolve()" [disabled]="savingAction()">
                    <i class="fas fa-check"></i> {{ savingAction() ? 'Saving…' : 'Mark as Resolved' }}
                  </button>
                </div>
              }
            </div>

            <!-- Right -->
            <div style="display:flex;flex-direction:column;gap:14px">

              <!-- Escalate -->
              @if (!['resolved','closed','withdrawn'].includes(detail()!.status)) {
                <div class="detail-section">
                  <div class="form-section-title"><i class="fas fa-arrow-up" style="color:#f59e0b"></i> Escalate</div>
                  @if (detail()!.escalation_level > 0) {
                    <div style="font-size:12px;color:var(--warning);margin-bottom:10px;padding:6px 10px;background:rgba(245,158,11,.08);border-radius:6px">
                      <i class="fas fa-arrow-up"></i> Escalated {{ detail()!.escalation_level }}×
                      @if (detail()!.escalated_to) { — currently with <strong>{{ detail()!.escalated_to.name }}</strong> }
                    </div>
                  }
                  <div class="form-group">
                    <label class="form-label">Escalate To *</label>
                    <select class="form-control" [(ngModel)]="escalateForm.escalated_to_id">
                      <option value="">— Select user —</option>
                      @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Reason *</label>
                    <textarea class="form-control" rows="2" [(ngModel)]="escalateForm.reason"
                      placeholder="Why is this being escalated?"></textarea>
                  </div>
                  <button class="btn btn-sm" style="background:#f59e0b;color:#fff;margin-top:4px"
                    (click)="doEscalate()" [disabled]="!escalateForm.escalated_to_id || !escalateForm.reason || savingAction()">
                    <i class="fas fa-arrow-up"></i> Escalate
                  </button>
                </div>

                <!-- Raise CAPA -->
                @if (!detail()!.capa_id) {
                  <div class="detail-section" style="border-color:rgba(139,92,246,.3)">
                    <div class="form-section-title" style="color:#7c3aed">
                      <i class="fas fa-shield-alt"></i> Raise CAPA
                    </div>
                    <p style="font-size:13px;color:var(--text2);margin:0 0 12px;line-height:1.6">
                      Create a Corrective &amp; Preventive Action to address the root cause and prevent recurrence.
                    </p>
                    <button class="btn btn-sm" style="background:#7c3aed;color:#fff"
                      (click)="doRaiseCapa()" [disabled]="savingAction()">
                      <i class="fas fa-shield-alt"></i> {{ savingAction() ? 'Raising…' : 'Raise CAPA' }}
                    </button>
                  </div>
                }

                <!-- Close / Withdraw -->
                <div class="detail-section">
                  <div class="form-section-title">Other Actions</div>
                  @if (detail()!.status === 'resolved') {
                    <div class="form-group">
                      <label class="form-label">Closing Comment</label>
                      <textarea class="form-control" rows="2" [(ngModel)]="closeComment"
                        placeholder="Final notes before closing…"></textarea>
                    </div>
                    <button class="btn btn-secondary btn-sm" style="margin-bottom:8px"
                      (click)="doClose()" [disabled]="savingAction()">
                      <i class="fas fa-lock"></i> Close Complaint
                    </button>
                    <br>
                  }
                  <button class="btn btn-secondary btn-sm" style="color:var(--text3)"
                    (click)="doWithdraw()" [disabled]="savingAction()">
                    <i class="fas fa-times-circle"></i> Mark as Withdrawn
                  </button>
                </div>
              }

              <!-- Already closed/resolved -->
              @if (['resolved','closed'].includes(detail()!.status)) {
                <div class="detail-section" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.03);text-align:center;padding:24px">
                  <i class="fas fa-check-circle" style="font-size:32px;color:#10b981;margin-bottom:8px;display:block"></i>
                  <div style="font-weight:700;color:#065f46">Complaint {{ detail()!.status }}</div>
                  @if (detail()!.actual_resolution_date) {
                    <div style="font-size:12px;color:var(--text3);margin-top:4px">
                      Resolved {{ detail()!.actual_resolution_date | date:'dd MMM yyyy' }}
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- ── TAB: Timeline ──────────────────────────── -->
        @if (activeTab === 'timeline') {
          <!-- Add comment -->
          <div class="inline-form-card" style="margin-bottom:16px">
            <div style="display:flex;gap:10px;align-items:flex-end">
              <div style="flex:1">
                <label class="form-label">Add Update / Comment</label>
                <textarea class="form-control" rows="2" [(ngModel)]="newComment"
                  placeholder="Type an update, internal note, or action taken…"></textarea>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;white-space:nowrap">
                  <input type="checkbox" [(ngModel)]="notifyComplainant"> Notify complainant
                </label>
                <button class="btn btn-primary btn-sm"
                  (click)="addUpdate()" [disabled]="!newComment.trim() || savingUpdate()">
                  {{ savingUpdate() ? 'Posting…' : 'Post Update' }}
                </button>
              </div>
            </div>
          </div>

          @if (loadingUpdates()) {
            @for (i of [1,2,3]; track i) {
              <div class="skeleton-row" style="height:64px;border-radius:8px;margin-bottom:10px"></div>
            }
          } @else if (updates().length) {
            <div class="timeline">
              @for (u of updates(); track u.id) {
                <div class="tl-item" [class]="'tl-' + u.update_type">
                  <div class="tl-icon">
                    @switch (u.update_type) {
                      @case ('status_change') { <i class="fas fa-exchange-alt"></i> }
                      @case ('escalation')    { <i class="fas fa-arrow-up"></i> }
                      @case ('resolution')    { <i class="fas fa-check-circle"></i> }
                      @case ('closure')       { <i class="fas fa-lock"></i> }
                      @default               { <i class="fas fa-comment"></i> }
                    }
                  </div>
                  <div class="tl-body">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                      <div>
                        <span style="font-weight:600;font-size:13px">{{ u.user?.name || 'System' }}</span>
                        @if (u.previous_status && u.new_status && u.previous_status !== u.new_status) {
                          <span style="font-size:11px;color:var(--text3);margin-left:8px">
                            <span class="badge badge-draft" style="font-size:10px">{{ fmt(u.previous_status) }}</span>
                            <i class="fas fa-arrow-right" style="margin:0 4px;font-size:9px"></i>
                            <span class="badge" [class]="statusClass(u.new_status)" style="font-size:10px">{{ fmt(u.new_status) }}</span>
                          </span>
                        }
                        @if (u.notify_complainant) {
                          <span class="badge badge-blue" style="font-size:10px;margin-left:6px">
                            <i class="fas fa-bell"></i> notified
                          </span>
                        }
                      </div>
                      <span style="font-size:11px;color:var(--text3);white-space:nowrap">
                        {{ u.created_at | date:'dd MMM yyyy, HH:mm' }}
                      </span>
                    </div>
                    @if (u.comment) {
                      <p style="font-size:13px;color:var(--text2);margin:5px 0 0;line-height:1.55;white-space:pre-wrap">{{ u.comment }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No updates yet. Post the first comment above.</div>
          }
        }

      </div><!-- /scroll -->

      <!-- Footer action bar -->
      <div class="modal-footer" style="border-top:1px solid var(--border);justify-content:space-between;flex-shrink:0">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          @if (detail()!.status === 'received') {
            <button class="btn btn-primary btn-sm" (click)="doAcknowledge()" [disabled]="savingAction()">
              <i class="fas fa-check"></i> Acknowledge
            </button>
          }
          @if (detail()!.status === 'acknowledged') {
            <button class="btn btn-sm" style="background:var(--accent);color:#fff"
              (click)="doInvestigate()" [disabled]="savingAction()">
              <i class="fas fa-search"></i> Start Investigation
            </button>
          }
          @if (!detail()!.assignee_id) {
            <button class="btn btn-secondary btn-sm" (click)="showAssignForm=true;activeTab='details'">
              <i class="fas fa-user-plus"></i> Assign
            </button>
          }
          @if (!detail()!.capa_id && !['received','resolved','closed','withdrawn'].includes(detail()!.status)) {
            <button class="btn btn-secondary btn-sm" style="color:#7c3aed;border-color:#7c3aed"
              (click)="doRaiseCapa()" [disabled]="savingAction()">
              <i class="fas fa-shield-alt"></i> Raise CAPA
            </button>
          }
        </div>
        <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
      </div>

    </div>
  </div>
}
  `,
  styles: [`
    .stats-row { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .stat-card  { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 20px; flex:1; min-width:110px; text-align:center; }
    .stat-num   { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; line-height:1; }
    .stat-lbl   { font-size:11px; color:var(--text2); margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }

    .page-toolbar  { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap; }
    .filter-group  { display:flex; gap:8px; flex-wrap:wrap; }
    .input-sm      { height:32px; border-radius:6px; border:1px solid var(--border); padding:0 10px; font-size:13px; background:var(--surface); color:var(--text1); min-width:190px; }

    .row-hover { cursor:pointer; }
    .row-hover:hover td { background:rgba(239,68,68,.03); }
    .mono-ref  { font-family:monospace; font-size:12px; color:var(--accent); }
    .text-truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .font-medium   { font-weight:600; }
    .avatar-xs { width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#8b5cf6); display:grid; place-items:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }

    .days-badge  { font-family:monospace; font-size:13px; font-weight:700; padding:2px 7px; border-radius:5px; }
    .days-ok     { background:rgba(16,185,129,.12); color:#065f46; }
    .days-warn   { background:rgba(245,158,11,.15); color:#b45309; }
    .days-over   { background:rgba(239,68,68,.15);  color:var(--danger); }

    .pagination { display:flex; align-items:center; gap:8px; padding:12px 16px; border-top:1px solid var(--border); }
    .page-info  { font-size:12px; color:var(--text2); margin-right:auto; }
    .empty-row  { text-align:center; color:var(--text3); padding:48px 0; }

    .modal-lg  { max-width:760px; }
    .modal-xl  { max-width:980px; width:95vw; }

    .form-grid  { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .fg-2col    { grid-column:span 2; }
    .form-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid var(--border); }
    .mt8  { margin-top:8px; }
    .mt16 { margin-top:16px; }
    .alert-error { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:var(--danger); padding:10px 14px; border-radius:8px; font-size:13px; }

    .tab-bar  { display:flex; border-bottom:2px solid var(--border); padding:0 20px; background:var(--surface); }
    .tab-btn  { padding:10px 16px; border:none; background:none; font-size:13px; font-weight:500; color:var(--text2); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; display:flex; align-items:center; gap:6px; transition:all .15s; }
    .tab-btn.active { color:var(--accent); border-bottom-color:var(--accent); }

    .two-col-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .detail-section { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; }
    .detail-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--text3); margin-bottom:10px; }
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(0,0,0,.04); font-size:13px; }
    .detail-row > span:first-child { color:var(--text2); }
    .detail-row > span:last-child  { font-weight:500; text-align:right; }

    .contact-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#ef4444,#f59e0b); display:grid; place-items:center; font-size:16px; font-weight:700; color:#fff; flex-shrink:0; }
    .inline-form-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; }

    .star-btn        { background:none; border:none; font-size:24px; cursor:pointer; color:var(--border); padding:0 1px; line-height:1; transition:color .1s; }
    .star-btn.active { color:#f59e0b; }

    /* Timeline */
    .timeline   { display:flex; flex-direction:column; }
    .tl-item    { display:flex; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
    .tl-item:last-child { border-bottom:none; }
    .tl-icon    { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; font-size:12px; flex-shrink:0; margin-top:2px; }
    .tl-status_change .tl-icon { background:rgba(79,70,229,.1);   color:var(--accent); }
    .tl-escalation    .tl-icon { background:rgba(245,158,11,.12);  color:#b45309; }
    .tl-resolution    .tl-icon { background:rgba(16,185,129,.12);  color:#065f46; }
    .tl-closure       .tl-icon { background:rgba(100,116,139,.1);  color:#475569; }
    .tl-comment       .tl-icon { background:rgba(0,0,0,.06);       color:var(--text2); }
    .tl-body { flex:1; min-width:0; }
  `]
})
export class ComplaintListComponent implements OnInit, OnDestroy {
  // List state
  items      = signal<any[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  statsCards = signal<any[]>([]);

  // Lookup data
  categories  = signal<any[]>([]);
  users       = signal<any[]>([]);
  clients     = signal<any[]>([]);
  departments = signal<any[]>([]);

  // Detail modal
  detail         = signal<any>(null);
  updates        = signal<any[]>([]);
  loadingUpdates = signal(false);
  activeTab = 'details';

  // Filters
  search = ''; filterStatus = ''; filterSeverity = '';

  // Create form
  showForm = false;
  saving   = signal(false);
  formError= signal('');
  form: any = {};

  // Actions
  savingAction = signal(false);
  savingUpdate = signal(false);

  // Assign
  showAssignForm = false;
  assigneeId: any = '';

  // Resolve
  resolveForm: any = { resolution: '', customer_satisfaction: 0 };
  resolveError = signal('');

  // Escalate
  escalateForm: any = { escalated_to_id: '', reason: '' };

  // Root cause
  editRootCause = false;
  rootCauseDraft = '';

  // Timeline
  newComment = '';
  notifyComplainant = false;

  // Close
  closeComment = '';

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private svc: ComplaintService, private uiEvents: UiEventService, public lang: LanguageService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.svc.categories().subscribe({ next: (r: any) => this.categories.set(r || []) });
    this.svc.users().subscribe({ next: (r: any) => this.users.set(r || []) });
    this.svc.clients().subscribe({ next: (r: any) => this.clients.set(r || []) });
    this.svc.departments().subscribe({ next: (r: any) => this.departments.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus)   p.status   = this.filterStatus;
    if (this.filterSeverity) p.severity = this.filterSeverity;
    if (this.search)         p.search   = this.search;
    this.svc.getAll(p).subscribe({
      next: (r: any) => {
        this.items.set(r.data || []);
        this.total.set(r.total || 0);
        this.totalPages.set(r.last_page || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  loadStats() {
    this.svc.getStats().subscribe({
      next: (s: any) => {
        const byStatus: any[] = s.by_status || [];
        const get = (st: string) => byStatus.find((x: any) => x.status === st)?.total ?? 0;
        const total = byStatus.reduce((sum: number, x: any) => sum + Number(x.total || 0), 0);
        this.statsCards.set([
          { label: 'Total',         value: total,                                     color: 'var(--text1)' },
          { label: 'Open',          value: get('received') + get('acknowledged') + get('under_investigation'), color: '#3b82f6' },
          { label: 'Overdue',       value: s.overdue ?? 0,                            color: '#ef4444' },
          { label: 'Resolved/Month',value: get('resolved') + get('closed'),           color: '#10b981' },
          { label: 'Avg Days',      value: s.avg_days != null ? s.avg_days : '—',     color: '#8b5cf6' },
        ]);
      }
    });
  }

  openCreate() {
    this.form = {
      title: '', description: '', severity: 'medium', source: 'email',
      complainant_type: 'client', complainant_name: '', complainant_email: '',
      complainant_phone: '', client_id: '', category_id: '', department_id: '',
      received_date: new Date().toISOString().substring(0, 10),
      is_regulatory: false
    };
    this.formError.set('');
    this.showForm = true;
  }

  submit() {
    if (!this.form.title?.trim())       { this.formError.set('Subject is required.'); return; }
    if (!this.form.description?.trim()) { this.formError.set('Description is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.category_id)   delete payload.category_id;
    if (!payload.client_id)     delete payload.client_id;
    if (!payload.department_id) delete payload.department_id;
    this.svc.create(payload).subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.load(); this.loadStats(); },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat().join(', ') || 'Failed to log complaint.');
      }
    });
  }

  openDetail(c: any) {
    this.svc.getById(c.id).subscribe({
      next: (r: any) => {
        this.detail.set(r);
        this.activeTab = 'details';
        this.updates.set([]);
        this.showAssignForm = false;
        this.editRootCause = false;
        this.resolveForm = { resolution: '', customer_satisfaction: 0 };
        this.escalateForm = { escalated_to_id: '', reason: '' };
        this.resolveError.set('');
        this.newComment = '';
        this.closeComment = '';
        this.assigneeId = '';
      }
    });
  }

  closeDetail() { this.detail.set(null); }

  private reloadDetail() {
    const d = this.detail();
    if (!d) return;
    this.svc.getById(d.id).subscribe({ next: (r: any) => this.detail.set(r) });
  }

  loadUpdates() {
    const d = this.detail();
    if (!d || this.updates().length) return;
    this.loadingUpdates.set(true);
    this.svc.getUpdates(d.id).subscribe({
      next: (r: any) => { this.updates.set(r || []); this.loadingUpdates.set(false); },
      error: () => this.loadingUpdates.set(false)
    });
  }

  doAcknowledge() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.acknowledge(d.id).subscribe({
      next: (r: any) => { this.savingAction.set(false); this.detail.set({ ...d, ...r }); this.load(); this.loadStats(); }
    });
  }

  doInvestigate() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.investigate(d.id).subscribe({
      next: (r: any) => { this.savingAction.set(false); this.detail.set({ ...d, ...r }); this.load(); this.loadStats(); }
    });
  }

  doAssign() {
    const d = this.detail(); if (!d || !this.assigneeId) return;
    this.savingAction.set(true);
    this.svc.assign(d.id, this.assigneeId).subscribe({
      next: () => { this.savingAction.set(false); this.showAssignForm = false; this.reloadDetail(); this.load(); }
    });
  }

  doResolve() {
    if (!this.resolveForm.resolution?.trim()) { this.resolveError.set('Resolution is required.'); return; }
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true); this.resolveError.set('');
    this.svc.resolve(d.id, this.resolveForm).subscribe({
      next: () => {
        this.savingAction.set(false); this.reloadDetail();
        this.load(); this.loadStats(); this.updates.set([]);
      }
    });
  }

  doEscalate() {
    const d = this.detail();
    if (!d || !this.escalateForm.escalated_to_id || !this.escalateForm.reason) return;
    this.savingAction.set(true);
    this.svc.escalate(d.id, this.escalateForm.escalated_to_id, this.escalateForm.reason).subscribe({
      next: () => {
        this.savingAction.set(false);
        this.escalateForm = { escalated_to_id: '', reason: '' };
        this.reloadDetail(); this.load(); this.loadStats(); this.updates.set([]);
      }
    });
  }

  doRaiseCapa() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.raiseCapa(d.id).subscribe({
      next: () => { this.savingAction.set(false); this.reloadDetail(); this.load(); }
    });
  }

  doClose() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.close(d.id, { comment: this.closeComment || 'Complaint closed.' }).subscribe({
      next: () => {
        this.savingAction.set(false); this.reloadDetail();
        this.load(); this.loadStats(); this.updates.set([]);
      }
    });
  }

  doWithdraw() {
    if (!confirm('Mark this complaint as withdrawn?')) return;
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.withdraw(d.id, 'Withdrawn by staff.').subscribe({
      next: () => { this.savingAction.set(false); this.reloadDetail(); this.load(); this.loadStats(); }
    });
  }

  saveRootCause() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.update(d.id, { root_cause: this.rootCauseDraft }).subscribe({
      next: () => {
        this.savingAction.set(false);
        this.detail.set({ ...d, root_cause: this.rootCauseDraft });
        this.editRootCause = false;
      }
    });
  }

  addUpdate() {
    const d = this.detail();
    if (!d || !this.newComment.trim()) return;
    this.savingUpdate.set(true);
    this.svc.addUpdate(d.id, {
      comment: this.newComment,
      update_type: 'comment',
      notify_complainant: this.notifyComplainant
    }).subscribe({
      next: (r: any) => {
        this.savingUpdate.set(false);
        this.updates.update(u => [r, ...u]);
        this.newComment = '';
        this.notifyComplainant = false;
      }
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  ageOf(c: any): number {
    const d = c?.received_date ?? c;
    if (!d) return 0;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  }

  daysClass(c: any): string {
    const age = this.ageOf(c);
    if (['resolved', 'closed', 'withdrawn'].includes(c.status)) return 'days-ok';
    if (age > 3) return 'days-over';
    if (age > 0) return 'days-warn';
    return 'days-ok';
  }

  isOverdue(d: string | null, status: string): boolean {
    if (!d || ['resolved', 'closed', 'withdrawn'].includes(status)) return false;
    return new Date(d) < new Date();
  }

  fmt(s: string | null | undefined): string {
    return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  severityClass(s: string): string {
    return { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', critical: 'badge-critical' }[s] || 'badge-draft';
  }

  statusClass(s: string): string {
    return {
      received:            'badge-draft',
      acknowledged:        'badge-yellow',
      under_investigation: 'badge-blue',
      pending_resolution:  'badge-orange',
      resolved:            'badge-green',
      closed:              'badge-draft',
      escalated:           'badge-red',
      withdrawn:           'badge-draft',
    }[s] || 'badge-draft';
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
