import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { VendorService } from '../../../core/services/vendor.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-vendor-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/vendors" class="bc-link">← Vendors</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ vendor()?.name || '…' }}</span>
  </div>

  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading vendor…</p></div>
  } @else if (!vendor()) {
    <div class="empty-state"><p>Vendor not found.</p><a routerLink="/vendors" class="btn-primary">Back</a></div>
  } @else {
    <div class="detail-header-card">
      <div class="dh-top">
        <div class="dh-left">
          <span class="vendor-name">{{ vendor()!.name }}</span>
          @if (vendor()!.code) { <span class="code-badge">{{ vendor()!.code }}</span> }
        </div>
        <div class="badges">
          <span class="badge badge-type">{{ fmt(vendor()!.type) }}</span>
          <span class="badge" [class]="'ql-' + vendor()!.qualification_status.replace('_','-')">{{ fmt(vendor()!.qualification_status) }}</span>
          <span class="badge" [class]="'vs-' + vendor()!.status">{{ vendor()!.status | titlecase }}</span>
        </div>
      </div>
      <div class="dh-meta">
        <span><i class="fas fa-user-tie"></i> {{ vendor()!.contact_name || '—' }}</span>
        <span><i class="fas fa-envelope"></i> {{ vendor()!.contact_email || '—' }}</span>
        <span><i class="fas fa-globe"></i> {{ vendor()!.country || '—' }}</span>
        @if (vendor()!.account_manager) { <span><i class="fas fa-user-check"></i> AM: {{ vendor()!.account_manager!.name }}</span> }
        @if (vendor()!.overall_rating) {
          <span><i class="fas fa-star text-warning"></i> {{ vendor()!.overall_rating?.toFixed(1) }}/10</span>
        }
      </div>
    </div>

    <!-- TABS -->
    <div class="tab-row">
      @for (t of tabs; track t.key) {
        <button class="tab-pill" [class.active]="activeTab === t.key" (click)="activeTab = t.key">
          <i [class]="t.icon"></i> {{ t.label }}
        </button>
      }
    </div>

    <!-- TAB CONTENT -->
    @if (activeTab === 'overview') {
      <div class="detail-body">
        <div class="detail-main">
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-building"></i> Company Details</h3>
            <div class="info-grid">
              <div class="info-item"><label>Type</label><span>{{ fmt(vendor()!.type) }}</span></div>
              <div class="info-item"><label>Category</label><span>{{ vendor()!.category?.name || '—' }}</span></div>
              <div class="info-item"><label>Risk Level</label><span [class]="'risk-' + vendor()!.risk_level">{{ vendor()!.risk_level | titlecase }}</span></div>
              <div class="info-item"><label>Registration No.</label><span>{{ vendor()!.registration_no || '—' }}</span></div>
              <div class="info-item"><label>Website</label>
                <span>@if(vendor()!.website){<a [href]="vendor()!.website" target="_blank" class="link">{{ vendor()!.website }}</a>} @else {—}</span>
              </div>
              <div class="info-item"><label>Phone</label><span>{{ vendor()!.contact_phone || '—' }}</span></div>
            </div>
            @if (vendor()!.address) {
              <div class="address-block"><i class="fas fa-map-marker-alt"></i> {{ vendor()!.address }}</div>
            }
          </div>

          @if (vendor()!.qualification_date || vendor()!.qualification_expiry) {
            <div class="section-card">
              <h3 class="section-title"><i class="fas fa-certificate"></i> Qualification</h3>
              <div class="info-grid">
                <div class="info-item"><label>Date</label><span>{{ vendor()!.qualification_date | date:'dd MMM yyyy' }}</span></div>
                <div class="info-item"><label>Expiry</label><span [class.text-danger]="isQualExpired()">{{ vendor()!.qualification_expiry | date:'dd MMM yyyy' }}</span></div>
              </div>
            </div>
          }
        </div>

        <div class="detail-sidebar">
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
            <div class="action-list">
              @if (canManage()) {
                @if (vendor()!.qualification_status !== 'qualified') {
                  <button class="action-btn btn-success" (click)="qualify()"><i class="fas fa-check-circle"></i> Qualify Vendor</button>
                }
                @if (vendor()!.status !== 'suspended') {
                  <button class="action-btn btn-warning" (click)="suspend()"><i class="fas fa-pause-circle"></i> Suspend</button>
                }
              }
            </div>
          </div>

          @if (vendor()!.overall_rating) {
            <div class="section-card">
              <h3 class="section-title"><i class="fas fa-chart-bar"></i> Performance</h3>
              <div class="perf-score">
                <div class="perf-num">{{ vendor()!.overall_rating?.toFixed(1) }}</div>
                <div class="perf-label">Overall Score / 10</div>
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (activeTab === 'evaluations') {
      <div class="section-card">
        <h3 class="section-title"><i class="fas fa-star"></i> Evaluations</h3>

        @for (e of evaluations(); track e.id) {
          <div class="eval-card">
            <div class="eval-header">
              <span class="eval-by">{{ e.evaluated_by?.name }}</span>
              <span class="eval-date">{{ e.evaluation_date | date:'dd MMM yyyy' }}</span>
              <span class="eval-score">{{ e.overall_score?.toFixed(1) }}/10</span>
            </div>
            <div class="eval-scores">
              @for (s of evalScores(e); track s.label) {
                <div class="eval-score-item">
                  <span>{{ s.label }}</span>
                  <div class="score-bar"><div class="score-fill" [style.width]="(s.value / 10 * 100) + '%'"></div></div>
                  <strong>{{ s.value }}</strong>
                </div>
              }
            </div>
            @if (e.comments) { <p class="eval-comment">{{ e.comments }}</p> }
          </div>
        } @empty { <p class="no-data">No evaluations recorded yet.</p> }

        @if (canManage()) {
          <div class="add-eval-form">
            <h4 class="sub-title">Add Evaluation</h4>
            <div class="score-fields">
              @for (f of evalFields; track f.key) {
                <div class="score-field">
                  <label>{{ f.label }} (1–10)</label>
                  <input class="field-input-sm" type="number" min="1" max="10" [(ngModel)]="newEval[f.key]">
                </div>
              }
            </div>
            <textarea class="field-input mt-8" rows="2" [(ngModel)]="newEval.comments" placeholder="Comments…"></textarea>
            <button class="btn-primary btn-sm mt-8" (click)="addEvaluation()">Submit Evaluation</button>
          </div>
        }
      </div>
    }

    @if (activeTab === 'contracts') {
      <div class="section-card">
        <h3 class="section-title"><i class="fas fa-file-contract"></i> Contracts</h3>
        @for (c of contracts(); track c.id) {
          <div class="contract-item">
            <div class="contract-header">
              <span class="contract-no">{{ c.contract_no }}</span>
              <span class="badge" [class]="'cs-' + c.status">{{ c.status | titlecase }}</span>
            </div>
            <div class="contract-title">{{ c.title }}</div>
            <div class="contract-meta">
              <span>{{ c.start_date | date:'dd MMM yyyy' }} – {{ c.end_date | date:'dd MMM yyyy' }}</span>
              @if (c.value) { <span>{{ c.currency }} {{ c.value | number }}</span> }
            </div>
          </div>
        } @empty { <p class="no-data">No contracts on file.</p> }

        @if (canManage()) {
          <div class="add-contract-form">
            <h4 class="sub-title">Add Contract</h4>
            <div class="field-row">
              <input class="field-input" [(ngModel)]="newContract.contract_no" placeholder="Contract No.">
              <input class="field-input" [(ngModel)]="newContract.title" placeholder="Contract Title">
            </div>
            <div class="field-row mt-8">
              <input class="field-input" type="date" [(ngModel)]="newContract.start_date" placeholder="Start Date">
              <input class="field-input" type="date" [(ngModel)]="newContract.end_date" placeholder="End Date">
            </div>
            <button class="btn-primary btn-sm mt-8" (click)="addContract()"
              [disabled]="!newContract.contract_no || !newContract.title">Add Contract</button>
          </div>
        }
      </div>
    }
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
    .detail-header-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:16px;}
    .dh-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;}
    .dh-left{display:flex;align-items:center;gap:10px;}
    .vendor-name{font-size:20px;font-weight:700;color:var(--text);}
    .code-badge{font-size:11px;background:var(--bg);border:1px solid var(--border);color:var(--text-muted);padding:2px 8px;border-radius:12px;}
    .badges{display:flex;gap:6px;flex-wrap:wrap;}
    .dh-meta{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--text-muted);}
    .dh-meta span{display:flex;align-items:center;gap:5px;}
    .tab-row{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;}
    .tab-pill{padding:7px 14px;border:1px solid var(--border);border-radius:20px;background:var(--surface);color:var(--text-muted);font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;}
    .tab-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);}
    .detail-body{display:grid;grid-template-columns:1fr 280px;gap:20px;}
    @media(max-width:900px){.detail-body{grid-template-columns:1fr;}}
    .section-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}
    .section-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 14px;display:flex;align-items:center;gap:8px;}
    .sub-title{font-size:13px;font-weight:600;color:var(--text);margin:0 0 10px;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .info-item{display:flex;flex-direction:column;gap:3px;}
    .info-item label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;}
    .info-item span{font-size:13px;color:var(--text);}
    .address-block{font-size:13px;color:var(--text-muted);margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}
    .link{color:var(--accent);text-decoration:none;}
    .eval-card{border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;}
    .eval-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
    .eval-by{font-size:13px;font-weight:600;color:var(--text);flex:1;}
    .eval-date{font-size:11px;color:var(--text-muted);}
    .eval-score{font-size:16px;font-weight:700;color:var(--accent);}
    .eval-scores{display:flex;flex-direction:column;gap:6px;}
    .eval-score-item{display:flex;align-items:center;gap:8px;font-size:12px;}
    .eval-score-item span{width:100px;color:var(--text-muted);}
    .score-bar{flex:1;height:6px;background:var(--bg);border-radius:3px;overflow:hidden;}
    .score-fill{height:100%;background:var(--accent);border-radius:3px;}
    .eval-score-item strong{width:20px;text-align:right;color:var(--text);}
    .eval-comment{font-size:12px;color:var(--text-muted);margin:8px 0 0;font-style:italic;}
    .add-eval-form{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
    .score-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .score-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-muted);}
    .field-input-sm{background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:13px;width:100%;box-sizing:border-box;}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;font-size:13px;width:100%;box-sizing:border-box;}
    textarea.field-input{resize:vertical;}
    .contract-item{border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;}
    .contract-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
    .contract-no{font-size:12px;font-weight:600;color:var(--accent);}
    .contract-title{font-size:13px;color:var(--text);margin-bottom:6px;}
    .contract-meta{display:flex;gap:16px;font-size:12px;color:var(--text-muted);}
    .add-contract-form{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;}
    .perf-score{text-align:center;padding:8px 0;}
    .perf-num{font-size:36px;font-weight:800;color:var(--accent);}
    .perf-label{font-size:12px;color:var(--text-muted);}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-type{background:#e0e7ff;color:#4338ca;}
    .ql-qualified{background:#dcfce7;color:#15803d;} .ql-not-qualified,.ql-expired{background:#fee2e2;color:#dc2626;}
    .ql-pending{background:#fef9c3;color:#ca8a04;}
    .vs-active{background:#dcfce7;color:#15803d;} .vs-suspended{background:#fee2e2;color:#dc2626;}
    .vs-prospect{background:#dbeafe;color:#1d4ed8;}
    .cs-active{background:#dcfce7;color:#15803d;} .cs-expired,.cs-terminated{background:#fee2e2;color:#dc2626;}
    .cs-draft{background:var(--bg);color:var(--text-muted);}
    .risk-low{color:#22c55e;} .risk-medium{color:#f59e0b;} .risk-high{color:#ef4444;} .risk-critical{color:#7f1d1d;}
    .text-danger{color:#ef4444;} .text-warning{color:#f59e0b;}
    .btn-primary{background:var(--accent);color:#fff;} .btn-success{background:#22c55e;color:#fff;}
    .btn-warning{background:#f59e0b;color:#fff;}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .mt-8{margin-top:8px;}
    .no-data{font-size:13px;color:var(--text-muted);text-align:center;padding:16px 0;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class VendorDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  vendor      = signal<any>(null);
  evaluations = signal<any[]>([]);
  contracts   = signal<any[]>([]);
  loading     = signal(true);
  toast       = signal<{ msg: string; type: string } | null>(null);
  activeTab   = 'overview';

  tabs = [
    { key: 'overview', label: 'Overview', icon: 'fas fa-building' },
    { key: 'evaluations', label: 'Evaluations', icon: 'fas fa-star' },
    { key: 'contracts', label: 'Contracts', icon: 'fas fa-file-contract' }
  ];

  evalFields = [
    { key: 'quality_score', label: 'Quality' },
    { key: 'delivery_score', label: 'Delivery' },
    { key: 'price_score', label: 'Price' },
    { key: 'service_score', label: 'Service' },
    { key: 'compliance_score', label: 'Compliance' }
  ];

  newEval: any = { quality_score: 5, delivery_score: 5, price_score: 5, service_score: 5, compliance_score: 5, comments: '', evaluation_date: new Date().toISOString().split('T')[0] };
  newContract: any = { contract_no: '', title: '', type: 'service', start_date: '', end_date: '', currency: 'SAR' };

  private id!: number;

  constructor(private route: ActivatedRoute, private svc: VendorService, public auth: AuthService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.get(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        this.vendor.set(r.data ?? r);
        this.loading.set(false);
        this.svc.getEvaluations(this.id).pipe(takeUntil(this.destroy$)).subscribe({ next: e => this.evaluations.set(e.data ?? e) });
        this.svc.getContracts(this.id).pipe(takeUntil(this.destroy$)).subscribe({ next: c => this.contracts.set(c.data ?? c) });
      },
      error: () => this.loading.set(false)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'; }

  isQualExpired = computed(() => {
    const v = this.vendor();
    if (!v?.qualification_expiry) return false;
    return new Date(v.qualification_expiry) < new Date();
  });

  canManage(): boolean {
    return ['super_admin', 'qa_manager'].includes(this.auth.currentUser()?.role?.slug ?? '');
  }

  evalScores(e: any): { label: string; value: number }[] {
    return this.evalFields.map(f => ({ label: f.label, value: e[f.key] ?? 0 }));
  }

  qualify(): void {
    this.svc.qualify(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('Vendor qualified', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  suspend(): void {
    this.svc.suspend(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('Vendor suspended', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  addEvaluation(): void {
    this.svc.addEvaluation(this.id, this.newEval).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newEval = { quality_score:5, delivery_score:5, price_score:5, service_score:5, compliance_score:5, comments:'', evaluation_date: new Date().toISOString().split('T')[0] };
        this.showToast('Evaluation submitted', 'success');
        this.svc.getEvaluations(this.id).pipe(takeUntil(this.destroy$)).subscribe({ next: e => this.evaluations.set(e.data ?? e) });
      },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  addContract(): void {
    if (!this.newContract.contract_no || !this.newContract.title) return;
    this.svc.addContract(this.id, this.newContract).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newContract = { contract_no:'', title:'', type:'service', start_date:'', end_date:'', currency:'SAR' };
        this.showToast('Contract added', 'success');
        this.svc.getContracts(this.id).pipe(takeUntil(this.destroy$)).subscribe({ next: c => this.contracts.set(c.data ?? c) });
      },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
