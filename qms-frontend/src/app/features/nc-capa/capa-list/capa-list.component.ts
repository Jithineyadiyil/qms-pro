import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NcCapaService } from '../../../core/services/nc-capa.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-capa-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FormsModule],
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
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" placeholder="Search CAPAs…">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="effectiveness_review">Effectiveness Review</option>
      <option value="closed">Closed</option>
      <option value="cancelled">Cancelled</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">{{ lang.t('All Types') }}</option>
      <option value="corrective">Corrective</option>
      <option value="preventive">Preventive</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterPriority" (change)="load()">
      <option value="">{{ lang.t('All Priorities') }}</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  </div>
  @if (canCreate()) {
    <button class="btn btn-primary btn-sm" (click)="openCreate()">
      <i class="fas fa-plus"></i> New CAPA
    </button>
  }
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">CAPA Register <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr><th>{{ lang.t('REFERENCE') }}</th><th>{{ lang.t('TITLE') }}</th><th>TYPE</th><th>LINKED NC</th><th>{{ lang.t('PRIORITY') }}</th><th>{{ lang.t('STATUS') }}</th><th>TARGET DATE</th><th>OWNER</th><th>EFFECTIVENESS</th></tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) { <tr><td colspan="9"><div class="skeleton-row"></div></td></tr> }
        }
        @for (capa of items(); track capa.id) {
          <tr class="row-hover" (click)="openDetail(capa)">
            <td><span class="mono-ref">{{ capa.reference_no }}</span></td>
            <td style="max-width:200px"><div class="text-truncate font-medium">{{ capa.title }}</div></td>
            <td><span class="badge" [class]="capa.type==='corrective'?'badge-blue':'badge-purple'">{{ capa.type }}</span></td>
            <td><span class="mono-ref" style="color:var(--accent)">{{ capa.nonconformance?.reference_no || '—' }}</span></td>
            <td><span class="badge" [class]="priorityClass(capa.priority)">{{ capa.priority }}</span></td>
            <td><span class="badge" [class]="statusClass(capa.status)">{{ fmt(capa.status) }}</span></td>
            <td style="font-size:12px" [style.color]="isOverdue(capa.target_date)?'#ef4444':'var(--text2)'">
              {{ capa.target_date | date:'dd MMM yy' }}
              @if (isOverdue(capa.target_date)) { <i class="fas fa-exclamation-circle"></i> }
            </td>
            <td>
              @if (capa.owner) { <div class="avatar-xs" [title]="capa.owner.name">{{ capa.owner.name?.charAt(0) }}</div> }
              @else { <span style="color:var(--text3);font-size:12px">—</span> }
            </td>
            <td><span class="badge" [class]="effClass(capa.effectiveness_status || capa.effectiveness_result)">{{ fmt(capa.effectiveness_status || capa.effectiveness_result || 'pending') }}</span></td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="9" class="empty-row">No CAPAs found</td></tr>
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

<!-- ====== CREATE CAPA MODAL ====== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-circle-check" style="color:var(--accent)"></i>{{ lang.t('New CAPA') }}</div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="CAPA title">
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="corrective">Corrective Action</option>
              <option value="preventive">Preventive Action</option>
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
            <label class="form-label">Linked NC</label>
            <select class="form-control" [(ngModel)]="form.nc_id">
              <option value="">— None —</option>
              @for (nc of openNcs(); track nc.id) {
                <option [value]="nc.id">{{ nc.reference_no }} — {{ nc.title | slice:0:40 }}</option>
              }
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
            <label class="form-label">Target Date *</label>
            <input type="date" class="form-control" [(ngModel)]="form.target_date">
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Description *</label>
            <textarea class="form-control" rows="3" [(ngModel)]="form.description" placeholder="What needs to be done and why…"></textarea>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Root Cause Analysis</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.root_cause_analysis" placeholder="Root cause identified…"></textarea>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Action Plan</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.action_plan" placeholder="Steps to address the root cause…"></textarea>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Effectiveness Criteria</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.effectiveness_criteria" placeholder="How will we measure success…"></textarea>
          </div>
        </div>
        @if (formError()) { <div class="alert-error">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submitCapa()" [disabled]="saving()">
          <i class="fas fa-circle-check"></i> {{ saving() ? 'Saving…' : 'Create CAPA' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== DETAIL MODAL ====== -->
@if (detailCapa()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header">
        <div>
          <div class="modal-title">
            <i class="fas fa-circle-check" style="color:var(--accent)"></i>
            {{ detailCapa()!.title }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            <span class="mono-ref">{{ detailCapa()!.reference_no }}</span>
            · {{ detailCapa()!.type }}
            @if (detailCapa()!.nonconformance) { · Linked to <span class="mono-ref" style="color:var(--accent)">{{ detailCapa()!.nonconformance.reference_no }}</span> }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="priorityClass(detailCapa()!.priority)">{{ detailCapa()!.priority }}</span>
          <span class="badge" [class]="statusClass(detailCapa()!.status)">{{ fmt(detailCapa()!.status) }}</span>
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        @for (t of tabs; track t.key) {
          <button class="tab-btn" [class.active]="activeTab===t.key" (click)="activeTab=t.key">
            <i [class]="t.icon"></i> {{ t.label }}
            @if (t.key==='tasks' && detailCapa()!.tasks?.length) {
              <span class="badge badge-blue" style="font-size:10px;padding:1px 6px">{{ detailCapa()!.tasks.length }}</span>
            }
          </button>
        }
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- TAB: Overview -->
        @if (activeTab === 'overview') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
              <div class="detail-section">
                <div class="detail-section-title">CAPA Details</div>
                <div class="detail-row"><span>Reference</span><span class="mono-ref">{{ detailCapa()!.reference_no }}</span></div>
                <div class="detail-row"><span>Type</span><span><span class="badge" [class]="detailCapa()!.type==='corrective'?'badge-blue':'badge-purple'">{{ detailCapa()!.type }}</span></span></div>
                <div class="detail-row"><span>Priority</span><span><span class="badge" [class]="priorityClass(detailCapa()!.priority)">{{ detailCapa()!.priority }}</span></span></div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detailCapa()!.status)">{{ fmt(detailCapa()!.status) }}</span></span></div>
                <div class="detail-row"><span>Owner</span><span>{{ detailCapa()!.owner?.name || '—' }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detailCapa()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Linked NC</span><span class="mono-ref" style="color:var(--accent)">{{ detailCapa()!.nonconformance?.reference_no || '—' }}</span></div>
                <div class="detail-row"><span>Target Date</span>
                  <span [style.color]="isOverdue(detailCapa()!.target_date) && detailCapa()!.status !== 'closed' ? '#ef4444' : 'inherit'">
                    {{ detailCapa()!.target_date | date:'dd MMM yyyy' }}
                  </span>
                </div>
                @if (detailCapa()!.actual_completion_date) {
                  <div class="detail-row"><span>Completed</span><span style="color:#10b981">{{ detailCapa()!.actual_completion_date | date:'dd MMM yyyy' }}</span></div>
                }
                <div class="detail-row"><span>Effectiveness</span><span><span class="badge" [class]="effClass(detailCapa()!.effectiveness_result)">{{ fmt(detailCapa()!.effectiveness_result || 'pending') }}</span></span></div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Description</div>
                <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailCapa()!.description }}</p>
              </div>
              @if (detailCapa()!.root_cause_analysis) {
                <div class="detail-section">
                  <div class="detail-section-title">Root Cause Analysis</div>
                  <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailCapa()!.root_cause_analysis }}</p>
                </div>
              }
              @if (detailCapa()!.action_plan) {
                <div class="detail-section">
                  <div class="detail-section-title">Action Plan</div>
                  <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailCapa()!.action_plan }}</p>
                </div>
              }
              @if (detailCapa()!.effectiveness_criteria) {
                <div class="detail-section">
                  <div class="detail-section-title">Effectiveness Criteria</div>
                  <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0">{{ detailCapa()!.effectiveness_criteria }}</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB: Tasks -->
        @if (activeTab === 'tasks') {
          <!-- Add task form -->
          @if (detailCapa()!.status !== 'closed') {
            <div class="detail-section" style="margin-bottom:16px">
              <div class="detail-section-title">Add Task</div>
              <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
                <div>
                  <label class="form-label">Task Description *</label>
                  <input class="form-control" [(ngModel)]="newTask.task_description" placeholder="What needs to be done…">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  <div>
                    <label class="form-label">Responsible *</label>
                    <select class="form-control" [(ngModel)]="newTask.responsible_id">
                      <option value="">— Select —</option>
                      @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                    </select>
                  </div>
                  <div>
                    <label class="form-label">Due Date *</label>
                    <input type="date" class="form-control" [(ngModel)]="newTask.due_date">
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" (click)="doAddTask()" [disabled]="!newTask.task_description || !newTask.responsible_id || !newTask.due_date">
                  <i class="fas fa-plus"></i> Add
                </button>
              </div>
            </div>
          }

          <!-- Task list -->
          @if (detailCapa()!.tasks?.length) {
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (task of detailCapa()!.tasks; track task.id) {
                <div style="padding:12px 14px;border:1px solid var(--border);border-radius:8px;border-left:3px solid" [style.border-left-color]="task.status==='completed'?'#10b981':isOverdue(task.due_date)?'#ef4444':'var(--accent)'">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="flex:1">
                      <div style="font-size:13px;font-weight:600;margin-bottom:4px" [style.text-decoration]="task.status==='completed'?'line-through':''">{{ task.task_description }}</div>
                      <div style="font-size:11px;color:var(--text2)">
                        Responsible: <strong>{{ task.responsible?.name || '—' }}</strong> ·
                        Due: <span [style.color]="isOverdue(task.due_date) && task.status!=='completed' ? '#ef4444' : 'inherit'">{{ task.due_date | date:'dd MMM yyyy' }}</span>
                      </div>
                      @if (task.completion_notes) {
                        <div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic">{{ task.completion_notes }}</div>
                      }
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;margin-left:12px">
                      <span class="badge" [class]="task.status==='completed'?'badge-green':'badge-draft'">{{ task.status }}</span>
                      @if (task.status !== 'completed' && detailCapa()!.status !== 'closed') {
                        <button class="btn btn-sm" style="background:#10b981;color:#fff;font-size:11px;padding:3px 10px" (click)="doCompleteTask(task)">
                          <i class="fas fa-check"></i> Complete
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No tasks yet. Add tasks above to track progress.</div>
          }
        }

        <!-- TAB: Effectiveness -->
        @if (activeTab === 'effectiveness') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
              <div class="detail-section" style="margin-bottom:14px">
                <div class="detail-section-title">Current Status</div>
                <div class="detail-row"><span>Tasks Done</span><span>{{ tasksDone() }} / {{ detailCapa()!.tasks?.length || 0 }}</span></div>
                <div class="detail-row"><span>Effectiveness Result</span><span><span class="badge" [class]="effClass(detailCapa()!.effectiveness_result)">{{ fmt(detailCapa()!.effectiveness_result || 'Pending') }}</span></span></div>
                @if (detailCapa()!.effectiveness_criteria) {
                  <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
                    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Success Criteria</div>
                    <p style="font-size:13px;color:var(--text2);margin:0">{{ detailCapa()!.effectiveness_criteria }}</p>
                  </div>
                }
              </div>
            </div>
            <div>
              @if (detailCapa()!.status !== 'closed') {
                <div class="detail-section">
                  <div class="detail-section-title">Record Effectiveness Verdict</div>
                  <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Verify whether the CAPA actions were effective in resolving the issue.</p>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <button class="btn btn-sm" style="background:#10b981;color:#fff;justify-content:center" (click)="doVerifyEffectiveness('effective')">
                      <i class="fas fa-check-double"></i> Effective — Close CAPA
                    </button>
                    <button class="btn btn-sm" style="background:#f59e0b;color:#fff;justify-content:center" (click)="doVerifyEffectiveness('partially_effective')">
                      <i class="fas fa-check"></i> Partially Effective
                    </button>
                    <button class="btn btn-sm" style="background:#ef4444;color:#fff;justify-content:center" (click)="doVerifyEffectiveness('not_effective')">
                      <i class="fas fa-times"></i> Not Effective — Reopen
                    </button>
                  </div>
                </div>
              } @else {
                <div class="detail-section" style="border-color:#10b981">
                  <div style="display:flex;align-items:center;gap:10px">
                    <i class="fas fa-check-circle" style="font-size:28px;color:#10b981"></i>
                    <div>
                      <div style="font-weight:700;color:#10b981;font-size:15px">CAPA Closed</div>
                      <div style="font-size:12px;color:var(--text2);margin-top:2px">Completed {{ detailCapa()!.actual_completion_date | date:'dd MMM yyyy' }}</div>
                      <div style="margin-top:6px"><span class="badge" [class]="effClass(detailCapa()!.effectiveness_result)">{{ fmt(detailCapa()!.effectiveness_result || 'pending') }}</span></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

      </div><!-- end scroll -->

      <!-- Footer -->
      <div class="modal-footer" style="border-top:1px solid var(--border);justify-content:space-between">
        <div style="display:flex;gap:8px">
          @if (canCreate()) {
            @if (detailCapa()!.status === 'open' || detailCapa()!.status === 'in_progress') {
              <button class="btn btn-primary btn-sm" (click)="activeTab='tasks'">
                <i class="fas fa-tasks"></i> Manage Tasks
              </button>
            }
            @if (tasksDone() === detailCapa()!.tasks?.length && detailCapa()!.tasks?.length > 0 && detailCapa()!.status !== 'closed') {
              <button class="btn btn-sm" style="background:#10b981;color:#fff" (click)="activeTab='effectiveness'">
                <i class="fas fa-check-double"></i> Verify Effectiveness
              </button>
            }
          }
        </div>
        <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    .stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:100px;text-align:center}
    .stat-num{font-family:'Syne',sans-serif;font-size:26px;font-weight:800}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .row-hover{cursor:pointer}.row-hover:hover td{background:rgba(79,70,229,.04)}
    .text-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .font-medium{font-weight:600}
    .avatar-xs{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:40px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px;margin-top:8px}
    .modal-lg{max-width:760px}
    .modal-xl{max-width:960px;width:95vw}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface);flex-shrink:0}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s;white-space:nowrap}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .badge-purple{background:rgba(139,92,246,.15);color:#8b5cf6;border:1px solid rgba(139,92,246,.2)}
  `]
})
export class CapaListComponent implements OnInit, OnDestroy {
  items       = signal<any[]>([]);
  loading     = signal(true);
  total       = signal(0);
  page        = signal(1);
  totalPages  = signal(1);
  statsCards  = signal<any[]>([]);
  detailCapa  = signal<any>(null);
  users       = signal<any[]>([]);
  departments = signal<any[]>([]);
  openNcs     = signal<any[]>([]);

  search = ''; filterStatus = ''; filterType = ''; filterPriority = '';
  showForm = false; saving = signal(false); formError = signal('');
  activeTab = 'overview';

  form: any = {
    title: '', description: '', type: 'corrective', priority: 'medium',
    target_date: '', nc_id: '', department_id: '',
    root_cause_analysis: '', action_plan: '', effectiveness_criteria: ''
  };

  newTask: any = { task_description: '', responsible_id: '', due_date: '' };

  tabs = [
    { key: 'overview',      label: 'Overview',      icon: 'fas fa-info-circle' },
    { key: 'tasks',         label: 'Tasks',         icon: 'fas fa-tasks' },
    { key: 'effectiveness', label: 'Effectiveness', icon: 'fas fa-check-double' },
  ];

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private svc: NcCapaService, private uiEvents: UiEventService, public lang: LanguageService, private auth: AuthService) {}

  canCreate = computed(() => {
    const perms: string[] = this.auth.currentUser()?.role?.permissions || [];
    return perms.includes('*') || perms.includes('capa.create') || perms.some((p: string) => p === 'capa.*');
  });

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => { if (this.canCreate()) this.openCreate(); });
    this.load();
    this.loadStats();
    this.svc.capaUsers().subscribe({ next: (r: any) => this.users.set(r || []) });
    this.svc.capaDepartments().subscribe({ next: (r: any) => this.departments.set(r || []) });
    this.svc.openNcs().subscribe({ next: (r: any) => this.openNcs.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus)   p.status   = this.filterStatus;
    if (this.filterType)     p.type     = this.filterType;
    if (this.filterPriority) p.priority = this.filterPriority;
    if (this.search)         p.search   = this.search;
    this.svc.listCapas(p).subscribe({
      next: (r: any) => { this.items.set(r.data || []); this.total.set(r.total || 0); this.totalPages.set(r.last_page || 1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  loadStats() {
    this.svc.capaStats().subscribe({
      next: (s: any) => this.statsCards.set([
        { label: 'Total',            value: (s.by_status ? Object.values(s.by_status as Record<string,number>).reduce((a:number, b:number) => a + b, 0) : 0), color: 'var(--text1)' },
        { label: 'Open',             value: s.open ?? 0,             color: 'var(--accent)' },
        { label: 'In Progress',      value: s.in_progress ?? 0,      color: '#f59e0b' },
        { label: 'Overdue',          value: s.overdue ?? 0,          color: '#ef4444' },
        { label: 'Closed This Month',value: s.closed_this_month ?? 0,color: '#10b981' },
      ]),
      error: () => {}
    });
  }

  openCreate() {
    this.form = { title: '', description: '', type: 'corrective', priority: 'medium', target_date: '', nc_id: '', department_id: '', root_cause_analysis: '', action_plan: '', effectiveness_criteria: '' };
    this.formError.set('');
    this.showForm = true;
  }

  submitCapa() {
    if (!this.form.title || !this.form.description || !this.form.target_date) {
      this.formError.set('Title, description and target date are required.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const payload = { ...this.form };
    if (!payload.nc_id) delete payload.nc_id;
    if (!payload.department_id) delete payload.department_id;
    this.svc.createCapa(payload).subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.page.set(1); this.load(); this.loadStats(); this.svc.openNcs().subscribe({ next: (r: any) => this.openNcs.set(r || []) }); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat()[0] as string || 'Failed.'); }
    });
  }

  openDetail(capa: any) {
    this.svc.getCapa(capa.id).subscribe({
      next: (r: any) => {
        this.detailCapa.set(r);
        this.activeTab = 'overview';
        this.newTask = { task_description: '', responsible_id: '', due_date: '' };
      }
    });
  }

  closeDetail() { this.detailCapa.set(null); }

  reloadDetail() {
    const id = this.detailCapa()?.id;
    if (id) this.svc.getCapa(id).subscribe({ next: (r: any) => this.detailCapa.set(r) });
  }

  doAddTask() {
    const c = this.detailCapa(); if (!c) return;
    this.svc.addTask(c.id, this.newTask).subscribe({
      next: () => { this.newTask = { task_description: '', responsible_id: '', due_date: '' }; this.reloadDetail(); },
      error: (e: any) => alert(e?.error?.message || 'Failed to add task')
    });
  }

  doCompleteTask(task: any) {
    const c = this.detailCapa(); if (!c) return;
    const notes = prompt('Completion notes (optional):') ?? '';
    this.svc.completeTask(c.id, task.id, notes).subscribe({
      next: () => this.reloadDetail(),
      error: (e: any) => alert(e?.error?.message || 'Failed')
    });
  }

  doVerifyEffectiveness(result: string) {
    const c = this.detailCapa(); if (!c) return;
    if (!confirm(`Mark this CAPA as "${result.replace(/_/g,' ')}"?`)) return;
    this.svc.effectivenessReview(c.id, result).subscribe({
      next: () => { this.reloadDetail(); this.load(); this.loadStats(); },
      error: (e: any) => alert(e?.error?.message || 'Failed')
    });
  }

  tasksDone(): number {
    return (this.detailCapa()?.tasks || []).filter((t: any) => t.status === 'completed').length;
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }
  isOverdue(d: string) { return d && new Date(d) < new Date() ? true : false; }
  priorityClass(p: string) { return { low: 'badge-draft', medium: 'badge-yellow', high: 'badge-orange', critical: 'badge-red' }[p] || 'badge-draft'; }
  statusClass(s: string) { return { draft: 'badge-draft', open: 'badge-draft', in_progress: 'badge-blue', effectiveness_review: 'badge-yellow', closed: 'badge-green', cancelled: 'badge-draft' }[s] || 'badge-draft'; }
  effClass(e: string) { return { pending: 'badge-draft', effective: 'badge-green', not_effective: 'badge-red', partially_effective: 'badge-yellow' }[e] || 'badge-draft'; }
  fmt(s: string | null | undefined): string { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
