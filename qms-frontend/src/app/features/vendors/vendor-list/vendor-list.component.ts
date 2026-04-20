import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { VendorService } from '../../../core/services/vendor.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-vendor-list',
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
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" [placeholder]="lang.t('Search vendors…')">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="prospect">Prospect</option>
      <option value="active">Active</option>
      <option value="approved">Approved</option>
      <option value="suspended">Suspended</option>
      <option value="blacklisted">Blacklisted</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterRisk" (change)="load()">
      <option value="">All Risk Levels</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  </div>
  @if (canCreate()) {
    <button class="btn btn-primary btn-sm" (click)="openCreate()">
      <i class="fas fa-plus"></i> Add Vendor
    </button>
  }
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">Vendors <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>CODE</th><th>VENDOR NAME</th><th>TYPE</th><th>{{ lang.t('CATEGORY') }}</th>
          <th>CONTACT</th><th>RISK</th><th>QUALIFICATION</th><th>RATING</th><th>{{ lang.t('STATUS') }}</th><th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) { <tr><td colspan="10"><div class="skeleton-row"></div></td></tr> }
        }
        @for (v of items(); track v.id) {
          <tr class="row-hover" (click)="openDetail(v)">
            <td><span class="mono-ref">{{ v.code }}</span></td>
            <td>
              <div class="font-medium">{{ v.name }}</div>
              @if (v.country) { <div style="font-size:11px;color:var(--text3)">{{ v.country }}</div> }
            </td>
            <td><span class="badge badge-draft">{{ fmt(v.type) }}</span></td>
            <td style="font-size:12px;color:var(--text2)">{{ v.category?.name || '—' }}</td>
            <td>
              @if (v.contact_name) {
                <div style="font-size:13px">{{ v.contact_name }}</div>
                @if (v.contact_email) { <div style="font-size:11px;color:var(--text3)">{{ v.contact_email }}</div> }
              } @else { <span style="color:var(--text3);font-size:12px">—</span> }
            </td>
            <td><span class="badge" [class]="riskClass(v.risk_level)">{{ v.risk_level }}</span></td>
            <td><span class="badge" [class]="qualClass(v.qualification_status)">{{ fmt(v.qualification_status) }}</span></td>
            <td>
              @if (v.overall_rating) {
                <div style="display:flex;align-items:center;gap:4px">
                  <span style="color:#f59e0b;font-size:12px">{{ starsOf(v.overall_rating) }}</span>
                  <span style="font-size:11px;color:var(--text2)">{{ v.overall_rating }}</span>
                </div>
              } @else { <span style="color:var(--text3);font-size:12px">—</span> }
            </td>
            <td><span class="badge" [class]="statusClass(v.status)">{{ v.status }}</span></td>
            <td (click)="$event.stopPropagation()">
              <button class="btn btn-secondary btn-xs" (click)="openEdit(v)"><i class="fas fa-edit"></i></button>
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="10" class="empty-row">No vendors found. <span style="color:var(--accent);cursor:pointer" (click)="openCreate()">Add one.</span></td></tr>
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
          <i class="fas fa-building" style="color:var(--accent)"></i>
          {{ editId ? 'Edit Vendor' : 'Add Vendor' }}
        </div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-section-title">Vendor Details</div>
        <div class="form-grid">
          <div class="form-group" style="grid-column:span 2">
            <label class="form-label">Vendor Name *</label>
            <input class="form-control" [(ngModel)]="form.name" placeholder="Company name">
          </div>
          <div class="form-group">
            <label class="form-label">Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="supplier">Supplier</option>
              <option value="service_provider">Service Provider</option>
              <option value="contractor">Contractor</option>
              <option value="consultant">Consultant</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="form.category_id">
              <option value="">— Select —</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Risk Level</label>
            <select class="form-control" [(ngModel)]="form.risk_level">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="form.status">
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Country</label>
            <input class="form-control" [(ngModel)]="form.country" placeholder="e.g. Saudi Arabia">
          </div>
          <div class="form-group">
            <label class="form-label">Website</label>
            <input class="form-control" [(ngModel)]="form.website" placeholder="https://…">
          </div>
          <div class="form-group">
            <label class="form-label">Registration No.</label>
            <input class="form-control" [(ngModel)]="form.registration_no">
          </div>
          <div class="form-group">
            <label class="form-label">Tax No.</label>
            <input class="form-control" [(ngModel)]="form.tax_no">
          </div>
        </div>
        <div class="form-section-title" style="margin-top:16px">Contact</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Contact Name</label>
            <input class="form-control" [(ngModel)]="form.contact_name">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Email</label>
            <input type="email" class="form-control" [(ngModel)]="form.contact_email">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Phone</label>
            <input class="form-control" [(ngModel)]="form.contact_phone">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input class="form-control" [(ngModel)]="form.address">
          </div>
        </div>

        <!-- ── Vendor Documents ── -->
        <div style="margin-top:16px">
          <label class="form-label" style="margin-bottom:6px;display:block">📎 Documents <small style="color:#64748b;font-weight:400">(certificates, registration, agreements)</small></label>
          <div [class.dz-over]="vendorDragging()"
               (dragover)="vendorDragOver($event)" (dragleave)="vendorDragging.set(false)"
               (drop)="vendorDrop($event)" (click)="vendorFileInput.click()"
               style="border:2px dashed var(--border2,#2a3450);border-radius:8px;padding:14px;text-align:center;cursor:pointer;transition:border-color .2s">
            <span style="font-size:1.4rem">📎</span>
            <p style="margin:4px 0 2px;font-size:.85rem;color:var(--text2,#94a3b8)">Click or drag files here</p>
            <small style="color:#4b6390;font-size:.75rem">PDF, Word, Excel, Images · Max 20 MB</small>
            <input #vendorFileInput type="file" multiple
                   accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                   style="display:none" (change)="vendorFilePick($event)">
          </div>
          @if (vendorAttachments().length > 0) {
            <ul style="list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px">
              @for (f of vendorAttachments(); track f.path; let i = $index) {
                <li style="display:flex;align-items:center;gap:8px;background:var(--surface2,#0f1628);border:1px solid var(--border2,#1e2845);border-radius:6px;padding:6px 10px">
                  <span>{{ vendorFileIcon(f.name) }}</span>
                  <span style="flex:1;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ f.name }}</span>
                  <span style="font-size:.72rem;color:#4b6390">{{ vendorFmtSize(f.size) }}</span>
                  @if (f.uploading) { <span style="font-size:.72rem;color:#60a5fa">Uploading…</span> }
                  @else if (f.error) { <span style="font-size:.72rem;color:#f87171">{{ f.error }}</span> }
                  @else { <a [href]="f.url" target="_blank" style="font-size:.75rem;color:var(--accent,#4f8ef7);text-decoration:none">↗ Open</a> }
                  <button type="button" (click)="vendorRemoveFile(i)"
                          style="background:none;border:none;cursor:pointer;color:#4b6390;font-size:.85rem;padding:2px 4px">✕</button>
                </li>
              }
            </ul>
          }
        </div>

        @if (formError()) { <div class="alert-error" style="margin-top:12px">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving() || vendorAnyUploading()">
          <i class="fas fa-save"></i> {{ saving() ? 'Saving…' : (editId ? 'Save Changes' : 'Add Vendor') }}
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
            <i class="fas fa-building" style="color:var(--accent)"></i>
            {{ detail()!.name }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            <span class="mono-ref">{{ detail()!.code }}</span>
            @if (detail()!.category) { · {{ detail()!.category.name }} }
            @if (detail()!.country) { · {{ detail()!.country }} }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="riskClass(detail()!.risk_level)">{{ detail()!.risk_level }} risk</span>
          <span class="badge" [class]="qualClass(detail()!.qualification_status)">{{ fmt(detail()!.qualification_status) }}</span>
          <span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status }}</span>
          <button class="btn btn-secondary btn-xs" (click)="openEdit(detail()!)"><i class="fas fa-edit"></i></button>
          <button class="modal-close" (click)="detail.set(null)"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab==='overview'" (click)="activeTab='overview'">
          <i class="fas fa-info-circle"></i> Overview
        </button>
        <button class="tab-btn" [class.active]="activeTab==='contracts'" (click)="activeTab='contracts';loadVendorContracts()">
          <i class="fas fa-file-contract"></i> Contracts
          @if (vendorContracts().length) { <span class="badge badge-blue tab-count">{{ vendorContracts().length }}</span> }
        </button>
        <button class="tab-btn" [class.active]="activeTab==='evaluations'" (click)="activeTab='evaluations';loadEvaluations()">
          <i class="fas fa-star"></i> Evaluations
          @if (evaluations().length) { <span class="badge badge-blue tab-count">{{ evaluations().length }}</span> }
        </button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- TAB: Overview -->
        @if (activeTab === 'overview') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Vendor Information</div>
                <div class="detail-row"><span>Name</span><span style="font-weight:700">{{ detail()!.name }}</span></div>
                <div class="detail-row"><span>Code</span><span class="mono-ref">{{ detail()!.code }}</span></div>
                <div class="detail-row"><span>Type</span><span><span class="badge badge-draft">{{ fmt(detail()!.type) }}</span></span></div>
                <div class="detail-row"><span>Category</span><span>{{ detail()!.category?.name || '—' }}</span></div>
                <div class="detail-row"><span>Country</span><span>{{ detail()!.country || '—' }}</span></div>
                @if (detail()!.website) {
                  <div class="detail-row"><span>Website</span><a [href]="detail()!.website" target="_blank" style="color:var(--accent);font-size:12px">{{ detail()!.website }}</a></div>
                }
                @if (detail()!.registration_no) {
                  <div class="detail-row"><span>Reg. No.</span><span>{{ detail()!.registration_no }}</span></div>
                }
                @if (detail()!.tax_no) {
                  <div class="detail-row"><span>Tax No.</span><span>{{ detail()!.tax_no }}</span></div>
                }
              </div>
              <div class="detail-section">
                <div class="detail-section-title">Contact</div>
                @if (detail()!.contact_name) {
                  <div style="display:flex;gap:12px;align-items:flex-start;padding:6px 0">
                    <div class="contact-avatar">{{ detail()!.contact_name.charAt(0) }}</div>
                    <div>
                      <div style="font-weight:600">{{ detail()!.contact_name }}</div>
                      @if (detail()!.contact_email) { <div style="font-size:12px;color:var(--accent);margin-top:2px"><i class="fas fa-envelope"></i> {{ detail()!.contact_email }}</div> }
                      @if (detail()!.contact_phone) { <div style="font-size:12px;color:var(--text2)"><i class="fas fa-phone"></i> {{ detail()!.contact_phone }}</div> }
                      @if (detail()!.address) { <div style="font-size:12px;color:var(--text2)"><i class="fas fa-map-marker-alt"></i> {{ detail()!.address }}</div> }
                    </div>
                  </div>
                } @else {
                  <div style="font-size:13px;color:var(--text3)">No contact recorded.</div>
                }
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">Qualification & Risk</div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status }}</span></span></div>
                <div class="detail-row"><span>Risk Level</span><span><span class="badge" [class]="riskClass(detail()!.risk_level)">{{ detail()!.risk_level }}</span></span></div>
                <div class="detail-row"><span>Qualification</span><span><span class="badge" [class]="qualClass(detail()!.qualification_status)">{{ fmt(detail()!.qualification_status) }}</span></span></div>
                @if (detail()!.qualification_date) {
                  <div class="detail-row"><span>Qualified On</span><span>{{ detail()!.qualification_date | date:'dd MMM yyyy' }}</span></div>
                }
                @if (detail()!.qualification_expiry) {
                  <div class="detail-row"><span>Expiry</span>
                    <span [style.color]="isExpired(detail()!.qualification_expiry)?'var(--danger)':''">
                      {{ detail()!.qualification_expiry | date:'dd MMM yyyy' }}
                    </span>
                  </div>
                }
                @if (detail()!.overall_rating) {
                  <div class="detail-row"><span>Overall Rating</span>
                    <span style="display:flex;align-items:center;gap:4px">
                      <span style="color:#f59e0b">{{ starsOf(detail()!.overall_rating) }}</span>
                      <span style="font-size:12px;color:var(--text2)">{{ detail()!.overall_rating }}/5</span>
                    </span>
                  </div>
                }
              </div>
              <div class="detail-section">
                <div class="detail-section-title">Quick Actions</div>
                <div style="display:flex;flex-direction:column;gap:8px;padding-top:4px">
                  @if (detail()!.qualification_status !== 'qualified' && canQualify()) {
                    <button class="btn btn-sm" style="background:#10b981;color:#fff;justify-content:center" (click)="qualify(detail()!)">
                      <i class="fas fa-certificate"></i> Qualify Vendor
                    </button>
                  }
                  @if (detail()!.status !== 'suspended' && canQualify()) {
                    <button class="btn btn-secondary btn-sm" style="color:var(--danger);border-color:var(--danger)" (click)="suspendVendor(detail()!)">
                      <i class="fas fa-ban"></i> Suspend Vendor
                    </button>
                  } @else {
                    <button class="btn btn-secondary btn-sm" (click)="reactivateVendor(detail()!)">
                      <i class="fas fa-check"></i> Reactivate Vendor
                    </button>
                  }
                  <button class="btn btn-secondary btn-sm" (click)="activeTab='contracts';loadVendorContracts();openAddContract=true">
                    <i class="fas fa-file-contract"></i> Add Contract
                  </button>
                  <button class="btn btn-secondary btn-sm" (click)="activeTab='evaluations';loadEvaluations();showEvalForm=true">
                    <i class="fas fa-star"></i> Add Evaluation
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- TAB: Contracts -->
        @if (activeTab === 'contracts') {
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-size:13px;color:var(--text2)">{{ vendorContracts().length }} contract(s)</div>
            <button class="btn btn-primary btn-sm" (click)="openAddContract=!openAddContract">
              <i class="fas fa-plus"></i> Add Contract
            </button>
          </div>

          @if (openAddContract) {
            <div class="inline-form-card" style="margin-bottom:16px">
              <div class="form-section-title">New Contract for {{ detail()!.name }}</div>
              <div class="form-grid">
                <div class="form-group" style="grid-column:span 2">
                  <label class="form-label">Title *</label>
                  <input class="form-control" [(ngModel)]="contractForm.title" placeholder="Contract title">
                </div>
                <div class="form-group">
                  <label class="form-label">Type *</label>
                  <select class="form-control" [(ngModel)]="contractForm.type">
                    <option value="service">Service</option><option value="supply">Supply</option>
                    <option value="nda">NDA</option><option value="partnership">Partnership</option>
                    <option value="maintenance">Maintenance</option><option value="other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Value</label>
                  <input type="number" class="form-control" [(ngModel)]="contractForm.value" placeholder="0.00">
                </div>
                <div class="form-group">
                  <label class="form-label">Currency</label>
                  <select class="form-control" [(ngModel)]="contractForm.currency">
                    <option value="SAR">SAR</option><option value="USD">USD</option>
                    <option value="AED">AED</option><option value="EUR">EUR</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Start Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="contractForm.start_date">
                </div>
                <div class="form-group">
                  <label class="form-label">End Date</label>
                  <input type="date" class="form-control" [(ngModel)]="contractForm.end_date">
                </div>
              </div>
              @if (contractError()) { <div class="alert-error" style="margin-top:8px">{{ contractError() }}</div> }
              <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn-primary btn-sm" (click)="submitVendorContract()" [disabled]="savingContract()">
                  {{ savingContract() ? 'Saving…' : 'Create Contract' }}
                </button>
                <button class="btn btn-secondary btn-sm" (click)="openAddContract=false">Cancel</button>
              </div>
            </div>
          }

          @if (loadingContracts()) {
            @for (i of [1,2]; track i) { <div class="skeleton-row" style="height:60px;border-radius:8px;margin-bottom:8px"></div> }
          } @else if (vendorContracts().length) {
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (c of vendorContracts(); track c.id) {
                <div class="contract-row">
                  <div>
                    <span class="mono-ref" style="font-size:11px">{{ c.contract_no }}</span>
                    <span class="badge" [class]="contractTypeClass(c.type)" style="margin-left:6px">{{ fmt(c.type) }}</span>
                  </div>
                  <div style="font-weight:600;font-size:14px">{{ c.title }}</div>
                  <div style="font-size:12px;color:var(--text2);display:flex;gap:12px;flex-wrap:wrap">
                    @if (c.value) { <span><i class="fas fa-coins"></i> {{ c.currency || 'SAR' }} {{ c.value | number }}</span> }
                    <span><i class="fas fa-calendar"></i> {{ c.start_date | date:'dd MMM yy' }} → {{ c.end_date ? (c.end_date | date:'dd MMM yy') : 'Open' }}</span>
                    @if (isExpiringSoon(c.end_date)) { <span style="color:#b45309"><i class="fas fa-clock"></i> Expiring soon</span> }
                  </div>
                  <span class="badge" [class]="contractStatusClass(c.status)" style="align-self:flex-start">{{ c.status }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No contracts for this vendor yet.</div>
          }
        }

        <!-- TAB: Evaluations -->
        @if (activeTab === 'evaluations') {
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-size:13px;color:var(--text2)">{{ evaluations().length }} evaluation(s)</div>
            <button class="btn btn-primary btn-sm" (click)="showEvalForm=!showEvalForm">
              <i class="fas fa-plus"></i> Add Evaluation
            </button>
          </div>

          @if (showEvalForm) {
            <div class="inline-form-card" style="margin-bottom:16px">
              <div class="form-section-title">New Evaluation — {{ detail()!.name }}</div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Evaluation Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="evalForm.evaluation_date">
                </div>
                <div class="form-group">
                  <label class="form-label">Period</label>
                  <input class="form-control" [(ngModel)]="evalForm.period" placeholder="e.g. Q1 2025">
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:8px">
                @for (sc of scoreFields; track sc.key) {
                  <div class="form-group">
                    <label class="form-label">{{ sc.label }} (0-10)</label>
                    <input type="number" class="form-control" [(ngModel)]="evalForm[sc.key]" min="0" max="10" step="0.5">
                  </div>
                }
              </div>
              <div class="form-group" style="margin-top:8px">
                <label class="form-label">{{ lang.t('Comments') }}</label>
                <textarea class="form-control" rows="2" [(ngModel)]="evalForm.comments" placeholder="Overall feedback…"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Recommendations</label>
                <textarea class="form-control" rows="2" [(ngModel)]="evalForm.recommendations" placeholder="Action items or improvement areas…"></textarea>
              </div>
              @if (evalError()) { <div class="alert-error" style="margin-top:8px">{{ evalError() }}</div> }
              <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn-primary btn-sm" (click)="submitEvaluation()" [disabled]="savingEval()">
                  {{ savingEval() ? 'Saving…' : 'Submit Evaluation' }}
                </button>
                <button class="btn btn-secondary btn-sm" (click)="showEvalForm=false">Cancel</button>
              </div>
            </div>
          }

          @if (loadingEvals()) {
            @for (i of [1,2]; track i) { <div class="skeleton-row" style="height:90px;border-radius:8px;margin-bottom:8px"></div> }
          } @else if (evaluations().length) {
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (e of evaluations(); track e.id) {
                <div class="eval-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                    <div>
                      <div style="font-weight:600;font-size:14px">{{ e.evaluation_date | date:'dd MMMM yyyy' }}</div>
                      @if (e.period) { <div style="font-size:11px;color:var(--text3)">{{ e.period }}</div> }
                    </div>
                    @if (e.overall_score) {
                      <div style="text-align:center">
                        <div style="font-size:22px;font-weight:800;color:var(--accent)">{{ e.overall_score | number:'1.1-1' }}</div>
                        <div style="font-size:10px;color:var(--text3)">/ 10</div>
                      </div>
                    }
                  </div>
                  @if (e.quality_score || e.delivery_score || e.price_score || e.service_score || e.compliance_score) {
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                      @if (e.quality_score != null) { <div class="score-pill">Quality <strong>{{ e.quality_score }}</strong></div> }
                      @if (e.delivery_score != null) { <div class="score-pill">Delivery <strong>{{ e.delivery_score }}</strong></div> }
                      @if (e.price_score != null) { <div class="score-pill">Price <strong>{{ e.price_score }}</strong></div> }
                      @if (e.service_score != null) { <div class="score-pill">Service <strong>{{ e.service_score }}</strong></div> }
                      @if (e.compliance_score != null) { <div class="score-pill">Compliance <strong>{{ e.compliance_score }}</strong></div> }
                    </div>
                  }
                  @if (e.comments) { <p style="font-size:12px;color:var(--text2);margin:0 0 4px">{{ e.comments }}</p> }
                  <div style="font-size:11px;color:var(--text3)">By {{ e.evaluated_by?.name || '—' }}</div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No evaluations yet.</div>
          }
        }

      </div>

      <div class="modal-footer" style="border-top:1px solid var(--border)">
        <button class="btn btn-secondary btn-sm" (click)="openEdit(detail()!)"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn btn-secondary" (click)="detail.set(null)">Close</button>
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
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .row-hover{cursor:pointer}.row-hover:hover td{background:rgba(79,70,229,.04)}
    .mono-ref{font-family:monospace;font-size:12px;color:var(--accent)}
    .font-medium{font-weight:600}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:40px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .form-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    .modal-lg{max-width:740px}
    .modal-xl{max-width:960px;width:95vw}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface);flex-shrink:0}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .tab-count{font-size:10px;padding:1px 6px}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .contact-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);display:grid;place-items:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0}
    .inline-form-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}
    .contract-row{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
    .eval-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .score-pill{background:var(--bg,#f0f0ff);border-radius:6px;padding:3px 8px;font-size:11px;color:var(--text2)}
    .score-pill strong{color:var(--accent);margin-left:4px}
    .badge-service{background:rgba(79,70,229,.12);color:#4338ca}
  `]
})
export class VendorListComponent implements OnInit, OnDestroy {
  items      = signal<any[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  statsCards = signal<any[]>([]);
  categories = signal<any[]>([]);
  detail     = signal<any>(null);
  vendorContracts = signal<any[]>([]);
  evaluations     = signal<any[]>([]);
  loadingContracts= signal(false);
  loadingEvals    = signal(false);

  search = ''; filterStatus = ''; filterRisk = '';
  showForm = false; saving = signal(false); formError = signal('');
  vendorAttachments  = signal<{name:string;size:number;path:string;url:string;uploading:boolean;error:string|null}[]>([]);
  vendorDragging     = signal(false);
  vendorAnyUploading = computed(() => this.vendorAttachments().some(f => f.uploading));
  editId: number | null = null;
  activeTab = 'overview';
  openAddContract = false;
  showEvalForm    = false;
  savingContract  = signal(false);
  contractError   = signal('');
  savingEval      = signal(false);
  evalError       = signal('');

  form: any = { name: '', type: 'service_provider', category_id: '', risk_level: 'low', status: 'prospect', country: '', website: '', registration_no: '', tax_no: '', contact_name: '', contact_email: '', contact_phone: '', address: '' };
  contractForm: any = { title: '', type: 'service', value: '', currency: 'SAR', start_date: '', end_date: '' };
  evalForm: any = { evaluation_date: '', period: '', quality_score: '', delivery_score: '', price_score: '', service_score: '', compliance_score: '', comments: '', recommendations: '' };
  scoreFields = [
    { key: 'quality_score', label: 'Quality' },
    { key: 'delivery_score', label: 'Delivery' },
    { key: 'price_score', label: 'Price' },
    { key: 'service_score', label: 'Service' },
    { key: 'compliance_score', label: 'Compliance' },
  ];

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private http: HttpClient, private svc: VendorService, private uiEvents: UiEventService, public lang: LanguageService, public auth: AuthService) {}


  private slug = () => (this.auth.currentUser() as any)?.role?.slug ?? '';
  canCreate  = () => ['super_admin','qa_manager','compliance_manager'].includes(this.slug());
  canEdit    = () => ['super_admin','qa_manager','compliance_manager'].includes(this.slug());
  canQualify = () => ['super_admin','qa_manager'].includes(this.slug());

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.loadCategories();

  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus) p.status     = this.filterStatus;
    if (this.filterRisk)   p.risk_level = this.filterRisk;
    if (this.search)       p.search     = this.search;
    this.svc.list(p).subscribe({
      next: (r: any) => { this.items.set(r.data || []); this.total.set(r.total || 0); this.totalPages.set(r.last_page || 1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }

  loadStats() {
    this.svc.stats().subscribe({
      next: (s: any) => this.statsCards.set([
        { label: 'Total',     value: s.total     ?? 0, color: 'var(--text1)' },
        { label: 'Active',    value: s.active    ?? 0, color: '#10b981' },
        { label: 'Qualified', value: s.qualified ?? 0, color: 'var(--accent)' },
        { label: 'High Risk', value: s.high_risk ?? 0, color: '#ef4444' },
        { label: 'Suspended', value: s.suspended ?? 0, color: '#f59e0b' },
      ]),
      error: () => {}
    });
  }

  openCreate() {
    this.editId = null;
    this.form = { name: '', type: 'service_provider', category_id: '', risk_level: 'low', status: 'prospect', country: '', website: '', registration_no: '', tax_no: '', contact_name: '', contact_email: '', contact_phone: '', address: '' };
    this.formError.set(''); this.showForm = true;
  }

  openEdit(v: any) {
    this.editId = v.id;
    this.form = { name: v.name || '', type: v.type || 'service_provider', category_id: v.category_id || '', risk_level: v.risk_level || 'low', status: v.status || 'prospect', country: v.country || '', website: v.website || '', registration_no: v.registration_no || '', tax_no: v.tax_no || '', contact_name: v.contact_name || '', contact_email: v.contact_email || '', contact_phone: v.contact_phone || '', address: v.address || '' };
    this.formError.set(''); this.showForm = true;
  }

  loadCategories(): void {
    this.svc.categories().subscribe({
      next: (r: any) => {
        // API returns plain array OR {data:[...]} — handle both
        const cats = Array.isArray(r) ? r : (r?.data ?? []);
        this.categories.set(cats);
      },
      error: (e: any) => {
        console.error('Failed to load vendor categories:', e?.status, e?.error);
      }
    });
  }

  // ── Vendor document helpers ──────────────────────────────────────────────
  vendorDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.vendorDragging.set(true); }
  vendorDrop(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.vendorDragging.set(false); Array.from(e.dataTransfer?.files??[]).forEach(f=>this.vendorUploadFile(f)); }
  vendorFilePick(e: Event) { Array.from((e.target as HTMLInputElement).files??[]).forEach(f=>this.vendorUploadFile(f)); (e.target as HTMLInputElement).value=''; }
  vendorRemoveFile(i: number) {
    const f = this.vendorAttachments()[i];
    if (f.path) this.http.delete(`${environment.apiUrl}/attachments/delete`,{body:{path:f.path}}).subscribe();
    this.vendorAttachments.update(l=>l.filter((_,j)=>j!==i));
  }
  private vendorUploadFile(file: File) {
    if (file.size > 20*1024*1024) { alert(`"${file.name}" exceeds 20 MB`); return; }
    const entry = {name:file.name,size:file.size,path:'',url:'',uploading:true,error:null as string|null};
    this.vendorAttachments.update(l=>[...l,entry]);
    const idx = this.vendorAttachments().length-1;
    const fd = new FormData(); fd.append('file',file); fd.append('module','vendors');
    this.http.post<{data:{path:string;url:string}}>(`${environment.apiUrl}/attachments/upload`,fd).subscribe({
      next: r => this.vendorAttachments.update(l=>l.map((f,i)=>i===idx?{...f,path:r.data.path,url:r.data.url,uploading:false}:f)),
      error:(e:HttpErrorResponse)=>this.vendorAttachments.update(l=>l.map((f,i)=>i===idx?{...f,uploading:false,error:e.error?.message||'Upload failed'}:f))
    });
  }
  vendorFileIcon(n:string){const m:Record<string,string>={pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',jpg:'🖼️',jpeg:'🖼️',png:'🖼️'};return m[n.split('.').pop()?.toLowerCase()??'']??'📎';}
  vendorFmtSize(b:number){if(!b)return'';if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}

  submit() {
    if (!this.form.name.trim()) { this.formError.set('Name is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form, document_paths: this.vendorAttachments().filter(f=>f.path&&!f.error&&!f.uploading).map(f=>f.path) };
    if (!payload.category_id) delete payload.category_id;
    const call = this.editId ? this.svc.update(this.editId, payload) : this.svc.create(payload);
    call.subscribe({
      next: (r: any) => {
        this.saving.set(false); this.showForm = false; this.vendorAttachments.set([]);
        this.load(); this.loadStats();
        if (this.detail()?.id === this.editId) this.detail.set({ ...this.detail(), ...r });
      },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat().join(', ') || 'Failed.'); }
    });
  }

  openDetail(v: any) {
    this.svc.get(v.id).subscribe({
      next: (r: any) => { this.detail.set(r); this.activeTab = 'overview'; this.vendorContracts.set([]); this.evaluations.set([]); this.openAddContract = false; this.showEvalForm = false; }
    });
  }

  qualify(v: any) {
    this.svc.qualify(v.id).subscribe({
      next: (r: any) => { this.detail.set(r); this.load(); this.loadStats(); this.showToast('Vendor qualified', 'success'); },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed to qualify vendor', 'error')
    });
  }

  suspendVendor(v: any) {
    this.svc.suspend(v.id).subscribe({
      next: (r: any) => { this.detail.set(r); this.load(); this.loadStats(); this.showToast('Vendor suspended', 'success'); },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed to suspend vendor', 'error')
    });
  }

  reactivateVendor(v: any) {
    this.svc.update(v.id, { status: 'active' }).subscribe({ next: (r: any) => { this.detail.set(r); this.load(); this.loadStats(); } });
  }

  loadVendorContracts() {
    const v = this.detail(); if (!v || this.vendorContracts().length) return;
    this.loadingContracts.set(true);
    this.svc.getContracts(v.id).subscribe({ next: (r: any) => { this.vendorContracts.set(r || []); this.loadingContracts.set(false); }, error: () => this.loadingContracts.set(false) });
  }

  submitVendorContract() {
    if (!this.contractForm.title.trim()) { this.contractError.set('Title required.'); return; }
    if (!this.contractForm.start_date)   { this.contractError.set('Start date required.'); return; }
    const v = this.detail(); if (!v) return;
    this.savingContract.set(true); this.contractError.set('');
    const payload = { ...this.contractForm };
    if (!payload.value) delete payload.value;
    if (!payload.end_date) delete payload.end_date;
    this.svc.addContract(v.id, payload).subscribe({
      next: (r: any) => {
        this.savingContract.set(false); this.openAddContract = false;
        this.vendorContracts.update(list => [r, ...list]);
        this.contractForm = { title: '', type: 'service', value: '', currency: 'SAR', start_date: '', end_date: '' };
      },
      error: (e: any) => { this.savingContract.set(false); this.contractError.set(e?.error?.message || 'Failed.'); }
    });
  }

  loadEvaluations() {
    const v = this.detail(); if (!v || this.evaluations().length) return;
    this.loadingEvals.set(true);
    this.svc.getEvaluations(v.id).subscribe({ next: (r: any) => { this.evaluations.set(r || []); this.loadingEvals.set(false); }, error: () => this.loadingEvals.set(false) });
  }

  submitEvaluation() {
    if (!this.evalForm.evaluation_date) { this.evalError.set('Evaluation date required.'); return; }
    const v = this.detail(); if (!v) return;
    this.savingEval.set(true); this.evalError.set('');
    const payload = { ...this.evalForm };
    ['quality_score','delivery_score','price_score','service_score','compliance_score'].forEach(k => { if (payload[k] === '') delete payload[k]; });
    this.svc.addEvaluation(v.id, payload).subscribe({
      next: (r: any) => {
        this.savingEval.set(false); this.showEvalForm = false;
        this.evaluations.update(list => [r, ...list]);
        this.evalForm = { evaluation_date: '', period: '', quality_score: '', delivery_score: '', price_score: '', service_score: '', compliance_score: '', comments: '', recommendations: '' };
        this.svc.get(v.id).subscribe({ next: (updated: any) => this.detail.set(updated) });
        this.load();
      },
      error: (e: any) => { this.savingEval.set(false); this.evalError.set(e?.error?.message || 'Failed.'); }
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }
  isExpired(d: string | null) { return d ? new Date(d) < new Date() : false; }
  isExpiringSoon(d: string | null) {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff <= 30;
  }
  starsOf(r: number) {
    // Ratings are 0–10; convert to 0–5 for star display
    const stars = Math.min(5, Math.max(0, Math.round(r / 2)));
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }
  fmt(s: string | null | undefined) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  riskClass(r: string) { return { low: 'badge-green', medium: 'badge-yellow', high: 'badge-orange', critical: 'badge-red' }[r] || 'badge-draft'; }
  qualClass(q: string) { return { qualified: 'badge-green', pending: 'badge-yellow', not_qualified: 'badge-red', expired: 'badge-orange' }[q] || 'badge-draft'; }
  statusClass(s: string) { return { approved: 'badge-green', active: 'badge-blue', prospect: 'badge-draft', suspended: 'badge-orange', blacklisted: 'badge-red', inactive: 'badge-draft' }[s] || 'badge-draft'; }
  contractTypeClass(t: string) { return { service: 'badge-service', supply: 'badge-green', nda: 'badge-purple', partnership: 'badge-yellow', maintenance: 'badge-blue' }[t] || 'badge-draft'; }
  contractStatusClass(s: string) { return { active: 'badge-green', draft: 'badge-draft', expired: 'badge-red', terminated: 'badge-red', suspended: 'badge-yellow' }[s] || 'badge-draft'; }

  toast = signal<{msg:string,type:string}|null>(null);
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
