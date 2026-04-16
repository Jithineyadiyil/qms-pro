import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/documents" class="bc-link">← Documents</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ doc()?.document_no || '…' }}</span>
  </div>

  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading document…</p></div>
  } @else if (!doc()) {
    <div class="empty-state"><p>Document not found.</p><a routerLink="/documents" class="btn-primary">Back</a></div>
  } @else {
    <div class="detail-header-card">
      <div class="dh-top">
        <div class="dh-left">
          <span class="ref-badge">{{ doc()!.document_no }}</span>
          <span class="version-badge">v{{ doc()!.version }}</span>
        </div>
        <div class="badges">
          <span class="badge badge-type">{{ fmt(doc()!.type) }}</span>
          <span class="badge" [class]="'doc-status-' + doc()!.status.replace('_','-')">{{ fmt(doc()!.status) }}</span>
          @if (doc()!.is_controlled) { <span class="badge badge-controlled"><i class="fas fa-lock"></i> Controlled</span> }
        </div>
      </div>
      <h1 class="dh-title">{{ doc()!.title }}</h1>
      <div class="dh-meta">
        <span><i class="fas fa-user"></i> Owner: {{ doc()!.owner?.name }}</span>
        <span><i class="fas fa-building"></i> {{ doc()!.department?.name || '—' }}</span>
        <span><i class="fas fa-folder"></i> {{ doc()!.category?.name || '—' }}</span>
        @if (doc()!.effective_date) { <span><i class="fas fa-calendar-check"></i> Effective: {{ doc()!.effective_date | date:'dd MMM yyyy' }}</span> }
        @if (doc()!.review_date) { <span><i class="fas fa-redo"></i> Review: {{ doc()!.review_date | date:'dd MMM yyyy' }}</span> }
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-main">

        @if (doc()!.description) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-info-circle"></i> Description</h3>
            <p class="desc-text">{{ doc()!.description }}</p>
          </div>
        }

        <!-- Version History -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-code-branch"></i> Version History <span class="count-badge">{{ versions().length }}</span></h3>
          @for (v of versions(); track v.id) {
            <div class="version-item" [class.current]="v.version === doc()!.version">
              <div class="v-badge">v{{ v.version }}</div>
              <div class="v-info">
                <div class="v-summary">{{ v.change_summary || 'No summary provided' }}</div>
                <div class="v-meta">
                  <span>{{ v.changed_by?.name }}</span>
                  <span>{{ v.created_at | date:'dd MMM yyyy' }}</span>
                </div>
              </div>
              @if (v.version === doc()!.version) { <span class="current-tag">Current</span> }
            </div>
          } @empty {
            <p class="no-data">No version history available.</p>
          }
        </div>

        <!-- Access Log -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-eye"></i> Recent Access Log</h3>
          @for (entry of accessLog(); track entry.id) {
            <div class="log-item">
              <div class="log-avatar">{{ entry.user?.name?.charAt(0) }}</div>
              <div class="log-info">
                <span class="log-user">{{ entry.user?.name }}</span>
                <span class="log-action">{{ fmt(entry.action) }}</span>
                <span class="log-date">{{ entry.created_at | date:'dd MMM yyyy HH:mm' }}</span>
              </div>
            </div>
          } @empty {
            <p class="no-data">No access records yet.</p>
          }
        </div>
      </div>

      <div class="detail-sidebar">
        <!-- Actions -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
          <div class="action-list">

            <button class="action-btn btn-primary" (click)="download()">
              <i class="fas fa-download"></i> Download
            </button>

            @if (canManage()) {
              @if (doc()!.status === 'draft') {
                <button class="action-btn btn-secondary" (click)="submitForReview()">
                  <i class="fas fa-paper-plane"></i> Submit for Review
                </button>
              }
              @if (doc()!.status === 'under_review') {
                @if (!showApprove) {
                  <button class="action-btn btn-success" (click)="showApprove = true"><i class="fas fa-check"></i> Approve</button>
                } @else {
                  <div class="inline-action">
                    <textarea class="field-input" rows="2" [(ngModel)]="approveComments" placeholder="Approval comments (optional)"></textarea>
                    <div class="row-btns">
                      <button class="btn-success btn-sm" (click)="approve()">Approve</button>
                      <button class="btn-outline btn-sm" (click)="showApprove = false">Cancel</button>
                    </div>
                  </div>
                }
                @if (!showReject) {
                  <button class="action-btn btn-danger" (click)="showReject = true"><i class="fas fa-times"></i> Reject</button>
                } @else {
                  <div class="inline-action">
                    <textarea class="field-input" rows="2" [(ngModel)]="rejectReason" placeholder="Reason for rejection…"></textarea>
                    <div class="row-btns">
                      <button class="btn-danger btn-sm" (click)="reject()" [disabled]="!rejectReason.trim()">Reject</button>
                      <button class="btn-outline btn-sm" (click)="showReject = false">Cancel</button>
                    </div>
                  </div>
                }
              }
              @if (doc()!.status === 'approved') {
                <button class="action-btn btn-warning" (click)="markObsolete()">
                  <i class="fas fa-archive"></i> Mark Obsolete
                </button>
              }
            }
          </div>
        </div>

        <!-- Details -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-info-circle"></i> Details</h3>
          <div class="detail-pairs">
            <div class="dp"><span>Type</span><strong>{{ fmt(doc()!.type) }}</strong></div>
            <div class="dp"><span>Version</span><strong>{{ doc()!.version }}</strong></div>
            <div class="dp"><span>Status</span><strong>{{ fmt(doc()!.status) }}</strong></div>
            @if (doc()!.reviewer) { <div class="dp"><span>Reviewer</span><strong>{{ doc()!.reviewer!.name }}</strong></div> }
            @if (doc()!.approver) { <div class="dp"><span>Approver</span><strong>{{ doc()!.approver!.name }}</strong></div> }
            @if (doc()!.expiry_date) { <div class="dp"><span>Expiry</span><strong>{{ doc()!.expiry_date | date:'dd MMM yyyy' }}</strong></div> }
          </div>
          @if (doc()!.tags?.length) {
            <div class="tags-row">
              @for (tag of doc()!.tags!; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
          }
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
    .dh-left{display:flex;align-items:center;gap:8px;}
    .ref-badge{font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;}
    .version-badge{font-size:11px;background:var(--bg);border:1px solid var(--border);color:var(--text-muted);padding:2px 8px;border-radius:12px;}
    .badges{display:flex;gap:6px;flex-wrap:wrap;}
    .dh-title{font-size:22px;font-weight:700;color:var(--text);margin:0 0 12px;}
    .dh-meta{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--text-muted);}
    .dh-meta span{display:flex;align-items:center;gap:5px;}
    .detail-body{display:grid;grid-template-columns:1fr 290px;gap:20px;}
    @media(max-width:900px){.detail-body{grid-template-columns:1fr;}}
    .section-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}
    .section-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 14px;display:flex;align-items:center;gap:8px;}
    .count-badge{background:var(--accent);color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;}
    .desc-text{font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;}
    .version-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
    .version-item:last-child{border-bottom:none;}
    .version-item.current{background:var(--accent)10;border-radius:8px;padding:10px;}
    .v-badge{font-size:11px;font-weight:700;background:var(--accent);color:#fff;padding:3px 8px;border-radius:6px;flex-shrink:0;}
    .v-info{flex:1;}
    .v-summary{font-size:13px;color:var(--text);margin-bottom:4px;}
    .v-meta{display:flex;gap:12px;font-size:11px;color:var(--text-muted);}
    .current-tag{font-size:10px;background:#22c55e22;color:#22c55e;padding:2px 6px;border-radius:4px;flex-shrink:0;}
    .log-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);}
    .log-item:last-child{border-bottom:none;}
    .log-avatar{width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
    .log-info{display:flex;flex-wrap:wrap;gap:8px;font-size:12px;}
    .log-user{color:var(--text);font-weight:600;} .log-action{color:var(--text-muted);} .log-date{color:var(--text-muted);margin-left:auto;}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;transition:opacity .15s;}
    .action-btn:hover{opacity:.85;}
    .inline-action{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;}
    .row-btns{display:flex;gap:8px;}
    .detail-pairs{display:flex;flex-direction:column;gap:10px;margin-bottom:12px;}
    .dp{display:flex;justify-content:space-between;font-size:13px;}
    .dp span{color:var(--text-muted);} .dp strong{color:var(--text);}
    .tags-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
    .tag{font-size:11px;background:var(--bg);border:1px solid var(--border);color:var(--text-muted);padding:3px 8px;border-radius:12px;}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-type{background:#e0e7ff;color:#4338ca;}
    .badge-controlled{background:#fef9c3;color:#ca8a04;}
    .doc-status-draft{background:var(--bg);color:var(--text-muted);}
    .doc-status-under-review{background:#dbeafe;color:#1d4ed8;}
    .doc-status-pending-approval{background:#e0e7ff;color:#4338ca;}
    .doc-status-approved{background:#dcfce7;color:#15803d;}
    .doc-status-obsolete,.doc-status-superseded{background:#fee2e2;color:#dc2626;}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;font-size:13px;width:100%;box-sizing:border-box;}
    textarea.field-input{resize:vertical;}
    .btn-primary{background:var(--accent);color:#fff;} .btn-secondary{background:#6366f1;color:#fff;}
    .btn-success{background:#22c55e;color:#fff;} .btn-danger{background:#ef4444;color:#fff;}
    .btn-warning{background:#f59e0b;color:#fff;}
    .btn-outline{background:transparent;color:var(--text);border:1px solid var(--border);}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .no-data{font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  doc       = signal<any>(null);
  versions  = signal<any[]>([]);
  accessLog = signal<any[]>([]);
  loading   = signal(true);
  toast     = signal<{ msg: string; type: string } | null>(null);

  approveComments = ''; rejectReason = '';
  showApprove = false; showReject = false;

  private id!: number;

  constructor(private route: ActivatedRoute, private svc: DocumentService, public auth: AuthService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.get(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        this.doc.set(r.data ?? r);
        this.loading.set(false);
        this.svc.getVersions(this.id).pipe(takeUntil(this.destroy$)).subscribe({ next: v => this.versions.set(v.data ?? v) });
        this.svc.getAccessLog(this.id).pipe(takeUntil(this.destroy$)).subscribe({ next: a => this.accessLog.set(a.data ?? a) });
      },
      error: () => this.loading.set(false)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'; }

  canManage(): boolean {
    return ['super_admin', 'qa_manager'].includes(this.auth.currentUser()?.role?.slug ?? '');
  }

  download(): void {
    this.svc.download(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.showToast('Download started', 'success'),
      error: () => this.showToast('Download failed', 'error')
    });
  }

  submitForReview(): void {
    this.svc.submitForReview(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('Submitted for review', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  approve(): void {
    this.svc.approve(this.id, { comments: this.approveComments }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showApprove = false; this.showToast('Document approved', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  reject(): void {
    this.svc.reject(this.id, this.rejectReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showReject = false; this.showToast('Document rejected', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  markObsolete(): void {
    this.svc.markObsolete(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('Marked as obsolete', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
