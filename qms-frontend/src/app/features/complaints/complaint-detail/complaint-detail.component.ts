import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ComplaintService } from '../../../core/services/complaint.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-complaint-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/complaints" class="bc-link">← Complaints</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ complaint()?.reference_no || '…' }}</span>
  </div>

  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading complaint…</p></div>
  } @else if (!complaint()) {
    <div class="empty-state"><p>Complaint not found.</p><a routerLink="/complaints" class="btn-primary">Back</a></div>
  } @else {
    <!-- HEADER -->
    <div class="detail-header-card">
      <div class="dh-top">
        <span class="ref-badge">{{ complaint()!.reference_no }}</span>
        <div class="badges">
          <span class="badge" [class]="'sev-' + complaint()!.severity">{{ complaint()!.severity | titlecase }}</span>
          <span class="badge badge-status">{{ fmt(complaint()!.status) }}</span>
          @if (complaint()!.is_regulatory) { <span class="badge badge-reg">Regulatory</span> }
          @if (complaint()!.escalation_level > 0) { <span class="badge badge-esc">Escalated L{{ complaint()!.escalation_level }}</span> }
        </div>
      </div>
      <h1 class="dh-title">{{ complaint()!.title }}</h1>
      <div class="dh-meta">
        <span><i class="fas fa-user"></i> {{ complaint()!.complainant_name || '—' }}</span>
        <span><i class="fas fa-tag"></i> {{ fmt(complaint()!.complainant_type) }}</span>
        <span><i class="fas fa-inbox"></i> {{ fmt(complaint()!.source) }}</span>
        <span><i class="fas fa-calendar"></i> Received: {{ complaint()!.received_date | date:'dd MMM yyyy' }}</span>
        @if (complaint()!.target_resolution_date) {
          <span [class.text-danger]="isOverdue()">
            <i class="fas fa-clock"></i> Target: {{ complaint()!.target_resolution_date | date:'dd MMM yyyy' }}
          </span>
        }
        @if (complaint()!.assignee) { <span><i class="fas fa-user-check"></i> Assigned: {{ complaint()!.assignee!.name }}</span> }
      </div>
    </div>

    <div class="detail-body">
      <!-- LEFT -->
      <div class="detail-main">

        <!-- Description -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-align-left"></i> Description</h3>
          <p class="desc-text">{{ complaint()!.description }}</p>

          @if (complaint()!.root_cause) {
            <hr class="divider">
            <h4 class="sub-title">Root Cause</h4>
            <p class="desc-text">{{ complaint()!.root_cause }}</p>
          }
          @if (complaint()!.resolution) {
            <hr class="divider">
            <h4 class="sub-title">Resolution</h4>
            <p class="desc-text">{{ complaint()!.resolution }}</p>
          }
        </div>

        <!-- CAPA Link -->
        @if (complaint()!.capa) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-shield-alt"></i> Linked CAPA</h3>
            <div class="linked-item">
              <span class="ref">{{ complaint()!.capa!.reference_no }}</span>
              <span class="linked-title">{{ complaint()!.capa!.title }}</span>
              <span class="badge" [class]="'pri-' + complaint()!.capa!.priority">{{ complaint()!.capa!.priority | titlecase }}</span>
            </div>
          </div>
        }

        <!-- Updates Timeline -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-history"></i> Activity Timeline <span class="count-badge">{{ updates().length }}</span></h3>
          <div class="timeline">
            @for (u of updates(); track u.id) {
              <div class="timeline-item">
                <div class="tl-dot" [class]="'tl-' + u.update_type"></div>
                <div class="tl-body">
                  <div class="tl-header">
                    <strong>{{ u.user?.name }}</strong>
                    <span class="tl-type">{{ fmt(u.update_type) }}</span>
                    <span class="tl-date">{{ u.created_at | date:'dd MMM yyyy HH:mm' }}</span>
                  </div>
                  @if (u.previous_status && u.new_status) {
                    <div class="tl-status-change">
                      <span class="old-status">{{ fmt(u.previous_status) }}</span>
                      <i class="fas fa-arrow-right"></i>
                      <span class="new-status">{{ fmt(u.new_status) }}</span>
                    </div>
                  }
                  @if (u.comment) { <p class="tl-comment">{{ u.comment }}</p> }
                </div>
              </div>
            } @empty {
              <p class="no-data">No activity recorded yet.</p>
            }
          </div>

          <!-- Add Comment -->
          <div class="add-update">
            <textarea class="field-input" rows="2" [(ngModel)]="newComment" placeholder="Add a note or comment…"></textarea>
            <button class="btn-primary btn-sm mt-8" (click)="addUpdate()" [disabled]="!newComment.trim()">
              <i class="fas fa-paper-plane"></i> Post Note
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDEBAR -->
      <div class="detail-sidebar">
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
          <div class="action-list">

            @if (canAction() && complaint()!.status === 'received') {
              <button class="action-btn btn-primary" (click)="doAction('acknowledge')">
                <i class="fas fa-check"></i> Acknowledge
              </button>
            }

            @if (canAction() && complaint()!.status === 'acknowledged') {
              @if (!showAssign) {
                <button class="action-btn btn-secondary" (click)="showAssign = true"><i class="fas fa-user-plus"></i> Assign</button>
              } @else {
                <div class="inline-action">
                  <select class="field-input" [(ngModel)]="assigneeId">
                    <option value="">Select user…</option>
                    @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                  </select>
                  <div class="row-btns">
                    <button class="btn-secondary btn-sm" (click)="assign()" [disabled]="!assigneeId">Assign</button>
                    <button class="btn-outline btn-sm" (click)="showAssign = false">Cancel</button>
                  </div>
                </div>
              }
              <button class="action-btn btn-info" (click)="doAction('investigate')"><i class="fas fa-search"></i> Start Investigation</button>
            }

            @if (canAction() && complaint()!.status === 'under_investigation') {
              @if (!showEscalate) {
                <button class="action-btn btn-warning" (click)="showEscalate = true"><i class="fas fa-level-up-alt"></i> Escalate</button>
              } @else {
                <div class="inline-action">
                  <select class="field-input" [(ngModel)]="escalateToId">
                    <option value="">Escalate to…</option>
                    @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                  </select>
                  <textarea class="field-input mt-6" rows="2" [(ngModel)]="escalateReason" placeholder="Reason for escalation…"></textarea>
                  <div class="row-btns">
                    <button class="btn-warning btn-sm" (click)="escalate()" [disabled]="!escalateToId || !escalateReason.trim()">Escalate</button>
                    <button class="btn-outline btn-sm" (click)="showEscalate = false">Cancel</button>
                  </div>
                </div>
              }

              @if (!showResolve) {
                <button class="action-btn btn-success" (click)="showResolve = true"><i class="fas fa-check-circle"></i> Resolve</button>
              } @else {
                <div class="inline-action">
                  <textarea class="field-input" rows="2" [(ngModel)]="resolution" placeholder="Resolution summary…"></textarea>
                  <input class="field-input mt-6" type="number" [(ngModel)]="satisfaction" min="1" max="5" placeholder="Customer satisfaction (1–5)">
                  <div class="row-btns">
                    <button class="btn-success btn-sm" (click)="resolve()" [disabled]="!resolution.trim()">Resolve</button>
                    <button class="btn-outline btn-sm" (click)="showResolve = false">Cancel</button>
                  </div>
                </div>
              }

              <button class="action-btn btn-accent" (click)="raiseCapa()"><i class="fas fa-shield-alt"></i> Raise CAPA</button>
            }

            @if (canAction() && complaint()!.status === 'resolved') {
              <button class="action-btn btn-close" (click)="doAction('close')"><i class="fas fa-lock"></i> Close Complaint</button>
            }

            @if (['received','acknowledged'].includes(complaint()!.status) && canAction()) {
              @if (!showWithdraw) {
                <button class="action-btn btn-outline-danger" (click)="showWithdraw = true"><i class="fas fa-ban"></i> Withdraw</button>
              } @else {
                <div class="inline-action">
                  <textarea class="field-input" rows="2" [(ngModel)]="withdrawReason" placeholder="Reason for withdrawal…"></textarea>
                  <div class="row-btns">
                    <button class="btn-danger btn-sm" (click)="withdraw()" [disabled]="!withdrawReason.trim()">Withdraw</button>
                    <button class="btn-outline btn-sm" (click)="showWithdraw = false">Cancel</button>
                  </div>
                </div>
              }
            }

          </div>
        </div>

        <!-- SLA -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-stopwatch"></i> SLA Status</h3>
          <div class="sla-pairs">
            <div class="sla-row"><span>Category</span><strong>{{ complaint()!.category?.name || '—' }}</strong></div>
            @if (complaint()!.acknowledged_date) {
              <div class="sla-row"><span>Acknowledged</span><strong>{{ complaint()!.acknowledged_date | date:'dd MMM' }}</strong></div>
            }
            @if (complaint()!.actual_resolution_date) {
              <div class="sla-row"><span>Resolved</span><strong>{{ complaint()!.actual_resolution_date | date:'dd MMM' }}</strong></div>
            }
            @if (complaint()!.customer_satisfaction) {
              <div class="sla-row">
                <span>Satisfaction</span>
                <strong class="stars">{{ '★'.repeat(complaint()!.customer_satisfaction) }}{{ '☆'.repeat(5 - complaint()!.customer_satisfaction!) }}</strong>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  }
</div>

@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    .detail-page{padding:24px;max-width:1200px;margin:0 auto;}
    .breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:20px;}
    .bc-link{color:var(--accent);text-decoration:none;} .bc-sep,.bc-cur{color:var(--text-muted);}
    .loading-center{display:flex;flex-direction:column;align-items:center;padding:80px;gap:16px;color:var(--text-muted);}
    .spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    .detail-header-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px;}
    .dh-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;}
    .ref-badge{font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;}
    .badges{display:flex;gap:6px;flex-wrap:wrap;}
    .dh-title{font-size:22px;font-weight:700;color:var(--text);margin:0 0 12px;}
    .dh-meta{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--text-muted);}
    .dh-meta span{display:flex;align-items:center;gap:5px;}
    .detail-body{display:grid;grid-template-columns:1fr 310px;gap:20px;}
    @media(max-width:900px){.detail-body{grid-template-columns:1fr;}}
    .section-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}
    .section-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 14px;display:flex;align-items:center;gap:8px;}
    .count-badge{background:var(--accent);color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;}
    .sub-title{font-size:13px;font-weight:600;color:var(--text);margin:0 0 6px;}
    .divider{border:none;border-top:1px solid var(--border);margin:14px 0;}
    .desc-text{font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;}
    .linked-item{display:flex;align-items:center;gap:12px;font-size:13px;}
    .linked-item .ref{color:var(--accent);font-weight:600;}
    .linked-item .linked-title{color:var(--text);flex:1;}
    .timeline{display:flex;flex-direction:column;gap:0;margin-bottom:16px;}
    .timeline-item{display:flex;gap:12px;padding-bottom:16px;position:relative;}
    .timeline-item:not(:last-child)::before{content:'';position:absolute;left:11px;top:24px;bottom:0;width:2px;background:var(--border);}
    .tl-dot{width:24px;height:24px;border-radius:50%;flex-shrink:0;margin-top:2px;}
    .tl-status_change{background:#6366f1;} .tl-comment{background:var(--accent);} .tl-escalation{background:#ef4444;} .tl-resolution{background:#22c55e;} .tl-closure{background:#6b7280;}
    .tl-body{flex:1;}
    .tl-header{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px;}
    .tl-header strong{font-size:13px;color:var(--text);}
    .tl-type{font-size:11px;background:var(--bg);color:var(--text-muted);padding:2px 6px;border-radius:4px;}
    .tl-date{font-size:11px;color:var(--text-muted);margin-left:auto;}
    .tl-status-change{display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:4px;}
    .old-status{color:var(--text-muted);} .new-status{color:var(--text);font-weight:600;}
    .tl-comment{font-size:13px;color:var(--text-muted);margin:0;}
    .add-update{border-top:1px solid var(--border);padding-top:14px;}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;font-size:13px;width:100%;box-sizing:border-box;}
    .field-input:focus{outline:none;border-color:var(--accent);}
    textarea.field-input{resize:vertical;}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;transition:opacity .15s;}
    .action-btn:hover{opacity:.85;}
    .inline-action{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;}
    .row-btns{display:flex;gap:8px;}
    .sla-pairs{display:flex;flex-direction:column;gap:10px;}
    .sla-row{display:flex;justify-content:space-between;font-size:13px;}
    .sla-row span{color:var(--text-muted);} .sla-row strong{color:var(--text);}
    .stars{color:#f59e0b;letter-spacing:2px;}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-status{background:var(--bg);color:var(--text-muted);}
    .badge-reg{background:#fee2e2;color:#dc2626;}
    .badge-esc{background:#fef9c3;color:#ca8a04;}
    .sev-low{background:#dcfce7;color:#16a34a;} .sev-medium{background:#fef9c3;color:#ca8a04;}
    .sev-high{background:#fee2e2;color:#dc2626;} .sev-critical{background:#7f1d1d;color:#fca5a5;}
    .pri-low{background:#dcfce7;color:#16a34a;} .pri-medium{background:#fef9c3;color:#ca8a04;}
    .pri-high{background:#fee2e2;color:#dc2626;} .pri-critical{background:#7f1d1d;color:#fca5a5;}
    .btn-primary{background:var(--accent);color:#fff;} .btn-secondary{background:#6366f1;color:#fff;}
    .btn-success{background:#22c55e;color:#fff;} .btn-warning{background:#f59e0b;color:#fff;}
    .btn-info{background:#0ea5e9;color:#fff;} .btn-accent{background:#8b5cf6;color:#fff;}
    .btn-close{background:#6b7280;color:#fff;} .btn-danger{background:#ef4444;color:#fff;}
    .btn-outline{background:transparent;color:var(--text);border:1px solid var(--border);}
    .btn-outline-danger{background:transparent;color:#ef4444;border:1px solid #ef4444;}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .mt-6{margin-top:6px;} .mt-8{margin-top:8px;}
    .text-danger{color:#ef4444;}
    .no-data{font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class ComplaintDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  complaint = signal<any>(null);
  updates   = signal<any[]>([]);
  users     = signal<any[]>([]);
  loading   = signal(true);
  toast     = signal<{ msg: string; type: string } | null>(null);

  newComment = ''; assigneeId = ''; resolution = ''; satisfaction: number | null = null;
  escalateToId = ''; escalateReason = ''; withdrawReason = '';
  showAssign = false; showResolve = false; showEscalate = false; showWithdraw = false;

  private id!: number;

  constructor(private route: ActivatedRoute, private svc: ComplaintService, public auth: AuthService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.svc.users().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.getById(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.complaint.set(r.data ?? r); this.loading.set(false); this.loadUpdates(); },
      error: () => this.loading.set(false)
    });
  }

  loadUpdates(): void {
    this.svc.getUpdates(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => this.updates.set(r.data ?? r)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'; }

  isOverdue = computed(() => {
    const c = this.complaint();
    if (!c?.target_resolution_date) return false;
    return new Date(c.target_resolution_date) < new Date() && !['resolved','closed','withdrawn'].includes(c.status);
  });

  canAction(): boolean {
    return ['super_admin','qa_manager','dept_manager'].includes(this.auth.currentUser()?.role?.slug ?? '');
  }

  doAction(action: 'acknowledge' | 'investigate' | 'close'): void {
    let obs$;
    switch (action) {
      case 'acknowledge': obs$ = this.svc.acknowledge(this.id); break;
      case 'investigate': obs$ = this.svc.investigate(this.id); break;
      case 'close':       obs$ = this.svc.close(this.id, {}); break;
      default: return;
    }
    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast(`Complaint ${action}d`, 'success'); this.load(); },
      error: (e: any) => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  assign(): void {
    this.svc.assign(this.id, Number(this.assigneeId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showAssign = false; this.showToast('Complaint assigned', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  escalate(): void {
    this.svc.escalate(this.id, Number(this.escalateToId), this.escalateReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showEscalate = false; this.showToast('Complaint escalated', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  resolve(): void {
    this.svc.resolve(this.id, { resolution: this.resolution, customer_satisfaction: this.satisfaction }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showResolve = false; this.showToast('Complaint resolved', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  withdraw(): void {
    this.svc.withdraw(this.id, this.withdrawReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showWithdraw = false; this.showToast('Complaint withdrawn', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  raiseCapa(): void {
    this.svc.raiseCapa(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('CAPA raised', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  addUpdate(): void {
    if (!this.newComment.trim()) return;
    this.svc.addUpdate(this.id, { comment: this.newComment }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.newComment = ''; this.showToast('Note posted', 'success'); this.loadUpdates(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
