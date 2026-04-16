import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NcCapaService } from '../../../core/services/nc-capa.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-nc-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/nc-capa" class="bc-link">← NC & CAPA</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ nc()?.reference_no || '…' }}</span>
  </div>

  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading NC…</p></div>
  } @else if (!nc()) {
    <div class="empty-state"><div class="empty-icon">⚠️</div><p>NC not found.</p><a routerLink="/nc-capa" class="btn-primary">Back</a></div>
  } @else {
    <div class="detail-header-card">
      <div class="dh-top">
        <span class="ref-badge">{{ nc()!.reference_no }}</span>
        <div class="badges">
          <span class="badge" [class]="'sev-' + nc()!.severity">{{ nc()!.severity | titlecase }}</span>
          <span class="badge badge-status">{{ fmt(nc()!.status) }}</span>
        </div>
      </div>
      <h1 class="dh-title">{{ nc()!.title }}</h1>
      <div class="dh-meta">
        <span><i class="fas fa-user"></i> Detected by: {{ nc()!.detected_by?.name }}</span>
        <span><i class="fas fa-building"></i> {{ nc()!.department?.name || '—' }}</span>
        <span><i class="fas fa-calendar"></i> {{ nc()!.detection_date | date:'dd MMM yyyy' }}</span>
        @if (nc()!.assigned_to) { <span><i class="fas fa-user-check"></i> Assigned: {{ nc()!.assigned_to!.name }}</span> }
        @if (nc()!.target_closure_date) { <span [class.text-danger]="isOverdue()"><i class="fas fa-clock"></i> Target: {{ nc()!.target_closure_date | date:'dd MMM yyyy' }}</span> }
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-main">
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-exclamation-triangle"></i> NC Description</h3>
          <div class="info-grid">
            <div class="info-item"><label>Source</label><span>{{ fmt(nc()!.source) }}</span></div>
            <div class="info-item"><label>Category</label><span>{{ nc()!.category?.name || '—' }}</span></div>
          </div>
          <p class="desc-text" style="margin-top:12px">{{ nc()!.description }}</p>
        </div>

        @if (nc()!.immediate_action) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-bolt"></i> Immediate Action Taken</h3>
            <p class="desc-text">{{ nc()!.immediate_action }}</p>
          </div>
        }

        @if (nc()!.root_cause) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-search"></i> Root Cause Analysis</h3>
            <p class="desc-text">{{ nc()!.root_cause }}</p>
          </div>
        }

        @if (nc()!.status === 'open' && canAction()) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-search-plus"></i> Start Investigation</h3>
            <textarea class="field-input" rows="3" [(ngModel)]="rootCauseInput" placeholder="Describe root cause findings…"></textarea>
            <button class="btn-primary btn-sm mt-8" (click)="startInvestigation()" [disabled]="!rootCauseInput.trim() || acting()">
              <i class="fas fa-search"></i> Start Investigation
            </button>
          </div>
        }
      </div>

      <div class="detail-sidebar">
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
          <div class="action-list">

            @if (canAction() && ['open','under_investigation'].includes(nc()!.status)) {
              @if (!showAssign) {
                <button class="action-btn btn-secondary" (click)="showAssign = true"><i class="fas fa-user-plus"></i> Assign</button>
              } @else {
                <div class="inline-action">
                  <select class="select-sm" [(ngModel)]="assigneeId">
                    <option value="">Select user…</option>
                    @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                  </select>
                  <button class="btn-secondary btn-sm" (click)="assign()" [disabled]="!assigneeId">Assign</button>
                  <button class="btn-outline btn-sm" (click)="showAssign = false">Cancel</button>
                </div>
              }
            }

            @if (canAction() && nc()!.status === 'under_investigation') {
              <button class="action-btn btn-warning" (click)="raiseCapa()">
                <i class="fas fa-shield-alt"></i> Raise CAPA
              </button>
            }

            @if (canAction() && ['under_investigation','capa_in_progress','effectiveness_check'].includes(nc()!.status)) {
              @if (!showClose) {
                <button class="action-btn btn-close" (click)="showClose = true"><i class="fas fa-lock"></i> Close NC</button>
              } @else {
                <div class="inline-action">
                  <textarea class="field-input" rows="2" [(ngModel)]="closeNotes" placeholder="Closure notes…"></textarea>
                  <button class="btn-close btn-sm" (click)="closeNc()" [disabled]="!closeNotes.trim()">Confirm Close</button>
                  <button class="btn-outline btn-sm" (click)="showClose = false">Cancel</button>
                </div>
              }
            }

          </div>
        </div>

        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-info-circle"></i> Details</h3>
          <div class="detail-pairs">
            <div class="dp"><span>Severity</span><strong [class]="'sev-text-' + nc()!.severity">{{ nc()!.severity | titlecase }}</strong></div>
            <div class="dp"><span>Source</span><strong>{{ fmt(nc()!.source) }}</strong></div>
            <div class="dp"><span>Status</span><strong>{{ fmt(nc()!.status) }}</strong></div>
            @if (nc()!.actual_closure_date) {
              <div class="dp"><span>Closed</span><strong>{{ nc()!.actual_closure_date | date:'dd MMM yyyy' }}</strong></div>
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
    .dh-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
    .ref-badge{font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;}
    .badges{display:flex;gap:8px;}
    .dh-title{font-size:22px;font-weight:700;color:var(--text);margin:0 0 12px;}
    .dh-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:var(--text-muted);}
    .dh-meta span{display:flex;align-items:center;gap:5px;}
    .detail-body{display:grid;grid-template-columns:1fr 300px;gap:20px;}
    @media(max-width:900px){.detail-body{grid-template-columns:1fr;}}
    .section-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}
    .section-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 14px;display:flex;align-items:center;gap:8px;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .info-item{display:flex;flex-direction:column;gap:4px;}
    .info-item label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;}
    .info-item span{font-size:13px;color:var(--text);font-weight:500;}
    .desc-text{font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-size:13px;width:100%;box-sizing:border-box;resize:vertical;}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;transition:opacity .15s;}
    .inline-action{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;}
    .detail-pairs{display:flex;flex-direction:column;gap:10px;}
    .dp{display:flex;justify-content:space-between;font-size:13px;}
    .dp span{color:var(--text-muted);} .dp strong{color:var(--text);}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-status{background:var(--bg);color:var(--text-muted);}
    .sev-minor{background:#fef9c3;color:#ca8a04;} .sev-major{background:#fee2e2;color:#dc2626;} .sev-critical{background:#7f1d1d;color:#fca5a5;}
    .sev-text-minor{color:#ca8a04;} .sev-text-major{color:#dc2626;} .sev-text-critical{color:#ef4444;}
    .select-sm{background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-size:13px;width:100%;}
    .btn-primary{background:var(--accent);color:#fff;} .btn-secondary{background:#6366f1;color:#fff;}
    .btn-warning{background:#f59e0b;color:#fff;} .btn-close{background:#6b7280;color:#fff;}
    .btn-outline{background:transparent;color:var(--text);border:1px solid var(--border);}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .mt-8{margin-top:8px;} .text-danger{color:#ef4444;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .empty-icon{font-size:48px;margin-bottom:16px;}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class NcDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  nc      = signal<any>(null);
  users   = signal<any[]>([]);
  loading = signal(true);
  acting  = signal(false);
  toast   = signal<{ msg: string; type: string } | null>(null);

  rootCauseInput = ''; assigneeId = ''; closeNotes = '';
  showAssign = false; showClose = false;

  private id!: number;

  constructor(
    private route: ActivatedRoute, private router: Router,
    private svc: NcCapaService, public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.svc.ncUsers().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.getNc(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.nc.set(r.data ?? r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'; }

  isOverdue = computed(() => {
    const n = this.nc();
    if (!n?.target_closure_date) return false;
    return new Date(n.target_closure_date) < new Date() && !['closed','cancelled'].includes(n.status);
  });

  canAction(): boolean {
    return ['super_admin','qa_manager','quality_supervisor','qa_officer','auditor'].includes((this.auth.currentUser() as any)?.role?.slug ?? '');
  }

  startInvestigation(): void {
    this.acting.set(true);
    this.svc.startInvestigation(this.id, this.rootCauseInput).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.rootCauseInput = ''; this.acting.set(false); this.showToast('Investigation started','success'); this.load(); },
      error: e => { this.acting.set(false); this.showToast(e.error?.message ?? 'Failed','error'); }
    });
  }

  assign(): void {
    this.svc.assignNc(this.id, Number(this.assigneeId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showAssign = false; this.showToast('NC assigned','success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed','error')
    });
  }

  raiseCapa(): void {
    this.svc.raiseCapa(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('CAPA raised','success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed','error')
    });
  }

  closeNc(): void {
    this.svc.closeNc(this.id, { closure_notes: this.closeNotes }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showClose = false; this.showToast('NC closed','success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed','error')
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
