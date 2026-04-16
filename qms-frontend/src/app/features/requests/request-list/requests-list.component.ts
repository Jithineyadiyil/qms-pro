import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestsService } from '../../../core/services/requests.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `

<!-- ══════════ STATS ══════════ -->
<div class="stats-row">
  @for (s of statsCards(); track s.label) {
    <div class="stat-card" [style.border-top]="'3px solid ' + s.color"
         (click)="s.filter && setTab(s.filter)" [style.cursor]="s.filter ? 'pointer':''">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<!-- ══════════ WORKFLOW BANNER ══════════ -->
@if (isEmployee()) {
  <div class="workflow-banner employee-banner">
    <i class="fas fa-circle-info"></i>
    <div>
      <strong>How it works:</strong>
      Submit your request → your <strong>Department Manager</strong> reviews →
      if approved it goes to the <strong>Quality Department</strong> for processing.
    </div>
  </div>
}
@if (isDeptManager()) {
  <div class="workflow-banner mgr-banner">
    <i class="fas fa-stamp"></i>
    <div>
      <strong>Department Manager View:</strong>
      Review and approve/reject requests submitted by your team.
      Approved requests are forwarded to the Quality Department.
    </div>
  </div>
}
@if (isQAManager()) {
  <div class="workflow-banner qa-banner">
    <i class="fas fa-user-gear"></i>
    <div>
      <strong>QA Manager View:</strong>
      Quality requests approved by Department Managers are <strong>automatically assigned to you</strong>.
      Review them in your <strong>QA Inbox</strong> and assign each one to a QA Officer or Specialist to process.
    </div>
  </div>
}
@if (isQAOfficer() && !isComplianceMgr()) {
  <div class="workflow-banner officer-banner">
    <i class="fas fa-clipboard-check"></i>
    <div>
      <strong>QA Officer View:</strong>
      Process Quality requests assigned to you. Close each request with a resolution summary.
    </div>
  </div>
}
@if (isComplianceMgr()) {
  <div class="workflow-banner" style="background:rgba(139,92,246,.08);border-left:3px solid #a78bfa">
    <i class="fas fa-scale-balanced" style="color:#a78bfa"></i>
    <div>
      <strong>Compliance Manager View:</strong>
      Compliance requests approved by Department Managers are <strong>automatically routed to you</strong>.
      Review your <strong>Compliance Inbox</strong> and assign each request to a Compliance Officer to action.
    </div>
  </div>
}
@if (isComplianceOfc()) {
  <div class="workflow-banner" style="background:rgba(139,92,246,.06);border-left:3px solid rgba(139,92,246,.4)">
    <i class="fas fa-user-lock" style="color:#a78bfa"></i>
    <div>
      <strong>Compliance Officer View:</strong>
      Process compliance requests assigned to you. Close each with a resolution and findings summary.
    </div>
  </div>
}

<!-- ══════════ TABS ══════════ -->
<div class="tab-row">
  @for (t of visibleTabs(); track t.key) {
    <button class="tab-pill" [class.active]="activeTab===t.key" (click)="setTab(t.key)">
      <i [class]="t.icon"></i> {{ t.label }}
      @if (tabCount(t.key) > 0) {
        <span class="tab-cnt">{{ tabCount(t.key) }}</span>
      }
    </button>
  }
</div>

<!-- ══════════ TOOLBAR ══════════ -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" [placeholder]="lang.t('Search requests…')">
    @if (!isEmployee()) {
      <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="approved">With QA Manager</option>
        <option value="in_progress">In Progress</option>
        <option value="rejected">Rejected</option>
        <option value="closed">Closed</option>
      </select>
    }
    <select class="select-sm" [(ngModel)]="filterPriority" (change)="load()">
      <option value="">All Priorities</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  </div>
  @if (canCreate()) {
    <button class="btn btn-primary btn-sm" (click)="openCreate()">
      <i class="fas fa-plus"></i> New Request
    </button>
  }
</div>

<!-- ══════════ TABLE ══════════ -->
<div class="card" style="padding:0">
  <div class="card-header" style="padding:16px 20px;margin-bottom:0">
    <div class="card-title">
      Requests <span class="badge badge-blue" style="margin-left:6px">{{ total() }}</span>
    </div>
    @if (statsRaw().overdue > 0) {
      <span class="badge badge-red" style="font-size:11px">
        <i class="fas fa-exclamation-triangle"></i> {{ statsRaw().overdue }} overdue
      </span>
    }
  </div>

  <div style="overflow-x:auto;border-top:1px solid var(--border)">
    <table class="table">
      <thead>
        <tr>
          <th>REFERENCE</th>
          <th>TITLE</th>
          <th>CATEGORY</th>
          <th>PRIORITY</th>
          <th>STATUS</th>
          <th>SUBMITTED BY</th>
          @if (!isEmployee()) { <th>DEPARTMENT</th> }
          @if (isQAManager() || isQAOfficer() || isCompliance()) { <th>ASSIGNED TO</th> }
          <th>DUE DATE</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <tr><td colspan="9"><div class="skeleton-row"></div></td></tr>
          }
        }
        @for (r of items(); track r.id) {
          <tr class="row-hover" (click)="openDetail(r)">
            <td><span class="mono-ref">{{ r.reference_no }}</span></td>
            <td style="max-width:220px">
              <div class="text-truncate font-medium">{{ r.title }}</div>
              <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
                <span class="dept-pill" [class]="r.target_department==='compliance' ? 'dept-pill--purple' : 'dept-pill--blue'">
                  <i [class]="r.target_department==='compliance' ? 'fas fa-scale-balanced' : 'fas fa-award'"></i>
                  {{ r.target_department==='compliance' ? 'Compliance' : 'Quality' }}
                </span>
                @if (r.description) {
                  <span style="font-size:11px;color:var(--text2)" class="text-truncate">{{ r.description | slice:0:50 }}</span>
                }
              </div>
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ r.category?.name || '—' }}</td>
            <td><span class="badge" [class]="priorityClass(r.priority)">{{ r.priority }}</span></td>
            <td><span class="badge" [class]="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
            <td style="font-size:12px;color:var(--text2)">{{ r.requester?.name || '—' }}</td>
            @if (!isEmployee()) {
              <td style="font-size:12px;color:var(--text2)">{{ r.department?.name || '—' }}</td>
            }
            @if (isQAManager() || isQAOfficer()) {
              <td>
                @if (r.assignee) {
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="avatar-xs" [title]="r.assignee.name">{{ r.assignee.name?.charAt(0) }}</div>
                    <span style="font-size:12px;color:var(--text2)">{{ r.assignee.name }}</span>
                  </div>
                } @else {
                  <span style="font-size:11px;color:var(--text3)">Unassigned</span>
                }
              </td>
            }
            <td style="font-size:12px" [style.color]="isOverdue(r.due_date, r.status) ? 'var(--danger)' : 'var(--text2)'">
              {{ r.due_date ? (r.due_date | date:'dd MMM yy') : '—' }}
              @if (isOverdue(r.due_date, r.status)) { <i class="fas fa-circle-exclamation" style="margin-left:4px"></i> }
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="9" class="empty-row">
            @if (activeTab === 'qa_queue') { No approved requests waiting in QA queue. }
            @else if (activeTab === 'my_approval') { No requests pending your approval. }
            @else if (activeTab === 'my_tasks') { No requests assigned to you. }
            @else { No requests found. }
          </td></tr>
        }
      </tbody>
    </table>
  </div>

  <div class="pagination">
    <span class="page-info">{{ total() }} total</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()">
      <i class="fas fa-chevron-left"></i>
    </button>
    <span style="font-size:12px;color:var(--text2)">{{ page() }} / {{ totalPages() }}</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()">
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</div>


<!-- ═══════════════ CREATE MODAL ═══════════════ -->
@if (showForm && canCreate()) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-inbox" style="color:var(--accent);margin-right:8px"></i>New Request</div>
        <button class="icon-btn modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">

        <!-- ── Send To selector ── -->
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" style="margin-bottom:8px">Send To <span style="color:#ef4444">*</span></label>
          <div class="dest-row">
            <button type="button" class="dest-btn" [class.dest-btn--active]="form.target_department==='quality'"
              (click)="form.target_department='quality'">
              <div class="dest-btn-icon dest-btn-icon--blue"><i class="fas fa-award"></i></div>
              <div>
                <div class="dest-btn-title">Quality Department</div>
                <div class="dest-btn-sub">NC/CAPA · Audits · Documents · Improvement</div>
              </div>
              <div class="dest-btn-check" [class.on]="form.target_department==='quality'">
                <i class="fas fa-check"></i>
              </div>
            </button>
            <button type="button" class="dest-btn" [class.dest-btn--active]="form.target_department==='compliance'"
              (click)="form.target_department='compliance'">
              <div class="dest-btn-icon dest-btn-icon--purple"><i class="fas fa-scale-balanced"></i></div>
              <div>
                <div class="dest-btn-title">Compliance Department</div>
                <div class="dest-btn-sub">Regulatory · Risk · Policy · Complaints</div>
              </div>
              <div class="dest-btn-check" [class.on]="form.target_department==='compliance'">
                <i class="fas fa-check"></i>
              </div>
            </button>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group fg-full">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="Brief summary of your request">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="form.category_id">
              <option value="">— Select category —</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority *</label>
            <select class="form-control" [(ngModel)]="form.priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="internal">Internal</option>
              <option value="external">External</option>
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
              <option value="regulatory">Regulatory</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-control" [(ngModel)]="form.due_date">
          </div>
          <div class="form-group fg-full">
            <label class="form-label">Description *</label>
            <textarea class="form-control" rows="4" [(ngModel)]="form.description"
              placeholder="Describe your request in detail…"></textarea>
          </div>
        </div>

        <!-- Dynamic routing note -->
        <div class="info-note" [style.border-color]="form.target_department==='compliance' ? 'rgba(139,92,246,.3)' : 'rgba(59,130,246,.2)'"
             [style.background]="form.target_department==='compliance' ? 'rgba(139,92,246,.06)' : 'rgba(59,130,246,.06)'">
          <i class="fas fa-route" [style.color]="form.target_department==='compliance' ? '#a78bfa' : 'var(--accent)'"></i>
          Your request will go to your <strong>Department Manager</strong> for approval, then forwarded to the
          <strong>{{ form.target_department === 'compliance' ? 'Compliance Manager' : 'QA Manager' }}</strong>.
        </div>

        @if (formError()) {
          <div class="alert-error" style="margin-top:8px">{{ formError() }}</div>
        }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-secondary" (click)="submit('draft')" [disabled]="saving()">
          <i class="fas fa-save"></i> Save Draft
        </button>
        <button class="btn btn-primary" (click)="submit('submit')" [disabled]="saving()">
          <i class="fas fa-paper-plane"></i> {{ saving() ? 'Submitting…' : 'Submit Request' }}
        </button>
      </div>
    </div>
  </div>
}


<!-- ═══════════════ DETAIL MODAL ═══════════════ -->
@if (detail()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:92vh;overflow:hidden;display:flex;flex-direction:column">

      <!-- Header -->
      <div class="modal-header" style="flex-shrink:0">
        <div>
          <div class="modal-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <i class="fas fa-inbox" style="color:var(--accent)"></i>
            {{ detail()!.title }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="mono-ref">{{ detail()!.reference_no }}</span>
            <span>·</span>
            <span class="badge" [class]="statusClass(detail()!.status)">{{ statusLabel(detail()!.status) }}</span>
            <span>·</span>
            <span class="badge" [class]="priorityClass(detail()!.priority)">{{ detail()!.priority }}</span>
          </div>
        </div>
        <button class="icon-btn modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
      </div>

      <!-- Tabs -->
      <div class="tab-bar" style="flex-shrink:0">
        <button class="tab-btn" [class.active]="dTab==='details'" (click)="dTab='details'">
          <i class="fas fa-info-circle"></i> Details
        </button>
        <button class="tab-btn" [class.active]="dTab==='workflow'" (click)="dTab='workflow'">
          <i class="fas fa-diagram-project"></i> Workflow
          @if (pendingActionCount() > 0) { <span class="tab-cnt-red">{{ pendingActionCount() }}</span> }
        </button>
        <button class="tab-btn" [class.active]="dTab==='comments'" (click)="dTab='comments';loadComments()">
          <i class="fas fa-comments"></i> Comments
        </button>
        <button class="tab-btn" [class.active]="dTab==='approvals'" (click)="dTab='approvals';loadApprovals()">
          <i class="fas fa-check-double"></i> Approval Log
        </button>
      </div>

      <!-- Tab content -->
      <div style="flex:1;overflow-y:auto;padding:20px 24px">

        <!-- ── DETAILS TAB ── -->
        @if (dTab === 'details') {
          <div class="two-col">
            <div style="display:flex;flex-direction:column;gap:12px">
              <div class="detail-section">
                <div class="detail-section-title">Request Information</div>
                <div class="detail-row"><span>Reference</span><span class="mono-ref">{{ detail()!.reference_no }}</span></div>
                <div class="detail-row"><span>Category</span><span>{{ detail()!.category?.name || '—' }}</span></div>
                <div class="detail-row"><span>Type</span><span>{{ fmt(detail()!.type) }}</span></div>
                <div class="detail-row"><span>Priority</span>
                  <span><span class="badge" [class]="priorityClass(detail()!.priority)">{{ detail()!.priority }}</span></span>
                </div>
                <div class="detail-row"><span>Status</span>
                  <span><span class="badge" [class]="statusClass(detail()!.status)">{{ statusLabel(detail()!.status) }}</span></span>
                </div>
                <div class="detail-row"><span>Submitted By</span><span>{{ detail()!.requester?.name || '—' }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detail()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Assigned To</span>
                  <span>{{ detail()!.assignee?.name || 'Unassigned' }}</span>
                </div>
                <div class="detail-row"><span>Due Date</span>
                  <span [style.color]="isOverdue(detail()!.due_date, detail()!.status) ? 'var(--danger)' : ''">
                    {{ detail()!.due_date ? (detail()!.due_date | date:'dd MMM yyyy') : '—' }}
                  </span>
                </div>
                @if (detail()!.closed_at) {
                  <div class="detail-row"><span>Closed</span>
                    <span style="color:var(--success)">{{ detail()!.closed_at | date:'dd MMM yyyy' }}</span>
                  </div>
                }
              </div>

              <!-- Journey / Stage indicator -->
              <div class="detail-section">
                <div class="detail-section-title">Request Journey</div>
                <div class="journey-steps">
                  <div class="journey-step" [class.done]="stepDone('submitted')" [class.active]="stepActive('submitted')">
                    <div class="journey-dot"><i class="fas fa-paper-plane"></i></div>
                    <div class="journey-label">Submitted</div>
                  </div>
                  <div class="journey-line" [class.done]="stepDone('approved')"></div>
                  <div class="journey-step" [class.done]="stepDone('approved')" [class.active]="stepActive('approved')">
                    <div class="journey-dot"><i class="fas fa-inbox"></i></div>
                    <div class="journey-label">{{ detail()!.target_department === 'compliance' ? 'Compliance Mgr' : 'QA Manager' }}</div>
                  </div>
                  <div class="journey-line" [class.done]="stepDone('in_progress')"></div>
                  <div class="journey-step" [class.done]="stepDone('in_progress')" [class.active]="stepActive('in_progress')">
                    <div class="journey-dot"><i class="fas fa-user-gear"></i></div>
                    <div class="journey-label">{{ detail()!.target_department === 'compliance' ? 'Compliance' : 'QA' }} Processing</div>
                  </div>
                  <div class="journey-line" [class.done]="stepDone('closed')"></div>
                  <div class="journey-step" [class.done]="stepDone('closed')" [class.active]="stepActive('closed')">
                    <div class="journey-dot"><i class="fas fa-circle-check"></i></div>
                    <div class="journey-label">Closed</div>
                  </div>
                </div>
                @if (detail()!.status === 'rejected') {
                  <div style="margin-top:10px;padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:6px;font-size:12px;color:var(--danger)">
                    <i class="fas fa-times-circle" style="margin-right:6px"></i>
                    This request was rejected by the Department Manager.
                  </div>
                }
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px">
              <div class="detail-section">
                <div class="detail-section-title">Description</div>
                <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.7;white-space:pre-wrap">{{ detail()!.description }}</p>
              </div>

              @if (detail()!.resolution) {
                <div class="detail-section" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.03)">
                  <div class="detail-section-title" style="color:var(--success)">
                    <i class="fas fa-check-circle"></i> Resolution
                  </div>
                  <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.7;white-space:pre-wrap">{{ detail()!.resolution }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- ── WORKFLOW TAB ── -->
        @if (dTab === 'workflow') {
          <div style="display:flex;flex-direction:column;gap:16px">

            <!-- EMPLOYEE: can submit draft -->
            @if (isEmployee() && detail()!.requester_id === currentUserId()) {
              @if (detail()!.status === 'draft') {
                <div class="action-card action-card-blue">
                  <div class="action-card-title"><i class="fas fa-paper-plane"></i> Submit Your Request</div>
                  <p class="action-card-desc">Your request is saved as a draft. Submit it to send it to your Department Manager for approval.</p>
                  <button class="btn btn-primary btn-sm" (click)="doSubmit()" [disabled]="savingAction()">
                    <i class="fas fa-paper-plane"></i> {{ savingAction() ? 'Submitting…' : 'Submit to Department Manager' }}
                  </button>
                </div>
              }
              @if (detail()!.status === 'submitted') {
                <div class="action-card action-card-amber">
                  <div class="action-card-title"><i class="fas fa-clock"></i> Awaiting Department Manager Approval</div>
                  <p class="action-card-desc">Your request has been submitted and is waiting for your Department Manager to review it.</p>
                </div>
              }
              @if (detail()!.status === 'approved') {
                <div class="action-card action-card-blue">
                  <div class="action-card-title"><i class="fas fa-inbox"></i> With QA Manager</div>
                  <p class="action-card-desc">
                    Your request was approved by your Department Manager and is now assigned to the
                    <strong>{{ detail()!.target_department === 'compliance' ? 'Compliance Manager' : 'QA Manager' }}
                    ({{ detail()!.assignee?.name }})</strong> for review and action.
                  </p>
                </div>
              }
              @if (detail()!.status === 'in_progress') {
                <div class="action-card action-card-green">
                  <div class="action-card-title"><i class="fas fa-spinner fa-spin"></i> Being Processed by QA</div>
                  <p class="action-card-desc">Assigned to <strong>{{ detail()!.assignee?.name }}</strong>. The QA team is working on your request.</p>
                </div>
              }
              @if (detail()!.status === 'rejected') {
                <div class="action-card action-card-red">
                  <div class="action-card-title"><i class="fas fa-times-circle"></i> Request Rejected</div>
                  <p class="action-card-desc">Your Department Manager rejected this request. Check the Approval Log for the rejection reason.</p>
                </div>
              }
              @if (detail()!.status === 'closed') {
                <div class="action-card action-card-green">
                  <div class="action-card-title"><i class="fas fa-circle-check"></i> Request Closed</div>
                  <p class="action-card-desc">This request has been resolved and closed by the Quality team.</p>
                </div>
              }
            }

            <!-- DEPT MANAGER: approve / reject submitted -->
            @if (isDeptManager() && detail()!.status === 'submitted') {
              <div class="action-card action-card-green">
                <div class="action-card-title"><i class="fas fa-stamp"></i> Approve Request</div>
                <p class="action-card-desc">Approving will forward this request to the <strong>{{ detail()!.target_department === 'compliance' ? 'Compliance Department' : 'Quality Department' }}</strong> for processing.</p>
                <div class="form-group" style="margin-bottom:8px">
                  <textarea class="form-control" rows="2" [(ngModel)]="approveComment"
                    placeholder="Approval comments (optional)…"></textarea>
                </div>
                <button class="btn btn-sm" style="background:#10b981;color:#fff"
                  (click)="doApprove()" [disabled]="savingAction()">
                  <i class="fas fa-check"></i> {{ savingAction() ? 'Processing…' : 'Approve & Forward to ' + (detail()!.target_department === 'compliance' ? 'Compliance' : 'QA') }}
                </button>
              </div>

              <div class="action-card action-card-red">
                <div class="action-card-title"><i class="fas fa-times-circle"></i> Reject Request</div>
                <p class="action-card-desc">The requester will be notified. Provide a clear reason for rejection.</p>
                <div class="form-group" style="margin-bottom:8px">
                  <textarea class="form-control" rows="2" [(ngModel)]="rejectReason"
                    placeholder="Reason for rejection *"></textarea>
                </div>
                <button class="btn btn-sm" style="background:#ef4444;color:#fff"
                  (click)="doReject()" [disabled]="!rejectReason.trim() || savingAction()">
                  <i class="fas fa-times"></i> {{ savingAction() ? 'Processing…' : 'Reject Request' }}
                </button>
              </div>
            }

            @if (isDeptManager() && detail()!.status !== 'submitted') {
              <div class="action-card-info">
                <i class="fas fa-circle-info"></i>
                <span>This request is in <strong>{{ statusLabel(detail()!.status) }}</strong> status. No actions required from you.</span>
              </div>
            }

            <!-- QA MANAGER: assign to QA officer -->
            @if (isQAManager() && detail()!.status === 'approved' && detail()!.target_department === 'quality') {
              <div class="action-card action-card-blue">
                <div class="action-card-title">
                  <i class="fas fa-user-plus"></i> Assign to QA Officer / Specialist
                </div>
                <p class="action-card-desc">
                  This request was approved by the Department Manager and assigned to you.
                  Select a QA team member to process it.
                </p>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <select class="form-control" [(ngModel)]="assigneeId" style="flex:1">
                    <option value="">— Select QA team member —</option>
                    @for (u of qaUsers(); track u.id) {
                      <option [value]="u.id">{{ u.name }} @if (u.role?.name) { ({{ u.role.name }}) }</option>
                    }
                  </select>
                  <button class="btn btn-primary btn-sm" (click)="doAssign()"
                    [disabled]="!assigneeId || savingAction()">
                    <i class="fas fa-user-check"></i> {{ savingAction() ? 'Assigning…' : 'Assign' }}
                  </button>
                </div>
              </div>
            }

            <!-- COMPLIANCE MANAGER: assign to Compliance Officer -->
            @if ((isComplianceMgr() || isQAManager()) && detail()!.status === 'approved' && detail()!.target_department === 'compliance') {
              <div class="action-card" style="border-left:3px solid #a78bfa;background:rgba(139,92,246,.05)">
                <div class="action-card-title">
                  <i class="fas fa-user-plus" style="color:#a78bfa"></i> Assign to Compliance Officer
                </div>
                <p class="action-card-desc">
                  This compliance request was approved. Select a Compliance Officer to process it.
                </p>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <select class="form-control" [(ngModel)]="assigneeId" style="flex:1">
                    <option value="">— Select Compliance Officer —</option>
                    @for (u of qaUsers(); track u.id) {
                      <option [value]="u.id">{{ u.name }} @if (u.role?.name) { ({{ u.role.name }}) }</option>
                    }
                  </select>
                  <button class="btn btn-sm" style="background:#a78bfa;color:#fff" (click)="doAssign()"
                    [disabled]="!assigneeId || savingAction()">
                    <i class="fas fa-user-check"></i> {{ savingAction() ? 'Assigning…' : 'Assign' }}
                  </button>
                </div>
              </div>
            }

            @if (isQAManager() && detail()!.status === 'in_progress') {
              <div class="action-card action-card-amber">
                <div class="action-card-title"><i class="fas fa-user-gear"></i> Currently Being Processed</div>
                <p class="action-card-desc">Assigned to <strong>{{ detail()!.assignee?.name || 'QA Officer' }}</strong>.</p>
                <!-- Reassign option -->
                <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
                  <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px">Reassign if needed:</div>
                  <div style="display:flex;gap:8px">
                    <select class="form-control" [(ngModel)]="assigneeId" style="flex:1">
                      <option value="">— Select officer —</option>
                      @for (u of qaUsers(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                    </select>
                    <button class="btn btn-secondary btn-sm" (click)="doReassign()" [disabled]="!assigneeId">
                      Reassign
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- QA OFFICER: close with resolution -->
            @if (isQAOfficer() && detail()!.assignee_id === currentUserId() && detail()!.status === 'in_progress' && detail()!.target_department === 'quality') {
              <div class="action-card action-card-green">
                <div class="action-card-title"><i class="fas fa-circle-check"></i> Close Request with Resolution</div>
                <p class="action-card-desc">Once you have addressed this request, provide a resolution summary and close it.</p>
                <div class="form-group" style="margin-bottom:8px">
                  <textarea class="form-control" rows="3" [(ngModel)]="closeResolution"
                    placeholder="Describe the resolution, actions taken, and outcome…"></textarea>
                </div>
                <button class="btn btn-sm" style="background:#10b981;color:#fff"
                  (click)="doClose()" [disabled]="!closeResolution.trim() || savingAction()">
                  <i class="fas fa-circle-check"></i> {{ savingAction() ? 'Closing…' : 'Close Request' }}
                </button>
              </div>
            }

            <!-- COMPLIANCE OFFICER: close compliance request -->
            @if (isComplianceOfc() && detail()!.assignee_id === currentUserId() && detail()!.status === 'in_progress' && detail()!.target_department === 'compliance') {
              <div class="action-card" style="border-left:3px solid #a78bfa;background:rgba(139,92,246,.05)">
                <div class="action-card-title"><i class="fas fa-circle-check" style="color:#a78bfa"></i> Close Compliance Request</div>
                <p class="action-card-desc">Provide your compliance resolution, findings, and any regulatory actions taken, then close the request.</p>
                <div class="form-group" style="margin-bottom:8px">
                  <textarea class="form-control" rows="3" [(ngModel)]="closeResolution"
                    placeholder="Compliance findings, actions taken, regulatory outcome…"></textarea>
                </div>
                <button class="btn btn-sm" style="background:#a78bfa;color:#fff"
                  (click)="doClose()" [disabled]="!closeResolution.trim() || savingAction()">
                  <i class="fas fa-circle-check"></i> {{ savingAction() ? 'Closing…' : 'Close Request' }}
                </button>
              </div>
            }

            <!-- QA MANAGER can also close -->
            @if (isQAManager() && ['in_progress','approved','in_review'].includes(detail()!.status)) {
              <div class="detail-section" style="margin-top:4px">
                <div class="detail-section-title" style="margin-bottom:10px">
                  <i class="fas fa-lock"></i> Close Request (QA Manager)
                </div>
                <textarea class="form-control" rows="2" [(ngModel)]="closeResolution"
                  placeholder="Resolution summary *" style="margin-bottom:8px"></textarea>
                <button class="btn btn-secondary btn-sm" (click)="doClose()" [disabled]="!closeResolution.trim() || savingAction()">
                  <i class="fas fa-lock"></i> Close
                </button>
              </div>
            }

          </div>
        }

        <!-- ── COMMENTS TAB ── -->
        @if (dTab === 'comments') {
          <div class="inline-form-card" style="margin-bottom:16px">
            <label class="form-label">Add Comment</label>
            <div style="display:flex;gap:8px;align-items:flex-end">
              <textarea class="form-control" rows="2" [(ngModel)]="newComment"
                placeholder="Write a comment…" style="flex:1"></textarea>
              <div style="display:flex;flex-direction:column;gap:6px">
                @if (!isEmployee()) {
                  <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;white-space:nowrap">
                    <input type="checkbox" [(ngModel)]="isInternal"> Internal only
                  </label>
                }
                <button class="btn btn-primary btn-sm" (click)="postComment()"
                  [disabled]="!newComment.trim() || savingComment()">
                  {{ savingComment() ? '…' : 'Post' }}
                </button>
              </div>
            </div>
          </div>

          @if (loadingComments()) {
            @for (i of [1,2,3]; track i) { <div class="skeleton-row" style="height:64px;border-radius:8px;margin-bottom:8px"></div> }
          } @else if (comments().length) {
            <div class="comments-list">
              @for (c of comments(); track c.id) {
                <div class="comment-item" [class.internal]="c.is_internal">
                  <div class="comment-avatar">{{ c.user?.name?.charAt(0) || '?' }}</div>
                  <div class="comment-body">
                    <div class="comment-meta">
                      <span class="comment-author">{{ c.user?.name || 'System' }}</span>
                      @if (c.is_internal) { <span class="badge badge-yellow" style="font-size:10px">Internal</span> }
                      <span class="comment-time">{{ c.created_at | date:'dd MMM yyyy, HH:mm' }}</span>
                    </div>
                    <p class="comment-text">{{ c.comment }}</p>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No comments yet.</div>
          }
        }

        <!-- ── APPROVAL LOG TAB ── -->
        @if (dTab === 'approvals') {
          @if (loadingApprovals()) {
            @for (i of [1,2]; track i) { <div class="skeleton-row" style="height:64px;border-radius:8px;margin-bottom:8px"></div> }
          } @else if (approvals().length) {
            <div class="approvals-list">
              @for (a of approvals(); track a.id) {
                <div class="approval-item">
                  <div class="approval-icon" [class.approved]="a.status==='approved'" [class.rejected]="a.status==='rejected'" [class.pending]="a.status==='pending'">
                    @if (a.status==='approved') { <i class="fas fa-check"></i> }
                    @else if (a.status==='rejected') { <i class="fas fa-times"></i> }
                    @else { <i class="fas fa-clock"></i> }
                  </div>
                  <div style="flex:1">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                      <div>
                        <div style="font-weight:600;font-size:13px">{{ a.approver?.name || '—' }}</div>
                        <span class="badge" style="font-size:10px;margin-top:3px"
                          [class]="a.status==='approved' ? 'badge-green' : a.status==='rejected' ? 'badge-red' : 'badge-draft'">
                          {{ a.status | titlecase }}
                        </span>
                      </div>
                      @if (a.decided_at) {
                        <span style="font-size:11px;color:var(--text3)">{{ a.decided_at | date:'dd MMM yyyy, HH:mm' }}</span>
                      }
                    </div>
                    @if (a.comments) {
                      <p style="font-size:13px;color:var(--text2);margin:6px 0 0;line-height:1.5">{{ a.comments }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No approval records yet.</div>
          }
        }

      </div><!-- /scroll -->

      <!-- Footer -->
      <div class="modal-footer" style="border-top:1px solid var(--border);flex-shrink:0;justify-content:space-between">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          @if (isEmployee() && detail()!.status === 'draft' && detail()!.requester_id === currentUserId()) {
            <button class="btn btn-primary btn-sm" (click)="doSubmit()" [disabled]="savingAction()">
              <i class="fas fa-paper-plane"></i> Submit to Dept Manager
            </button>
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
    /* ── Stats ── */
    .stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:110px;text-align:center;transition:box-shadow .15s}
    .stat-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .stat-num{font-family:'Inter',sans-serif;font-size:28px;font-weight:800;line-height:1}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}

    /* ── Workflow banners ── */
    .workflow-banner{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:12px;line-height:1.5}
    .workflow-banner i{font-size:16px;flex-shrink:0;margin-top:1px}
    .employee-banner{background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);color:var(--text2)}
    .employee-banner i{color:#3b82f6}
    .mgr-banner{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);color:var(--text2)}
    .mgr-banner i{color:#f59e0b}
    .qa-banner{background:rgba(139,92,246,.07);border:1px solid rgba(139,92,246,.2);color:var(--text2)}
    .qa-banner i{color:#8b5cf6}
    .officer-banner{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);color:var(--text2)}
    .officer-banner i{color:#10b981}

    /* ── Tabs ── */
    .tab-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
    .tab-pill{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s}
    .tab-pill.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .tab-cnt{background:rgba(255,255,255,.3);border-radius:10px;padding:1px 6px;font-size:10px}
    .tab-pill:not(.active) .tab-cnt{background:rgba(79,70,229,.12);color:var(--accent);border-radius:10px;padding:1px 6px;font-size:10px}
    .tab-cnt-red{background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px}

    /* ── Toolbar ── */
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text);min-width:180px}
    .input-sm:focus{outline:none;border-color:var(--accent)}

    /* ── Table ── */
    .row-hover{cursor:pointer}.row-hover:hover td{background:rgba(79,70,229,.03)}
    .mono-ref{font-family:monospace;font-size:12px;color:var(--accent)}
    .text-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .font-medium{font-weight:600}
    .avatar-xs{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:48px}

    /* ── Create modal ── */
    .modal-lg{max-width:680px}
    .modal-xl{max-width:980px;width:95vw}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .fg-full{grid-column:span 2}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger,#ef4444);padding:10px 14px;border-radius:8px;font-size:13px}
    .info-note{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);border-radius:8px;font-size:12px;color:var(--text2);margin-top:4px}
    .info-note i{color:#3b82f6;flex-shrink:0;margin-top:1px}

    /* ── Detail modal ── */
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 24px;background:var(--surface)}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s;white-space:nowrap}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px;display:flex;align-items:center;gap:6px}
    .detail-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}.detail-row span:last-child{font-weight:500;text-align:right}
    .inline-form-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}

    /* ── Send-To destination selector (create modal) ── */
    .dest-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    @media(max-width:580px){.dest-row{grid-template-columns:1fr}}
    .dest-btn{display:flex;align-items:center;gap:10px;padding:11px 14px;
      background:var(--bg);border:2px solid var(--border);border-radius:10px;
      cursor:pointer;text-align:left;transition:all .15s;width:100%}
    .dest-btn:hover{border-color:var(--border2);background:var(--surface2)}
    .dest-btn--active{border-color:var(--accent)!important;background:rgba(59,130,246,.05)!important}
    .dest-btn:has(.dest-btn-icon--purple).dest-btn--active{border-color:#a78bfa!important;background:rgba(139,92,246,.05)!important}
    .dest-btn-icon{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;font-size:15px;flex-shrink:0}
    .dest-btn-icon--blue{background:rgba(59,130,246,.14);color:#60a5fa}
    .dest-btn-icon--purple{background:rgba(139,92,246,.14);color:#a78bfa}
    .dest-btn-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px}
    .dest-btn-sub{font-size:10px;color:var(--text2);line-height:1.3}
    .dest-btn-check{width:18px;height:18px;border-radius:50%;border:2px solid var(--border2);
      display:grid;place-items:center;flex-shrink:0;font-size:9px;
      color:transparent;transition:all .15s;margin-left:auto}
    .dest-btn-check.on{background:var(--accent);border-color:var(--accent);color:#fff}

    /* ── Journey steps ── */
    .journey-steps{display:flex;align-items:center;gap:0;padding:8px 0}
    .journey-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}
    .journey-dot{width:32px;height:32px;border-radius:50%;border:2px solid var(--border);display:grid;place-items:center;font-size:12px;color:var(--text3);background:var(--surface);transition:all .2s}
    .journey-step.done .journey-dot{background:var(--success);border-color:var(--success);color:#fff}
    .journey-step.active .journey-dot{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 0 0 3px rgba(79,70,229,.2)}
    .journey-label{font-size:10px;color:var(--text3);text-align:center;max-width:60px;line-height:1.3}
    .journey-step.done .journey-label,.journey-step.active .journey-label{color:var(--text2)}
    .journey-line{flex:1;height:2px;background:var(--border);transition:background .2s}
    .journey-line.done{background:var(--success)}

    /* ── Action cards ── */
    .action-card{padding:16px;border-radius:10px;border:1px solid var(--border)}
    .action-card-title{font-size:14px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:7px}
    .action-card-desc{font-size:13px;color:var(--text2);margin:0 0 10px;line-height:1.5}
    .action-card-blue{border-color:rgba(59,130,246,.3);background:rgba(59,130,246,.04)}
    .action-card-blue .action-card-title{color:#3b82f6}
    .action-card-green{border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.04)}
    .action-card-green .action-card-title{color:#10b981}
    .action-card-amber{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.04)}
    .action-card-amber .action-card-title{color:#f59e0b}
    .action-card-red{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.04)}
    .action-card-red .action-card-title{color:#ef4444}
    .action-card-info{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text2)}
    .action-card-info i{color:var(--accent);flex-shrink:0}

    /* ── Comments ── */
    .comments-list{display:flex;flex-direction:column;gap:12px}
    .comment-item{display:flex;gap:12px}
    .comment-item.internal{background:rgba(245,158,11,.04);border-radius:8px;padding:8px;margin:0 -8px;border:1px solid rgba(245,158,11,.15)}
    .comment-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px}
    .comment-body{flex:1}
    .comment-meta{display:flex;align-items:center;gap:8px;margin-bottom:3px}
    .comment-author{font-size:13px;font-weight:600}
    .comment-time{font-size:11px;color:var(--text3);margin-left:auto}
    .comment-text{font-size:13px;color:var(--text2);margin:0;line-height:1.5}

    /* ── Approvals ── */
    .approvals-list{display:flex;flex-direction:column;gap:10px}
    .approval-item{display:flex;gap:12px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px}
    .approval-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:14px;flex-shrink:0}
    .approval-icon.approved{background:rgba(16,185,129,.15);color:var(--success)}
    .approval-icon.rejected{background:rgba(239,68,68,.15);color:var(--danger)}
    .approval-icon.pending{background:rgba(245,158,11,.15);color:#f59e0b}
  `]
})
export class RequestsListComponent implements OnInit, OnDestroy {
  items         = signal<any[]>([]);
  loading       = signal(true);
  total         = signal(0);
  page          = signal(1);
  totalPages    = signal(1);
  statsCards    = signal<any[]>([]);
  statsRaw      = signal<any>({});
  categories    = signal<any[]>([]);
  users         = signal<any[]>([]);

  search = ''; filterStatus = ''; filterPriority = ''; filterType = '';
  activeTab = 'all';

  showForm  = false;
  saving    = signal(false);
  formError = signal('');
  toast = signal<{msg:string,type:string}|null>(null);
  form: any = {};

  detail           = signal<any>(null);
  dTab             = 'details';
  comments         = signal<any[]>([]);
  approvals        = signal<any[]>([]);
  loadingComments  = signal(false);
  loadingApprovals = signal(false);
  savingAction     = signal(false);
  savingComment    = signal(false);

  assigneeId     : any = '';
  approveComment = '';
  rejectReason   = '';
  closeResolution= '';
  newComment     = '';
  isInternal     = false;

  private destroy$    = new Subject<void>();
  private searchTimer: any;

  // ── Role computed signals ──────────────────────────
  private _slug = computed(() => (this.auth.currentUser() as any)?.role?.slug ?? '');

  isQAManager     = computed(() => ['super_admin','qa_manager'].includes(this._slug()));
  isQASupervisor  = computed(() => this._slug() === 'quality_supervisor');
  isQAOfficer     = computed(() => ['qa_officer','quality_supervisor'].includes(this._slug()));
  isDeptManager   = computed(() => this._slug() === 'dept_manager');
  isComplianceMgr = computed(() => this._slug() === 'compliance_manager');
  isComplianceOfc = computed(() => this._slug() === 'compliance_officer');
  isCompliance    = computed(() => ['compliance_manager','compliance_officer'].includes(this._slug()));
  isEmployee      = computed(() => this._slug() === 'employee');

  canCreate = computed(() => {
    const perms: string[] = (this.auth.currentUser() as any)?.role?.permissions || [];
    return perms.includes('*') || perms.includes('request.create') || perms.some((p:string)=>p==='request.*');
  });

  currentUserId = computed(() => this.auth.currentUser()?.id);

  // QA users for assignment — only show QA dept members (officers/specialists)
  qaUsers = computed(() => {
    const all   = this.users();
    const me    = this.currentUserId();
    // Backend /users already returns QA dept only; filter out self (QA Manager assigning to team)
    return all.filter((u: any) => u.id !== me);
  });

  // Tab badge for workflow actions pending
  pendingActionCount = computed(() => {
    const d = this.detail();
    if (!d) return 0;
    if (this.isDeptManager() && d.status === 'submitted') return 1;
    if ((this.isQAManager() || this.isComplianceMgr()) && d.status === 'approved') return 1;
    if ((this.isQAOfficer() || this.isComplianceOfc()) && d.assignee_id === this.currentUserId() && d.status === 'in_progress') return 1;
    return 0;
  });

  // Tabs per role
  private allTabs = [
    { key: 'all',         label: 'All Requests',   icon: 'fas fa-list' },
    { key: 'my_requests', label: 'My Requests',     icon: 'fas fa-user' },
    { key: 'my_approval', label: 'Pending Approval',icon: 'fas fa-stamp' },
    { key: 'qa_queue',    label: 'My Inbox',        icon: 'fas fa-inbox' },
    { key: 'my_tasks',    label: 'My Tasks',        icon: 'fas fa-tasks' },
    { key: 'overdue',     label: 'Overdue',         icon: 'fas fa-exclamation-triangle' },
    { key: 'draft',       label: 'Drafts',          icon: 'fas fa-file-pen' },
  ];

  visibleTabs = computed(() => {
    if (this.isQAManager())     return this.allTabs.filter(t => ['all','qa_queue','overdue'].includes(t.key));
    if (this.isDeptManager())   return this.allTabs.filter(t => ['all','my_approval','overdue'].includes(t.key));
    if (this.isQAOfficer())     return this.allTabs.filter(t => ['my_tasks','all'].includes(t.key));
    if (this.isComplianceMgr()) return this.allTabs.filter(t => ['all','qa_queue','overdue'].includes(t.key)); // qa_queue = compliance inbox
    if (this.isComplianceOfc()) return this.allTabs.filter(t => ['my_tasks','all'].includes(t.key));
    // Employee
    return this.allTabs.filter(t => ['my_requests','draft'].includes(t.key));
  });

  constructor(
    private svc: RequestsService,
    private uiEvents: UiEventService,
    public lang: LanguageService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => { if (this.canCreate()) this.openCreate(); });
    // Default tab by role
    if (this.isQAManager())       this.activeTab = 'qa_queue';
    else if (this.isDeptManager())  this.activeTab = 'my_approval';
    else if (this.isQAOfficer())    this.activeTab = 'my_tasks';
    else if (this.isComplianceMgr())this.activeTab = 'qa_queue';   // compliance inbox
    else if (this.isComplianceOfc())this.activeTab = 'my_tasks';
    else                            this.activeTab = 'my_requests';
    this.load();
    this.loadStats();
    this.svc.categories().subscribe({ next: (r: any) => this.categories.set(r?.data || r || []) });
    // Users loaded per-request in openDetail() based on target_department
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus)   p.status   = this.filterStatus;
    if (this.filterPriority) p.priority = this.filterPriority;
    if (this.filterType)     p.type     = this.filterType;
    if (this.search)         p.q        = this.search;

    // Tab filters
    if (this.activeTab === 'my_approval') p.status = 'submitted';
    if (this.activeTab === 'qa_queue')    p.status = 'approved';
    if (this.activeTab === 'my_tasks')  { p.status = 'in_progress'; p.assignee_id = this.currentUserId(); }
    if (this.activeTab === 'overdue')     p.overdue = 1;
    if (this.activeTab === 'draft')       p.status = 'draft';
    if (this.activeTab === 'my_requests') p.q = this.search; // backend scopes to own

    this.svc.list(p).subscribe({
      next: (r: any) => { this.items.set(r.data||[]); this.total.set(r.total||0); this.totalPages.set(r.last_page||1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }

  setTab(key: string) { this.activeTab = key; this.filterStatus = ''; this.page.set(1); this.load(); }

  loadStats() {
    this.svc.stats().subscribe({
      next: (r: any) => {
        const s = r?.data || r;
        this.statsRaw.set(s);

        if (this.isQAManager()) {
          this.statsCards.set([
            { label: 'Total',        value: s.total||0,       color: 'var(--text)' },
            { label: 'QA Queue',     value: s.approved||0,    color: '#8b5cf6', filter: 'qa_queue' },
            { label: 'In Progress',  value: s.in_progress||0, color: '#3b82f6' },
            { label: 'Overdue',      value: s.overdue||0,     color: '#ef4444', filter: 'overdue' },
            { label: 'Closed',       value: s.closed||0,      color: '#10b981' },
          ]);
        } else if (this.isDeptManager()) {
          this.statsCards.set([
            { label: 'All Requests',      value: s.total||0,      color: 'var(--text)' },
            { label: 'Pending My Review', value: s.submitted||0,  color: '#f59e0b', filter: 'my_approval' },
            { label: 'Approved & Forwarded', value: s.approved||0, color: '#10b981' },
            { label: 'Rejected',          value: s.rejected||0,   color: '#ef4444' },
          ]);
        } else if (this.isComplianceMgr()) {
          this.statsCards.set([
            { label: 'Total',               value: s.total||0,       color: 'var(--text)' },
            { label: 'Compliance Inbox',    value: s.approved||0,    color: '#a78bfa', filter: 'qa_queue' },
            { label: 'In Progress',         value: s.in_progress||0, color: '#3b82f6' },
            { label: 'Overdue',             value: s.overdue||0,     color: '#ef4444', filter: 'overdue' },
            { label: 'Closed',              value: s.closed||0,      color: '#10b981' },
          ]);
        } else if (this.isComplianceOfc()) {
          this.statsCards.set([
            { label: 'My Tasks',    value: s.in_progress||0, color: '#a78bfa', filter: 'my_tasks' },
            { label: 'Completed',   value: s.closed||0,      color: '#10b981' },
            { label: 'Overdue',     value: s.overdue||0,     color: '#ef4444', filter: 'overdue' },
          ]);
        } else if (this.isQAOfficer()) {
          this.statsCards.set([
            { label: 'My Tasks',    value: s.in_progress||0, color: '#3b82f6', filter: 'my_tasks' },
            { label: 'Completed',   value: s.closed||0,      color: '#10b981' },
            { label: 'Overdue',     value: s.overdue||0,     color: '#ef4444', filter: 'overdue' },
          ]);
        } else {
          // Employee
          this.statsCards.set([
            { label: 'My Requests', value: s.total||0,      color: 'var(--text)', filter: 'my_requests' },
            { label: 'Drafts',      value: s.draft||0,      color: 'var(--text2)', filter: 'draft' },
            { label: 'Submitted',   value: s.submitted||0,  color: '#f59e0b' },
            { label: 'In Progress', value: (s.approved||0)+(s.in_progress||0), color: '#3b82f6' },
            { label: 'Closed',      value: s.closed||0,     color: '#10b981' },
          ]);
        }
      }
    });
  }

  tabCount(key: string): number {
    const s = this.statsRaw();
    if (key === 'my_approval') return s.submitted || 0;
    if (key === 'qa_queue')    return s.approved || 0;
    if (key === 'my_tasks')    return s.in_progress || 0;
    if (key === 'overdue')     return s.overdue || 0;
    if (key === 'draft')       return s.draft || 0;
    return 0;
  }

  openCreate() {
    this.form = { title: '', description: '', priority: 'medium', type: 'internal', category_id: '', due_date: '', target_department: 'quality' };
    this.formError.set('');
    this.showForm = true;
  }

  submit(action: 'draft' | 'submit') {
    if (!this.form.title?.trim())       { this.formError.set('Title is required.'); return; }
    if (!this.form.description?.trim()) { this.formError.set('Description is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.category_id) delete payload.category_id;
    this.svc.create(payload).subscribe({
      next: (r: any) => {
        const created = r?.data || r;
        if (action === 'submit' && created?.id) {
          this.svc.submit(created.id).subscribe({
            next: () => { this.saving.set(false); this.showForm = false; this.load(); this.loadStats(); }
          });
        } else {
          this.saving.set(false); this.showForm = false; this.load(); this.loadStats();
        }
      },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors||{}).flat().join(', ') || 'Failed.');
      }
    });
  }

  openDetail(r: any) {
    this.svc.get(r.id).subscribe({
      next: (res: any) => {
        const req = res?.data || res;
        this.detail.set(req);
        this.dTab = this.pendingActionCount() > 0 ? 'workflow' : 'details';
        this.comments.set([]); this.approvals.set([]);  // clear on every open
        this.assigneeId = ''; this.approveComment = '';
        this.rejectReason = ''; this.closeResolution = '';
        this.newComment = ''; this.savingAction.set(false);

        // Load the correct team for the assignment dropdown based on target_department
        const target = req?.target_department ?? 'quality';
        this.svc.users({ target_department: target }).subscribe({
          next: (ur: any) => this.users.set(ur?.data || ur || [])
        });
      }
    });
  }

  closeDetail() { this.detail.set(null); }

  private reloadDetail() {
    const d = this.detail(); if (!d) return;
    this.svc.get(d.id).subscribe({ next: (r: any) => this.detail.set(r?.data || r) });
  }

  doSubmit() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.submit(d.id).subscribe({
      next: () => { this.savingAction.set(false); this.reloadDetail(); this.load(); this.loadStats(); },
      error: (e: any) => { this.savingAction.set(false); this.showToast(e?.error?.message || 'Failed', 'error'); }
    });
  }

  doApprove() {
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.approve(d.id, this.approveComment).subscribe({
      next: () => { this.savingAction.set(false); this.approveComment = ''; this.reloadDetail(); this.load(); this.loadStats(); this.approvals.set([]); },
      error: (e: any) => { this.savingAction.set(false); this.showToast(e?.error?.message || 'Failed', 'error'); }
    });
  }

  doReject() {
    if (!this.rejectReason.trim()) return;
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.reject(d.id, this.rejectReason).subscribe({
      next: () => { this.savingAction.set(false); this.rejectReason = ''; this.reloadDetail(); this.load(); this.loadStats(); this.approvals.set([]); },
      error: (e: any) => { this.savingAction.set(false); this.showToast(e?.error?.message || 'Failed', 'error'); }
    });
  }

  doAssign() {
    const d = this.detail(); if (!d || !this.assigneeId) return;
    this.savingAction.set(true);
    this.svc.assign(d.id, +this.assigneeId).subscribe({
      next: () => { this.savingAction.set(false); this.assigneeId = ''; this.reloadDetail(); this.load(); this.loadStats(); },
      error: (e: any) => { this.savingAction.set(false); this.showToast(e?.error?.message || 'Failed', 'error'); }
    });
  }

  doReassign() { this.doAssign(); }

  doClose() {
    if (!this.closeResolution.trim()) return;
    const d = this.detail(); if (!d) return;
    this.savingAction.set(true);
    this.svc.close(d.id, this.closeResolution).subscribe({
      next: () => { this.savingAction.set(false); this.closeResolution = ''; this.reloadDetail(); this.load(); this.loadStats(); },
      error: (e: any) => { this.savingAction.set(false); this.showToast(e?.error?.message || 'Failed', 'error'); }
    });
  }

  loadComments() {
    const d = this.detail(); if (!d) return;
    this.loadingComments.set(true);
    this.svc.comments(d.id).subscribe({
      next: (r: any) => { this.comments.set(r?.data || r || []); this.loadingComments.set(false); },
      error: () => this.loadingComments.set(false)
    });
  }

  postComment() {
    const d = this.detail(); if (!d || !this.newComment.trim()) return;
    this.savingComment.set(true);
    this.svc.addComment(d.id, this.newComment, this.isInternal).subscribe({
      next: (r: any) => { this.savingComment.set(false); this.comments.update(l => [...l, r?.data||r]); this.newComment = ''; this.isInternal = false; }
    });
  }

  loadApprovals() {
    const d = this.detail(); if (!d) return;
    this.loadingApprovals.set(true);
    this.svc.approvals(d.id).subscribe({
      next: (r: any) => { this.approvals.set(r?.data || r || []); this.loadingApprovals.set(false); },
      error: () => this.loadingApprovals.set(false)
    });
  }

  // Journey step helpers
  stepDone(status: string): boolean {
    const order = ['submitted','approved','in_progress','closed'];
    const cur   = this.detail()?.status;
    if (cur === 'rejected') return false;
    return order.indexOf(cur) > order.indexOf(status);
  }

  stepActive(status: string): boolean {
    const cur = this.detail()?.status;
    if (status === 'submitted')   return cur === 'submitted';
    if (status === 'approved')    return cur === 'approved';
    if (status === 'in_progress') return cur === 'in_progress';
    if (status === 'closed')      return cur === 'closed';
    return false;
  }

  isOverdue(d: string | null, status: string): boolean {
    if (!d || ['approved','closed','rejected'].includes(status)) return false;
    return new Date(d) < new Date();
  }

  fmt(s: string | null | undefined): string { return (s||'').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }

  statusLabel(s: string): string {
    const map: any = {
      draft:       'Draft',
      submitted:   'Awaiting Dept Approval',
      in_review:   'In Review',
      approved:    'With QA Manager',
      in_progress: 'In Progress',
      rejected:    'Rejected',
      closed:      'Closed',
    };
    return map[s] || this.fmt(s);
  }

  priorityClass(p: string): string {
    return ({ low:'badge-draft', medium:'badge-yellow', high:'badge-orange', critical:'badge-red' } as any)[p] || 'badge-draft';
  }

  statusClass(s: string): string {
    return ({
      draft:'badge-draft', submitted:'badge-yellow', in_review:'badge-blue',
      in_progress:'badge-blue', approved:'badge-purple',
      rejected:'badge-red', closed:'badge-green',
    } as any)[s] || 'badge-draft';
  }

  prevPage() { if (this.page()>1) { this.page.update(p=>p-1); this.load(); } }
  nextPage() { if (this.page()<this.totalPages()) { this.page.update(p=>p+1); this.load(); } }
  
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
