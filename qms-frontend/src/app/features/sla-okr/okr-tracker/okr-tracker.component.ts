import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-okr-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- Stats Row -->
<div class="stats-row">
  @for (s of statsCards(); track s.label) {
    <div class="stat-card" [style.border-top]="'3px solid ' + s.color">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" placeholder="Search objectives…">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="draft">Draft</option>
      <option value="active">Active</option>
      <option value="at_risk">At Risk</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">{{ lang.t('All Types') }}</option>
      <option value="company">Company</option>
      <option value="department">Department</option>
      <option value="team">Team</option>
      <option value="individual">Individual</option>
    </select>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openCreate()">
    <i class="fas fa-plus"></i> Add Objective
  </button>
</div>

<!-- Objectives List -->
@if (loading()) {
  @for (i of [1,2,3]; track i) {
    <div class="skeleton-row" style="height:120px;border-radius:12px;margin-bottom:12px"></div>
  }
}

@for (obj of items(); track obj.id) {
  <div class="okr-card" [class.expanded]="expandedIds.has(obj.id)">
    <!-- Objective Header -->
    <div class="okr-header">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
          <span class="badge" [class]="typeClass(obj.type)">{{ obj.type | titlecase }}</span>
          <span class="badge" [class]="objStatusClass(obj.status)">{{ fmt(obj.status) }}</span>
          @if (obj.department) { <span style="font-size:12px;color:var(--text3)"><i class="fas fa-sitemap" style="font-size:10px"></i> {{ obj.department.name }}</span> }
        </div>
        <div class="okr-title">{{ obj.title }}</div>
        @if (obj.description) {
          <div style="font-size:12px;color:var(--text3);margin-top:4px">{{ obj.description | slice:0:100 }}…</div>
        }
        <div class="okr-meta">
          @if (obj.owner) {
            <span style="display:flex;align-items:center;gap:5px">
              <div class="avatar-xs">{{ obj.owner.name?.charAt(0) }}</div> {{ obj.owner.name }}
            </span>
          }
          <span style="color:var(--text3)">·</span>
          <span style="font-size:12px;color:var(--text2)">
            {{ obj.period_start | date:'MMM yyyy' }} – {{ obj.period_end | date:'MMM yyyy' }}
          </span>
          @if (obj.key_results?.length) {
            <span style="color:var(--text3)">·</span>
            <span style="font-size:12px;color:var(--text2)">{{ obj.key_results.length }} key result{{ obj.key_results.length > 1 ? 's' : '' }}</span>
          }
        </div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:130px">
        <div class="okr-pct" [style.color]="progressColor(obj.progress_percent)">
          {{ obj.progress_percent || 0 }}%
        </div>
        <div style="width:120px">
          <div class="prog-bar-wrap">
            <div class="prog-bar" [style.width]="(obj.progress_percent||0)+'%'" [style.background]="progressColor(obj.progress_percent)"></div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-xs" (click)="toggleExpand(obj.id); $event.stopPropagation()">
            <i class="fas" [class.fa-chevron-down]="!expandedIds.has(obj.id)" [class.fa-chevron-up]="expandedIds.has(obj.id)"></i>
            KRs
          </button>
          <button class="btn btn-secondary btn-xs" (click)="openEditObj(obj); $event.stopPropagation()"><i class="fas fa-edit"></i></button>
        </div>
      </div>
    </div>

    <!-- Key Results (expanded) -->
    @if (expandedIds.has(obj.id)) {
      <div class="kr-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">
            Key Results
          </div>
          <button class="btn btn-secondary btn-xs" (click)="openAddKR(obj)">
            <i class="fas fa-plus"></i> Add KR
          </button>
        </div>

        @for (kr of obj.key_results; track kr.id) {
          <div class="kr-row">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span class="badge" [class]="krStatusClass(kr.status)" style="font-size:10px">{{ fmt(kr.status) }}</span>
                <span style="font-size:13px;font-weight:500">{{ kr.title }}</span>
              </div>
              <div class="kr-bar-row">
                <div class="kr-bar-wrap">
                  <div class="kr-bar" [style.width]="(kr.progress_percent||0)+'%'" [style.background]="progressColor(kr.progress_percent)"></div>
                </div>
                <span class="kr-pct" [style.color]="progressColor(kr.progress_percent)">{{ kr.progress_percent || 0 }}%</span>
              </div>
            </div>
            <div class="kr-values">
              <div style="text-align:center">
                <div style="font-family:'Inter',sans-serif;font-size:18px;font-weight:800;color:var(--text1)">{{ kr.current_value }}</div>
                <div style="font-size:10px;color:var(--text3)">current</div>
              </div>
              <div style="color:var(--text3);font-size:16px">/</div>
              <div style="text-align:center">
                <div style="font-family:'Inter',sans-serif;font-size:18px;font-weight:800;color:var(--accent)">{{ kr.target_value }}</div>
                <div style="font-size:10px;color:var(--text3)">{{ kr.unit || 'target' }}</div>
              </div>
              <button class="btn btn-sm" style="background:var(--accent);color:#fff;font-size:11px;padding:4px 10px"
                (click)="openCheckIn(obj, kr)">
                Check-in
              </button>
            </div>
          </div>
        }

        @if (!obj.key_results?.length) {
          <div style="text-align:center;color:var(--text3);padding:20px;font-size:13px">
            No key results yet. <span style="color:var(--accent);cursor:pointer" (click)="openAddKR(obj)">Add the first one.</span>
          </div>
        }
      </div>
    }
  </div>
}

@if (!loading() && items().length === 0) {
  <div class="card" style="text-align:center;padding:60px">
    <i class="fas fa-bullseye" style="font-size:40px;color:var(--border);margin-bottom:16px;display:block"></i>
    <div style="font-size:15px;font-weight:600;margin-bottom:8px">No Objectives Found</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Create your first OKR to start tracking progress.</div>
    <button class="btn btn-primary" (click)="openCreate()"><i class="fas fa-plus"></i> Add Objective</button>
  </div>
}

<!-- Pagination -->
@if (totalPages() > 1) {
  <div class="pagination">
    <span class="page-info">{{ total() }} total · Page {{ page() }} of {{ totalPages() }}</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
    <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
  </div>
}

<!-- ====== CREATE / EDIT OBJECTIVE MODAL ====== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-bullseye" style="color:var(--accent)"></i>
          {{ editId ? 'Edit Objective' : 'Add Objective' }}
        </div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-section-title">Objective Details</div>
        <div class="form-grid">
          <div class="form-group fg-full">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="What do you want to achieve?">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="company">Company</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="form.status">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="at_risk">At Risk</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <select class="form-control" [(ngModel)]="form.department_id">
              <option value="">— None —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Period Start *</label>
            <input type="date" class="form-control" [(ngModel)]="form.period_start">
          </div>
          <div class="form-group">
            <label class="form-label">Period End *</label>
            <input type="date" class="form-control" [(ngModel)]="form.period_end">
          </div>
          <div class="form-group fg-full">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.description" placeholder="Why is this objective important?"></textarea>
          </div>
        </div>

        @if (!editId) {
          <div class="form-section-title mt16" style="display:flex;justify-content:space-between;align-items:center">
            Key Results
            <button class="btn btn-secondary btn-xs" (click)="addKrRow()"><i class="fas fa-plus"></i> Add KR</button>
          </div>
          @for (kr of form.key_results; track $index; let i = $index) {
            <div class="kr-form-row">
              <div class="form-grid" style="grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;flex:1">
                <div class="form-group" style="margin:0">
                  <input class="form-control" [(ngModel)]="kr.title" placeholder="Key result title *">
                </div>
                <div class="form-group" style="margin:0">
                  <input type="number" class="form-control" [(ngModel)]="kr.target_value" placeholder="Target">
                </div>
                <div class="form-group" style="margin:0">
                  <input class="form-control" [(ngModel)]="kr.unit" placeholder="Unit (%, #…)">
                </div>
                <div class="form-group" style="margin:0">
                  <select class="form-control" [(ngModel)]="kr.metric_type">
                    <option value="percentage">%</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency</option>
                    <option value="boolean">Yes/No</option>
                  </select>
                </div>
              </div>
              <button class="btn btn-secondary btn-xs" style="margin-left:8px;flex-shrink:0" (click)="removeKrRow(i)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          }
          @if (!form.key_results?.length) {
            <div style="text-align:center;color:var(--text3);padding:16px;font-size:13px;border:1px dashed var(--border);border-radius:8px">
              No key results added yet. Click "Add KR" to add one.
            </div>
          }
        }

        @if (formError()) { <div class="alert-error mt8">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-save"></i> {{ saving() ? 'Saving…' : (editId ? 'Update' : 'Create Objective') }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== ADD KEY RESULT MODAL ====== -->
@if (showKrForm) {
  <div class="modal-overlay" (click)="showKrForm=false">
    <div class="modal" style="max-width:560px" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-key" style="color:var(--accent)"></i> Add Key Result</div>
        <button class="modal-close" (click)="showKrForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--text3);margin-bottom:12px">
          Objective: <strong>{{ krObjTitle }}</strong>
        </div>
        <div class="form-grid">
          <div class="form-group fg-full">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="krForm.title" placeholder="What does success look like?">
          </div>
          <div class="form-group">
            <label class="form-label">Metric Type</label>
            <select class="form-control" [(ngModel)]="krForm.metric_type">
              <option value="percentage">Percentage</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="boolean">Yes/No</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <input class="form-control" [(ngModel)]="krForm.unit" placeholder="%, SAR, #, …">
          </div>
          <div class="form-group">
            <label class="form-label">Start Value</label>
            <input type="number" class="form-control" [(ngModel)]="krForm.start_value" placeholder="0">
          </div>
          <div class="form-group">
            <label class="form-label">Target Value *</label>
            <input type="number" class="form-control" [(ngModel)]="krForm.target_value">
          </div>
          <div class="form-group fg-full">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="2" [(ngModel)]="krForm.description" placeholder="How will this be measured?"></textarea>
          </div>
        </div>
        @if (krError()) { <div class="alert-error mt8">{{ krError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showKrForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submitKR()" [disabled]="savingKr()">
          {{ savingKr() ? 'Adding…' : 'Add Key Result' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== CHECK-IN MODAL ====== -->
@if (showCheckIn) {
  <div class="modal-overlay" (click)="showCheckIn=false">
    <div class="modal" style="max-width:480px" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-check-circle" style="color:var(--accent)"></i> Check-in</div>
        <button class="modal-close" (click)="showCheckIn=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--text3);margin-bottom:14px">
          <strong>{{ ciKr?.title }}</strong>
          <div style="margin-top:4px">Target: <strong>{{ ciKr?.target_value }} {{ ciKr?.unit }}</strong> · Current: <strong>{{ ciKr?.current_value }}</strong></div>
        </div>
        <div class="form-grid">
          <div class="form-group fg-full">
            <label class="form-label">New Value *</label>
            <input type="number" class="form-control" [(ngModel)]="ciForm.value"
              [placeholder]="'Current: ' + (ciKr?.current_value || 0)">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="ciForm.status">
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Confidence (1–10)</label>
            <input type="number" class="form-control" [(ngModel)]="ciForm.confidence_level" min="1" max="10">
          </div>
          <div class="form-group fg-full">
            <label class="form-label">Notes</label>
            <textarea class="form-control" rows="3" [(ngModel)]="ciForm.notes"
              placeholder="Any context, blockers, or progress notes…"></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showCheckIn=false">Cancel</button>
        <button class="btn btn-primary" (click)="submitCheckIn()" [disabled]="savingCi()">
          <i class="fas fa-save"></i> {{ savingCi() ? 'Saving…' : 'Record Check-in' }}
        </button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    .stats-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:110px;text-align:center}
    .stat-num{font-family:'Inter',sans-serif;font-size:28px;font-weight:800;line-height:1}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .okr-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:12px;transition:box-shadow .15s}
    .okr-card:hover{box-shadow:0 2px 16px rgba(0,0,0,.06)}
    .okr-card.expanded{border-color:var(--accent)}
    .okr-header{display:flex;gap:16px;align-items:flex-start}
    .okr-title{font-family:'Inter',sans-serif;font-size:15px;font-weight:700}
    .okr-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
    .okr-pct{font-family:'Inter',sans-serif;font-size:26px;font-weight:800;line-height:1;text-align:right}
    .prog-bar-wrap{height:7px;background:var(--border);border-radius:4px}
    .prog-bar{height:100%;border-radius:4px;transition:width .4s}
    .avatar-xs{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
    .kr-section{margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
    .kr-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
    .kr-row:last-child{border-bottom:none}
    .kr-bar-row{display:flex;align-items:center;gap:8px;margin-top:4px}
    .kr-bar-wrap{flex:1;height:5px;background:var(--border);border-radius:3px}
    .kr-bar{height:100%;border-radius:3px;transition:width .4s}
    .kr-pct{font-size:12px;font-weight:700;min-width:32px;text-align:right}
    .kr-values{display:flex;align-items:center;gap:8px;min-width:160px;flex-shrink:0}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 0;margin-top:8px}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .modal-lg{max-width:760px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .fg-full{grid-column:span 2}
    .form-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
    .mt16{margin-top:16px}.mt8{margin-top:8px}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    .kr-form-row{display:flex;align-items:flex-start;gap:4px;margin-bottom:8px;padding:10px;background:var(--surface2,rgba(0,0,0,.02));border-radius:8px}
  `]
})
export class OkrTrackerComponent implements OnInit, OnDestroy {
  items      = signal<any[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  statsCards = signal<any[]>([]);
  departments= signal<any[]>([]);
  expandedIds = new Set<number>();

  // Create/Edit objective
  showForm  = false;
  editId: any = null;
  saving    = signal(false);
  formError = signal('');
  form: any = {};

  // Add KR
  showKrForm = false;
  krObjId: any = null;
  krObjTitle = '';
  krForm: any = {};
  krError  = signal('');
  savingKr = signal(false);

  // Check-in
  showCheckIn = false;
  ciObjId: any = null;
  ciKr: any = null;
  ciForm: any = {};
  savingCi = signal(false);

  search = ''; filterStatus = ''; filterType = '';
  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private api: ApiService, private uiEvents: UiEventService, public lang: LanguageService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.api.get<any>('/objectives/departments').subscribe({ next: (r: any) => this.departments.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.filterType)   p.type   = this.filterType;
    if (this.search)       p.search = this.search;
    this.api.get<any>('/objectives', p).subscribe({
      next: (r: any) => { this.items.set(r.data||[]); this.total.set(r.total||0); this.totalPages.set(r.last_page||1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }

  loadStats() {
    this.api.get<any>('/objectives/stats').subscribe({
      next: (s: any) => {
        const byStatus: any[] = s.by_status || [];
        const get = (st: string) => byStatus.find((x: any) => x.status === st)?.total ?? 0;
        const krStatus: any[] = s.kr_by_status || [];
        const getKr = (st: string) => krStatus.find((x: any) => x.status === st)?.total ?? 0;
        this.statsCards.set([
          { label: 'Total',        value: byStatus.reduce((a:number,x:any) => a + Number(x.total||0), 0), color: 'var(--text1)' },
          { label: 'Active',       value: get('active'),    color: '#3b82f6' },
          { label: 'At Risk',      value: get('at_risk'),   color: '#f59e0b' },
          { label: 'Completed',    value: get('completed'), color: '#10b981' },
          { label: 'Avg Progress', value: (s.avg_progress || 0) + '%', color: 'var(--accent)' },
        ]);
      }
    });
  }

  toggleExpand(id: number) {
    this.expandedIds.has(id) ? this.expandedIds.delete(id) : this.expandedIds.add(id);
  }

  openCreate() {
    this.editId = null;
    const today = new Date();
    const qEnd = new Date(today.getFullYear(), Math.ceil((today.getMonth()+1)/3)*3, 0);
    this.form = {
      title: '', description: '', type: 'department', status: 'active',
      department_id: '', period_start: today.toISOString().substring(0,10),
      period_end: qEnd.toISOString().substring(0,10), key_results: []
    };
    this.formError.set(''); this.showForm = true;
  }

  openEditObj(obj: any) {
    this.editId = obj.id;
    this.form = {
      title: obj.title, description: obj.description||'', type: obj.type||'department',
      status: obj.status||'active', department_id: obj.department_id||'',
      period_start: obj.period_start?.substring?.(0,10)||'',
      period_end: obj.period_end?.substring?.(0,10)||''
    };
    this.formError.set(''); this.showForm = true;
  }

  addKrRow() {
    this.form.key_results = this.form.key_results || [];
    this.form.key_results.push({ title: '', target_value: '', start_value: 0, unit: '', metric_type: 'percentage' });
  }

  removeKrRow(i: number) { this.form.key_results.splice(i, 1); }

  submit() {
    if (!this.form.title?.trim()) { this.formError.set('Title is required.'); return; }
    if (!this.form.period_start)  { this.formError.set('Period start is required.'); return; }
    if (!this.form.period_end)    { this.formError.set('Period end is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.department_id) delete payload.department_id;
    if (this.editId) delete payload.key_results; // can't bulk-update KRs on edit
    const req = this.editId
      ? this.api.put(`/objectives/${this.editId}`, payload)
      : this.api.post('/objectives', payload);
    req.subscribe({
      next: (r: any) => {
        this.saving.set(false); this.showForm = false;
        this.load(); this.loadStats();
        if (this.editId) {
          this.items.update(list => list.map(o => o.id === this.editId ? { ...o, ...r } : o));
        }
      },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors||{}).flat().join(', ') || 'Save failed.');
      }
    });
  }

  openAddKR(obj: any) {
    this.krObjId = obj.id;
    this.krObjTitle = obj.title;
    this.krForm = { title: '', metric_type: 'percentage', start_value: 0, target_value: '', unit: '', description: '' };
    this.krError.set(''); this.showKrForm = true;
  }

  submitKR() {
    if (!this.krForm.title?.trim()) { this.krError.set('Title is required.'); return; }
    if (!this.krForm.target_value)  { this.krError.set('Target value is required.'); return; }
    this.savingKr.set(true); this.krError.set('');
    this.api.post(`/objectives/${this.krObjId}/key-results`, this.krForm).subscribe({
      next: (kr: any) => {
        this.savingKr.set(false); this.showKrForm = false;
        this.items.update(list => list.map(o => {
          if (o.id === this.krObjId) {
            return { ...o, key_results: [...(o.key_results||[]), kr] };
          }
          return o;
        }));
        this.expandedIds.add(this.krObjId);
      }
    });
  }

  openCheckIn(obj: any, kr: any) {
    this.ciObjId = obj.id;
    this.ciKr = kr;
    this.ciForm = { value: '', status: kr.status || 'on_track', confidence_level: 7, notes: '' };
    this.showCheckIn = true;
  }

  submitCheckIn() {
    if (this.ciForm.value === '') return;
    this.savingCi.set(true);
    this.api.post(`/objectives/${this.ciObjId}/key-results/${this.ciKr.id}/check-in`, this.ciForm).subscribe({
      next: () => {
        this.savingCi.set(false); this.showCheckIn = false;
        // Reload the objective to get updated progress
        this.api.get<any>(`/objectives/${this.ciObjId}`).subscribe({
          next: (updated: any) => {
            this.items.update(list => list.map(o => o.id === this.ciObjId ? updated : o));
            this.loadStats();
          }
        });
      }
    });
  }

  progressColor(p: number | null): string {
    if (p == null || p === 0) return 'var(--text3)';
    if (p >= 70) return 'var(--success)';
    if (p >= 40) return '#f59e0b';
    return 'var(--danger)';
  }

  fmt(s: string | null | undefined): string {
    return (s||'').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  typeClass(t: string): string {
    return { company: 'badge-purple', department: 'badge-blue', team: 'badge-yellow', individual: 'badge-draft' }[t] || 'badge-draft';
  }

  objStatusClass(s: string): string {
    return { draft: 'badge-draft', active: 'badge-green', at_risk: 'badge-yellow', completed: 'badge-blue', cancelled: 'badge-draft' }[s] || 'badge-draft';
  }

  krStatusClass(s: string): string {
    return { on_track: 'badge-green', at_risk: 'badge-yellow', off_track: 'badge-red', completed: 'badge-blue' }[s] || 'badge-draft';
  }

  prevPage() { if (this.page()>1) { this.page.update(p=>p-1); this.load(); } }
  nextPage() { if (this.page()<this.totalPages()) { this.page.update(p=>p+1); this.load(); } }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
