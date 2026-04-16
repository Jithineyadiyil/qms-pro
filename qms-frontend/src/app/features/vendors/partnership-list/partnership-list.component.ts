import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { VendorService } from '../../../core/services/vendor.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-partnership-list',
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

<!-- Expiry Alert Banner -->
@if (expiring().length) {
  <div class="expiry-banner">
    <i class="fas fa-exclamation-triangle"></i>
    <strong>{{ expiring().length }} contract(s)</strong> expiring within 30 days —
    @for (c of expiring().slice(0,3); track c.id) {
      <span class="expiry-tag" (click)="openDetail(c)">{{ c.contract_no }}</span>
    }
    @if (expiring().length > 3) { <span>+{{ expiring().length - 3 }} more</span> }
  </div>
}

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" placeholder="Search contracts…">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="draft">Draft</option>
      <option value="active">Active</option>
      <option value="expired">Expired</option>
      <option value="terminated">Terminated</option>
      <option value="suspended">Suspended</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">{{ lang.t('All Types') }}</option>
      <option value="service">Service</option>
      <option value="supply">Supply</option>
      <option value="nda">NDA</option>
      <option value="partnership">Partnership</option>
      <option value="maintenance">Maintenance</option>
      <option value="other">Other</option>
    </select>
  </div>
  @if (canCreate()) {
    <button class="btn btn-primary btn-sm" (click)="openCreate()">
      <i class="fas fa-plus"></i> New Contract
    </button>
  }
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">Contracts <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>CONTRACT NO</th><th>{{ lang.t('TITLE') }}</th><th>VENDOR</th><th>TYPE</th>
          <th>VALUE</th><th>START</th><th>EXPIRY</th><th>OWNER</th><th>{{ lang.t('STATUS') }}</th><th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) { <tr><td colspan="10"><div class="skeleton-row"></div></td></tr> }
        }
        @for (c of items(); track c.id) {
          <tr class="row-hover" (click)="openDetail(c)">
            <td><span class="mono-ref">{{ c.contract_no }}</span></td>
            <td style="max-width:220px">
              <div class="text-truncate font-medium">{{ c.title }}</div>
              @if (c.auto_renewal) { <div style="font-size:10px;color:#10b981"><i class="fas fa-sync-alt"></i> Auto-renewal</div> }
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ c.vendor?.name || '—' }}</td>
            <td><span class="badge" [class]="typeClass(c.type)">{{ fmt(c.type) }}</span></td>
            <td style="font-size:12px;font-weight:600">
              {{ c.value ? (c.currency || 'SAR') + ' ' + (c.value | number) : '—' }}
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ c.start_date | date:'dd MMM yy' }}</td>
            <td>
              @if (c.end_date) {
                <span [class]="expiryClass(c.end_date, c.status)" style="font-size:12px">
                  {{ c.end_date | date:'dd MMM yy' }}
                  @if (isExpiringSoon(c.end_date) && c.status==='active') {
                    <i class="fas fa-clock" style="margin-left:3px" title="Expiring soon"></i>
                  }
                </span>
              } @else {
                <span style="font-size:12px;color:var(--text3)">Open-ended</span>
              }
            </td>
            <td>
              @if (c.owner) {
                <div style="display:flex;align-items:center;gap:6px">
                  <div class="avatar-xs">{{ c.owner.name?.charAt(0) }}</div>
                  <span style="font-size:12px">{{ c.owner.name }}</span>
                </div>
              }
            </td>
            <td><span class="badge" [class]="statusClass(c.status)">{{ c.status }}</span></td>
            <td (click)="$event.stopPropagation()">
              <button class="btn btn-secondary btn-xs" (click)="openEdit(c)"><i class="fas fa-edit"></i></button>
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="10" class="empty-row">No contracts found. <span style="color:var(--accent);cursor:pointer" (click)="openCreate()">Create one.</span></td></tr>
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

<!-- ====== CREATE / EDIT MODAL ====== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-file-contract" style="color:var(--accent)"></i>
          {{ editId ? 'Edit Contract' : 'New Contract' }}
        </div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-section-title">Contract Details</div>
        <div class="form-grid">
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="e.g. IT Support Services Agreement 2025">
          </div>
          <div class="form-group">
            <label class="form-label">Vendor *</label>
            <select class="form-control" [(ngModel)]="form.vendor_id">
              <option value="">— Select Vendor —</option>
              @for (v of vendors(); track v.id) { <option [value]="v.id">{{ v.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contract Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="service">Service</option>
              <option value="supply">Supply</option>
              <option value="nda">NDA</option>
              <option value="partnership">Partnership</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="form.status">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Owner</label>
            <select class="form-control" [(ngModel)]="form.owner_id">
              <option value="">— Select Owner —</option>
              @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
            </select>
          </div>
        </div>

        <div class="form-section-title" style="margin-top:16px">Financial & Dates</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Contract Value</label>
            <input type="number" class="form-control" [(ngModel)]="form.value" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label">Currency</label>
            <select class="form-control" [(ngModel)]="form.currency">
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input type="date" class="form-control" [(ngModel)]="form.start_date">
          </div>
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input type="date" class="form-control" [(ngModel)]="form.end_date">
          </div>
          <div class="form-group">
            <label class="form-label">Renewal Notice (days)</label>
            <input type="number" class="form-control" [(ngModel)]="form.renewal_notice_days" placeholder="30">
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:8px;padding-top:28px">
            <input type="checkbox" id="autoRenewal" [(ngModel)]="form.auto_renewal" style="width:16px;height:16px">
            <label for="autoRenewal" style="font-size:13px;cursor:pointer">Auto-renewal</label>
          </div>
        </div>

        <div class="form-section-title" style="margin-top:16px">Description</div>
        <div class="form-group">
          <textarea class="form-control" rows="3" [(ngModel)]="form.description" placeholder="Scope of work, key terms and obligations…"></textarea>
        </div>

        @if (formError()) { <div class="alert-error" style="margin-top:10px">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-save"></i> {{ saving() ? 'Saving…' : (editId ? 'Save Changes' : 'Create Contract') }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== DETAIL MODAL ====== -->
@if (detail()) {
  <div class="modal-overlay" (click)="detail.set(null)">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header">
        <div>
          <div class="modal-title">
            <i class="fas fa-file-contract" style="color:var(--accent)"></i>
            {{ detail()!.title }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            <span class="mono-ref">{{ detail()!.contract_no }}</span>
            · {{ detail()!.vendor?.name }}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status }}</span>
          @if (isExpiringSoon(detail()!.end_date) && detail()!.status==='active') {
            <span class="badge" style="background:rgba(245,158,11,.15);color:#b45309;border:1px solid rgba(245,158,11,.3)">
              <i class="fas fa-clock"></i> Expiring Soon
            </span>
          }
          <button class="btn btn-secondary btn-xs" (click)="openEdit(detail()!)"><i class="fas fa-edit"></i> Edit</button>
          <button class="modal-close" (click)="detail.set(null)"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <!-- Left -->
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="detail-section">
              <div class="detail-section-title">Contract Information</div>
              <div class="detail-row"><span>Contract No</span><span class="mono-ref">{{ detail()!.contract_no }}</span></div>
              <div class="detail-row"><span>Type</span><span><span class="badge" [class]="typeClass(detail()!.type)">{{ fmt(detail()!.type) }}</span></span></div>
              <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status }}</span></span></div>
              <div class="detail-row"><span>Vendor</span><span style="font-weight:600">{{ detail()!.vendor?.name || '—' }}</span></div>
              <div class="detail-row"><span>Owner</span>
                <span>
                  @if (detail()!.owner) {
                    <div style="display:flex;align-items:center;gap:6px">
                      <div class="avatar-xs">{{ detail()!.owner.name?.charAt(0) }}</div>
                      {{ detail()!.owner.name }}
                    </div>
                  } @else { — }
                </span>
              </div>
              <div class="detail-row"><span>Auto-Renewal</span>
                <span>
                  @if (detail()!.auto_renewal) {
                    <span class="badge" style="background:rgba(16,185,129,.12);color:#065f46"><i class="fas fa-sync-alt"></i> Yes</span>
                  } @else { No }
                </span>
              </div>
              @if (detail()!.auto_renewal) {
                <div class="detail-row"><span>Notice Period</span><span>{{ detail()!.renewal_notice_days || 30 }} days</span></div>
              }
            </div>

            <div class="detail-section">
              <div class="detail-section-title">Financial Details</div>
              <div class="detail-row"><span>Contract Value</span>
                <span style="font-size:16px;font-weight:700;color:var(--accent)">
                  {{ detail()!.value ? (detail()!.currency || 'SAR') + ' ' + (detail()!.value | number:'1.2-2') : '—' }}
                </span>
              </div>
              <div class="detail-row"><span>Currency</span><span>{{ detail()!.currency || 'SAR' }}</span></div>
            </div>
          </div>

          <!-- Right -->
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="detail-section">
              <div class="detail-section-title">Key Dates</div>
              <div class="detail-row"><span>Start Date</span><span>{{ detail()!.start_date | date:'dd MMMM yyyy' }}</span></div>
              <div class="detail-row">
                <span>End Date</span>
                <span [style.color]="isExpiringSoon(detail()!.end_date)?'#b45309':isExpired(detail()!.end_date)?'var(--danger)':''">
                  @if (detail()!.end_date) {
                    {{ detail()!.end_date | date:'dd MMMM yyyy' }}
                    @if (isExpiringSoon(detail()!.end_date) && detail()!.status==='active') {
                      <span style="font-size:11px;margin-left:4px">({{ daysLeft(detail()!.end_date) }} days left)</span>
                    }
                  } @else { Open-ended }
                </span>
              </div>
              @if (detail()!.end_date) {
                <div class="detail-row"><span>Duration</span><span>{{ durationMonths(detail()!.start_date, detail()!.end_date) }} months</span></div>
              }
            </div>

            @if (detail()!.description) {
              <div class="detail-section">
                <div class="detail-section-title">Description</div>
                <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6;white-space:pre-wrap">{{ detail()!.description }}</p>
              </div>
            }

            <!-- Timeline / Status Bar -->
            @if (detail()!.start_date && detail()!.end_date) {
              <div class="detail-section">
                <div class="detail-section-title">Contract Progress</div>
                <div style="margin-top:4px">
                  <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
                    <span>{{ detail()!.start_date | date:'dd MMM yy' }}</span>
                    <span>{{ contractProgress(detail()!.start_date, detail()!.end_date) }}% elapsed</span>
                    <span>{{ detail()!.end_date | date:'dd MMM yy' }}</span>
                  </div>
                  <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
                    <div [style.width]="contractProgress(detail()!.start_date, detail()!.end_date)+'%'"
                         [style.background]="contractProgress(detail()!.start_date, detail()!.end_date)>90?'var(--danger)':contractProgress(detail()!.start_date, detail()!.end_date)>70?'#f59e0b':'var(--accent)'"
                         style="height:100%;border-radius:4px;transition:width .3s"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer" style="border-top:1px solid var(--border);justify-content:space-between">
        <div style="display:flex;gap:8px">
          @if (detail()!.status === 'draft') {
            <button class="btn btn-sm" style="background:#10b981;color:#fff" (click)="activate(detail()!)">
              <i class="fas fa-check-circle"></i> Activate
            </button>
          }
          @if (detail()!.status === 'active') {
            @if (confirmTerminateId !== detail()!.id) {
              <button class="btn btn-sm" style="background:var(--danger);color:#fff;opacity:.75"
                (click)="confirmTerminateId=detail()!.id">
                <i class="fas fa-ban"></i> Terminate Contract
              </button>
            } @else {
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <span style="font-size:12px;color:var(--danger);font-weight:600">Confirm terminate?</span>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff"
                  (click)="terminate(detail()!)" [disabled]="saving()">
                  Yes, Terminate
                </button>
                <button class="btn btn-sm btn-secondary" (click)="confirmTerminateId=null">Cancel</button>
              </div>
            }
          }
          @if (detail()!.status === 'terminated' || detail()!.status === 'expired') {
            <button class="btn btn-secondary btn-sm" (click)="openRenewModal(detail()!)">
              <i class="fas fa-sync-alt"></i> Renew Contract
            </button>
          }
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" (click)="openEdit(detail()!)"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-secondary" (click)="detail.set(null)">Close</button>
        </div>
      </div>
    </div>
  </div>
}

<!-- ====== RENEW MODAL ====== -->
@if (showRenewForm) {
  <div class="modal-overlay" (click)="showRenewForm=false">
    <div class="modal" style="max-width:480px" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-sync-alt" style="color:var(--accent)"></i> Renew Contract</div>
        <button class="modal-close" (click)="showRenewForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text2);margin-bottom:16px">
          Renewing <strong>{{ renewTarget()?.contract_no }}</strong>. Set new dates for the renewed contract.
        </p>
        <div class="form-group">
          <label class="form-label">New Start Date *</label>
          <input type="date" class="form-control" [(ngModel)]="renewForm.start_date">
        </div>
        <div class="form-group">
          <label class="form-label">New End Date *</label>
          <input type="date" class="form-control" [(ngModel)]="renewForm.end_date">
        </div>
        <div class="form-group">
          <label class="form-label">Updated Value</label>
          <input type="number" class="form-control" [(ngModel)]="renewForm.value" placeholder="Leave blank to keep existing">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showRenewForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submitRenew()" [disabled]="saving()">
          <i class="fas fa-sync-alt"></i> {{ saving() ? 'Renewing…' : 'Renew Contract' }}
        </button>
      </div>
    </div>
  </div>
}
@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    .stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:100px;text-align:center}
    .stat-num{font-family:'Inter',sans-serif;font-size:26px;font-weight:800}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
    .expiry-banner{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:#b45309;padding:10px 16px;border-radius:10px;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-size:13px;flex-wrap:wrap}
    .expiry-tag{background:rgba(245,158,11,.2);padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;cursor:pointer}
    .expiry-tag:hover{background:rgba(245,158,11,.35)}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .row-hover{cursor:pointer}.row-hover:hover td{background:rgba(79,70,229,.04)}
    .mono-ref{font-family:monospace;font-size:12px;color:var(--accent)}
    .text-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .font-medium{font-weight:600}
    .avatar-xs{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:40px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .form-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    .modal-lg{max-width:740px}
    .modal-xl{max-width:920px;width:95vw}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .badge-service{background:rgba(79,70,229,.12);color:#4338ca}
    .badge-supply{background:rgba(16,185,129,.12);color:#065f46}
    .badge-nda{background:rgba(139,92,246,.12);color:#5b21b6}
    .badge-partnership{background:rgba(245,158,11,.12);color:#92400e}
    .badge-maintenance{background:rgba(59,130,246,.12);color:#1d4ed8}
  `]
})
export class PartnershipListComponent implements OnInit, OnDestroy {
  items      = signal<any[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  statsCards = signal<any[]>([]);
  expiring   = signal<any[]>([]);
  vendors    = signal<any[]>([]);
  users      = signal<any[]>([]);
  detail     = signal<any>(null);
  renewTarget= signal<any>(null);
  confirmTerminateId: number | null = null;

  search = ''; filterStatus = ''; filterType = '';
  showForm = false; saving = signal(false); formError = signal('');
  editId: number | null = null;
  showRenewForm = false;
  renewForm: any = { start_date: '', end_date: '', value: '' };

  form: any = {
    title: '', vendor_id: '', type: 'service', status: 'draft',
    value: '', currency: 'SAR', start_date: '', end_date: '',
    auto_renewal: false, renewal_notice_days: 30, description: '', owner_id: ''
  };

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private svc: VendorService, private uiEvents: UiEventService, public lang: LanguageService, public auth: AuthService) {}


  private slug = () => (this.auth.currentUser() as any)?.role?.slug ?? '';
  canCreate     = () => ['super_admin','qa_manager','compliance_manager'].includes(this.slug());
  canEdit       = () => ['super_admin','qa_manager','compliance_manager'].includes(this.slug());
  canTerminate  = () => ['super_admin','qa_manager'].includes(this.slug());

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.svc.vendorsList().subscribe({ next: (r: any) => this.vendors.set(r || []) });
    this.svc.users().subscribe({ next: (r: any) => this.users.set(r || []) });
    this.svc.expiringContracts().subscribe({ next: (r: any) => this.expiring.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page(), per_page: 15 };
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.filterType)   p.type   = this.filterType;
    if (this.search)       p.search = this.search;
    this.svc.listContracts(p).subscribe({
      next: (r: any) => {
        this.items.set(r.data || []);
        this.total.set(r.total || 0);
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
    this.svc.contractStats().subscribe({
      next: (s: any) => this.statsCards.set([
        { label: 'Total',      value: s.total    ?? 0, color: 'var(--text1)' },
        { label: 'Active',     value: s.active   ?? 0, color: '#10b981' },
        { label: 'Draft',      value: s.draft    ?? 0, color: 'var(--text3)' },
        { label: 'Expiring',   value: s.expiring ?? 0, color: '#f59e0b' },
        { label: 'Expired',    value: s.expired  ?? 0, color: 'var(--danger)' },
      ]),
      error: () => {}
    });
  }

  openCreate() {
    this.editId = null;
    this.form = { title: '', vendor_id: '', type: 'service', status: 'draft', value: '', currency: 'SAR', start_date: '', end_date: '', auto_renewal: false, renewal_notice_days: 30, description: '', owner_id: '' };
    this.formError.set('');
    this.showForm = true;
  }

  openEdit(c: any) {
    this.editId = c.id;
    this.form = {
      title: c.title || '', vendor_id: c.vendor_id || '', type: c.type || 'service',
      status: c.status || 'draft', value: c.value || '', currency: c.currency || 'SAR',
      start_date: c.start_date?.substring(0, 10) || '',
      end_date: c.end_date?.substring(0, 10) || '',
      auto_renewal: !!c.auto_renewal, renewal_notice_days: c.renewal_notice_days || 30,
      description: c.description || '', owner_id: c.owner_id || ''
    };
    this.formError.set('');
    this.showForm = true;
  }

  submit() {
    if (!this.form.title.trim())   { this.formError.set('Title is required.'); return; }
    if (!this.form.vendor_id)      { this.formError.set('Vendor is required.'); return; }
    if (!this.form.start_date)     { this.formError.set('Start date is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.value)       delete payload.value;
    if (!payload.end_date)    delete payload.end_date;
    if (!payload.owner_id)    delete payload.owner_id;
    const call = this.editId ? this.svc.updateContract(this.editId, payload) : this.svc.createContract(payload);
    call.subscribe({
      next: (r: any) => {
        this.saving.set(false); this.showForm = false;
        this.load(); this.loadStats();
        this.svc.expiringContracts().subscribe({ next: (ex: any) => this.expiring.set(ex || []) });
        if (this.detail()?.id === this.editId) this.detail.set(r);
      },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat().join(', ') || 'Failed.');
      }
    });
  }

  openDetail(c: any) {
    this.svc.getContract(c.id).subscribe({ next: (r: any) => this.detail.set(r) });
  }

  activate(c: any) {
    this.svc.activateContract(c.id).subscribe({
      next: (r: any) => { this.detail.set(r); this.load(); this.loadStats(); }
    });
  }

  terminate(c: any) {
    if (this.confirmTerminateId !== c.id) {
      this.confirmTerminateId = c.id;   // first click: show confirm
      return;
    }
    this.confirmTerminateId = null;     // second click: confirmed
    this.svc.terminateContract(c.id).subscribe({
      next: (r: any) => { this.detail.set(r); this.load(); this.loadStats(); this.showToast('Contract terminated', 'success'); },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed to terminate', 'error')
    });
  }

  openRenewModal(c: any) {
    this.renewTarget.set(c);
    this.renewForm = { start_date: '', end_date: '', value: c.value || '' };
    this.showRenewForm = true;
  }

  submitRenew() {
    const c = this.renewTarget();
    if (!c || !this.renewForm.start_date || !this.renewForm.end_date) return;
    this.saving.set(true);
    const payload: any = {
      title: c.title, vendor_id: c.vendor_id, type: c.type,
      status: 'active', currency: c.currency, description: c.description,
      auto_renewal: c.auto_renewal, renewal_notice_days: c.renewal_notice_days,
      start_date: this.renewForm.start_date, end_date: this.renewForm.end_date,
    };
    if (this.renewForm.value) payload.value = this.renewForm.value;
    this.svc.createContract(payload).subscribe({
      next: () => {
        this.saving.set(false); this.showRenewForm = false;
        this.load(); this.loadStats();
      },
      error: () => { this.saving.set(false); }
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  isExpiringSoon(d: string | null) {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff <= 30;
  }
  isExpired(d: string | null) { return d ? new Date(d) < new Date() : false; }
  daysLeft(d: string) { return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)); }
  durationMonths(start: string, end: string) {
    const s = new Date(start), e = new Date(end);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }
  contractProgress(start: string, end: string) {
    const s = new Date(start).getTime(), e = new Date(end).getTime(), now = Date.now();
    if (now <= s) return 0;
    if (now >= e) return 100;
    return Math.round(((now - s) / (e - s)) * 100);
  }
  expiryClass(d: string, status: string) {
    if (status !== 'active') return 'color:var(--text2)';
    if (this.isExpired(d)) return 'color:var(--danger)';
    if (this.isExpiringSoon(d)) return 'color:#b45309';
    return 'color:var(--text2)';
  }
  fmt(s: string) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  typeClass(t: string) {
    return { service: 'badge-service', supply: 'badge-supply', nda: 'badge-nda', partnership: 'badge-partnership', maintenance: 'badge-maintenance', other: 'badge-draft' }[t] || 'badge-draft';
  }
  statusClass(s: string) {
    return { active: 'badge-green', draft: 'badge-draft', expired: 'badge-red', terminated: 'badge-red', suspended: 'badge-yellow' }[s] || 'badge-draft';
  }

  toast = signal<{msg:string,type:string}|null>(null);
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
