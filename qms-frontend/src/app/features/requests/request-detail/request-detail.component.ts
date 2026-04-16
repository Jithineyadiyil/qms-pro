import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RequestsService } from '../../../core/services/requests.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * RequestDetailComponent
 *
 * Standalone full-page view for a single request.
 * Handles the complete workflow for ALL roles:
 *
 *   Employee          → Submit draft
 *   Dept Manager      → Approve (→ routes to QA or Compliance Manager) / Reject
 *   QA Manager        → Assign to QA Officer / Supervisor, Reassign, Close
 *   Quality Supervisor→ Process / Close (quality requests)
 *   QA Officer        → Close (quality requests assigned to them)
 *   Compliance Mgr    → Assign to Compliance Officer, Close
 *   Compliance Ofc    → Close (compliance requests assigned to them)
 */
@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TitleCasePipe, DatePipe],
  template: `
<div class="detail-page">

  <!-- BREADCRUMB -->
  <div class="breadcrumb">
    <a routerLink="/requests" class="bc-link"><i class="fas fa-arrow-left"></i> Requests</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ req()?.reference_no || '…' }}</span>
  </div>

  <!-- LOADING -->
  @if (loading()) {
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading request…</p>
    </div>
  }

  <!-- NOT FOUND -->
  @else if (!req()) {
    <div class="empty-state">
      <i class="fas fa-circle-exclamation" style="font-size:48px;color:var(--danger)"></i>
      <p>Request not found or you don't have permission to view it.</p>
      <a routerLink="/requests" class="btn-action btn-primary">Back to Requests</a>
    </div>
  }

  <!-- MAIN -->
  @else {

    <!-- ── HEADER ── -->
    <div class="header-card">
      <div class="header-top">
        <div class="ref-number">{{ req()!.reference_no }}</div>
        <div class="header-badges">
          <span class="badge" [class]="'badge-p-' + req()!.priority">
            {{ req()!.priority | titlecase }}
          </span>
          <span class="badge" [class]="'badge-s-' + req()!.status.replace('_','-')">
            {{ formatStatus(req()!.status) }}
          </span>
          <!-- Destination pill -->
          <span class="dept-pill" [class]="req()!.target_department === 'compliance' ? 'dept-pill--purple' : 'dept-pill--blue'">
            <i [class]="req()!.target_department === 'compliance' ? 'fas fa-scale-balanced' : 'fas fa-award'"></i>
            {{ req()!.target_department === 'compliance' ? 'Compliance' : 'Quality' }}
          </span>
        </div>
      </div>
      <h1 class="header-title">{{ req()!.title }}</h1>
      <div class="header-meta">
        <span><i class="fas fa-user"></i> {{ req()!.requester?.name }}</span>
        <span><i class="fas fa-building"></i> {{ req()!.department?.name || '—' }}</span>
        <span><i class="fas fa-tag"></i> {{ req()!.category?.name || 'No Category' }}</span>
        <span><i class="fas fa-calendar"></i> {{ req()!.created_at | date:'dd MMM yyyy' }}</span>
        @if (req()!.due_date) {
          <span [class.overdue-text]="isOverdue()">
            <i class="fas fa-clock"></i> Due: {{ req()!.due_date | date:'dd MMM yyyy' }}
            @if (isOverdue()) { <strong> — OVERDUE</strong> }
          </span>
        }
        @if (req()!.assignee) {
          <span><i class="fas fa-user-check"></i> Assigned: {{ req()!.assignee!.name }}</span>
        }
      </div>
    </div>

    <!-- ── JOURNEY BAR ── -->
    <div class="journey-card">
      <div class="journey-steps">
        <div class="journey-step" [class.done]="jDone('submitted')" [class.active]="jActive('submitted')">
          <div class="j-dot"><i class="fas fa-paper-plane"></i></div>
          <div class="j-label">Submitted</div>
        </div>
        <div class="journey-line" [class.done]="jDone('approved')"></div>
        <div class="journey-step" [class.done]="jDone('approved')" [class.active]="jActive('approved')">
          <div class="j-dot"><i class="fas fa-inbox"></i></div>
          <div class="j-label">{{ req()!.target_department === 'compliance' ? 'Compliance Mgr' : 'QA Manager' }}</div>
        </div>
        <div class="journey-line" [class.done]="jDone('in_progress')"></div>
        <div class="journey-step" [class.done]="jDone('in_progress')" [class.active]="jActive('in_progress')">
          <div class="j-dot"><i class="fas fa-user-gear"></i></div>
          <div class="j-label">{{ req()!.target_department === 'compliance' ? 'Compliance' : 'QA' }} Processing</div>
        </div>
        <div class="journey-line" [class.done]="jDone('closed')"></div>
        <div class="journey-step" [class.done]="jDone('closed')" [class.active]="jActive('closed')">
          <div class="j-dot"><i class="fas fa-circle-check"></i></div>
          <div class="j-label">Closed</div>
        </div>
      </div>
      @if (req()!.status === 'rejected') {
        <div class="rejected-bar">
          <i class="fas fa-times-circle"></i> Rejected by Department Manager
        </div>
      }
    </div>

    <!-- ── BODY GRID ── -->
    <div class="body-grid">

      <!-- LEFT: Details + Approval chain + Comments -->
      <div class="left-col">

        <!-- Description -->
        <div class="card">
          <div class="card-title"><i class="fas fa-align-left"></i> Description</div>
          <p class="body-text">{{ req()!.description }}</p>
        </div>

        <!-- Resolution (if closed) -->
        @if (req()!.resolution) {
          <div class="card card-success">
            <div class="card-title"><i class="fas fa-check-circle"></i> Resolution</div>
            <p class="body-text">{{ req()!.resolution }}</p>
          </div>
        }

        <!-- Approval chain -->
        @if (approvals().length) {
          <div class="card">
            <div class="card-title"><i class="fas fa-stamp"></i> Approval Chain</div>
            <div class="chain-list">
              @for (a of approvals(); track a.id) {
                <div class="chain-item" [class]="'chain-' + a.status">
                  <div class="chain-seq">{{ a.sequence }}</div>
                  <div class="chain-body">
                    <div class="chain-name">{{ a.approver?.name }}</div>
                    <div class="chain-status">{{ a.status | titlecase }}</div>
                    @if (a.comments) { <div class="chain-comment">{{ a.comments }}</div> }
                    @if (a.decided_at) { <div class="chain-date">{{ a.decided_at | date:'dd MMM yyyy HH:mm' }}</div> }
                  </div>
                  <div class="chain-icon">
                    @if (a.status === 'approved') { <i class="fas fa-check-circle" style="color:#22c55e"></i> }
                    @else if (a.status === 'rejected') { <i class="fas fa-times-circle" style="color:#ef4444"></i> }
                    @else { <i class="fas fa-clock" style="color:var(--text2)"></i> }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Comments -->
        <div class="card">
          <div class="card-title">
            <i class="fas fa-comments"></i> Comments
            @if (comments().length) { <span class="cnt-badge">{{ comments().length }}</span> }
          </div>

          <div class="comment-list">
            @for (c of comments(); track c.id) {
              <div class="comment" [class.internal-comment]="c.is_internal">
                <div class="comment-av">{{ c.user?.name?.charAt(0) || '?' }}</div>
                <div class="comment-body">
                  <div class="comment-meta">
                    <strong>{{ c.user?.name || 'System' }}</strong>
                    @if (c.is_internal) { <span class="int-tag">Internal</span> }
                    <span class="comment-date">{{ c.created_at | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <p class="comment-text">{{ c.comment }}</p>
                </div>
              </div>
            } @empty {
              <p class="empty-msg">No comments yet.</p>
            }
          </div>

          <!-- Add comment -->
          <div class="add-comment">
            <textarea class="field-input" rows="3" [(ngModel)]="newComment"
              placeholder="Add a comment…"></textarea>
            <div class="comment-footer">
              @if (!isEmployee()) {
                <label class="int-toggle">
                  <input type="checkbox" [(ngModel)]="commentInternal"> Internal only
                </label>
              } @else { <span></span> }
              <button class="btn-action btn-primary btn-sm"
                [disabled]="!newComment.trim() || submittingComment()"
                (click)="postComment()">
                <i class="fas fa-paper-plane"></i>
                {{ submittingComment() ? 'Posting…' : 'Post' }}
              </button>
            </div>
          </div>
        </div>

      </div><!-- /left-col -->

      <!-- RIGHT: Workflow Actions + Meta -->
      <div class="right-col">

        <!-- ══ WORKFLOW ACTIONS ══ -->
        <div class="card">
          <div class="card-title"><i class="fas fa-bolt"></i> Actions</div>

          <!-- ── EMPLOYEE: submit draft ── -->
          @if (isEmployee() && req()!.requester_id === currentUserId()) {
            @if (req()!.status === 'draft') {
              <div class="action-section">
                <p class="action-desc">
                  Your request is a draft. Submit it to send to your Department Manager for approval,
                  who will forward it to the
                  <strong>{{ req()!.target_department === 'compliance' ? 'Compliance Manager' : 'QA Manager' }}</strong>.
                </p>
                <button class="btn-action btn-primary" (click)="doSubmit()" [disabled]="saving()">
                  <i class="fas fa-paper-plane"></i>
                  {{ saving() ? 'Submitting…' : 'Submit to Department Manager' }}
                </button>
              </div>
            }
            @if (req()!.status === 'submitted') {
              <div class="status-info status-info--amber">
                <i class="fas fa-clock"></i>
                Awaiting your <strong>Department Manager's</strong> approval.
              </div>
            }
            @if (req()!.status === 'approved') {
              <div class="status-info status-info--blue">
                <i class="fas fa-inbox"></i>
                Approved. Now with
                <strong>{{ req()!.target_department === 'compliance' ? 'Compliance Manager' : 'QA Manager' }}
                ({{ req()!.assignee?.name }})</strong> for assignment.
              </div>
            }
            @if (req()!.status === 'in_progress') {
              <div class="status-info status-info--green">
                <i class="fas fa-spinner fa-spin"></i>
                Being processed by <strong>{{ req()!.assignee?.name }}</strong>.
              </div>
            }
            @if (req()!.status === 'closed') {
              <div class="status-info status-info--green">
                <i class="fas fa-circle-check"></i>
                Request resolved and closed. See resolution above.
              </div>
            }
            @if (req()!.status === 'rejected') {
              <div class="status-info status-info--red">
                <i class="fas fa-times-circle"></i>
                Rejected by your Department Manager. See Approval Chain for reason.
              </div>
            }
          }

          <!-- ── DEPT MANAGER: approve / reject ── -->
          @if (isDeptMgr() && req()!.status === 'submitted') {
            <div class="action-section">
              <p class="action-desc">
                Review this request from your department. Approving will forward it to the
                <strong>{{ req()!.target_department === 'compliance' ? 'Compliance Manager' : 'QA Manager' }}</strong>.
              </p>
              <textarea class="field-input" rows="2" [(ngModel)]="approveComment"
                placeholder="Approval comments (optional)…" style="margin-bottom:8px"></textarea>
              <button class="btn-action btn-success" (click)="doApprove()" [disabled]="saving()">
                <i class="fas fa-check"></i>
                {{ saving() ? 'Processing…' : 'Approve & Forward to ' + (req()!.target_department === 'compliance' ? 'Compliance' : 'QA') }}
              </button>
            </div>
            <div class="action-section" style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">
              <textarea class="field-input" rows="2" [(ngModel)]="rejectReason"
                placeholder="Reason for rejection (required)…" style="margin-bottom:8px"></textarea>
              <button class="btn-action btn-danger" (click)="doReject()"
                [disabled]="!rejectReason.trim() || saving()">
                <i class="fas fa-times"></i> Reject Request
              </button>
            </div>
          }
          @if (isDeptMgr() && req()!.status !== 'submitted') {
            <div class="status-info status-info--neutral">
              <i class="fas fa-circle-info"></i>
              This request is <strong>{{ formatStatus(req()!.status) }}</strong>. No action needed from you.
            </div>
          }

          <!-- ── QA MANAGER: assign (quality requests) ── -->
          @if (isQAMgr() && req()!.status === 'approved' && req()!.target_department === 'quality') {
            <div class="action-section">
              <p class="action-desc">
                This request is in your QA inbox. Assign it to a QA Officer or Quality Supervisor to process.
              </p>
              <div class="assign-row">
                <select class="field-input" [(ngModel)]="assigneeId" style="flex:1">
                  <option value="">— Select QA team member —</option>
                  @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.name }} ({{ u.role?.name }})</option>
                  }
                </select>
                <button class="btn-action btn-primary" (click)="doAssign()" [disabled]="!assigneeId || saving()">
                  <i class="fas fa-user-check"></i> {{ saving() ? '…' : 'Assign' }}
                </button>
              </div>
            </div>
          }

          <!-- ── COMPLIANCE MANAGER: assign (compliance requests) ── -->
          @if ((isComplianceMgr() || isQAMgr()) && req()!.status === 'approved' && req()!.target_department === 'compliance') {
            <div class="action-section" style="border-left:3px solid #a78bfa">
              <p class="action-desc">
                This compliance request is in your inbox. Assign it to a Compliance Officer to process.
              </p>
              <div class="assign-row">
                <select class="field-input" [(ngModel)]="assigneeId" style="flex:1">
                  <option value="">— Select Compliance Officer —</option>
                  @for (u of users(); track u.id) {
                    <option [value]="u.id">{{ u.name }} ({{ u.role?.name }})</option>
                  }
                </select>
                <button class="btn-action" style="background:#a78bfa;color:#fff"
                  (click)="doAssign()" [disabled]="!assigneeId || saving()">
                  <i class="fas fa-user-check"></i> {{ saving() ? '…' : 'Assign' }}
                </button>
              </div>
            </div>
          }

          <!-- ── QA MANAGER: in progress — reassign or close ── -->
          @if (isQAMgr() && req()!.status === 'in_progress' && req()!.target_department === 'quality') {
            <div class="action-section">
              <p class="action-desc">Assigned to <strong>{{ req()!.assignee?.name }}</strong>. Reassign if needed:</p>
              <div class="assign-row">
                <select class="field-input" [(ngModel)]="assigneeId" style="flex:1">
                  <option value="">— Select QA officer —</option>
                  @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
                <button class="btn-action btn-secondary" (click)="doAssign()" [disabled]="!assigneeId || saving()">
                  Reassign
                </button>
              </div>
            </div>
          }

          <!-- ── COMPLIANCE MANAGER: in progress — reassign or close ── -->
          @if (isComplianceMgr() && req()!.status === 'in_progress' && req()!.target_department === 'compliance') {
            <div class="action-section" style="border-left:3px solid #a78bfa">
              <p class="action-desc">Assigned to <strong>{{ req()!.assignee?.name }}</strong>. Reassign if needed:</p>
              <div class="assign-row">
                <select class="field-input" [(ngModel)]="assigneeId" style="flex:1">
                  <option value="">— Select compliance officer —</option>
                  @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
                <button class="btn-action" style="background:#a78bfa;color:#fff"
                  (click)="doAssign()" [disabled]="!assigneeId || saving()">
                  Reassign
                </button>
              </div>
            </div>
          }

          <!-- ── QA OFFICER / SUPERVISOR: close (quality) ── -->
          @if ((isQAOfficer() || isQASupervisor() || isQAMgr()) &&
               req()!.assignee_id === currentUserId() &&
               req()!.status === 'in_progress' &&
               req()!.target_department === 'quality') {
            <div class="action-section" style="border-top:1px solid var(--border);margin-top:8px;padding-top:12px">
              <p class="action-desc">Provide a resolution summary and close this request.</p>
              <textarea class="field-input" rows="3" [(ngModel)]="resolution"
                placeholder="Describe the resolution, actions taken, and outcome…"
                style="margin-bottom:8px"></textarea>
              <button class="btn-action btn-success" (click)="doClose()" [disabled]="!resolution.trim() || saving()">
                <i class="fas fa-circle-check"></i> {{ saving() ? 'Closing…' : 'Close Request' }}
              </button>
            </div>
          }

          <!-- ── COMPLIANCE OFFICER / MANAGER: close (compliance) ── -->
          @if ((isComplianceOfc() || isComplianceMgr()) &&
               req()!.assignee_id === currentUserId() &&
               req()!.status === 'in_progress' &&
               req()!.target_department === 'compliance') {
            <div class="action-section" style="border-left:3px solid #a78bfa;border-top:1px solid var(--border);margin-top:8px;padding-top:12px">
              <p class="action-desc">Provide your compliance resolution, findings, and any regulatory actions taken.</p>
              <textarea class="field-input" rows="3" [(ngModel)]="resolution"
                placeholder="Compliance findings, regulatory outcome, actions taken…"
                style="margin-bottom:8px"></textarea>
              <button class="btn-action" style="background:#a78bfa;color:#fff"
                (click)="doClose()" [disabled]="!resolution.trim() || saving()">
                <i class="fas fa-circle-check"></i> {{ saving() ? 'Closing…' : 'Close Compliance Request' }}
              </button>
            </div>
          }

          <!-- QA Manager override close (any in_progress/approved) -->
          @if (isQAMgr() && ['in_progress','approved'].includes(req()!.status) &&
               req()!.assignee_id !== currentUserId()) {
            <div class="action-section" style="border-top:1px solid var(--border);margin-top:8px;padding-top:12px">
              <p class="action-desc" style="font-size:11px">QA Manager override — close directly:</p>
              <textarea class="field-input" rows="2" [(ngModel)]="resolution"
                placeholder="Resolution summary…" style="margin-bottom:8px"></textarea>
              <button class="btn-action btn-secondary btn-sm" (click)="doClose()"
                [disabled]="!resolution.trim() || saving()">
                <i class="fas fa-lock"></i> Force Close
              </button>
            </div>
          }

          <!-- Edit draft -->
          @if (canEdit() && req()!.status === 'draft') {
            <a [routerLink]="['/requests', id, 'edit']" class="btn-action btn-outline" style="margin-top:8px;display:inline-flex;text-decoration:none">
              <i class="fas fa-pencil"></i> Edit Request
            </a>
          }

          <!-- No actions fallback -->
          @if (noActions()) {
            <div class="status-info status-info--neutral">
              <i class="fas fa-circle-info"></i>
              No actions available for this request in its current state.
            </div>
          }
        </div>

        <!-- ── META CARD ── -->
        <div class="card">
          <div class="card-title"><i class="fas fa-circle-info"></i> Request Details</div>
          <div class="meta-grid">
            <div class="meta-row"><span>Type</span><strong>{{ req()!.type | titlecase }}</strong></div>
            <div class="meta-row"><span>Priority</span><strong>{{ req()!.priority | titlecase }}</strong></div>
            <div class="meta-row"><span>Status</span><strong>{{ formatStatus(req()!.status) }}</strong></div>
            <div class="meta-row"><span>Destination</span>
              <strong [style.color]="req()!.target_department === 'compliance' ? '#a78bfa' : 'var(--accent)'">
                {{ req()!.target_department === 'compliance' ? 'Compliance Dept' : 'Quality Dept' }}
              </strong>
            </div>
            <div class="meta-row"><span>Category</span><strong>{{ req()!.category?.name || '—' }}</strong></div>
            <div class="meta-row"><span>Submitted</span><strong>{{ req()!.submitted_at ? (req()!.submitted_at | date:'dd MMM yyyy') : '—' }}</strong></div>
            @if (req()!.approved_at) {
              <div class="meta-row"><span>Approved</span><strong style="color:#22c55e">{{ req()!.approved_at | date:'dd MMM yyyy' }}</strong></div>
            }
            @if (req()!.due_date) {
              <div class="meta-row">
                <span>Due Date</span>
                <strong [style.color]="isOverdue() ? '#ef4444' : 'var(--success)'">
                  {{ req()!.due_date | date:'dd MMM yyyy' }}
                </strong>
              </div>
            }
            @if (req()!.category?.sla_hours) {
              <div class="meta-row"><span>SLA Target</span><strong>{{ req()!.category!.sla_hours }}h</strong></div>
            }
          </div>
        </div>

      </div><!-- /right-col -->
    </div>
  }

</div>

@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    :host { display: block; }
    .detail-page { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }

    /* Breadcrumb */
    .breadcrumb { display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:20px; }
    .bc-link { color:var(--accent); text-decoration:none; display:flex; align-items:center; gap:6px; }
    .bc-link:hover { text-decoration:underline; }
    .bc-sep { color:var(--text2); }
    .bc-cur { color:var(--text2); }

    /* States */
    .loading-state { display:flex; flex-direction:column; align-items:center; gap:16px; padding:80px; color:var(--text2); }
    .spinner { width:40px; height:40px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .empty-state { text-align:center; padding:80px; color:var(--text2); display:flex; flex-direction:column; align-items:center; gap:16px; }

    /* Header */
    .header-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; margin-bottom:16px; }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap; gap:8px; }
    .ref-number { font-size:12px; font-weight:700; color:var(--accent); letter-spacing:1px; text-transform:uppercase; }
    .header-badges { display:flex; gap:6px; flex-wrap:wrap; }
    .header-title { font-size:22px; font-weight:700; color:var(--text); margin:0 0 12px; line-height:1.3; }
    .header-meta { display:flex; flex-wrap:wrap; gap:16px; font-size:13px; color:var(--text2); }
    .header-meta span { display:flex; align-items:center; gap:5px; }
    .overdue-text { color:#ef4444 !important; }

    /* Destination pill */
    .dept-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; }
    .dept-pill--blue { background:rgba(59,130,246,.12); color:#60a5fa; }
    .dept-pill--purple { background:rgba(139,92,246,.12); color:#a78bfa; }

    /* Badges */
    .badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:12px; }
    .badge-p-low    { background:rgba(34,197,94,.12); color:#16a34a; }
    .badge-p-medium { background:rgba(234,179,8,.12); color:#a16207; }
    .badge-p-high   { background:rgba(239,68,68,.12); color:#dc2626; }
    .badge-p-critical { background:#7f1d1d; color:#fca5a5; }
    .badge-s-draft { background:var(--surface2); color:var(--text2); }
    .badge-s-submitted { background:rgba(59,130,246,.12); color:#3b82f6; }
    .badge-s-approved { background:rgba(34,197,94,.12); color:#16a34a; }
    .badge-s-in-progress { background:rgba(99,102,241,.12); color:#6366f1; }
    .badge-s-in-review { background:rgba(99,102,241,.12); color:#6366f1; }
    .badge-s-rejected { background:rgba(239,68,68,.12); color:#ef4444; }
    .badge-s-closed { background:var(--surface2); color:var(--text2); }

    /* Journey */
    .journey-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px 24px; margin-bottom:16px; }
    .journey-steps { display:flex; align-items:center; gap:0; }
    .journey-step { display:flex; flex-direction:column; align-items:center; gap:6px; }
    .j-dot { width:34px; height:34px; border-radius:50%; background:var(--surface2); border:2px solid var(--border2); display:grid; place-items:center; font-size:13px; color:var(--text2); transition:all .2s; }
    .journey-step.done .j-dot { background:var(--accent); border-color:var(--accent); color:#fff; }
    .journey-step.active .j-dot { background:var(--surface); border-color:var(--accent); color:var(--accent); box-shadow:0 0 0 3px rgba(59,130,246,.2); }
    .j-label { font-size:10px; font-weight:600; color:var(--text2); text-align:center; white-space:nowrap; }
    .journey-step.done .j-label, .journey-step.active .j-label { color:var(--text); }
    .journey-line { flex:1; height:2px; background:var(--border2); margin:0 4px; margin-bottom:20px; transition:background .2s; }
    .journey-line.done { background:var(--accent); }
    .rejected-bar { margin-top:10px; padding:6px 12px; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); border-radius:6px; font-size:12px; color:#ef4444; display:flex; align-items:center; gap:6px; }

    /* Body grid */
    .body-grid { display:grid; grid-template-columns:1fr 340px; gap:16px; }
    @media(max-width:960px) { .body-grid { grid-template-columns:1fr; } }
    .left-col, .right-col { display:flex; flex-direction:column; gap:14px; }

    /* Cards */
    .card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px; }
    .card-success { border-color:rgba(34,197,94,.3); background:rgba(34,197,94,.03); }
    .card-title { font-size:13px; font-weight:700; color:var(--text); margin-bottom:14px; display:flex; align-items:center; gap:8px; }
    .body-text { font-size:14px; color:var(--text2); line-height:1.7; margin:0; white-space:pre-wrap; }
    .cnt-badge { background:var(--accent); color:#fff; border-radius:10px; padding:1px 8px; font-size:11px; }

    /* Approval chain */
    .chain-list { display:flex; flex-direction:column; gap:10px; }
    .chain-item { display:flex; align-items:flex-start; gap:12px; padding:12px; border-radius:8px; background:var(--bg); }
    .chain-pending  { border-left:3px solid var(--text2); }
    .chain-approved { border-left:3px solid #22c55e; }
    .chain-rejected { border-left:3px solid #ef4444; }
    .chain-seq { width:26px; height:26px; border-radius:50%; background:var(--accent); color:#fff; display:grid; place-items:center; font-size:11px; font-weight:700; flex-shrink:0; }
    .chain-body { flex:1; }
    .chain-name { font-size:13px; font-weight:600; color:var(--text); }
    .chain-status { font-size:12px; color:var(--text2); margin-top:2px; }
    .chain-comment { font-size:12px; color:var(--text2); margin-top:6px; font-style:italic; line-height:1.4; }
    .chain-date { font-size:11px; color:var(--text2); margin-top:4px; }
    .chain-icon { flex-shrink:0; font-size:16px; }

    /* Comments */
    .comment-list { display:flex; flex-direction:column; gap:14px; margin-bottom:16px; }
    .comment { display:flex; gap:10px; }
    .internal-comment { opacity:.8; }
    .comment-av { width:34px; height:34px; border-radius:50%; background:var(--accent); color:#fff; display:grid; place-items:center; font-size:13px; font-weight:700; flex-shrink:0; }
    .comment-body { flex:1; }
    .comment-meta { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
    .comment-meta strong { font-size:13px; color:var(--text); }
    .comment-date { font-size:11px; color:var(--text2); }
    .int-tag { font-size:10px; background:rgba(245,158,11,.12); color:#f59e0b; padding:2px 6px; border-radius:4px; }
    .comment-text { font-size:13px; color:var(--text2); margin:0; line-height:1.5; }
    .empty-msg { font-size:13px; color:var(--text2); text-align:center; padding:16px 0; }

    .add-comment { border-top:1px solid var(--border); padding-top:14px; }
    .comment-footer { display:flex; justify-content:space-between; align-items:center; margin-top:8px; }
    .int-toggle { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text2); cursor:pointer; }

    /* Actions */
    .action-section { display:flex; flex-direction:column; gap:8px; }
    .action-desc { font-size:13px; color:var(--text2); margin:0 0 8px; line-height:1.5; }
    .assign-row { display:flex; gap:8px; }
    .status-info { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:8px; font-size:13px; line-height:1.5; }
    .status-info i { flex-shrink:0; margin-top:1px; }
    .status-info--blue   { background:rgba(59,130,246,.08);  border:1px solid rgba(59,130,246,.2);  color:var(--text2); }
    .status-info--amber  { background:rgba(245,158,11,.08);  border:1px solid rgba(245,158,11,.2);  color:var(--text2); }
    .status-info--green  { background:rgba(34,197,94,.08);   border:1px solid rgba(34,197,94,.2);   color:var(--text2); }
    .status-info--red    { background:rgba(239,68,68,.08);   border:1px solid rgba(239,68,68,.2);   color:var(--text2); }
    .status-info--neutral{ background:var(--surface2);       border:1px solid var(--border);        color:var(--text2); }

    /* Buttons */
    .btn-action { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:10px 16px; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; width:100%; transition:opacity .15s; font-family:'Inter',sans-serif; }
    .btn-action:disabled { opacity:.55; cursor:not-allowed; }
    .btn-action:hover:not(:disabled) { opacity:.88; }
    .btn-action.btn-sm { padding:7px 12px; font-size:12px; }
    .btn-primary  { background:var(--accent); color:#fff; }
    .btn-success  { background:#22c55e; color:#fff; }
    .btn-danger   { background:#ef4444; color:#fff; }
    .btn-secondary{ background:#6366f1; color:#fff; }
    .btn-outline  { background:transparent; color:var(--text); border:1px solid var(--border) !important; }

    /* Fields */
    .field-input { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:10px 12px; font-size:13px; font-family:'Inter',sans-serif; box-sizing:border-box; outline:none; resize:vertical; }
    .field-input:focus { border-color:var(--accent); }

    /* Meta */
    .meta-grid { display:flex; flex-direction:column; gap:0; }
    .meta-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid rgba(0,0,0,.04); font-size:13px; }
    .meta-row:last-child { border-bottom:none; }
    .meta-row span { color:var(--text2); }
    .meta-row strong { text-align:right; }

    /* Toast */
    .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:8px; font-size:13px; font-weight:500; z-index:9999; animation:slideUp .3s ease; }
    .toast-success { background:#22c55e; color:#fff; }
    .toast-error   { background:#ef4444; color:#fff; }
    @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  `]
})
export class RequestDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  req       = signal<any>(null);
  comments  = signal<any[]>([]);
  approvals = signal<any[]>([]);
  users     = signal<any[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  submittingComment = signal(false);
  toast     = signal<{ msg: string; type: string } | null>(null);

  id!: number;

  newComment      = '';
  commentInternal = false;
  assigneeId      = '';
  approveComment  = '';
  rejectReason    = '';
  resolution      = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: RequestsService,
    public auth: AuthService,
  ) {}

  // ── Role helpers ─────────────────────────────────────────────────────
  private slug = () => (this.auth.currentUser() as any)?.role?.slug ?? '';
  isQAMgr          = () => ['super_admin','qa_manager'].includes(this.slug());
  isQASupervisor   = () => this.slug() === 'quality_supervisor';
  isQAOfficer      = () => this.slug() === 'qa_officer';
  isDeptMgr        = () => this.slug() === 'dept_manager';
  isComplianceMgr  = () => this.slug() === 'compliance_manager';
  isComplianceOfc  = () => this.slug() === 'compliance_officer';
  isEmployee       = () => this.slug() === 'employee';
  currentUserId    = () => (this.auth.currentUser() as any)?.id;

  canEdit = () => {
    const uid = this.currentUserId();
    return this.req()?.requester?.id === uid || this.isQAMgr();
  };

  /** True when no visible action card applies — show the "no actions" fallback */
  noActions = computed(() => {
    const r = this.req(); if (!r) return false;
    const s = r.status;
    if (this.isEmployee() && r.requester_id === this.currentUserId()) return false;
    if (this.isDeptMgr()) return false;
    if (this.isQAMgr()) return false;
    if ((this.isQAOfficer() || this.isQASupervisor()) && r.assignee_id === this.currentUserId()) return false;
    if (this.isComplianceMgr()) return false;
    if (this.isComplianceOfc() && r.assignee_id === this.currentUserId()) return false;
    return true;
  });

  // ── Journey ──────────────────────────────────────────────────────────
  jDone(status: string): boolean {
    const order = ['submitted','approved','in_progress','closed'];
    const cur   = this.req()?.status;
    if (cur === 'rejected') return false;
    return order.indexOf(cur) > order.indexOf(status);
  }

  jActive(status: string): boolean {
    return this.req()?.status === status;
  }

  formatStatus(s: string): string {
    return s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  isOverdue = computed(() => {
    const r = this.req();
    if (!r?.due_date) return false;
    return new Date(r.due_date) < new Date() && !['closed','rejected'].includes(r.status);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.get(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        const req = r.data ?? r;
        this.req.set(req);
        this.loading.set(false);
        this.loadComments();
        this.loadApprovals();
        // Load assignable users scoped to request's target_department
        this.svc.users({ target_department: req?.target_department ?? 'quality' })
          .pipe(takeUntil(this.destroy$))
          .subscribe({ next: ur => this.users.set(ur.data ?? ur) });
      },
      error: () => this.loading.set(false)
    });
  }

  loadComments(): void {
    this.svc.comments(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => this.comments.set(r.data ?? r)
    });
  }

  loadApprovals(): void {
    this.svc.approvals(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => this.approvals.set(r.data ?? r)
    });
  }

  // ── Workflow actions ─────────────────────────────────────────────────
  doSubmit(): void {
    this.saving.set(true);
    this.svc.submit(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving.set(false); this.showToast('Request submitted for approval', 'success'); this.load(); },
      error: e  => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to submit', 'error'); }
    });
  }

  doApprove(): void {
    this.saving.set(true);
    this.svc.approve(this.id, this.approveComment).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving.set(false); this.approveComment = ''; this.showToast('Request approved and forwarded', 'success'); this.load(); },
      error: e  => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to approve', 'error'); }
    });
  }

  doReject(): void {
    if (!this.rejectReason.trim()) return;
    this.saving.set(true);
    this.svc.reject(this.id, this.rejectReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving.set(false); this.rejectReason = ''; this.showToast('Request rejected', 'success'); this.load(); },
      error: e  => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to reject', 'error'); }
    });
  }

  doAssign(): void {
    if (!this.assigneeId) return;
    this.saving.set(true);
    this.svc.assign(this.id, Number(this.assigneeId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving.set(false); this.assigneeId = ''; this.showToast('Request assigned successfully', 'success'); this.load(); },
      error: e  => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to assign', 'error'); }
    });
  }

  doClose(): void {
    if (!this.resolution.trim()) return;
    this.saving.set(true);
    this.svc.close(this.id, this.resolution).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving.set(false); this.resolution = ''; this.showToast('Request closed', 'success'); this.load(); },
      error: e  => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to close', 'error'); }
    });
  }

  postComment(): void {
    if (!this.newComment.trim()) return;
    this.submittingComment.set(true);
    this.svc.addComment(this.id, this.newComment, this.commentInternal).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newComment = ''; this.commentInternal = false;
        this.submittingComment.set(false);
        this.showToast('Comment posted', 'success');
        this.loadComments();
      },
      error: () => this.submittingComment.set(false)
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
