import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { VisitService } from '../../../core/services/visit.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-visit-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/visits" class="bc-link">← Visits</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ visit()?.reference_no || '…' }}</span>
  </div>

  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading visit…</p></div>
  } @else if (!visit()) {
    <div class="empty-state"><p>Visit not found.</p><a routerLink="/visits" class="btn-primary">Back</a></div>
  } @else {
    <div class="detail-header-card">
      <div class="dh-top">
        <span class="ref-badge">{{ visit()!.reference_no }}</span>
        <div class="badges">
          <span class="badge badge-type">{{ fmt(visit()!.type) }}</span>
          <span class="badge" [class]="'vs-' + visit()!.status">{{ fmt(visit()!.status) }}</span>
          @if (visit()!.is_virtual) { <span class="badge badge-virtual"><i class="fas fa-video"></i> Virtual</span> }
        </div>
      </div>
      <h1 class="dh-title">{{ visit()!.client?.name }} — {{ fmt(visit()!.type) }}</h1>
      <div class="dh-meta">
        <span><i class="fas fa-calendar"></i> {{ visit()!.visit_date | date:'dd MMM yyyy' }} {{ visit()!.visit_time || '' }}</span>
        <span><i class="fas fa-clock"></i> {{ visit()!.duration_hours || '—' }}h</span>
        <span><i class="fas fa-map-marker-alt"></i> {{ visit()!.location || 'TBD' }}</span>
        <span><i class="fas fa-user-tie"></i> Host: {{ visit()!.host?.name }}</span>
        @if (visit()!.rating) {
          <span><i class="fas fa-star text-warning"></i>
            @for (i of ratingArr(); track i) { ★ }
            ({{ visit()!.rating }}/5)
          </span>
        }
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-main">

        <!-- Purpose & Agenda -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bullseye"></i> Purpose</h3>
          <p class="desc-text">{{ visit()!.purpose }}</p>
          @if (visit()!.agenda) {
            <hr class="divider">
            <h4 class="sub-title">Agenda</h4>
            <p class="desc-text">{{ visit()!.agenda }}</p>
          }
          @if (visit()!.meeting_link) {
            <div class="meeting-link-row">
              <i class="fas fa-video"></i>
              <a [href]="visit()!.meeting_link" target="_blank" class="meeting-link">Join Virtual Meeting</a>
            </div>
          }
        </div>

        <!-- Participants -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-users"></i> Participants <span class="count-badge">{{ (visit()!.participants || []).length }}</span></h3>
          @for (p of visit()!.participants || []; track p.id) {
            <div class="participant-item">
              <div class="p-avatar">{{ (p.is_internal ? p.user?.name : p.external_name)?.charAt(0) }}</div>
              <div class="p-info">
                <div class="p-name">{{ p.is_internal ? p.user?.name : p.external_name }}</div>
                <div class="p-role">{{ p.is_internal ? 'Internal' : p.external_role || 'External' }}</div>
              </div>
              @if (p.attended !== null && p.attended !== undefined) {
                <span class="attended-badge" [class.attended]="p.attended">{{ p.attended ? '✓ Attended' : '✗ Absent' }}</span>
              }
            </div>
          } @empty {
            <p class="no-data">No participants added.</p>
          }

          @if (canManage() && !['completed','cancelled'].includes(visit()!.status)) {
            <div class="add-participant-form">
              <div class="field-row">
                <input class="field-input" [(ngModel)]="newParticipant.external_name" placeholder="External participant name">
                <input class="field-input" [(ngModel)]="newParticipant.external_role" placeholder="Role / Title">
              </div>
              <button class="btn-primary btn-sm mt-8" (click)="addParticipant()"
                [disabled]="!newParticipant.external_name.trim()">
                <i class="fas fa-user-plus"></i> Add Participant
              </button>
            </div>
          }
        </div>

        <!-- Findings -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-flag"></i> Findings & Action Items <span class="count-badge">{{ (visit()!.findings || []).length }}</span></h3>
          @for (f of visit()!.findings || []; track f.id) {
            <div class="finding-item" [class]="'finding-' + f.finding_type">
              <div class="finding-header">
                <span class="finding-type">{{ fmt(f.finding_type) }}</span>
                <span class="badge" [class]="'pri-' + f.priority">{{ f.priority | titlecase }}</span>
                <span class="finding-status">{{ fmt(f.status) }}</span>
              </div>
              <p class="finding-desc">{{ f.description }}</p>
              @if (f.responsible || f.due_date) {
                <div class="finding-meta">
                  @if (f.responsible) { <span><i class="fas fa-user"></i> {{ f.responsible.name }}</span> }
                  @if (f.due_date) { <span><i class="fas fa-calendar"></i> {{ f.due_date | date:'dd MMM yyyy' }}</span> }
                </div>
              }
            </div>
          } @empty {
            <p class="no-data">No findings recorded.</p>
          }

          @if (canManage() && visit()!.status === 'in_progress') {
            <div class="add-finding-form">
              <h4 class="sub-title">Add Finding / Action Item</h4>
              <select class="field-input" [(ngModel)]="newFinding.finding_type">
                <option value="positive">Positive</option><option value="concern">Concern</option>
                <option value="action_item">Action Item</option><option value="observation">Observation</option>
                <option value="requirement">Requirement</option>
              </select>
              <textarea class="field-input mt-6" rows="2" [(ngModel)]="newFinding.description" placeholder="Description…"></textarea>
              <div class="field-row mt-6">
                <select class="field-input" [(ngModel)]="newFinding.priority">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
                <input class="field-input" type="date" [(ngModel)]="newFinding.due_date">
              </div>
              <button class="btn-primary btn-sm mt-8" (click)="addFinding()"
                [disabled]="!newFinding.description.trim()">Add Finding</button>
            </div>
          }
        </div>

        <!-- Minutes -->
        @if (visit()!.minutes || visit()!.outcome) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-file-alt"></i> Minutes & Outcome</h3>
            @if (visit()!.minutes) {
              <h4 class="sub-title">Minutes</h4>
              <p class="desc-text">{{ visit()!.minutes }}</p>
            }
            @if (visit()!.outcome) {
              <hr class="divider">
              <h4 class="sub-title">Outcome</h4>
              <p class="desc-text">{{ visit()!.outcome }}</p>
            }
            @if (visit()!.rating_comments) {
              <hr class="divider">
              <h4 class="sub-title">Satisfaction Notes</h4>
              <p class="desc-text">{{ visit()!.rating_comments }}</p>
            }
          </div>
        }
      </div>

      <div class="detail-sidebar">
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
          <div class="action-list">

            @if (canManage()) {
              @if (visit()!.status === 'planned') {
                <button class="action-btn btn-secondary" (click)="doAction('confirm')"><i class="fas fa-check"></i> Confirm Visit</button>
              }
              @if (['planned','confirmed'].includes(visit()!.status)) {
                <button class="action-btn btn-primary" (click)="doAction('start')"><i class="fas fa-play"></i> Start Visit</button>
              }
              @if (visit()!.status === 'in_progress') {
                @if (!showComplete) {
                  <button class="action-btn btn-success" (click)="showComplete = true"><i class="fas fa-flag-checkered"></i> Complete</button>
                } @else {
                  <div class="inline-action">
                    <textarea class="field-input" rows="2" [(ngModel)]="completeData.outcome" placeholder="Visit outcome…"></textarea>
                    <textarea class="field-input mt-6" rows="2" [(ngModel)]="completeData.minutes" placeholder="Meeting minutes…"></textarea>
                    <div class="row-btns">
                      <button class="btn-success btn-sm" (click)="completeVisit()">Complete</button>
                      <button class="btn-outline btn-sm" (click)="showComplete = false">Cancel</button>
                    </div>
                  </div>
                }
              }
              @if (visit()!.status === 'completed' && !visit()!.rating) {
                @if (!showRate) {
                  <button class="action-btn btn-accent" (click)="showRate = true"><i class="fas fa-star"></i> Rate Visit</button>
                } @else {
                  <div class="inline-action">
                    <div class="star-rating">
                      @for (n of [1,2,3,4,5]; track n) {
                        <button type="button" class="star-btn" [class.active]="rating >= n" (click)="rating = n">★</button>
                      }
                    </div>
                    <textarea class="field-input mt-6" rows="2" [(ngModel)]="ratingComments" placeholder="Comments…"></textarea>
                    <div class="row-btns">
                      <button class="btn-accent btn-sm" (click)="rateVisit()" [disabled]="!rating">Rate</button>
                      <button class="btn-outline btn-sm" (click)="showRate = false">Cancel</button>
                    </div>
                  </div>
                }
              }
            }

          </div>
        </div>

        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-address-card"></i> Client Info</h3>
          <div class="client-info">
            <div class="ci-name">{{ visit()!.client?.name }}</div>
            <div class="ci-type">{{ fmt(visit()!.client?.type) }}</div>
            @if (visit()!.client?.contact_name) { <div class="ci-contact"><i class="fas fa-user"></i> {{ visit()!.client!.contact_name }}</div> }
            @if (visit()!.client?.contact_email) { <div class="ci-contact"><i class="fas fa-envelope"></i> {{ visit()!.client!.contact_email }}</div> }
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
    .dh-title{font-size:20px;font-weight:700;color:var(--text);margin:0 0 12px;}
    .dh-meta{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--text-muted);}
    .dh-meta span{display:flex;align-items:center;gap:5px;}
    .detail-body{display:grid;grid-template-columns:1fr 290px;gap:20px;}
    @media(max-width:900px){.detail-body{grid-template-columns:1fr;}}
    .section-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}
    .section-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 14px;display:flex;align-items:center;gap:8px;}
    .count-badge{background:var(--accent);color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;}
    .sub-title{font-size:13px;font-weight:600;color:var(--text);margin:0 0 6px;}
    .divider{border:none;border-top:1px solid var(--border);margin:14px 0;}
    .desc-text{font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;}
    .meeting-link-row{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;}
    .meeting-link{color:var(--accent);text-decoration:none;font-weight:500;}
    .participant-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);}
    .participant-item:last-child{border-bottom:none;}
    .p-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
    .p-name{font-size:13px;color:var(--text);} .p-role{font-size:11px;color:var(--text-muted);}
    .p-info{flex:1;}
    .attended-badge{font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg);color:var(--text-muted);}
    .attended-badge.attended{background:#dcfce7;color:#15803d;}
    .add-participant-form{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}
    .finding-item{padding:12px;border-radius:8px;margin-bottom:10px;border:1px solid var(--border);}
    .finding-positive{border-left:4px solid #22c55e;} .finding-concern{border-left:4px solid #ef4444;}
    .finding-action_item,.finding-action-item{border-left:4px solid #f59e0b;}
    .finding-observation{border-left:4px solid #6366f1;} .finding-requirement{border-left:4px solid #3b82f6;}
    .finding-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
    .finding-type{font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text);flex:1;}
    .finding-status{font-size:11px;color:var(--text-muted);}
    .finding-desc{font-size:13px;color:var(--text-muted);margin:0;}
    .finding-meta{display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-top:6px;}
    .add-finding-form{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;font-size:13px;width:100%;box-sizing:border-box;}
    textarea.field-input{resize:vertical;}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;}
    .inline-action{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;}
    .row-btns{display:flex;gap:8px;}
    .star-rating{display:flex;gap:4px;}
    .star-btn{font-size:22px;background:none;border:none;cursor:pointer;color:var(--text-muted);transition:color .1s;}
    .star-btn.active{color:#f59e0b;}
    .client-info{display:flex;flex-direction:column;gap:6px;}
    .ci-name{font-size:15px;font-weight:700;color:var(--text);}
    .ci-type{font-size:12px;color:var(--text-muted);}
    .ci-contact{font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-type{background:#e0e7ff;color:#4338ca;} .badge-virtual{background:#dbeafe;color:#1d4ed8;}
    .vs-planned{background:#dbeafe;color:#1d4ed8;} .vs-confirmed{background:#e0e7ff;color:#4338ca;}
    .vs-in-progress,.vs-in_progress{background:#fef9c3;color:#ca8a04;}
    .vs-completed{background:#dcfce7;color:#15803d;} .vs-cancelled{background:#fee2e2;color:#dc2626;}
    .pri-low{background:#dcfce7;color:#16a34a;} .pri-medium{background:#fef9c3;color:#ca8a04;} .pri-high{background:#fee2e2;color:#dc2626;}
    .btn-primary{background:var(--accent);color:#fff;} .btn-secondary{background:#6366f1;color:#fff;}
    .btn-success{background:#22c55e;color:#fff;} .btn-accent{background:#8b5cf6;color:#fff;}
    .btn-outline{background:transparent;color:var(--text);border:1px solid var(--border);}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .mt-6{margin-top:6px;} .mt-8{margin-top:8px;}
    .text-warning{color:#f59e0b;}
    .no-data{font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class VisitDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  visit   = signal<any>(null);
  loading = signal(true);
  toast   = signal<{ msg: string; type: string } | null>(null);

  showComplete = false; showRate = false;
  rating = 0; ratingComments = '';
  completeData = { outcome: '', minutes: '' };
  newParticipant = { external_name: '', external_role: '', is_internal: false };
  newFinding = { finding_type: 'action_item', description: '', priority: 'medium', due_date: '' };

  private id!: number;

  constructor(private route: ActivatedRoute, private svc: VisitService, public auth: AuthService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.get(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.visit.set(r.data ?? r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'; }

  ratingArr = computed(() => Array.from({ length: this.visit()?.rating ?? 0 }, (_, i) => i));

  canManage(): boolean {
    return ['super_admin', 'qa_manager', 'dept_manager'].includes(this.auth.currentUser()?.role?.slug ?? '');
  }

  doAction(action: 'confirm' | 'start'): void {
    const obs = action === 'confirm' ? this.svc.confirm(this.id) : this.svc.start(this.id);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast(`Visit ${action}ed`, 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  completeVisit(): void {
    this.svc.complete(this.id, this.completeData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showComplete = false; this.showToast('Visit completed', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  rateVisit(): void {
    this.svc.rate(this.id, { rating: this.rating, rating_comments: this.ratingComments }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showRate = false; this.showToast('Rating submitted', 'success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed', 'error')
    });
  }

  addParticipant(): void {
    if (!this.newParticipant.external_name.trim()) return;
    this.svc.addParticipant(this.id, this.newParticipant).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.newParticipant = {external_name:'',external_role:'',is_internal:false}; this.showToast('Participant added','success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed','error')
    });
  }

  addFinding(): void {
    if (!this.newFinding.description.trim()) return;
    this.svc.addFinding(this.id, this.newFinding).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.newFinding = {finding_type:'action_item',description:'',priority:'medium',due_date:''}; this.showToast('Finding added','success'); this.load(); },
      error: e => this.showToast(e.error?.message ?? 'Failed','error')
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
