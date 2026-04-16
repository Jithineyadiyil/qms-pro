import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/audits" class="bc-link">← Audits</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ audit()?.reference_no || '…' }}</span>
  </div>
  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading audit…</p></div>
  } @else if (!audit()) {
    <div class="empty-state"><p>Audit not found.</p><a routerLink="/audits" class="btn-primary">Back</a></div>
  } @else {
    <div class="detail-header-card">
      <div class="dh-top">
        <span class="ref-badge">{{ audit()!.reference_no }}</span>
        <div class="badges">
          <span class="badge badge-type">{{ fmt(audit()!.type) }}</span>
          <span class="badge badge-status">{{ fmt(audit()!.status) }}</span>
        </div>
      </div>
      <h1 class="dh-title">{{ audit()!.title }}</h1>
      <div class="dh-meta">
        <span><i class="fas fa-user"></i> Lead: {{ audit()!.lead_auditor?.name }}</span>
        <span><i class="fas fa-building"></i> {{ audit()!.department?.name || '—' }}</span>
        <span><i class="fas fa-calendar"></i> {{ audit()!.planned_start_date | date:'dd MMM yyyy' }} – {{ audit()!.planned_end_date | date:'dd MMM yyyy' }}</span>
        @if (audit()!.overall_result) { <span><i class="fas fa-flag"></i> {{ fmt(audit()!.overall_result!) }}</span> }
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-main">
        <!-- Scope & Criteria -->
        @if (audit()!.scope || audit()!.criteria) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-crosshairs"></i> Scope & Criteria</h3>
            @if (audit()!.scope) { <p class="desc-text"><strong>Scope:</strong> {{ audit()!.scope }}</p> }
            @if (audit()!.criteria) { <p class="desc-text mt-8"><strong>Criteria:</strong> {{ audit()!.criteria }}</p> }
          </div>
        }

        <!-- Team -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-users"></i> Audit Team</h3>
          @for (m of audit()!.team || []; track m.user?.id) {
            <div class="team-item">
              <div class="avatar">{{ m.user?.name?.charAt(0) }}</div>
              <div class="team-info">
                <div class="team-name">{{ m.user?.name }}</div>
                <div class="team-role">{{ fmt(m.role) }}</div>
              </div>
            </div>
          } @empty { <p class="no-data">No team members added.</p> }

          @if (canAction() && !['closed','cancelled'].includes(audit()!.status)) {
            <div class="add-team-form">
              <select class="field-input" [(ngModel)]="newMember.user_id">
                <option value="">Add team member…</option>
                @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
              </select>
              <select class="field-input mt-6" [(ngModel)]="newMember.role">
                <option value="auditor">Auditor</option>
                <option value="lead_auditor">Lead Auditor</option>
                <option value="observer">Observer</option>
                <option value="technical_expert">Technical Expert</option>
              </select>
              <button class="btn-primary btn-sm mt-8" (click)="addTeamMember()" [disabled]="!newMember.user_id">Add Member</button>
            </div>
          }
        </div>

        <!-- Findings -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-flag"></i> Findings <span class="count-badge">{{ findings().length }}</span></h3>
          @for (f of findings(); track f.id) {
            <div class="finding-item" [class]="'finding-' + f.finding_type.replace('_','-')">
              <div class="finding-header">
                <span class="finding-type">{{ fmt(f.finding_type) }}</span>
                <span class="finding-status">{{ fmt(f.status) }}</span>
              </div>
              <p class="finding-desc">{{ f.description }}</p>
              @if (f.requirement_ref) { <div class="finding-ref">Ref: {{ f.requirement_ref }}</div> }
              @if (f.status === 'open' && canAction()) {
                <button class="btn-sm btn-warning mt-6" (click)="raiseCapa(f.id)">Raise CAPA</button>
              }
            </div>
          } @empty { <p class="no-data">No findings recorded.</p> }

          @if (canAction() && audit()!.status === 'in_progress') {
            <div class="add-finding-form">
              <h4 class="sub-title">Add Finding</h4>
              <select class="field-input" [(ngModel)]="newFinding.finding_type">
                <option value="minor_nc">Minor NC</option><option value="major_nc">Major NC</option>
                <option value="observation">Observation</option><option value="opportunity">Opportunity</option>
                <option value="positive">Positive Finding</option>
              </select>
              <textarea class="field-input mt-6" rows="2" [(ngModel)]="newFinding.description" placeholder="Finding description…"></textarea>
              <input class="field-input mt-6" [(ngModel)]="newFinding.requirement_ref" placeholder="ISO clause / requirement ref (optional)">
              <button class="btn-primary btn-sm mt-8" (click)="addFinding()" [disabled]="!newFinding.description.trim()">Add Finding</button>
            </div>
          }
        </div>

        <!-- Executive Summary -->
        @if (audit()!.executive_summary) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-file-alt"></i> Executive Summary</h3>
            <p class="desc-text">{{ audit()!.executive_summary }}</p>
          </div>
        }
      </div>

      <div class="detail-sidebar">
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
          <div class="action-list">
            @if (canAction() && audit()!.status === 'planned') {
              <button class="action-btn btn-secondary" (click)="doAction('notify')"><i class="fas fa-bell"></i> Notify Auditees</button>
            }
            @if (canAction() && ['planned','notified'].includes(audit()!.status)) {
              <button class="action-btn btn-primary" (click)="doAction('start')"><i class="fas fa-play"></i> Start Audit</button>
            }
            @if (canAction() && audit()!.status === 'in_progress') {
              @if (!showIssueReport) {
                <button class="action-btn btn-warning" (click)="showIssueReport = true"><i class="fas fa-file-signature"></i> Issue Report</button>
              } @else {
                <div class="inline-action">
                  <textarea class="field-input" rows="3" [(ngModel)]="reportSummary" placeholder="Executive summary…"></textarea>
                  <select class="field-input mt-6" [(ngModel)]="reportResult">
                    <option value="satisfactory">Satisfactory</option>
                    <option value="minor_findings">Minor Findings</option>
                    <option value="major_findings">Major Findings</option>
                    <option value="critical_findings">Critical Findings</option>
                  </select>
                  <button class="btn-warning btn-sm mt-8" (click)="issueReport()">Issue Report</button>
                </div>
              }
            }
            @if (canAction() && audit()!.status === 'report_issued') {
              <button class="action-btn btn-close" (click)="doAction('close')"><i class="fas fa-lock"></i> Close Audit</button>
            }
          </div>
        </div>
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-calendar-alt"></i> Timeline</h3>
          <div class="timeline-rows">
            <div class="tl-row"><span>Planned Start</span><strong>{{ audit()!.planned_start_date | date:'dd MMM yyyy' }}</strong></div>
            <div class="tl-row"><span>Planned End</span><strong>{{ audit()!.planned_end_date | date:'dd MMM yyyy' }}</strong></div>
            @if (audit()!.actual_start_date) { <div class="tl-row"><span>Actual Start</span><strong>{{ audit()!.actual_start_date | date:'dd MMM yyyy' }}</strong></div> }
            @if (audit()!.report_date) { <div class="tl-row"><span>Report Date</span><strong>{{ audit()!.report_date | date:'dd MMM yyyy' }}</strong></div> }
          </div>
        </div>
      </div>
    </div>
  }
</div>
@if (toast()) { <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div> }
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
    .count-badge{background:var(--accent);color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;}
    .sub-title{font-size:13px;font-weight:600;color:var(--text);margin:0 0 8px;}
    .desc-text{font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;}
    .team-item{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);}
    .team-item:last-child{border-bottom:none;}
    .avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
    .team-name{font-size:13px;color:var(--text);} .team-role{font-size:11px;color:var(--text-muted);}
    .add-team-form{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}
    .finding-item{padding:12px;border-radius:8px;margin-bottom:10px;border:1px solid var(--border);}
    .finding-minor-nc{border-left:4px solid #f59e0b;} .finding-major-nc{border-left:4px solid #ef4444;}
    .finding-observation{border-left:4px solid #6366f1;} .finding-positive{border-left:4px solid #22c55e;}
    .finding-opportunity{border-left:4px solid #3b82f6;}
    .finding-header{display:flex;justify-content:space-between;margin-bottom:6px;}
    .finding-type{font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text);}
    .finding-status{font-size:11px;color:var(--text-muted);}
    .finding-desc{font-size:13px;color:var(--text-muted);margin:0;}
    .finding-ref{font-size:11px;color:var(--text-muted);margin-top:4px;}
    .add-finding-form{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;}
    .inline-action{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;}
    .timeline-rows{display:flex;flex-direction:column;gap:10px;}
    .tl-row{display:flex;justify-content:space-between;font-size:13px;}
    .tl-row span{color:var(--text-muted);} .tl-row strong{color:var(--text);}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;font-size:13px;width:100%;box-sizing:border-box;}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-type{background:#e0e7ff;color:#4338ca;} .badge-status{background:var(--bg);color:var(--text-muted);}
    .btn-primary{background:var(--accent);color:#fff;} .btn-secondary{background:#6366f1;color:#fff;}
    .btn-warning{background:#f59e0b;color:#fff;} .btn-close{background:#6b7280;color:#fff;}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .mt-6{margin-top:6px;} .mt-8{margin-top:8px;}
    .no-data{font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class AuditDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  audit    = signal<any>(null);
  findings = signal<any[]>([]);
  users    = signal<any[]>([]);
  loading  = signal(true);
  toast    = signal<{ msg: string; type: string } | null>(null);

  showIssueReport = false;
  reportSummary = ''; reportResult = 'satisfactory';
  newMember = { user_id: '', role: 'auditor' };
  newFinding = { finding_type: 'observation', description: '', requirement_ref: '' };

  private id!: number;

  constructor(private route: ActivatedRoute, private svc: AuditService, public auth: AuthService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.svc.users().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.get(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        const d = r.data ?? r; this.audit.set(d);
        this.findings.set(d.findings ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) ?? '—'; }
  canAction(): boolean { return ['super_admin','qa_manager','quality_supervisor','auditor'].includes((this.auth.currentUser() as any)?.role?.slug ?? ''); }

  doAction(action: 'notify' | 'start' | 'close'): void {
    const obs = action === 'notify' ? this.svc.notify(this.id) : action === 'start' ? this.svc.start(this.id) : this.svc.close(this.id);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast(`Audit ${action}d`,'success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  issueReport(): void {
    this.svc.issueReport(this.id, { executive_summary: this.reportSummary, overall_result: this.reportResult }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showIssueReport = false; this.showToast('Report issued','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  addTeamMember(): void {
    this.svc.addTeamMember(this.id, this.newMember).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.newMember = {user_id:'',role:'auditor'}; this.showToast('Member added','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  addFinding(): void {
    if (!this.newFinding.description.trim()) return;
    this.svc.addFinding(this.id, this.newFinding).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.newFinding = {finding_type:'observation',description:'',requirement_ref:''}; this.showToast('Finding added','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  raiseCapa(findingId: number): void {
    this.svc.raiseCapa(this.id, findingId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('CAPA raised','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  private showToast(msg: string, type: string): void { this.toast.set({msg,type}); setTimeout(()=>this.toast.set(null),3500); }
}
