import { Component, OnDestroy, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfViewerModule],
  template: `
<!-- Stats Row -->
<div class="stats-row">
  @for (s of stats(); track s.label) {
    <div class="stat-card" [style.border-top]="'3px solid ' + s.color">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" [placeholder]="lang.t('Search documents…')">
    @if (canManage()) {
      <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="under_review">Under Review</option>
        <option value="approved">Approved</option>
        <option value="obsolete">Obsolete</option>
      </select>
    }
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">All Types</option>
      <option value="policy">Policy</option>
      <option value="procedure">Procedure</option>
      <option value="work_instruction">Work Instruction</option>
      <option value="form">Form</option>
      <option value="manual">Manual</option>
      <option value="report">Report</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterCategory" (change)="load()">
      <option value="">All Categories</option>
      @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
    </select>
  </div>
  @if (canManage()) {
    <button class="btn btn-primary btn-sm" (click)="openCreate()">
      <i class="fas fa-plus"></i> Upload Document
    </button>
  }
</div>

<!-- Dept info banner for read-only users -->
@if (!canManage()) {
  <div class="info-banner">
    <i class="fas fa-building"></i>
    Showing approved documents distributed to
    <strong>{{ auth.currentUser()?.department?.name || 'your department' }}</strong>
  </div>
}

<!-- Table card -->
<div class="card" style="padding:0">
  <div class="card-header" style="padding:16px 20px;margin-bottom:0">
    <div class="card-title">
      Documents
      <span class="badge badge-blue" style="margin-left:6px">{{ total() }}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      @if (canManage() && expiringCount() > 0) {
        <span class="badge badge-red" style="font-size:11px">
          <i class="fas fa-exclamation-triangle"></i> {{ expiringCount() }} expiring soon
        </span>
      }
    </div>
  </div>

  <div class="table-wrap" style="overflow-x:auto;border-top:1px solid var(--border)">
    <table class="table">
      <thead>
        <tr>
          <th>DOC NO</th>
          <th>TITLE</th>
          <th>TYPE</th>
          <th>CATEGORY</th>
          <th>VERSION</th>
          <th>STATUS</th>
          <th>REVIEW DATE</th>
          <th>OWNER</th>
          @if (canManage()) { <th>DISTRIBUTED TO</th> }
          <th style="width:60px">FILE</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <tr><td [attr.colspan]="canManage() ? 10 : 9"><div class="skeleton-row"></div></td></tr>
          }
        }
        @for (d of items(); track d.id) {
          <tr class="row-hover" (click)="openDetail(d)">
            <td><span class="mono-ref">{{ d.document_no }}</span></td>
            <td style="max-width:220px">
              <div class="text-truncate font-medium">{{ d.title }}</div>
              @if (d.description) {
                <div style="font-size:11px;color:var(--text2);margin-top:2px" class="text-truncate">
                  {{ d.description | slice:0:60 }}{{ d.description.length > 60 ? '…' : '' }}
                </div>
              }
            </td>
            <td><span class="badge" [class]="typeClass(d.type)">{{ fmt(d.type) }}</span></td>
            <td style="font-size:12px;color:var(--text2)">{{ d.category?.name || '—' }}</td>
            <td>
              <span class="badge badge-draft" style="font-family:monospace;font-size:11px">
                v{{ d.version || '1.0' }}
              </span>
            </td>
            <td><span class="badge" [class]="statusClass(d.status)">{{ fmt(d.status) }}</span></td>
            <td style="font-size:12px" [style.color]="isExpiringSoon(d.review_date) ? 'var(--danger)' : 'var(--text2)'">
              {{ d.review_date | date:'dd MMM yy' }}
              @if (isExpiringSoon(d.review_date)) {
                <i class="fas fa-circle-exclamation" style="margin-left:4px"></i>
              }
            </td>
            <td>
              @if (d.owner) {
                <div class="avatar-xs" [title]="d.owner.name">{{ d.owner.name?.charAt(0) }}</div>
              } @else { <span style="color:var(--text3)">—</span> }
            </td>
            @if (canManage()) {
              <td>
                @if (d.distributed_departments?.length) {
                  <div class="dept-pills">
                    @for (dept of d.distributed_departments.slice(0,2); track dept.id) {
                      <span class="dept-pill">{{ dept.code }}</span>
                    }
                    @if (d.distributed_departments.length > 2) {
                      <span class="dept-pill" style="background:var(--surface2);color:var(--text3)">
                        +{{ d.distributed_departments.length - 2 }}
                      </span>
                    }
                  </div>
                } @else {
                  <span style="font-size:11px;color:var(--text3)">—</span>
                }
              </td>
            }
            <td (click)="$event.stopPropagation()">

  @if (d.file_path) {

    <button
      class="btn btn-secondary btn-xs"
      (click)="handleDocument(d)">

      @if (d.type === 'form' || isQaRole()) {
        <i class="fas fa-download"></i>
      } @else {
        <i class="fas fa-eye"></i>
      }

    </button>

  } @else {
    <span style="font-size:11px;color:var(--text3)">—</span>
  }

</td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr>
            <td [attr.colspan]="canManage() ? 10 : 9" class="empty-row">
              @if (canManage()) {
                No documents found.
                <a style="cursor:pointer;color:var(--accent)" (click)="openCreate()">Upload one</a>
              } @else {
                No approved documents have been distributed to your department yet.
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

  <div class="pagination">
    <span class="page-info">{{ total() }} total documents</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()">
      <i class="fas fa-chevron-left"></i>
    </button>
    <span style="font-size:12px;color:var(--text2)">{{ page() }} / {{ totalPages() }}</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()">
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</div>


<!-- ═══════════════════ UPLOAD MODAL (QA only) ═══════════════════ -->
@if (showForm && canManage()) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-upload" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-file-circle-plus" style="color:var(--success);margin-right:8px"></i>
          Upload New Document
        </div>
        <button class="icon-btn modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group fg-full">
            <label class="form-label">Document Title *</label>
            <input class="form-control" [(ngModel)]="form.title" placeholder="e.g. Quality Management Policy">
          </div>
          <div class="form-group">
            <label class="form-label">Document Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="policy">Policy</option>
              <option value="procedure">Procedure</option>
              <option value="work_instruction">Work Instruction</option>
              <option value="form">Form</option>
              <option value="manual">Manual</option>
              <option value="report">Report</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="form.category_id">
              <option value="">— Select category —</option>
              @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Version</label>
            <input class="form-control" [(ngModel)]="form.version" placeholder="1.0">
          </div>
          <div class="form-group">
            <label class="form-label">Reviewer</label>
            <select class="form-control" [(ngModel)]="form.reviewer_id">
              <option value="">— Select reviewer —</option>
              @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Approver</label>
            <select class="form-control" [(ngModel)]="form.approver_id">
              <option value="">— Select approver —</option>
              @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Review Date</label>
            <input type="date" class="form-control" [(ngModel)]="form.review_date">
          </div>
          <div class="form-group">
            <label class="form-label">Expiry Date</label>
            <input type="date" class="form-control" [(ngModel)]="form.expiry_date">
          </div>
          <div class="form-group fg-full">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.description" placeholder="Brief description of this document…"></textarea>
          </div>

          <!-- Dept distribution -->
          <div class="form-group fg-full">
            <label class="form-label">
              Distribute To Departments
              <span style="font-weight:400;color:var(--text3);text-transform:none;font-size:11px"> — departments that can view this document after approval</span>
            </label>
            <div class="dept-check-grid">
              @for (dept of departments(); track dept.id) {
                @if (dept.code !== 'QA') {
                  <label class="dept-check-item">
                    <input type="checkbox" [value]="dept.id" (change)="toggleFormDept($event, dept.id)"
                           [checked]="formDeptIds.includes(dept.id)">
                    <span>{{ dept.name }}</span>
                  </label>
                }
              }
            </div>
          </div>

          <!-- File Upload -->
          <div class="form-group fg-full">
            <label class="form-label">Attach File</label>
            <div class="file-drop" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onFileDrop($event)">
              @if (selectedFile) {
                <div class="file-selected">
                  <i class="fas fa-file-alt" style="font-size:20px;color:var(--accent)"></i>
                  <div style="flex:1">
                    <div style="font-weight:600;font-size:13px">{{ selectedFile.name }}</div>
                    <div style="font-size:11px;color:var(--text3)">{{ formatFileSize(selectedFile.size) }}</div>
                  </div>
                  <button class="btn btn-secondary btn-xs" (click)="$event.stopPropagation();clearFile()">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              } @else {
                <div class="file-empty">
                  <i class="fas fa-cloud-upload-alt" style="font-size:28px;color:var(--text3);margin-bottom:6px"></i>
                  <div style="font-size:13px;color:var(--text2)">Click to browse or drag & drop</div>
                  <div style="font-size:11px;color:var(--text3);margin-top:3px">PDF, Word, Excel, Images — max 20MB</div>
                </div>
              }
            </div>
            <input #fileInput type="file" style="display:none" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" (change)="onFileChange($event)">
          </div>
        </div>

        @if (formError()) {
          <div class="alert-error" style="margin-top:4px">{{ formError() }}</div>
        }
        @if (uploadProgress() > 0 && uploadProgress() < 100) {
          <div style="margin-top:12px">
            <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Uploading… {{ uploadProgress() }}%</div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width]="uploadProgress() + '%'"></div>
            </div>
          </div>
        }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-upload"></i> {{ saving() ? 'Uploading...' : 'Upload Document' }}
        </button>
      </div>
    </div>
  </div>
}


<!-- ═══════════════════ DETAIL MODAL ═══════════════════ -->
@if (detailDoc()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:92vh;overflow:hidden;display:flex;flex-direction:column">

      <!-- Header -->
      <div class="modal-header" style="flex-shrink:0">
        <div>
          <div class="modal-title" style="display:flex;align-items:center;gap:8px">
            <i [class]="docIcon(detailDoc()!.type)" style="color:var(--success)"></i>
            {{ detailDoc()!.title }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:4px;display:flex;gap:8px;align-items:center">
            <span class="mono-ref">{{ detailDoc()!.document_no }}</span>
            <span>·</span>
            <span>{{ fmt(detailDoc()!.type) }}</span>
            @if (detailDoc()!.category) { <span>· {{ detailDoc()!.category.name }}</span> }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="statusClass(detailDoc()!.status)">{{ fmt(detailDoc()!.status) }}</span>
          <button class="icon-btn modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar" style="flex-shrink:0">
        @for (t of visibleTabs(); track t.key) {
          <button class="tab-btn" [class.active]="activeTab===t.key" (click)="activeTab=t.key">
            <i [class]="t.icon"></i> {{ t.label }}
          </button>
        }
      </div>

      <!-- Tab content -->
      <div style="flex:1;overflow-y:auto;padding:20px 24px">

        <!-- Overview tab -->
        @if (activeTab === 'overview') {
          <div class="two-col">
            <!-- Left: document details + file -->
            <div style="display:flex;flex-direction:column;gap:12px">
              <div class="detail-section">
                <div class="detail-section-title">Document Details</div>
                <div class="detail-row"><span>Document No</span><span class="mono-ref">{{ detailDoc()!.document_no }}</span></div>
                <div class="detail-row"><span>Type</span><span>{{ fmt(detailDoc()!.type) }}</span></div>
                <div class="detail-row"><span>Category</span><span>{{ detailDoc()!.category?.name || '—' }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detailDoc()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Version</span><span><b>v{{ detailDoc()!.version || '1.0' }}</b></span></div>
                <div class="detail-row"><span>Status</span>
                  <span><span class="badge" [class]="statusClass(detailDoc()!.status)">{{ fmt(detailDoc()!.status) }}</span></span>
                </div>
                <div class="detail-row"><span>Owner</span><span>{{ detailDoc()!.owner?.name || '—' }}</span></div>
                <div class="detail-row"><span>Reviewer</span><span>{{ detailDoc()!.reviewer?.name || '—' }}</span></div>
                <div class="detail-row"><span>Approver</span><span>{{ detailDoc()!.approver?.name || '—' }}</span></div>
                <div class="detail-row"><span>Effective Date</span>
                  <span>{{ detailDoc()!.effective_date ? (detailDoc()!.effective_date | date:'dd MMM yyyy') : '—' }}</span>
                </div>
                <div class="detail-row"><span>Review Date</span>
                  <span [style.color]="isExpiringSoon(detailDoc()!.review_date) ? 'var(--danger)' : 'inherit'">
                    {{ detailDoc()!.review_date ? (detailDoc()!.review_date | date:'dd MMM yyyy') : '—' }}
                    @if (isExpiringSoon(detailDoc()!.review_date)) { <i class="fas fa-circle-exclamation"></i> }
                  </span>
                </div>
                <div class="detail-row"><span>Expiry Date</span>
                  <span>{{ detailDoc()!.expiry_date ? (detailDoc()!.expiry_date | date:'dd MMM yyyy') : '—' }}</span>
                </div>
              </div>

              @if (detailDoc()!.rejection_reason) {
                <div class="detail-section" style="border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.04)">
                  <div class="detail-section-title" style="color:var(--danger)">Rejection Reason</div>
                  <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.5">{{ detailDoc()!.rejection_reason }}</p>
                </div>
              }

              @if (detailDoc()!.file_path) {
                <div class="detail-section">
                  <div class="detail-section-title">Attached File</div>
                  <div class="file-info-row">
                    <i class="fas fa-file-alt" style="font-size:22px;color:var(--accent)"></i>
                    <div style="flex:1">
                      <div style="font-size:13px;font-weight:600">{{ getFileName(detailDoc()!.file_path) }}</div>
                      <div style="font-size:11px;color:var(--text3)">
                        {{ detailDoc()!.mime_type || '' }}
                        @if (detailDoc()!.file_size) { · {{ formatFileSize(detailDoc()!.file_size) }} }
                      </div>
                    </div>

                    <button class="btn btn-primary btn-sm" (click)="handleDocument(detailDoc()!)">
                      
                     @if (detailDoc()!.type === 'form' || this.isQaRole()) {
                           <i class="fas fa-download"></i> Download
                    } @else {
                      <i class="fas fa-eye"></i>
                    }
                    
                    
                    
                    </button>


                  </div>
                </div>
              }
            </div>

            <!-- Right: description + QA-only sections -->
            <div style="display:flex;flex-direction:column;gap:12px">
              @if (detailDoc()!.description) {
                <div class="detail-section">
                  <div class="detail-section-title">Description</div>
                  <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6">{{ detailDoc()!.description }}</p>
                </div>
              }

              @if (canManage()) {
                <!-- New Version Upload -->
                <div class="detail-section">
                  <div class="detail-section-title">Upload New Version</div>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                      <input class="form-control" [(ngModel)]="newVersionForm.version" placeholder="Version e.g. 2.0 *">
                      <input class="form-control" [(ngModel)]="newVersionForm.change_summary" placeholder="Change summary">
                    </div>
                    <div class="file-drop" style="padding:10px" (click)="versionFileInput.click()">
                      @if (versionFile) {
                        <div class="file-selected">
                          <i class="fas fa-file" style="color:var(--accent)"></i>
                          <span style="font-size:12px;font-weight:600;flex:1">{{ versionFile.name }}</span>
                          <button class="btn btn-secondary btn-xs" (click)="$event.stopPropagation();versionFile=null">
                            <i class="fas fa-times"></i>
                          </button>
                        </div>
                      } @else {
                        <div style="text-align:center;font-size:12px;color:var(--text3)">
                          <i class="fas fa-cloud-upload-alt" style="margin-right:6px"></i> Click to attach file (optional)
                        </div>
                      }
                    </div>
                    <input #versionFileInput type="file" style="display:none" (change)="onVersionFileChange($event)">
                    <button class="btn btn-primary btn-sm" (click)="submitNewVersion()" [disabled]="!newVersionForm.version">
                      <i class="fas fa-code-branch"></i> Upload New Version
                    </button>
                  </div>
                </div>

                <!-- Distribution -->
                <div class="detail-section">
                  <div class="detail-section-title" style="display:flex;justify-content:space-between;align-items:center">
                    <span>Department Distribution</span>
                    @if (detailDoc()!.status === 'approved') {
                      <button class="btn btn-primary btn-xs" (click)="saveDistribution()" [disabled]="savingDistrib()">
                        <i class="fas fa-save"></i> {{ savingDistrib() ? 'Saving…' : 'Save' }}
                      </button>
                    }
                  </div>
                  @if (detailDoc()!.status !== 'approved') {
                    <p style="font-size:12px;color:var(--text3);margin:6px 0 0">
                      Document must be <strong>approved</strong> before it can be distributed to departments.
                    </p>
                  } @else {
                    <div class="dept-check-grid" style="margin-top:8px">
                      @for (dept of departments(); track dept.id) {
                        @if (dept.code !== 'QA') {
                          <label class="dept-check-item">
                            <input type="checkbox"
                                   [checked]="selectedDeptIds.includes(dept.id)"
                                   (change)="toggleDept($event, dept.id)">
                            <span>{{ dept.name }}</span>
                          </label>
                        }
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Versions tab -->
        @if (activeTab === 'versions') {
          @if (detailDoc()!.versions?.length) {
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (v of detailDoc()!.versions; track v.id) {
                <div class="version-row">
                  <div style="flex:1">
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
                      <span class="badge badge-blue" style="font-family:monospace">v{{ v.version }}</span>
                      @if ($first) { <span class="badge badge-green" style="font-size:10px">Current</span> }
                    </div>
                    <div style="font-size:13px;color:var(--text)">{{ v.change_summary || 'No change summary' }}</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:3px">
                      By {{ v.changed_by?.name || '—' }} · {{ v.created_at | date:'dd MMM yyyy, HH:mm' }}
                    </div>
                  </div>
                  @if (v.file_path) {
                  
                    <button class="btn btn-secondary btn-sm" *ngIf="detailDoc()!.type === 'form'"    (click)="downloadVersionFile(v)">
                      <i class="fas fa-download"></i>
                    </button>

                      <button class="btn btn-secondary btn-sm" (click)="handleDocument(detailDoc()!)">
                      
                     @if (detailDoc()!.type === 'form') {
                           <i class="fas fa-download"></i> 
                    } @else {
                      <i class="fas fa-eye"></i>Preview
                    }
                </button>


                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No version history available.</div>
          }
        }

        <!-- Access log tab (QA only) -->
        @if (activeTab === 'access' && canManage()) {
          @if (accessLog().length) {
            <table class="table">
              <thead>
                <tr>
                  <th>User</th><th>Department</th><th>Action</th><th>IP Address</th><th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                @for (log of accessLog(); track log.id) {
                  <tr>
                    <td>{{ log.user?.name || '—' }}</td>
                    <td style="font-size:12px;color:var(--text2)">{{ log.user?.department?.name || '—' }}</td>
                    <td><span class="badge" [class]="logClass(log.action)">{{ log.action | titlecase }}</span></td>
                    <td style="font-family:monospace;font-size:12px">{{ log.ip_address || '—' }}</td>
                    <td style="font-size:12px;color:var(--text2)">{{ log.created_at | date:'dd MMM yyyy, HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-row">No access log entries yet.</div>
          }
        }

      </div>

      <!-- Footer -->
      <div class="modal-footer" style="flex-shrink:0;justify-content:space-between">
        <div style="display:flex;gap:8px">
          @if (canManage()) {
            @if (detailDoc()!.status === 'draft') {
              <button class="btn btn-primary btn-sm" (click)="doSubmitReview()">
                <i class="fas fa-paper-plane"></i> Submit for Review
              </button>
            }
            @if (detailDoc()!.status === 'under_review') {
              <button class="btn btn-sm" style="background:var(--success);color:#fff" (click)="doApprove()">
                <i class="fas fa-check"></i> Approve
              </button>
              <button class="btn btn-sm btn-danger" (click)="doReject()">
                <i class="fas fa-times"></i> Reject
              </button>
            }
            @if (detailDoc()!.status === 'approved') {
              <button class="btn btn-secondary btn-sm" (click)="doObsolete()">
                <i class="fas fa-archive"></i> Mark Obsolete
              </button>
            }
          }
          @if (detailDoc()!.file_path) {
            
                <button class="btn btn-secondary btn-sm" (click)="handleDocument(detailDoc()!)">
                      
                     @if (detailDoc()!.type === 'form' || this.isQaRole()) {
                           <i class="fas fa-download"></i> Download
                    } @else {
                      <i class="fas fa-eye"></i>Preview
                    }
                </button>


          }
        </div>
        <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
      </div>
    </div>
  </div>
}

@if (pdfSrc) {

<div class="pdf-modal-overlay">

  <div class="pdf-modal">

    <!-- Header -->
    <div class="pdf-toolbar">

      <div class="toolbar-left">
        <button class="pdf-btn" (click)="zoomOut()">
          <i class="fas fa-search-minus"></i>
        </button>

        <span class="zoom-label">{{ (zoom * 100) | number:'1.0-0' }}%</span>

        <button class="pdf-btn" (click)="zoomIn()">
          <i class="fas fa-search-plus"></i>
        </button>
      </div>

      <button class="pdf-close" (click)="closePreview()">
        <i class="fas fa-times"></i>
      </button>

    </div>

    <!-- PDF Viewer -->
    <div class="pdf-container">

      <pdf-viewer
        [src]="pdfSrc"
        [zoom]="zoom"
        [page]="previewpage"
        [show-all]="true"
        [original-size]="false"
        style="display:block">
      </pdf-viewer>

    </div>

  </div>

</div>

}
@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    /* ── Stats ── */
    .stats-row { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap }
    .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 20px; flex:1; min-width:110px; text-align:center; transition:box-shadow .15s; cursor:default }
    .stat-card:hover { box-shadow:0 2px 12px rgba(0,0,0,.08) }
    .stat-num { font-family:'Inter',sans-serif; font-size:28px; font-weight:800; line-height:1 }
    .stat-lbl { font-size:11px; color:var(--text2); margin-top:4px; text-transform:uppercase; letter-spacing:.5px }

    /* ── Toolbar ── */
    .page-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:12px; flex-wrap:wrap }
    .filter-group { display:flex; gap:8px; flex-wrap:wrap }
    .input-sm { height:32px; border-radius:6px; border:1px solid var(--border); padding:0 10px; font-size:13px; background:var(--surface); color:var(--text); min-width:180px }
    .input-sm:focus { outline:none; border-color:var(--accent) }

    /* ── Info banner ── */
    .info-banner { display:flex; align-items:center; gap:10px; background:rgba(59,130,246,.07); border:1px solid rgba(59,130,246,.18); border-radius:8px; padding:10px 16px; font-size:13px; color:var(--text2); margin-bottom:12px }
    .info-banner i { color:#3b82f6; font-size:14px; flex-shrink:0 }

    /* ── Table ── */
    .row-hover { cursor:pointer }
    .row-hover:hover td { background:rgba(79,70,229,.03) }
    .text-truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
    .font-medium { font-weight:600 }
    .mono-ref { font-family:monospace; font-size:12px; color:var(--accent) }
    .avatar-xs { width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#8b5cf6); display:grid; place-items:center; font-size:11px; font-weight:700; color:#fff }

    /* ── Dept pills ── */
    .dept-pills { display:flex; gap:3px; flex-wrap:wrap }
    .dept-pill { background:rgba(59,130,246,.1); color:#3b82f6; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; white-space:nowrap }

    /* ── Pagination ── */
    .pagination { display:flex; align-items:center; gap:8px; padding:12px 16px; border-top:1px solid var(--border) }
    .page-info { font-size:12px; color:var(--text2); margin-right:auto }
    .empty-row { text-align:center; color:var(--text3); padding:48px }

    /* ── Upload modal ── */
    .modal-upload { max-width:780px; width:95vw }
    .modal-xl { max-width:980px; width:95vw }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px }
    .fg-full { grid-column:span 2 }
    .alert-error { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:var(--danger,#ef4444); padding:10px 14px; border-radius:8px; font-size:13px }
    .progress-bar { background:var(--border); border-radius:4px; height:6px }
    .progress-fill { background:var(--accent); height:6px; border-radius:4px; transition:width .3s }

    /* ── Dept checkboxes ── */
    .dept-check-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px }
    .dept-check-item { display:flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid var(--border); border-radius:6px; cursor:pointer; font-size:13px; transition:border-color .15s }
    .dept-check-item:hover { border-color:var(--accent) }
    .dept-check-item input { accent-color:var(--accent); cursor:pointer }

    /* ── File drop zone ── */
    .file-drop { border:2px dashed var(--border); border-radius:10px; padding:20px; cursor:pointer; transition:all .2s; background:var(--surface) }
    .file-drop:hover { border-color:var(--accent); background:rgba(79,70,229,.03) }
    .file-selected { display:flex; align-items:center; gap:10px }
    .file-empty { text-align:center; padding:12px 0 }

    /* ── Tabs ── */
    .tab-bar { display:flex; border-bottom:2px solid var(--border); padding:0 24px; background:var(--surface) }
    .tab-btn { padding:10px 16px; border:none; background:none; font-size:13px; font-weight:500; color:var(--text2); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; display:flex; align-items:center; gap:6px; transition:all .15s; white-space:nowrap }
    .tab-btn.active { color:var(--success); border-bottom-color:var(--success) }

    /* ── Detail layout ── */
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px }
    .detail-section { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px }
    .detail-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--text3); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between }
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(0,0,0,.04); font-size:13px }
    .detail-row span:first-child { color:var(--text2) }
    .detail-row span:last-child { font-weight:500; text-align:right }
    .file-info-row { display:flex; align-items:center; gap:12px; padding:10px; background:var(--surface2); border-radius:8px }

    /* ── Version rows ── */
    .version-row { padding:14px; border:1px solid var(--border); border-radius:8px; display:flex; align-items:center; gap:12px }
    .pdf-modal-overlay{  position:fixed;  inset:0;  background:rgba(0,0,0,0.6);  display:flex;  justify-content:center;  align-items:center;  z-index:9999;}

.pdf-modal{  width:85vw;  height:90vh;  background:#fff;  border-radius:10px;  display:flex;  flex-direction:column;  overflow:hidden;}

.pdf-toolbar{  display:flex;  justify-content:space-between;  align-items:center;  padding:10px 15px;  border-bottom:1px solid #eee;  background:#fafafa;}

.toolbar-left{  display:flex;  align-items:center;  gap:10px;}

.pdf-btn{  border:none;  background:#eee;  padding:6px 10px;  border-radius:5px;  cursor:pointer;}

.pdf-btn:hover{  background:#ddd;}

.zoom-label{  font-size:13px;  font-weight:600;}

.pdf-close{  border:none;  background:#ef4444;  color:#fff;  padding:6px 10px;  border-radius:6px;  cursor:pointer;}

.pdf-container{  flex:1;  overflow:auto;  display:flex;  justify-content:center;}
pdf-viewer {  width: 100%;  height: 100%;}

  `]
})
export class DocumentListComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('versionFileInput') versionFileInput!: ElementRef;

  items = signal<any[]>([]);
  toast = signal<{msg:string,type:string}|null>(null);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);
  stats = signal<any[]>([]);
  detailDoc = signal<any>(null);
  categories = signal<any[]>([]);
  users = signal<any[]>([]);
  departments = signal<any[]>([]);
  accessLog = signal<any[]>([]);
  expiringCount = signal(0);
  savingDistrib = signal(false);

  filterStatus = '';
  filterType = '';
  filterCategory = '';
  search = '';
  showForm = false;
  saving = signal(false);
  formError = signal('');
  uploadProgress = signal(0);
  activeTab = 'overview';
  selectedFile: File | null = null;
  versionFile: File | null = null;
  selectedDeptIds: number[] = [];
  formDeptIds: number[] = [];

  form: any = { title: '', type: 'policy', description: '', category_id: '', reviewer_id: '', approver_id: '', version: '1.0', review_date: '', expiry_date: '' };
  newVersionForm: any = { version: '', change_summary: '' };

  private allTabs = [
    { key: 'overview', label: 'Overview', icon: 'fas fa-info-circle' },
    { key: 'versions', label: 'Versions', icon: 'fas fa-code-branch' },
    { key: 'access', label: 'Access Log', icon: 'fas fa-eye' },
  ];

  /** True if logged-in user can manage documents (upload, review, approve) */
  canManage = computed(() => {
    const u = this.auth.currentUser();

    if (!u) return false;
    const perms: string[] = u.role?.permissions || [];
    // Super Admin wildcard OR document.create permission
    return perms.includes('*') || perms.includes('document.create') ||
      perms.some((p: string) => p === 'document.*');
  });

  visibleTabs = computed(() =>
    this.canManage() ? this.allTabs : this.allTabs.filter(t => t.key !== 'access')
  );

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(
    private svc: DocumentService,
    private uiEvents: UiEventService,
    public lang: LanguageService,
    public auth: AuthService
  ) { }

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.canManage()) this.openCreate();
    });
    this.load();
    this.loadStats();
    this.svc.categories().subscribe({ next: (r: any) => this.categories.set(r || []) });
    this.svc.departments().subscribe({ next: (r: any) => this.departments.set(r || []) });
    if (this.canManage()) {
      this.svc.users().subscribe({ next: (r: any) => this.users.set(r || []) });
    }

    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && ['p', 's', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus && this.canManage()) p.status = this.filterStatus;
    if (this.filterType) p.type = this.filterType;
    if (this.filterCategory) p.category_id = this.filterCategory;
    if (this.search) p.search = this.search;
    this.svc.list(p).subscribe({
      next: (r: any) => {
        this.items.set(r.data || []);
        this.total.set(r.total || 0);
        this.totalPages.set(r.last_page || 1);
        this.loading.set(false);
        this.expiringCount.set((r.data || []).filter((d: any) => this.isExpiringSoon(d.review_date)).length);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  loadStats() {
    this.svc.stats().subscribe({
      next: (r: any) => {
        const bs: any[] = r.by_status || [];
        const get = (s: string) => Number(bs.find((x: any) => x.status === s)?.total || 0);
        const total = bs.reduce((sum: number, x: any) => sum + Number(x.total || 0), 0);
        if (this.canManage()) {
          this.stats.set([
            { label: 'Total', value: total, color: 'var(--text)' },
            { label: 'Draft', value: get('draft'), color: 'var(--text2)' },
            { label: 'Under Review', value: get('under_review'), color: '#f59e0b' },
            { label: 'Approved', value: get('approved'), color: '#10b981' },
            { label: 'Obsolete', value: get('obsolete'), color: '#9ca3af' },
          ]);
        } else {
          this.stats.set([
            { label: 'Available Documents', value: total, color: '#10b981' },
            { label: 'Policies', value: get('approved'), color: 'var(--accent)' },
          ]);
        }
      }
    });
  }

  openCreate() {
    this.form = { title: '', type: 'policy', description: '', category_id: '', reviewer_id: '', approver_id: '', version: '1.0', review_date: '', expiry_date: '' };
    this.formDeptIds = [];
    this.selectedFile = null;
    this.formError.set('');
    this.uploadProgress.set(0);
    this.showForm = true;
  }

  toggleFormDept(event: any, deptId: number) {
    if (event.target.checked) { if (!this.formDeptIds.includes(deptId)) this.formDeptIds.push(deptId); }
    else { this.formDeptIds = this.formDeptIds.filter(id => id !== deptId); }
  }

  toggleDept(event: any, deptId: number) {
    if (event.target.checked) { if (!this.selectedDeptIds.includes(deptId)) this.selectedDeptIds.push(deptId); }
    else { this.selectedDeptIds = this.selectedDeptIds.filter(id => id !== deptId); }
  }

  saveDistribution() {
    const d = this.detailDoc(); if (!d) return;
    this.savingDistrib.set(true);
    this.svc.distribute(d.id, this.selectedDeptIds).subscribe({
      next: () => { this.savingDistrib.set(false); this.reloadDetail(); this.load(); },
      error: (e: any) => { this.savingDistrib.set(false); this.showToast(e?.error?.message || 'Failed', 'error'); }
    });
  }

  onFileChange(e: any) { const f = e.target.files?.[0]; if (f) this.selectedFile = f; }
  onFileDrop(e: DragEvent) { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) this.selectedFile = f; }
  clearFile() { this.selectedFile = null; if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = ''; }
  onVersionFileChange(e: any) { const f = e.target.files?.[0]; if (f) this.versionFile = f; }

  submit() {
    if (!this.form.title) { this.formError.set('Document title is required.'); return; }
    if (!this.form.type) { this.formError.set('Document type is required.'); return; }
    this.saving.set(true); this.formError.set(''); this.uploadProgress.set(10);
    const fd = new FormData();
    Object.entries(this.form).forEach(([k, v]) => { if (v) fd.append(k, v as string); });
    this.formDeptIds.forEach(id => fd.append('distribute_to[]', String(id)));
    if (this.selectedFile) fd.append('file', this.selectedFile);
    this.uploadProgress.set(40);
    this.svc.create(fd).subscribe({
      next: () => { this.uploadProgress.set(100); this.saving.set(false); this.showForm = false; this.load(); this.loadStats(); },
      error: (e: any) => {
        this.saving.set(false); this.uploadProgress.set(0);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat()[0] as string || 'Upload failed.');
      }
    });
  }

  openDetail(d: any) {
    this.svc.get(d.id).subscribe({
      next: (r: any) => {
        this.detailDoc.set(r);
        this.activeTab = 'overview';
        this.newVersionForm = { version: '', change_summary: '' };
        this.versionFile = null;
        this.selectedDeptIds = (r.distributed_departments || []).map((dept: any) => dept.id);
        if (this.canManage()) this.loadAccessLog(r.id);
      }
    });
  }

  loadAccessLog(id: number) {
    this.svc.getAccessLog(id).subscribe({ next: (r: any) => this.accessLog.set(r || []) });
  }

  closeDetail() { this.detailDoc.set(null); this.accessLog.set([]); this.selectedDeptIds = []; }

  reloadDetail() {
    const id = this.detailDoc()?.id;
    if (id) this.svc.get(id).subscribe({
      next: (r: any) => {
        this.detailDoc.set(r);
        this.selectedDeptIds = (r.distributed_departments || []).map((dept: any) => dept.id);
      }
    });
  }

  submitNewVersion() {
    const d = this.detailDoc(); if (!d || !this.newVersionForm.version) return;
    const fd = new FormData();
    fd.append('version', this.newVersionForm.version);
    if (this.newVersionForm.change_summary) fd.append('change_summary', this.newVersionForm.change_summary);
    if (this.versionFile) fd.append('file', this.versionFile);
    this.svc.newVersion(d.id, fd).subscribe({
      next: () => { this.newVersionForm = { version: '', change_summary: '' }; this.versionFile = null; this.reloadDetail(); this.load(); },
      error: (e: any) => this.showToast(e?.error?.message || 'Failed to upload version', 'error')
    });
  }

  doSubmitReview() {
    const d = this.detailDoc(); if (!d) return;
    this.svc.submitForReview(d.id).subscribe({ next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error: (e: any) => this.showToast(e?.error?.message || 'Failed', 'error') });
  }

  doApprove() {
    const d = this.detailDoc(); if (!d) return;
    this.svc.approve(d.id, {}).subscribe({ next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error: (e: any) => this.showToast(e?.error?.message || 'Failed', 'error') });
  }

  doReject() {
    const reason = prompt('Reason for rejection:'); if (!reason) return;
    const d = this.detailDoc(); if (!d) return;
    this.svc.reject(d.id, reason).subscribe({ next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error: (e: any) => this.showToast(e?.error?.message || 'Failed', 'error') });
  }

  doObsolete() {
    
    const d = this.detailDoc(); if (!d) return;
    this.svc.markObsolete(d.id).subscribe({ next: () => { this.reloadDetail(); this.load(); this.loadStats(); }, error: (e: any) => this.showToast(e?.error?.message || 'Failed', 'error') });
  }

  doDownload(d: any) {
    this.svc.download(d.id).subscribe({
      next: (r: any) => { if (r?.url) window.open(r.url, '_blank'); },
      error: (e: any) => this.showToast(e?.error?.message || 'File not found on server.', 'error')
    });
  }

  downloadVersionFile(v: any) { if (v.file_path) window.open(`/storage/${v.file_path}`, '_blank'); }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  isExpiringSoon(d: string) {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 30;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileName(path: string) { return path ? path.split('/').pop() || path : ''; }

  docIcon(type: string) {
    return ({
      policy: 'fas fa-shield-halved', procedure: 'fas fa-list-check', work_instruction: 'fas fa-tools',
      form: 'fas fa-file-lines', manual: 'fas fa-book', report: 'fas fa-chart-bar', contract: 'fas fa-handshake'
    } as any)[type] || 'fas fa-file';
  }

  typeClass(t: string) {
    return ({
      policy: 'badge-purple', procedure: 'badge-blue', work_instruction: 'badge-orange',
      form: 'badge-yellow', manual: 'badge-green', report: 'badge-blue'
    } as any)[t] || 'badge-draft';
  }

  statusClass(s: string) {
    return ({
      draft: 'badge-draft', under_review: 'badge-yellow', pending_approval: 'badge-orange',
      approved: 'badge-green', obsolete: 'badge-draft'
    } as any)[s] || 'badge-draft';
  }

  logClass(a: string) {
    return ({ view: 'badge-blue', download: 'badge-green', print: 'badge-yellow', share: 'badge-purple' } as any)[a] || 'badge-draft';
  }

  fmt(s: string | null | undefined) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()); }

  
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  canDownload(doc: any): boolean {
    const type = doc.type;

    return type === 'form';
  }
  getType(doc: any): string {
    return doc.type.name?.trim().toLowerCase();
  }


  pdfSrc: string | undefined;

  zoom = 1;
  previewpage = 1;



  previewDocument(d: any) {

    this.svc.preview(d.id).subscribe({
      next: (blob: Blob) => {
        this.pdfSrc = URL.createObjectURL(blob);

      },
      error: () => this.showToast('Unable to preview document', 'error')
    });

  }

  handleDocument(d: any) {

    if (d.type === 'form' || this.isQaRole()) {
      this.downloadDocument(d);
    } else {
      this.previewDocument(d);
    }

  }


  downloadDocument(d: any) {
    this.svc.download(d.id).subscribe({
      next: (r: any) => {
        if (r?.url) {

          const link = document.createElement('a');
          link.href = r.url;
          link.download = r.filename || 'document';
          link.target = '_blank';
          link.click();

        }
      },
      error: (e: any) => this.showToast(e?.error?.message || 'File not found on server.', 'error')
    });
  }

  zoomIn() {
    this.zoom = this.zoom + 0.25;
  }

  zoomOut() {
    if (this.zoom > 0.5) {
      this.zoom = this.zoom - 0.25;
    }
  }

  closePreview() {
    this.pdfSrc = undefined;
  }

  
  isQaRole = computed(() => {
    const u = this.auth.currentUser();

    if (!u) return false;
    const roles: any = u.role || [];
    const perms: string[] = u.role?.permissions || [];
    // Super Admin wildcard OR document.create permission
    return perms.includes('*') || perms.includes('document.create') || ['qa_manager', 'qa_officer'].includes(roles?.slug);
  });


}
