import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NcCapaService } from '../../../core/services/nc-capa.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-capa-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="detail-page">
  <div class="breadcrumb">
    <a routerLink="/nc-capa/capas" class="bc-link">← CAPAs</a>
    <span class="bc-sep">/</span>
    <span class="bc-cur">{{ capa()?.reference_no || '…' }}</span>
  </div>

  @if (loading()) {
    <div class="loading-center"><div class="spinner"></div><p>Loading CAPA…</p></div>
  } @else if (!capa()) {
    <div class="empty-state"><p>CAPA not found.</p><a routerLink="/nc-capa/capas" class="btn-primary">Back</a></div>
  } @else {
    <div class="detail-header-card">
      <div class="dh-top">
        <span class="ref-badge">{{ capa()!.reference_no }}</span>
        <div class="badges">
          <span class="badge" [class]="'type-' + capa()!.type">{{ capa()!.type | titlecase }}</span>
          <span class="badge" [class]="'pri-' + capa()!.priority">{{ capa()!.priority | titlecase }}</span>
          <span class="badge-status">{{ fmt(capa()!.status) }}</span>
        </div>
      </div>
      <h1 class="dh-title">{{ capa()!.title }}</h1>
      <div class="dh-meta">
        <span><i class="fas fa-user"></i> Owner: {{ capa()!.owner?.name }}</span>
        <span><i class="fas fa-building"></i> {{ capa()!.department?.name || '—' }}</span>
        <span><i class="fas fa-calendar"></i> Target: {{ capa()!.target_date | date:'dd MMM yyyy' }}</span>
        @if (capa()!.nc) { <span><i class="fas fa-link"></i> NC: {{ capa()!.nc!.reference_no }}</span> }
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-main">

        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-info-circle"></i> Description</h3>
          <p class="desc-text">{{ capa()!.description }}</p>
          @if (capa()!.root_cause_analysis) {
            <hr class="divider">
            <h4 class="sub-title">Root Cause Analysis</h4>
            <p class="desc-text">{{ capa()!.root_cause_analysis }}</p>
          }
          @if (capa()!.action_plan) {
            <hr class="divider">
            <h4 class="sub-title">Action Plan</h4>
            <p class="desc-text">{{ capa()!.action_plan }}</p>
          }
        </div>

        <!-- Tasks -->
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-tasks"></i> Tasks <span class="count-badge">{{ capa()!.tasks?.length || 0 }}</span></h3>
          @for (task of capa()!.tasks || []; track task.id) {
            <div class="task-item" [class]="'task-' + task.status">
              <div class="task-check">
                @if (task.status === 'completed') { <i class="fas fa-check-circle text-success"></i> }
                @else { <i class="fas fa-circle text-muted"></i> }
              </div>
              <div class="task-body">
                <div class="task-desc">{{ task.task_description }}</div>
                <div class="task-meta">
                  <span>{{ task.responsible?.name }}</span>
                  <span>Due: {{ task.due_date | date:'dd MMM yyyy' }}</span>
                  <span class="task-status-badge">{{ fmt(task.status) }}</span>
                </div>
                @if (task.status !== 'completed' && canAction()) {
                  <div class="task-complete-row">
                    <input class="field-input-sm" [(ngModel)]="taskNotes[task.id]" placeholder="Completion notes…">
                    <button class="btn-success btn-sm" (click)="completeTask(task.id)">Mark Complete</button>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <p class="no-data">No tasks added yet.</p>
          }

          @if (canAction() && !['closed','cancelled'].includes(capa()!.status)) {
            <div class="add-task-form">
              <h4 class="sub-title">Add Task</h4>
              <input class="field-input" [(ngModel)]="newTask.task_description" placeholder="Task description…">
              <div class="field-row">
                <select class="field-input" [(ngModel)]="newTask.responsible_id">
                  <option value="">Responsible…</option>
                  @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
                <input class="field-input" type="date" [(ngModel)]="newTask.due_date">
              </div>
              <button class="btn-primary btn-sm mt-8" (click)="addTask()" [disabled]="!newTask.task_description || !newTask.responsible_id">
                <i class="fas fa-plus"></i> Add Task
              </button>
            </div>
          }
        </div>

        @if (capa()!.effectiveness_criteria) {
          <div class="section-card">
            <h3 class="section-title"><i class="fas fa-check-double"></i> Effectiveness Review</h3>
            <div class="info-row"><label>Criteria:</label><span>{{ capa()!.effectiveness_criteria }}</span></div>
            @if (capa()!.effectiveness_result) {
              <div class="info-row"><label>Result:</label><span>{{ capa()!.effectiveness_result }}</span></div>
            } @else if (canAction() && capa()!.status === 'effectiveness_review') {
              <textarea class="field-input mt-8" rows="2" [(ngModel)]="effectivenessResult" placeholder="Describe effectiveness result…"></textarea>
              <button class="btn-primary btn-sm mt-8" (click)="submitEffectiveness()" [disabled]="!effectivenessResult.trim()">
                Submit Effectiveness Review
              </button>
            }
          </div>
        }
      </div>

      <div class="detail-sidebar">
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-bolt"></i> Actions</h3>
          <div class="action-list">
            @if (canAction() && capa()!.status === 'effectiveness_review') {
              <button class="action-btn btn-close" (click)="closeCapa()"><i class="fas fa-lock"></i> Close CAPA</button>
            }
          </div>
          @if (!canAction() || capa()!.status === 'closed') {
            <p class="no-data" style="margin:0">No actions available.</p>
          }
        </div>
        <div class="section-card">
          <h3 class="section-title"><i class="fas fa-chart-line"></i> Progress</h3>
          <div class="progress-bar-wrap">
            <div class="progress-bar" [style.width]="taskProgress() + '%'"></div>
          </div>
          <div class="progress-label">{{ completedTasks() }}/{{ totalTasks() }} tasks complete</div>
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
    .detail-body{display:grid;grid-template-columns:1fr 280px;gap:20px;}
    @media(max-width:900px){.detail-body{grid-template-columns:1fr;}}
    .section-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}
    .section-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 14px;display:flex;align-items:center;gap:8px;}
    .count-badge{background:var(--accent);color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;}
    .sub-title{font-size:13px;font-weight:600;color:var(--text);margin:0 0 6px;}
    .divider{border:none;border-top:1px solid var(--border);margin:14px 0;}
    .desc-text{font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;}
    .task-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);}
    .task-item:last-child{border-bottom:none;}
    .task-check{margin-top:2px;font-size:16px;}
    .task-body{flex:1;}
    .task-desc{font-size:13px;color:var(--text);margin-bottom:6px;}
    .task-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--text-muted);}
    .task-status-badge{background:var(--bg);border-radius:4px;padding:2px 6px;}
    .task-complete-row{display:flex;gap:8px;margin-top:8px;}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;font-size:13px;width:100%;box-sizing:border-box;}
    .field-input-sm{background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;flex:1;}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;}
    .add-task-form{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
    .info-row{display:flex;gap:12px;font-size:13px;margin-bottom:8px;}
    .info-row label{font-weight:600;color:var(--text);min-width:70px;} .info-row span{color:var(--text-muted);}
    .action-list{display:flex;flex-direction:column;gap:8px;}
    .action-btn{width:100%;padding:10px 14px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;}
    .progress-bar-wrap{background:var(--bg);border-radius:6px;height:8px;margin-bottom:8px;overflow:hidden;}
    .progress-bar{background:var(--accent);height:100%;border-radius:6px;transition:width .3s;}
    .progress-label{font-size:12px;color:var(--text-muted);}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;}
    .badge-status{background:var(--bg);color:var(--text-muted);font-size:12px;padding:3px 8px;border-radius:6px;}
    .type-corrective{background:#dbeafe;color:#1d4ed8;} .type-preventive{background:#dcfce7;color:#15803d;}
    .pri-low{background:#dcfce7;color:#16a34a;} .pri-medium{background:#fef9c3;color:#ca8a04;}
    .pri-high{background:#fee2e2;color:#dc2626;} .pri-critical{background:#7f1d1d;color:#fca5a5;}
    .btn-primary{background:var(--accent);color:#fff;} .btn-success{background:#22c55e;color:#fff;}
    .btn-close{background:#6b7280;color:#fff;}
    .btn-sm{padding:6px 12px;font-size:12px;border:none;border-radius:6px;cursor:pointer;font-weight:500;}
    .mt-8{margin-top:8px;}
    .text-success{color:#22c55e;} .text-muted{color:var(--text-muted);}
    .no-data{font-size:13px;color:var(--text-muted);text-align:center;padding:16px 0;}
    .empty-state{text-align:center;padding:80px;color:var(--text-muted);}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class CapaDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  capa    = signal<any>(null);
  users   = signal<any[]>([]);
  loading = signal(true);
  toast   = signal<{ msg: string; type: string } | null>(null);
  taskNotes: Record<number, string> = {};
  effectivenessResult = '';
  newTask = { task_description: '', responsible_id: '', due_date: '' };

  private id!: number;

  constructor(
    private route: ActivatedRoute, private router: Router,
    private svc: NcCapaService, public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.svc.capaUsers().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.svc.getCapa(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.capa.set(r.data ?? r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  fmt(s: string): string { return s?.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) ?? '—'; }

  totalTasks     = computed(() => this.capa()?.tasks?.length ?? 0);
  completedTasks = computed(() => (this.capa()?.tasks ?? []).filter((t:any) => t.status === 'completed').length);
  taskProgress   = computed(() => this.totalTasks() > 0 ? Math.round((this.completedTasks() / this.totalTasks()) * 100) : 0);

  canAction(): boolean {
    return ['super_admin','qa_manager','quality_supervisor','qa_officer','compliance_officer','auditor'].includes((this.auth.currentUser() as any)?.role?.slug ?? '');
  }

  addTask(): void {
    if (!this.newTask.task_description || !this.newTask.responsible_id) return;
    this.svc.addTask(this.id, this.newTask).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.newTask = {task_description:'',responsible_id:'',due_date:''}; this.showToast('Task added','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  completeTask(taskId: number): void {
    const notes = this.taskNotes[taskId] ?? '';
    this.svc.completeTask(this.id, taskId, notes).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { delete this.taskNotes[taskId]; this.showToast('Task completed','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  submitEffectiveness(): void {
    this.svc.effectivenessReview(this.id, this.effectivenessResult).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.effectivenessResult=''; this.showToast('Effectiveness submitted','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  closeCapa(): void {
    this.svc.closeCapa(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast('CAPA closed','success'); this.load(); },
      error: e => this.showToast(e.error?.message??'Failed','error')
    });
  }

  private showToast(msg: string, type: string): void { this.toast.set({msg,type}); setTimeout(()=>this.toast.set(null),3500); }
}
