import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NcCapaService } from '../../../core/services/nc-capa.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-nc-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- Stats Row -->
<div class="stats-row">
  @for (s of statsCards(); track s.label) {
    <div class="stat-card">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" [placeholder]="lang.t('Search NCs…')">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="open">Open</option>
      <option value="under_investigation">Under Investigation</option>
      <option value="capa_in_progress">CAPA In Progress</option>
      <option value="pending_capa">Pending CAPA</option>
      <option value="closed">Closed</option>
      <option value="cancelled">Cancelled</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterSeverity" (change)="load()">
      <option value="">{{ lang.t('All Severities') }}</option>
      <option value="minor">Minor</option>
      <option value="major">Major</option>
      <option value="critical">Critical</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterSource" (change)="load()">
      <option value="">All Sources</option>
      <option value="internal_audit">Internal Audit</option>
      <option value="external_audit">External Audit</option>
      <option value="client_complaint">Client Complaint</option>
      <option value="process_review">Process Review</option>
      <option value="supplier_issue">Supplier Issue</option>
      <option value="regulatory">Regulatory</option>
      <option value="other">Other</option>
    </select>
  </div>
  @if (canCreate()) {
    <button class="btn btn-primary btn-sm" (click)="openCreate()">
      <i class="fas fa-plus"></i> Raise NC
    </button>
  }
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">Non-Conformances <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>{{ lang.t('REFERENCE') }}</th><th>{{ lang.t('TITLE') }}</th><th>{{ lang.t('SOURCE') }}</th><th>{{ lang.t('DEPARTMENT') }}</th>
          <th>{{ lang.t('SEVERITY') }}</th><th>{{ lang.t('STATUS') }}</th><th>DETECTED</th><th>{{ lang.t('DUE DATE') }}</th><th>{{ lang.t('ASSIGNED') }}</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) { <tr><td colspan="9"><div class="skeleton-row"></div></td></tr> }
        }
        @for (nc of items(); track nc.id) {
          <tr class="row-hover" (click)="openDetail(nc)">
            <td><span class="mono-ref">{{ nc.reference_no }}</span></td>
            <td style="max-width:220px">
              <div class="text-truncate font-medium">{{ nc.title }}</div>
              @if (nc.category) { <div style="font-size:11px;color:var(--text3)">{{ nc.category.name }}</div> }
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ fmt(nc.source) }}</td>
            <td style="font-size:12px;color:var(--text2)">{{ nc.department?.name || '—' }}</td>
            <td><span class="badge" [class]="severityClass(nc.severity)">{{ nc.severity }}</span></td>
            <td><span class="badge" [class]="statusClass(nc.status)">{{ fmt(nc.status) }}</span></td>
            <td style="font-size:12px;color:var(--text2)">{{ nc.detection_date | date:'dd MMM yy' }}</td>
            <td style="font-size:12px" [style.color]="isOverdue(nc.target_closure_date) ? '#ef4444' : 'var(--text2)'">
              {{ nc.target_closure_date | date:'dd MMM yy' }}
              @if (isOverdue(nc.target_closure_date)) { <i class="fas fa-exclamation-circle" style="color:#ef4444"></i> }
            </td>
            <td>
              @if (nc.assigned_to) {
                <div class="avatar-xs" [title]="nc.assigned_to.name">{{ nc.assigned_to.name?.charAt(0) }}</div>
              } @else {
                <span style="color:var(--text3);font-size:12px">{{ lang.t('Unassigned') }}</span>
              }
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="9" class="empty-row">No non-conformances found</td></tr>
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

<!-- ====== RAISE NC MODAL ====== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i> Raise Non-Conformance</div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="Brief description of the non-conformance">
          </div>
          <div class="form-group">
            <label class="form-label">Severity *</label>
            <select class="form-control" [(ngModel)]="form.severity">
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Source *</label>
            <select class="form-control" [(ngModel)]="form.source">
              <option value="internal_audit">Internal Audit</option>
              <option value="external_audit">External Audit</option>
              <option value="client_complaint">Client Complaint</option>
              <option value="process_review">Process Review</option>
              <option value="supplier_issue">Supplier Issue</option>
              <option value="regulatory">Regulatory</option>
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
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="form.category_id">
              <option value="">— Select —</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Detection Date *</label>
            <input type="date" class="form-control" [(ngModel)]="form.detection_date">
          </div>
          <div class="form-group">
            <label class="form-label">Target Closure Date</label>
            <input type="date" class="form-control" [(ngModel)]="form.target_closure_date">
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Description *</label>
            <textarea class="form-control" rows="3" [(ngModel)]="form.description" placeholder="Detailed description of the non-conformance…"></textarea>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Immediate Action Taken</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.immediate_action" placeholder="Any immediate containment actions taken…"></textarea>
          </div>
        </div>

        <!-- ── Attachments ── -->
        <div style="margin-top:12px">
          <label class="form-label" style="margin-bottom:6px;display:block">📎 Attachments</label>
          <div [class.dz-over]="ncDragging()"
               (dragover)="ncDragOver($event)" (dragleave)="ncDragging.set(false)"
               (drop)="ncDrop($event)" (click)="ncFileInput.click()"
               style="border:2px dashed var(--border2,#2a3450);border-radius:8px;padding:14px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s">
            <span style="font-size:1.4rem">📎</span>
            <p style="margin:4px 0 2px;font-size:.85rem;color:var(--text2,#94a3b8)">Click or drag files here</p>
            <small style="color:#4b6390;font-size:.75rem">PDF, Word, Excel, Images · Max 20 MB</small>
            <input #ncFileInput type="file" multiple
                   accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                   style="display:none" (change)="ncFilePick($event)">
          </div>
          @if (ncAttachments().length > 0) {
            <ul style="list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px">
              @for (f of ncAttachments(); track f.path; let i = $index) {
                <li style="display:flex;align-items:center;gap:8px;background:var(--surface2,#0f1628);border:1px solid var(--border2,#1e2845);border-radius:6px;padding:6px 10px">
                  <span>{{ ncFileIcon(f.name) }}</span>
                  <span style="flex:1;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ f.name }}</span>
                  <span style="font-size:.72rem;color:#4b6390">{{ ncFmtSize(f.size) }}</span>
                  @if (f.uploading) { <span style="font-size:.72rem;color:#60a5fa">Uploading…</span> }
                  @else if (f.error) { <span style="font-size:.72rem;color:#f87171">{{ f.error }}</span> }
                  @else { <a [href]="f.url" target="_blank" style="font-size:.75rem;color:var(--accent,#4f8ef7);text-decoration:none">↗</a> }
                  <button type="button" (click)="ncRemoveFile(i)"
                          style="background:none;border:none;cursor:pointer;color:#4b6390;font-size:.85rem;padding:2px 4px">✕</button>
                </li>
              }
            </ul>
          }
        </div>

        @if (formError()) { <div class="alert-error" style="margin-top:8px">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-danger" (click)="submitNc()" [disabled]="saving() || ncAnyUploading()">
          <i class="fas fa-triangle-exclamation"></i> {{ saving() ? 'Saving…' : 'Raise NC' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== DETAIL MODAL ====== -->
@if (detailNc()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header">
        <div>
          <div class="modal-title">
            <i class="fas fa-triangle-exclamation" [style.color]="detailNc()!.severity==='critical'?'#ef4444':detailNc()!.severity==='major'?'#f59e0b':'#9ca3af'"></i>
            {{ detailNc()!.title }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            <span class="mono-ref">{{ detailNc()!.reference_no }}</span>
            · {{ fmt(detailNc()!.source) }}
            @if (detailNc()!.department) { · {{ detailNc()!.department.name }} }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="severityClass(detailNc()!.severity)">{{ detailNc()!.severity }}</span>
          <span class="badge" [class]="statusClass(detailNc()!.status)">{{ fmt(detailNc()!.status) }}</span>
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        @for (t of tabs; track t.key) {
          <button class="tab-btn" [class.active]="activeTab===t.key" (click)="activeTab=t.key">
            <i [class]="t.icon"></i> {{ t.label }}
          </button>
        }
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- TAB: Overview -->
        @if (activeTab === 'overview') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
              <div class="detail-section">
                <div class="detail-section-title">NC Details</div>
                <div class="detail-row"><span>Reference No</span><span class="mono-ref">{{ detailNc()!.reference_no }}</span></div>
                <div class="detail-row"><span>Severity</span><span><span class="badge" [class]="severityClass(detailNc()!.severity)">{{ detailNc()!.severity }}</span></span></div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detailNc()!.status)">{{ fmt(detailNc()!.status) }}</span></span></div>
                <div class="detail-row"><span>Source</span><span>{{ fmt(detailNc()!.source) }}</span></div>
                <div class="detail-row"><span>Category</span><span>{{ detailNc()!.category?.name || '—' }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detailNc()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Detected By</span><span>{{ detailNc()!.detected_by?.name || '—' }}</span></div>
                <div class="detail-row"><span>Assigned To</span><span>{{ detailNc()!.assigned_to?.name || 'Unassigned' }}</span></div>
                <div class="detail-row"><span>Detection Date</span><span>{{ detailNc()!.detection_date | date:'dd MMM yyyy' }}</span></div>
                <div class="detail-row"><span>Target Closure</span>
                  <span [style.color]="isOverdue(detailNc()!.target_closure_date) ? '#ef4444' : 'inherit'">
                    {{ detailNc()!.target_closure_date ? (detailNc()!.target_closure_date | date:'dd MMM yyyy') : '—' }}
                  </span>
                </div>
                @if (detailNc()!.actual_closure_date) {
                  <div class="detail-row"><span>Actual Closure</span><span style="color:#10b981">{{ detailNc()!.actual_closure_date | date:'dd MMM yyyy' }}</span></div>
                }
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Description</div>
                <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailNc()!.description }}</p>
              </div>
              @if (detailNc()!.immediate_action) {
                <div class="detail-section">
                  <div class="detail-section-title">Immediate Action Taken</div>
                  <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailNc()!.immediate_action }}</p>
                </div>
              }
              @if (detailNc()!.root_cause) {
                <div class="detail-section">
                  <div class="detail-section-title">Root Cause</div>
                  <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailNc()!.root_cause }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB: Investigation -->
        @if (activeTab === 'investigate') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
              <div class="detail-section" style="margin-bottom:14px">
                <div class="detail-section-title">Assign Investigator</div>
                <div style="display:flex;gap:8px">
                  <select class="form-control" [(ngModel)]="assignUserId" style="flex:1">
                    <option value="">— Select user —</option>
                    @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                  </select>
                  <button class="btn btn-primary btn-sm" (click)="doAssign()" [disabled]="!assignUserId">
                    <i class="fas fa-user-check"></i> Assign
                  </button>
                </div>
                @if (detailNc()!.assigned_to) {
                  <div style="margin-top:8px;font-size:13px;color:var(--text2)">
                    Currently assigned to: <strong>{{ detailNc()!.assigned_to.name }}</strong>
                  </div>
                }
              </div>
              @if (['under_investigation','capa_in_progress','pending_capa'].includes(detailNc()!.status)) {
                <div class="detail-section">
                  <div class="detail-section-title">Root Cause Analysis</div>
                  <textarea class="form-control" rows="5" [(ngModel)]="rootCauseDraft" style="margin-bottom:10px" placeholder="Document the root cause of this non-conformance…">{{ detailNc()!.root_cause }}</textarea>
                  <button class="btn btn-primary btn-sm" (click)="doSaveRootCause()">
                    <i class="fas fa-save"></i> Save Root Cause
                  </button>
                </div>
              }
            </div>
            <div>
              @if (detailNc()!.status !== 'closed' && detailNc()!.status !== 'cancelled' && canCreate()) {
                <div class="detail-section" style="margin-bottom:14px">
                  <div class="detail-section-title">Raise CAPA</div>
                  <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Create a Corrective / Preventive Action linked to this NC.</p>
                  <button class="btn btn-primary btn-sm" (click)="goToCreateCapa()">
                    <i class="fas fa-circle-check"></i> Create CAPA
                  </button>
                </div>
              }
              @if (detailNc()!.status !== 'closed' && detailNc()!.status !== 'cancelled') {
                <div class="detail-section">
                  <div class="detail-section-title">Close NC</div>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <input type="date" class="form-control" [(ngModel)]="closureDate" placeholder="Actual closure date">
                    <textarea class="form-control" rows="3" [(ngModel)]="closureRootCause" placeholder="Final root cause (optional)…"></textarea>
                    <button class="btn btn-sm" style="background:#10b981;color:#fff" (click)="doClose()" [disabled]="!closureDate">
                      <i class="fas fa-check-circle"></i> Close NC
                    </button>
                  </div>
                </div>
              }
              @if (detailNc()!.status === 'closed') {
                <div class="detail-section" style="border-color:#10b981">
                  <div style="display:flex;align-items:center;gap:10px">
                    <i class="fas fa-check-circle" style="font-size:24px;color:#10b981"></i>
                    <div>
                      <div style="font-weight:700;color:#10b981">NC Closed</div>
                      <div style="font-size:12px;color:var(--text2)">{{ detailNc()!.actual_closure_date | date:'dd MMM yyyy' }}</div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB: Linked CAPAs -->
        @if (activeTab === 'capas') {
          <!-- Create CAPA form -->
          @if (!showCapaForm) {
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div style="font-size:13px;color:var(--text2)">{{ detailNc()!.capas?.length || 0 }} CAPA(s) linked to this NC</div>
              @if (detailNc()!.status !== 'closed' && detailNc()!.status !== 'cancelled' && canCreate()) {
                <button class="btn btn-primary btn-sm" (click)="showCapaForm=true">
                  <i class="fas fa-plus"></i> Create CAPA
                </button>
              }
            </div>
          }

          @if (showCapaForm) {
            <div class="detail-section" style="margin-bottom:16px;border-color:var(--accent)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div class="detail-section-title" style="margin:0">Create CAPA for {{ detailNc()!.reference_no }}</div>
                <button class="btn btn-secondary btn-xs" (click)="showCapaForm=false"><i class="fas fa-times"></i></button>
              </div>
              <div class="form-grid">
                <div class="form-group" style="grid-column:span 2">
                  <label class="form-label">CAPA Title *</label>
                  <input class="form-control" [(ngModel)]="capaForm.title" placeholder="e.g. Implement corrective measures for process gap">
                </div>
                <div class="form-group">
                  <label class="form-label">Type *</label>
                  <select class="form-control" [(ngModel)]="capaForm.type">
                    <option value="corrective">Corrective Action</option>
                    <option value="preventive">Preventive Action</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Priority *</label>
                  <select class="form-control" [(ngModel)]="capaForm.priority">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Target Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="capaForm.target_date">
                </div>
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <select class="form-control" [(ngModel)]="capaForm.department_id">
                    <option value="">— Select —</option>
                    @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
                  </select>
                </div>
                <div class="form-group" style="grid-column:span 2">
                  <label class="form-label">Description *</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="capaForm.description" placeholder="What needs to be done and why…"></textarea>
                </div>
                <div class="form-group" style="grid-column:span 2">
                  <label class="form-label">Root Cause Analysis</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="capaForm.root_cause_analysis" [placeholder]="detailNc()!.root_cause || 'Root cause identified…'"></textarea>
                </div>
                <div class="form-group" style="grid-column:span 2">
                  <label class="form-label">Action Plan</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="capaForm.action_plan" placeholder="Steps to address the root cause…"></textarea>
                </div>
                <div class="form-group" style="grid-column:span 2">
                  <label class="form-label">Effectiveness Criteria</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="capaForm.effectiveness_criteria" placeholder="How will we measure success…"></textarea>
                </div>
              </div>
              @if (capaFormError()) { <div class="alert-error">{{ capaFormError() }}</div> }
              <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
                <button class="btn btn-secondary btn-sm" (click)="showCapaForm=false">Cancel</button>
                <button class="btn btn-primary btn-sm" (click)="doCreateCapa()" [disabled]="savingCapa()">
                  <i class="fas fa-circle-check"></i> {{ savingCapa() ? 'Creating…' : 'Create CAPA' }}
                </button>
              </div>
            </div>
          }

          <!-- CAPA list -->
          @if (detailNc()!.capas?.length) {
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (capa of detailNc()!.capas; track capa.id) {
                <div style="padding:14px;border:1px solid var(--border);border-left:3px solid;border-radius:10px;display:flex;justify-content:space-between;align-items:flex-start"
                     [style.border-left-color]="capa.status==='closed'?'#10b981':capa.type==='corrective'?'var(--accent)':'#8b5cf6'">
                  <div>
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
                      <span class="mono-ref">{{ capa.reference_no }}</span>
                      <span class="badge" [class]="capa.type==='corrective'?'badge-blue':'badge-purple'">{{ capa.type }}</span>
                      <span class="badge" [class]="capaStatusClass(capa.status)">{{ fmt(capa.status) }}</span>
                    </div>
                    <div style="font-weight:600;font-size:13px;margin-bottom:4px">{{ capa.title }}</div>
                    <div style="font-size:12px;color:var(--text2)">
                      Owner: {{ capa.owner?.name || '—' }} ·
                      Due: <span [style.color]="isOverdue(capa.target_date)&&capa.status!=='closed'?'#ef4444':'inherit'">{{ capa.target_date | date:'dd MMM yyyy' }}</span>
                    </div>
                  </div>
                  <span class="badge" [class]="priorityClass(capa.priority)">{{ capa.priority }}</span>
                </div>
              }
            </div>
          } @else if (!showCapaForm) {
            <div class="empty-row" style="padding:30px">
              <i class="fas fa-circle-check" style="font-size:28px;color:var(--text3);margin-bottom:8px;display:block"></i>
              No CAPAs created yet.
              @if (detailNc()!.status !== 'closed') {
                <div style="margin-top:8px"><button class="btn btn-primary btn-sm" (click)="showCapaForm=true"><i class="fas fa-plus"></i> Create First CAPA</button></div>
              }
            </div>
          }
        }

      </div><!-- end scroll area -->

      <!-- Footer workflow buttons -->
      <div class="modal-footer" style="border-top:1px solid var(--border)">
        <div style="display:flex;gap:8px">
          @if (canCreate()) {
            @if (detailNc()!.status === 'open') {
              <button class="btn btn-primary btn-sm" (click)="activeTab='investigate'">
                <i class="fas fa-search"></i> Start Investigation
              </button>
            }
            @if (detailNc()!.status === 'under_investigation' || detailNc()!.status === 'pending_capa') {
              <button class="btn btn-primary btn-sm" (click)="goToCreateCapa()">
                <i class="fas fa-circle-check"></i> Create CAPA
              </button>
            }
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
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:100px;text-align:center}
    .stat-num{font-family:'Inter',sans-serif;font-size:26px;font-weight:800}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .row-hover{cursor:pointer}.row-hover:hover td{background:rgba(239,68,68,.04)}
    .text-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .font-medium{font-weight:600}
    .avatar-xs{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2,#8b5cf6));display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:40px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px;margin-top:8px}
    .btn-danger{background:#ef4444;color:#fff}
    .modal-lg{max-width:720px}
    .modal-xl{max-width:960px;width:95vw}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface);flex-shrink:0}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s;white-space:nowrap}
    .tab-btn.active{color:#ef4444;border-bottom-color:#ef4444}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .badge-purple{background:rgba(139,92,246,.15);color:#8b5cf6;border:1px solid rgba(139,92,246,.2)}
  `]
})
export class NcListComponent implements OnInit, OnDestroy {
  // ── NC attachment state ────────────────────────────────────────────────
  ncAttachments  = signal<{name:string;size:number;path:string;url:string;uploading:boolean;error:string|null}[]>([]);
  ncDragging     = signal(false);
  ncAnyUploading = computed(() => this.ncAttachments().some(f => f.uploading));

  items       = signal<any[]>([]);
  loading     = signal(true);
  total       = signal(0);
  page        = signal(1);
  totalPages  = signal(1);
  statsCards  = signal<any[]>([]);
  detailNc    = signal<any>(null);
  categories  = signal<any[]>([]);
  users       = signal<any[]>([]);
  departments = signal<any[]>([]);
  toast = signal<{msg:string,type:string}|null>(null);

  search = ''; filterStatus = ''; filterSeverity = ''; filterSource = '';
  showForm = false; saving = signal(false); formError = signal('');
  activeTab = 'overview';
  assignUserId = '';
  rootCauseDraft = '';
  closureDate = '';
  closureRootCause = '';
  showCapaForm = false;
  savingCapa = signal(false);
  capaFormError = signal('');
  capaForm: any = {
    title: '', type: 'corrective', priority: 'medium', target_date: '',
    description: '', root_cause_analysis: '', action_plan: '',
    effectiveness_criteria: '', department_id: ''
  };

  form: any = {
    title: '', description: '', severity: 'major', source: 'internal_audit',
    detection_date: new Date().toISOString().split('T')[0],
    target_closure_date: '', immediate_action: '', category_id: '', department_id: ''
  };

  tabs = [
    { key: 'overview',    label: 'Overview',    icon: 'fas fa-info-circle' },
    { key: 'investigate', label: 'Investigation', icon: 'fas fa-search' },
    { key: 'capas',       label: 'CAPAs',        icon: 'fas fa-circle-check' },
  ];

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private http: HttpClient, private svc: NcCapaService, private uiEvents: UiEventService, public lang: LanguageService, private auth: AuthService) {}

  canCreate = computed(() => {
    const perms: string[] = this.auth.currentUser()?.role?.permissions || [];
    return perms.includes('*') || perms.includes('nc.create') || perms.some((p: string) => p === 'nc.*');
  });

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => { if (this.canCreate()) this.openCreate(); });
    this.load();
    this.loadStats();
    this.svc.ncCategories().subscribe({ next: (r: any) => this.categories.set(r || []) });
    this.svc.ncUsers().subscribe({ next: (r: any) => this.users.set(r || []) });
    this.svc.ncDepartments().subscribe({ next: (r: any) => this.departments.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus)   p.status   = this.filterStatus;
    if (this.filterSeverity) p.severity = this.filterSeverity;
    if (this.filterSource)   p.source   = this.filterSource;
    if (this.search)         p.search   = this.search;
    this.svc.listNcs(p).subscribe({
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
    this.svc.ncStats().subscribe({
      next: (s: any) => this.statsCards.set([
        { label: 'Total',            value: s.total ?? 0,            color: 'var(--text1)' },
        { label: 'Open',             value: s.open ?? 0,             color: 'var(--accent)' },
        { label: 'Critical',         value: s.critical ?? 0,         color: '#ef4444' },
        { label: 'Overdue',          value: s.overdue ?? 0,          color: '#ef4444' },
        { label: 'Closed This Month',value: s.closed_this_month ?? 0,color: '#10b981' },
      ]),
      error: () => {}
    });
  }

  openCreate() {
    this.form = {
      title: '', description: '', severity: 'major', source: 'internal_audit',
      detection_date: new Date().toISOString().split('T')[0],
      target_closure_date: '', immediate_action: '', category_id: '', department_id: ''
    };
    this.formError.set('');
    this.showForm = true;
  }

  // ── NC attachment helpers ──────────────────────────────────────────────
  ncDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.ncDragging.set(true); }
  ncDrop(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.ncDragging.set(false); Array.from(e.dataTransfer?.files??[]).forEach(f=>this.ncUploadFile(f)); }
  ncFilePick(e: Event) { Array.from((e.target as HTMLInputElement).files??[]).forEach(f=>this.ncUploadFile(f)); (e.target as HTMLInputElement).value=''; }
  ncRemoveFile(i: number) {
    const f = this.ncAttachments()[i];
    if (f.path) this.http.delete(`${environment.apiUrl}/attachments/delete`,{body:{path:f.path}}).subscribe();
    this.ncAttachments.update(l=>l.filter((_,j)=>j!==i));
  }
  private ncUploadFile(file: File) {
    if (file.size > 20*1024*1024) { alert(`"${file.name}" exceeds 20 MB`); return; }
    const entry = {name:file.name,size:file.size,path:'',url:'',uploading:true,error:null as string|null};
    this.ncAttachments.update(l=>[...l,entry]);
    const idx = this.ncAttachments().length-1;
    const fd = new FormData(); fd.append('file',file); fd.append('module','nc');
    this.http.post<{data:{path:string;url:string}}>(`${environment.apiUrl}/attachments/upload`,fd).subscribe({
      next: r => this.ncAttachments.update(l=>l.map((f,i)=>i===idx?{...f,path:r.data.path,url:r.data.url,uploading:false}:f)),
      error:(e:HttpErrorResponse)=>this.ncAttachments.update(l=>l.map((f,i)=>i===idx?{...f,uploading:false,error:e.error?.message||'Upload failed'}:f))
    });
  }
  ncFileIcon(n:string){const m:Record<string,string>={pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📰',pptx:'📰',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',txt:'📃',csv:'📊'};return m[n.split('.').pop()?.toLowerCase()??'']??'📎';}
  ncFmtSize(b:number){if(!b)return'';if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}

  submitNc() {
    if (!this.form.title || !this.form.description) {
      this.formError.set('Title and description are required.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const ncPayload = {...this.form, attachments: this.ncAttachments().filter(f=>f.path&&!f.error&&!f.uploading).map(f=>f.path)};
    this.svc.createNc(ncPayload).subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.ncAttachments.set([]); this.page.set(1); this.load(); this.loadStats(); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat()[0] as string || 'Failed.'); }
    });
  }

  openDetail(nc: any) {
    this.svc.getNc(nc.id).subscribe({
      next: (r: any) => {
        this.detailNc.set(r);
        this.activeTab = 'overview';
        this.assignUserId = '';
        this.rootCauseDraft = r.root_cause || '';
        this.closureDate = '';
        this.closureRootCause = '';
      }
    });
  }

  closeDetail() { this.detailNc.set(null); this.showCapaForm = false; }

  reloadDetail() {
    const id = this.detailNc()?.id;
    if (id) this.svc.getNc(id).subscribe({ next: (r: any) => this.detailNc.set(r) });
  }

  doAssign() {
    const nc = this.detailNc(); if (!nc || !this.assignUserId) return;
    this.svc.assignNc(nc.id, Number(this.assignUserId)).subscribe({
      next: () => { this.reloadDetail(); this.load(); this.loadStats(); this.assignUserId = ''; },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed to assign', 'error')
    });
  }

  doSaveRootCause() {
    const nc = this.detailNc(); if (!nc) return;
    this.svc.startInvestigation(nc.id, this.rootCauseDraft).subscribe({
      next: () => { this.reloadDetail(); this.load(); },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed', 'error')
    });
  }

  goToCreateCapa() {
    this.showCapaForm = true;
    this.capaForm = {
      title: '', type: 'corrective', priority: 'medium', target_date: '',
      description: '', root_cause_analysis: this.detailNc()?.root_cause || '',
      action_plan: '', effectiveness_criteria: '', department_id: ''
    };
    this.capaFormError.set('');
    this.activeTab = 'capas';
  }

  doCreateCapa() {
    const nc = this.detailNc(); if (!nc) return;
    if (!this.capaForm.title || !this.capaForm.description || !this.capaForm.target_date) {
      this.capaFormError.set('Title, description and target date are required.');
      return;
    }
    this.savingCapa.set(true);
    this.capaFormError.set('');
    const payload: any = { ...this.capaForm, nc_id: nc.id };
    if (!payload.department_id) delete payload.department_id;
    this.svc.createCapa(payload).subscribe({
      next: () => {
        this.savingCapa.set(false);
        this.showCapaForm = false;
        this.reloadDetail();
        this.load();
        this.loadStats();
      },
      error: (e: any) => {
        this.savingCapa.set(false);
        const msg = e?.error?.message
          || (e?.error?.errors ? Object.values(e.error.errors).flat().join(', ') : null)
          || e?.message
          || `Server error (${e?.status || 'unknown'})`;
        this.capaFormError.set(msg);
      }
    });
  }

  doClose() {
    const nc = this.detailNc(); if (!nc || !this.closureDate) return;
    this.svc.closeNc(nc.id, { actual_closure_date: this.closureDate, root_cause: this.closureRootCause || nc.root_cause }).subscribe({
      next: () => { this.reloadDetail(); this.load(); this.loadStats(); },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed to close NC', 'error')
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }
  isOverdue(d: string) { return d && new Date(d) < new Date() ? true : false; }
  severityClass(s: string) { return { minor: 'badge-draft', major: 'badge-yellow', critical: 'badge-red' }[s] || 'badge-draft'; }
  statusClass(s: string) { return { open: 'badge-draft', under_investigation: 'badge-yellow', capa_in_progress: 'badge-blue', pending_capa: 'badge-orange', closed: 'badge-green', cancelled: 'badge-draft' }[s] || 'badge-draft'; }
  capaStatusClass(s: string) { return { draft: 'badge-draft', open: 'badge-draft', in_progress: 'badge-blue', effectiveness_review: 'badge-yellow', closed: 'badge-green', cancelled: 'badge-draft' }[s] || 'badge-draft'; }
  priorityClass(p: string) { return { low: 'badge-draft', medium: 'badge-yellow', high: 'badge-orange', critical: 'badge-red' }[p] || 'badge-draft'; }
  fmt(s: string | null | undefined): string { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()); }
  
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
