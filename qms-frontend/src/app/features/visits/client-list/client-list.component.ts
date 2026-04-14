import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitService } from '../../../core/services/visit.service';
import { UiEventService } from '../../../core/services/ui-event.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" placeholder="Search clients…">
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">All Types</option>
      <option value="client">Client</option>
      <option value="insurer">Insurer</option>
      <option value="regulator">Regulator</option>
      <option value="partner">Partner</option>
      <option value="prospect">Prospect</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">All Statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="prospect">Prospect</option>
    </select>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openCreate()">
    <i class="fas fa-plus"></i> Add Client / Insurer
  </button>
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">Clients &amp; Insurers <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>NAME</th><th>TYPE</th><th>INDUSTRY</th><th>CONTACT</th>
          <th>ACCOUNT MANAGER</th><th>STATUS</th><th>VISITS</th><th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) { <tr><td colspan="8"><div class="skeleton-row"></div></td></tr> }
        }
        @for (c of items(); track c.id) {
          <tr class="row-hover" (click)="openDetail(c)">
            <td>
              <div class="client-name">{{ c.name }}</div>
              @if (c.code) { <div style="font-size:11px;color:var(--text3)">{{ c.code }}</div> }
            </td>
            <td><span class="badge" [class]="typeClass(c.type)">{{ c.type || '—' }}</span></td>
            <td style="font-size:12px;color:var(--text2)">{{ c.industry || '—' }}</td>
            <td>
              @if (c.contact_name) {
                <div style="font-size:13px;font-weight:500">{{ c.contact_name }}</div>
                @if (c.contact_email) { <div style="font-size:11px;color:var(--text3)">{{ c.contact_email }}</div> }
              } @else {
                <span style="color:var(--text3);font-size:12px">—</span>
              }
            </td>
            <td>
              @if (c.account_manager) {
                <div style="display:flex;align-items:center;gap:6px">
                  <div class="avatar-xs">{{ c.account_manager.name?.charAt(0) }}</div>
                  <span style="font-size:12px">{{ c.account_manager.name }}</span>
                </div>
              } @else {
                <span style="color:var(--text3);font-size:12px">Unassigned</span>
              }
            </td>
            <td><span class="badge" [class]="statusClass(c.status)">{{ c.status || 'active' }}</span></td>
            <td>
              <span class="badge badge-blue" style="font-size:11px">{{ c.visits_count || 0 }} visits</span>
            </td>
            <td (click)="$event.stopPropagation()">
              <button class="btn btn-secondary btn-xs" (click)="openEdit(c)"><i class="fas fa-edit"></i></button>
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="8" class="empty-row">No clients found. <span style="color:var(--accent);cursor:pointer" (click)="openCreate()">Add the first one.</span></td></tr>
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

<!-- ====== ADD / EDIT MODAL ====== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-building" style="color:var(--accent)"></i>
          {{ editId ? 'Edit Client / Insurer' : 'Add Client / Insurer' }}
        </div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Name *</label>
            <input class="form-control" [(ngModel)]="form.name" placeholder="Company / organisation name">
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="client">Client</option>
              <option value="insurer">Insurer</option>
              <option value="regulator">Regulator</option>
              <option value="partner">Partner</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="form.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Industry</label>
            <input class="form-control" [(ngModel)]="form.industry" placeholder="e.g. Insurance, Finance, Healthcare…">
          </div>
          <div class="form-group">
            <label class="form-label">Country</label>
            <input class="form-control" [(ngModel)]="form.country" placeholder="e.g. UAE, Saudi Arabia…">
          </div>
          <div class="form-group">
            <label class="form-label">Account Manager</label>
            <select class="form-control" [(ngModel)]="form.account_manager_id">
              <option value="">— Unassigned —</option>
              @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
            </select>
          </div>
        </div>

        <div class="form-section-title" style="margin-top:16px">Primary Contact</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Contact Name</label>
            <input class="form-control" [(ngModel)]="form.contact_name" placeholder="Full name">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Email</label>
            <input type="email" class="form-control" [(ngModel)]="form.contact_email" placeholder="email@company.com">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Phone</label>
            <input class="form-control" [(ngModel)]="form.contact_phone" placeholder="+971 XX XXX XXXX">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input class="form-control" [(ngModel)]="form.address" placeholder="Office address">
          </div>
        </div>

        @if (formError()) { <div class="alert-error" style="margin-top:12px">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-save"></i> {{ saving() ? 'Saving…' : (editId ? 'Save Changes' : 'Add Client') }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== DETAIL MODAL ====== -->
@if (detailClient()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header">
        <div>
          <div class="modal-title">
            <i class="fas fa-building" style="color:var(--accent)"></i>
            {{ detailClient()!.name }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            {{ detailClient()!.code || '' }}
            @if (detailClient()!.industry) { · {{ detailClient()!.industry }} }
            @if (detailClient()!.country) { · {{ detailClient()!.country }} }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="typeClass(detailClient()!.type)">{{ detailClient()!.type }}</span>
          <span class="badge" [class]="statusClass(detailClient()!.status)">{{ detailClient()!.status }}</span>
          <button class="btn btn-secondary btn-xs" (click)="openEdit(detailClient()!)"><i class="fas fa-edit"></i> Edit</button>
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab==='overview'" (click)="activeTab='overview'">
          <i class="fas fa-info-circle"></i> Overview
        </button>
        <button class="tab-btn" [class.active]="activeTab==='visits'" (click)="activeTab='visits';loadClientVisits()">
          <i class="fas fa-calendar-check"></i> Visit History
          @if (clientVisitList().length) { <span class="badge badge-blue" style="font-size:10px;padding:1px 6px">{{ clientVisitList().length }}</span> }
        </button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- TAB: Overview -->
        @if (activeTab === 'overview') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Organisation Details</div>
                <div class="detail-row"><span>Name</span><span style="font-weight:700">{{ detailClient()!.name }}</span></div>
                <div class="detail-row"><span>Code</span><span class="mono-ref">{{ detailClient()!.code || '—' }}</span></div>
                <div class="detail-row"><span>Type</span><span><span class="badge" [class]="typeClass(detailClient()!.type)">{{ detailClient()!.type }}</span></span></div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detailClient()!.status)">{{ detailClient()!.status }}</span></span></div>
                <div class="detail-row"><span>Industry</span><span>{{ detailClient()!.industry || '—' }}</span></div>
                <div class="detail-row"><span>Country</span><span>{{ detailClient()!.country || '—' }}</span></div>
                <div class="detail-row"><span>Account Manager</span>
                  <span>
                    @if (detailClient()!.account_manager) {
                      <div style="display:flex;align-items:center;gap:6px">
                        <div class="avatar-xs">{{ detailClient()!.account_manager.name?.charAt(0) }}</div>
                        {{ detailClient()!.account_manager.name }}
                      </div>
                    } @else { — }
                  </span>
                </div>
                <div class="detail-row"><span>Total Visits</span><span><span class="badge badge-blue">{{ detailClient()!.visits_count || 0 }}</span></span></div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Primary Contact</div>
                @if (detailClient()!.contact_name || detailClient()!.contact_email || detailClient()!.contact_phone) {
                  <div class="contact-card">
                    <div class="contact-avatar">{{ (detailClient()!.contact_name || detailClient()!.name)?.charAt(0) }}</div>
                    <div>
                      <div style="font-weight:600;font-size:14px">{{ detailClient()!.contact_name || '—' }}</div>
                      @if (detailClient()!.contact_email) {
                        <div style="font-size:12px;color:var(--accent);margin-top:3px">
                          <i class="fas fa-envelope"></i> {{ detailClient()!.contact_email }}
                        </div>
                      }
                      @if (detailClient()!.contact_phone) {
                        <div style="font-size:12px;color:var(--text2);margin-top:2px">
                          <i class="fas fa-phone"></i> {{ detailClient()!.contact_phone }}
                        </div>
                      }
                      @if (detailClient()!.address) {
                        <div style="font-size:12px;color:var(--text2);margin-top:2px">
                          <i class="fas fa-map-marker-alt"></i> {{ detailClient()!.address }}
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div style="font-size:13px;color:var(--text3)">No contact details recorded.</div>
                  <button class="btn btn-secondary btn-sm" style="margin-top:8px" (click)="openEdit(detailClient()!)">
                    <i class="fas fa-plus"></i> Add Contact
                  </button>
                }
              </div>

              <!-- Quick stats -->
              <div class="detail-section">
                <div class="detail-section-title">Visit Summary</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  @for (s of clientVisitStats(); track s.label) {
                    <div style="background:var(--bg,#f9f9ff);border-radius:8px;padding:10px;text-align:center">
                      <div style="font-size:20px;font-weight:800;color:var(--accent)">{{ s.value }}</div>
                      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">{{ s.label }}</div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <!-- TAB: Visit History -->
        @if (activeTab === 'visits') {
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-size:13px;color:var(--text2)">{{ clientVisitList().length }} visit(s) on record</div>
          </div>
          @if (loadingVisits()) {
            @for (i of [1,2,3]; track i) { <div class="skeleton-row" style="height:70px;border-radius:10px;margin-bottom:8px"></div> }
          } @else if (clientVisitList().length) {
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (v of clientVisitList(); track v.id) {
                <div class="visit-history-card">
                  <div class="visit-date-badge">
                    <div style="font-size:18px;font-weight:800;line-height:1">{{ v.visit_date | date:'dd' }}</div>
                    <div style="font-size:10px;text-transform:uppercase">{{ v.visit_date | date:'MMM yyyy' }}</div>
                  </div>
                  <div style="flex:1">
                    <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
                      <span class="mono-ref">{{ v.reference_no }}</span>
                      <span class="badge" [class]="visitTypeClass(v.type)">{{ fmt(v.type) }}</span>
                      <span class="badge" [class]="visitStatusClass(v.status)">{{ fmt(v.status) }}</span>
                      @if (v.rating) {
                        <span style="font-size:12px;color:#f59e0b">
                          @for (i of stars(v.rating); track i) { ★ }
                        </span>
                      }
                    </div>
                    <div style="font-size:13px;color:var(--text2)">{{ v.purpose }}</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:3px">
                      Host: {{ v.host?.name || '—' }}
                      @if (v.location) { · {{ v.location }} }
                      @if (v.is_virtual) { · 🔗 Virtual }
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">
              <i class="fas fa-calendar-times" style="font-size:28px;color:var(--text3);display:block;margin-bottom:8px"></i>
              No visits recorded for this client yet.
            </div>
          }
        }

      </div><!-- end scroll -->

      <div class="modal-footer" style="border-top:1px solid var(--border)">
        <button class="btn btn-secondary btn-sm" (click)="openEdit(detailClient()!)">
          <i class="fas fa-edit"></i> Edit Details
        </button>
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
    .client-name{font-weight:600;font-size:14px}
    .avatar-xs{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:40px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .form-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    .modal-lg{max-width:720px}
    .modal-xl{max-width:900px;width:95vw}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface);flex-shrink:0}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .contact-card{display:flex;gap:14px;align-items:flex-start;padding:10px;background:var(--bg,#f9f9ff);border-radius:8px}
    .contact-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0}
    .visit-history-card{display:flex;gap:14px;align-items:flex-start;padding:12px 14px;border:1px solid var(--border);border-radius:10px;transition:background .15s}
    .visit-history-card:hover{background:rgba(79,70,229,.03)}
    .visit-date-badge{min-width:52px;text-align:center;background:linear-gradient(135deg,var(--accent),#8b5cf6);border-radius:8px;padding:8px 6px;color:#fff}
    .badge-insurer{background:rgba(245,158,11,.15);color:#b45309;border:1px solid rgba(245,158,11,.2)}
    .badge-regulator{background:rgba(239,68,68,.12);color:#b91c1c;border:1px solid rgba(239,68,68,.2)}
    .badge-partner{background:rgba(16,185,129,.12);color:#065f46;border:1px solid rgba(16,185,129,.2)}
    .badge-prospect{background:rgba(139,92,246,.12);color:#5b21b6;border:1px solid rgba(139,92,246,.2)}
  `]
})
export class ClientListComponent implements OnInit, OnDestroy {
  items            = signal<any[]>([]);
  loading          = signal(true);
  total            = signal(0);
  page             = signal(1);
  totalPages       = signal(1);
  statsCards       = signal<any[]>([]);
  users            = signal<any[]>([]);
  detailClient     = signal<any>(null);
  clientVisitList  = signal<any[]>([]);
  loadingVisits    = signal(false);

  search = ''; filterType = ''; filterStatus = '';
  showForm = false; saving = signal(false); formError = signal('');
  editId: number | null = null;
  activeTab = 'overview';

  form: any = {
    name: '', type: 'client', status: 'active', industry: '', country: '',
    contact_name: '', contact_email: '', contact_phone: '', address: '',
    account_manager_id: ''
  };

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private svc: VisitService, private uiEvents: UiEventService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.svc.clientUsers().subscribe({ next: (r: any) => this.users.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterType)   p.type   = this.filterType;
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.search)       p.search = this.search;
    this.svc.clientList(p).subscribe({
      next: (r: any) => {
        this.items.set(r.data || r || []);
        this.total.set(r.total || r.length || 0);
        this.totalPages.set(r.last_page || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  loadStats() {
    this.svc.clientStats().subscribe({
      next: (s: any) => this.statsCards.set([
        { label: 'Total',     value: s.total     ?? 0, color: 'var(--text1)' },
        { label: 'Active',    value: s.active    ?? 0, color: '#10b981' },
        { label: 'Insurers',  value: s.insurers  ?? 0, color: '#f59e0b' },
        { label: 'Prospects', value: s.prospects ?? 0, color: '#8b5cf6' },
      ]),
      error: () => {}
    });
  }

  openCreate() {
    this.editId = null;
    this.form = { name: '', type: 'client', status: 'active', industry: '', country: '', contact_name: '', contact_email: '', contact_phone: '', address: '', account_manager_id: '' };
    this.formError.set('');
    this.showForm = true;
  }

  openEdit(client: any) {
    this.editId = client.id;
    this.form = {
      name: client.name || '', type: client.type || 'client', status: client.status || 'active',
      industry: client.industry || '', country: client.country || '',
      contact_name: client.contact_name || '', contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '', address: client.address || '',
      account_manager_id: client.account_manager_id || ''
    };
    this.formError.set('');
    this.showForm = true;
  }

  submit() {
    if (!this.form.name.trim()) { this.formError.set('Name is required.'); return; }
    this.saving.set(true);
    this.formError.set('');
    const payload = { ...this.form };
    if (!payload.account_manager_id) delete payload.account_manager_id;
    const call = this.editId
      ? this.svc.updateClient(this.editId, payload)
      : this.svc.createClient(payload);
    call.subscribe({
      next: (r: any) => {
        this.saving.set(false);
        this.showForm = false;
        this.load();
        this.loadStats();
        // If editing from detail, refresh it
        if (this.editId && this.detailClient()?.id === this.editId) {
          this.svc.getClient(this.editId).subscribe({ next: (c: any) => this.detailClient.set(c) });
        }
      },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat()[0] as string || 'Failed.');
      }
    });
  }

  openDetail(client: any) {
    this.svc.getClient(client.id).subscribe({
      next: (r: any) => {
        this.detailClient.set(r);
        this.activeTab = 'overview';
        this.clientVisitList.set([]);
      }
    });
  }

  closeDetail() { this.detailClient.set(null); }

  loadClientVisits() {
    const c = this.detailClient();
    if (!c || this.clientVisitList().length) return;
    this.loadingVisits.set(true);
    this.svc.clientVisits(c.id).subscribe({
      next: (r: any) => { this.clientVisitList.set(r || []); this.loadingVisits.set(false); },
      error: () => this.loadingVisits.set(false)
    });
  }

  clientVisitStats() {
    const visits = this.clientVisitList();
    if (!visits.length) return [];
    const completed  = visits.filter((v: any) => v.status === 'completed').length;
    const planned    = visits.filter((v: any) => ['planned','confirmed'].includes(v.status)).length;
    const rated      = visits.filter((v: any) => v.rating).length;
    const avgRating  = rated ? (visits.reduce((s: number, v: any) => s + (v.rating || 0), 0) / rated).toFixed(1) : '—';
    return [
      { label: 'Total',     value: visits.length },
      { label: 'Completed', value: completed },
      { label: 'Planned',   value: planned },
      { label: 'Avg Rating', value: avgRating },
    ];
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }
  stars(r: number) { return Array(Math.min(r, 5)).fill(0); }
  fmt(s: string | null | undefined) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()); }
  typeClass(t: string)   { return { client: 'badge-blue', insurer: 'badge-insurer', regulator: 'badge-regulator', partner: 'badge-partner', prospect: 'badge-prospect' }[t] || 'badge-draft'; }
  statusClass(s: string) { return { active: 'badge-green', inactive: 'badge-draft', prospect: 'badge-purple' }[s] || 'badge-draft'; }
  visitTypeClass(t: string) { return { client_visit: 'badge-blue', insurer_audit: 'badge-insurer', regulatory_inspection: 'badge-regulator', partnership_review: 'badge-partner', sales_meeting: 'badge-green', technical_review: 'badge-draft' }[t] || 'badge-draft'; }
  visitStatusClass(s: string) { return { planned: 'badge-blue', confirmed: 'badge-yellow', in_progress: 'badge-orange', completed: 'badge-green', cancelled: 'badge-draft', rescheduled: 'badge-purple' }[s] || 'badge-draft'; }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
