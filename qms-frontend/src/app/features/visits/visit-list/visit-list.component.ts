import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitService } from '../../../core/services/visit.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-visit-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- Stats Row -->
<div class="stats-row">
  @for (s of stats(); track s.label) {
    <div class="stat-card">
      <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
      <div class="stat-lbl">{{ s.label }}</div>
    </div>
  }
</div>

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">{{ lang.t('All Types') }}</option>
      <option value="client_visit">Client Visit</option>
      <option value="insurer_audit">Insurer Audit</option>
      <option value="regulatory_inspection">Regulatory Inspection</option>
      <option value="partnership_review">Partnership Review</option>
      <option value="sales_meeting">Sales Meeting</option>
      <option value="technical_review">Technical Review</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="planned">Planned</option>
      <option value="confirmed">Confirmed</option>
      <option value="in_progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
      <option value="rescheduled">Rescheduled</option>
    </select>
  </div>
  <div class="filter-group">
    <button class="btn btn-secondary btn-sm" [class.active-view]="view==='list'" (click)="view='list'">
      <i class="fas fa-list"></i> List
    </button>
    <button class="btn btn-secondary btn-sm" [class.active-view]="view==='calendar'" (click)="view='calendar'">
      <i class="fas fa-calendar-alt"></i> Calendar
    </button>
    <button class="btn btn-primary btn-sm" (click)="openSchedule()">
      <i class="fas fa-plus"></i> Schedule Visit
    </button>
  </div>
</div>

<!-- Calendar View -->
@if (view === 'calendar') {
  <div class="card" style="margin-bottom:16px">
    <div class="card-header">
      <div class="card-title">
        <button class="btn btn-secondary btn-xs" (click)="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
        &nbsp;{{ calMonthLabel() }}&nbsp;
        <button class="btn btn-secondary btn-xs" (click)="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="calendar-grid">
      @for (day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; track day) {
        <div class="cal-header">{{ day }}</div>
      }
      @for (cell of calendarCells(); track $index) {
        <div class="cal-cell" [class.today]="cell.isToday" [class.empty]="!cell.day">
          @if (cell.day) {
            <div class="cal-day">{{ cell.day }}</div>
            @for (v of cell.visits; track v.id) {
              <div class="cal-event" [class]="typeClass(v.type)" (click)="openDetail(v)">
                {{ v.client?.name || '—' }}
              </div>
            }
          }
        </div>
      }
    </div>
  </div>
}

<!-- List View -->
@if (view === 'list') {
  @if (loading()) {
    <div class="card"><div class="card-body" style="display:flex;flex-direction:column;gap:14px">
      @for (i of [1,2,3]; track i) { <div class="skeleton-row" style="height:80px;border-radius:12px"></div> }
    </div></div>
  } @else if (items().length === 0) {
    <div class="card"><div class="empty-row">No visits found. <a (click)="openSchedule()" style="cursor:pointer;color:var(--accent)">Schedule one</a></div></div>
  } @else {
    <div style="display:flex;flex-direction:column;gap:14px">
      @for (v of items(); track v.id) {
        <div class="card visit-card">
          <div class="card-body" style="display:grid;grid-template-columns:64px 1fr auto;gap:20px;align-items:center">
            <!-- Date Badge -->
            <div class="date-badge">
              <div class="date-day">{{ (v.visit_date | date:'dd') }}</div>
              <div class="date-mon">{{ (v.visit_date | date:'MMM') }}</div>
              <div class="date-yr">{{ (v.visit_date | date:'yyyy') }}</div>
            </div>
            <!-- Visit Info -->
            <div>
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
                <span class="badge" [class]="typeClass(v.type)" style="text-transform:capitalize">{{ fmt(v.type) }}</span>
                @if (v.is_virtual) { <span class="badge badge-purple">🔗 Virtual</span> }
                <span class="badge" [class]="statusClass(v.status)">{{ fmt(v.status) }}</span>
                @if (v.rating) {
                  <span style="font-size:12px;color:var(--warning)">
                    @for (i of stars(v.rating); track i) { ★ }
                    @for (i of emptyStars(v.rating); track i) { ☆ }
                  </span>
                }
              </div>
              <div style="font-size:15px;font-weight:600;color:var(--text1);margin-bottom:3px">
                {{ v.client?.name || '—' }}
              </div>
              <div style="font-size:13px;color:var(--text2);margin-bottom:3px">{{ v.purpose }}</div>
              <div style="font-size:12px;color:var(--text3);display:flex;gap:12px;flex-wrap:wrap">
                <span><i class="fas fa-map-marker-alt"></i> {{ v.is_virtual ? '🔗 Virtual' : (v.location || 'TBD') }}</span>
                <span><i class="fas fa-user-tie"></i> Host: {{ v.host?.name || '—' }}</span>
                @if (v.visit_time) { <span><i class="fas fa-clock"></i> {{ v.visit_time }}</span> }
                @if (v.duration_hours) { <span><i class="fas fa-hourglass-half"></i> {{ v.duration_hours }}h</span> }
              </div>
            </div>
            <!-- Actions -->
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <button class="btn btn-secondary btn-sm" (click)="openDetail(v)">
                <i class="fas fa-eye"></i> Details
              </button>
              @if (v.status === 'planned') {
                <button class="btn btn-sm" style="background:var(--success);color:#fff;font-size:11px" (click)="confirmVisit(v)">
                  Confirm
                </button>
              }
              @if (v.status === 'confirmed') {
                <button class="btn btn-sm" style="background:var(--accent);color:#fff;font-size:11px" (click)="startVisit(v)">
                  Start
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
    <div class="pagination">
      <span class="page-info">{{ total() }} total visits</span>
      <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
      <span style="font-size:12px">{{ page() }} / {{ totalPages() }}</span>
      <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
    </div>
  }
}

<!-- ===================== SCHEDULE VISIT MODAL ===================== -->
@if (showForm) {
  <div class="modal-overlay" (click)="showForm=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-calendar-plus" style="color:var(--accent)"></i> Schedule Visit</div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-section-title">Visit Details</div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Client / Insurer *</label>
            <select class="form-control" [(ngModel)]="form.client_id">
              <option value="">— Select Client —</option>
              @for (c of clients(); track c.id) { <option [value]="c.id">{{ c.name }} ({{ c.type }})</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Visit Type *</label>
            <select class="form-control" [(ngModel)]="form.type">
              <option value="client_visit">Client Visit</option>
              <option value="insurer_audit">Insurer Audit</option>
              <option value="regulatory_inspection">Regulatory Inspection</option>
              <option value="partnership_review">Partnership Review</option>
              <option value="sales_meeting">Sales Meeting</option>
              <option value="technical_review">Technical Review</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Visit Date *</label>
            <input type="date" class="form-control" [(ngModel)]="form.visit_date">
          </div>
          <div class="form-group">
            <label class="form-label">Visit Time</label>
            <input type="time" class="form-control" [(ngModel)]="form.visit_time">
          </div>
          <div class="form-group">
            <label class="form-label">Duration (hours)</label>
            <input type="number" class="form-control" [(ngModel)]="form.duration_hours" placeholder="e.g. 2" min="0.5" step="0.5">
          </div>
          <div class="form-group">
            <label class="form-label">Mode</label>
            <select class="form-control" [(ngModel)]="form.is_virtual">
              <option [ngValue]="false">In-Person</option>
              <option [ngValue]="true">Virtual</option>
            </select>
          </div>
        </div>
        @if (!form.is_virtual) {
          <div class="form-group">
            <label class="form-label">Location</label>
            <input class="form-control" [(ngModel)]="form.location" placeholder="e.g. HQ Meeting Room 3, Floor 5">
          </div>
        }
        @if (form.is_virtual) {
          <div class="form-group">
            <label class="form-label">Meeting Link</label>
            <input class="form-control" [(ngModel)]="form.meeting_link" placeholder="https://teams.microsoft.com/... or Zoom link">
          </div>
        }
        <div class="form-group">
          <label class="form-label">Purpose / Objective *</label>
          <textarea class="form-control" [(ngModel)]="form.purpose" rows="2" placeholder="What is the purpose of this visit?"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Agenda</label>
          <textarea class="form-control" [(ngModel)]="form.agenda" rows="4" placeholder="1. Welcome and introductions&#10;2. Review of previous action items&#10;3. ..."></textarea>
        </div>
        <div class="form-section-title" style="margin-top:16px">Internal Participants</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input class="form-control" style="flex:1" [(ngModel)]="newParticipantName" placeholder="Name (internal team member)">
          <input class="form-control" style="flex:1" [(ngModel)]="newParticipantRole" placeholder="Role / Title">
          <button class="btn btn-secondary btn-sm" (click)="addInternalParticipant()"><i class="fas fa-plus"></i> Add</button>
        </div>
        @if (form.participants?.length) {
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            @for (p of form.participants; track $index) {
              <span class="badge badge-blue" style="font-size:12px;padding:5px 10px">
                {{ p.external_name }} <span style="opacity:.6">· {{ p.external_role }}</span>
                <button style="background:none;border:none;cursor:pointer;color:inherit;margin-left:4px" (click)="removeParticipant($index)">×</button>
              </span>
            }
          </div>
        }
        @if (formError()) { <div class="alert-error" style="margin-top:8px">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-calendar-check"></i> {{ saving() ? 'Scheduling...' : 'Schedule Visit' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ===================== VISIT DETAIL MODAL ===================== -->
@if (detailVisit()) {
  <div class="modal-overlay" (click)="detailVisit.set(null)">
    <div class="modal modal-xl" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div>
          <div class="modal-title">
            <i class="fas fa-handshake" style="color:var(--accent)"></i>
            {{ detailVisit()!.client?.name }} —
            <span style="text-transform:capitalize">{{ fmt(detailVisit()!.type) }}</span>
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">
            {{ detailVisit()!.reference_no }} · {{ detailVisit()!.visit_date | date:'dd MMMM yyyy' }}
            @if (detailVisit()!.visit_time) { · {{ detailVisit()!.visit_time }} }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="statusClass(detailVisit()!.status)">{{ fmt(detailVisit()!.status) }}</span>
          <button class="modal-close" (click)="detailVisit.set(null)"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- Left Column -->
        <div>
          <div class="detail-section">
            <div class="detail-section-title">Visit Information</div>
            <div class="detail-row"><span>Client</span><span>{{ detailVisit()!.client?.name }}</span></div>
            <div class="detail-row"><span>Type</span><span style="text-transform:capitalize">{{ fmt(detailVisit()!.type) }}</span></div>
            <div class="detail-row"><span>Date</span><span>{{ detailVisit()!.visit_date | date:'dd MMM yyyy' }}</span></div>
            <div class="detail-row"><span>Time</span><span>{{ detailVisit()!.visit_time || '—' }}</span></div>
            <div class="detail-row"><span>Duration</span><span>{{ detailVisit()!.duration_hours ? detailVisit()!.duration_hours + 'h' : '—' }}</span></div>
            <div class="detail-row"><span>Mode</span>
              <span>{{ detailVisit()!.is_virtual ? '🔗 Virtual' : '📍 In-Person' }}</span>
            </div>
            <div class="detail-row"><span>Location</span><span>{{ detailVisit()!.is_virtual ? detailVisit()!.meeting_link || '—' : detailVisit()!.location || '—' }}</span></div>
            <div class="detail-row"><span>Host</span><span>{{ detailVisit()!.host?.name || '—' }}</span></div>
          </div>
          <div class="detail-section" style="margin-top:14px">
            <div class="detail-section-title">Purpose</div>
            <p style="font-size:13px;color:var(--text2);margin:0">{{ detailVisit()!.purpose }}</p>
          </div>
          @if (detailVisit()!.agenda) {
            <div class="detail-section" style="margin-top:14px">
              <div class="detail-section-title">Agenda</div>
              <pre style="font-size:13px;color:var(--text2);white-space:pre-wrap;font-family:inherit;margin:0">{{ detailVisit()!.agenda }}</pre>
            </div>
          }
          <!-- Minutes (editable when completed) -->
          <div class="detail-section" style="margin-top:14px">
            <div class="detail-section-title" style="display:flex;justify-content:space-between">
              Meeting Minutes
              @if (detailVisit()!.status === 'in_progress' || detailVisit()!.status === 'completed') {
                <button class="btn btn-secondary btn-xs" (click)="editMinutes=!editMinutes">
                  <i class="fas fa-edit"></i> {{ editMinutes ? 'Cancel' : 'Edit' }}
                </button>
              }
            </div>
            @if (editMinutes) {
              <textarea class="form-control" style="margin-top:8px" rows="5" [(ngModel)]="minutesDraft" placeholder="Record meeting minutes..."></textarea>
              <div style="margin-top:6px;text-align:right">
                <button class="btn btn-primary btn-xs" (click)="saveMinutes()">Save Minutes</button>
              </div>
            } @else {
              <pre style="font-size:13px;color:var(--text2);white-space:pre-wrap;font-family:inherit;margin:4px 0 0">{{ detailVisit()!.minutes || 'No minutes recorded yet.' }}</pre>
            }
          </div>
        </div>
        <!-- Right Column -->
        <div>
          <!-- Participants -->
          <div class="detail-section">
            <div class="detail-section-title">Participants</div>
            @if (detailVisit()!.participants?.length) {
              @for (p of detailVisit()!.participants; track p.id) {
                <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-light)">
                  <div class="avatar-xs">{{ (p.user?.name || p.external_name || '?').charAt(0) }}</div>
                  <div>
                    <div style="font-size:13px;font-weight:600">{{ p.user?.name || p.external_name }}</div>
                    <div style="font-size:11px;color:var(--text3)">{{ p.external_role || p.user?.role?.name }}</div>
                  </div>
                  @if (p.attended !== null) {
                    <span class="badge" style="margin-left:auto" [class]="p.attended ? 'badge-green' : 'badge-draft'">
                      {{ p.attended ? 'Attended' : 'Absent' }}
                    </span>
                  }
                </div>
              }
            } @else {
              <div style="font-size:13px;color:var(--text3)">No participants recorded.</div>
            }
          </div>
          <!-- Action Items -->
          <div class="detail-section" style="margin-top:14px">
            <div class="detail-section-title" style="display:flex;justify-content:space-between">
              Action Items
              <button class="btn btn-secondary btn-xs" (click)="showActionForm=!showActionForm">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            @if (showActionForm) {
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <input class="form-control" [(ngModel)]="newAction.description" placeholder="Action description *">
                <input class="form-control" [(ngModel)]="newAction.responsible" placeholder="Responsible person">
                <input type="date" class="form-control" [(ngModel)]="newAction.due_date">
                <button class="btn btn-primary btn-sm" (click)="addActionItem()">Add Action</button>
              </div>
            }
            @if (actionItems().length) {
              @for (a of actionItems(); track $index) {
                <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light)">
                  <input type="checkbox" [(ngModel)]="a.done" style="margin-top:3px">
                  <div style="flex:1">
                    <div style="font-size:13px" [style.text-decoration]="a.done?'line-through':''">{{ a.description }}</div>
                    <div style="font-size:11px;color:var(--text3)">
                      {{ a.responsible }} @if (a.due_date) { · Due: {{ a.due_date | date:'dd MMM' }} }
                    </div>
                  </div>
                </div>
              }
              <button class="btn btn-secondary btn-xs" style="margin-top:6px" (click)="saveActionItems()">Save Action Items</button>
            } @else if (!showActionForm) {
              <div style="font-size:13px;color:var(--text3)">No action items yet.</div>
            }
          </div>
          <!-- Findings -->
          <div class="detail-section" style="margin-top:14px">
            <div class="detail-section-title" style="display:flex;justify-content:space-between">
              Findings
              <button class="btn btn-secondary btn-xs" (click)="showFindingForm=!showFindingForm">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            @if (showFindingForm) {
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <select class="form-control" [(ngModel)]="newFinding.finding_type">
                  <option value="positive">Positive</option>
                  <option value="observation">Observation</option>
                  <option value="concern">Concern</option>
                  <option value="requirement">Requirement</option>
                  <option value="action_item">Action Item</option>
                </select>
                <select class="form-control" [(ngModel)]="newFinding.priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <textarea class="form-control" style="grid-column:span 2" [(ngModel)]="newFinding.description" rows="2" placeholder="Finding description *"></textarea>
                <input type="date" class="form-control" [(ngModel)]="newFinding.due_date" placeholder="Due date">
                <button class="btn btn-primary btn-sm" (click)="submitFinding()">Add Finding</button>
              </div>
            }
            @if (detailVisit()!.findings?.length) {
              @for (f of detailVisit()!.findings; track f.id) {
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light)">
                  <div style="display:flex;gap:6px;margin-bottom:3px">
                    <span class="badge" [class]="findingClass(f.finding_type)" style="text-transform:capitalize">{{ fmt(f.finding_type) }}</span>
                    <span class="badge" [class]="priorityClass(f.priority)">{{ f.priority }}</span>
                  </div>
                  <div style="font-size:13px;color:var(--text1)">{{ f.description }}</div>
                  @if (f.due_date) { <div style="font-size:11px;color:var(--text3)">Due: {{ f.due_date | date:'dd MMM yyyy' }}</div> }
                </div>
              }
            } @else if (!showFindingForm) {
              <div style="font-size:13px;color:var(--text3)">No findings recorded.</div>
            }
          </div>
          <!-- Rating -->
          @if (detailVisit()!.status === 'completed') {
            <div class="detail-section" style="margin-top:14px">
              <div class="detail-section-title">Satisfaction Rating</div>
              @if (detailVisit()!.rating) {
                <div style="font-size:24px;color:var(--warning);letter-spacing:3px">
                  @for (i of stars(detailVisit()!.rating); track i) { ★ }
                  @for (i of emptyStars(detailVisit()!.rating); track i) { ☆ }
                  <span style="font-size:13px;color:var(--text2);margin-left:8px">{{ detailVisit()!.rating }}/5</span>
                </div>
                @if (detailVisit()!.rating_comments) {
                  <div style="font-size:13px;color:var(--text2);margin-top:6px">{{ detailVisit()!.rating_comments }}</div>
                }
              } @else {
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <div>
                    @for (i of [1,2,3,4,5]; track i) {
                      <button class="star-btn" [class.filled]="ratingDraft>=i" (click)="ratingDraft=i">★</button>
                    }
                  </div>
                  <input class="form-control" style="flex:1;min-width:150px" [(ngModel)]="ratingComment" placeholder="Optional comments...">
                  <button class="btn btn-primary btn-sm" (click)="submitRating()" [disabled]="!ratingDraft">Rate Visit</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
      <!-- Footer Actions -->
      <div class="modal-footer" style="justify-content:space-between">
        <div style="display:flex;gap:8px">
          @if (detailVisit()!.status === 'planned') {
            <button class="btn btn-primary btn-sm" (click)="confirmVisit(detailVisit()!)">
              <i class="fas fa-check"></i> Confirm Visit
            </button>
          }
          @if (detailVisit()!.status === 'confirmed') {
            <button class="btn btn-primary btn-sm" (click)="startVisit(detailVisit()!)">
              <i class="fas fa-play"></i> Start Visit
            </button>
          }
          @if (detailVisit()!.status === 'in_progress') {
            <button class="btn btn-success btn-sm" (click)="completeVisit(detailVisit()!)">
              <i class="fas fa-flag-checkered"></i> Mark Complete
            </button>
          }
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" style="display:flex;align-items:center;gap:6px" (click)="downloadMOM()">
            <i class="fas fa-file-pdf" style="color:#ef4444"></i> Download MOM
          </button>
          <button class="btn btn-secondary" (click)="detailVisit.set(null)">Close</button>
        </div>
      </div>
    </div>
  </div>
}
@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    .stats-row { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 20px; flex:1; min-width:120px; text-align:center; }
    .stat-num { font-family:'Inter',sans-serif; font-size:28px; font-weight:800; }
    .stat-lbl { font-size:11px; color:var(--text2); margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }
    .page-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap; }
    .filter-group { display:flex; gap:8px; flex-wrap:wrap; }
    .active-view { background:var(--accent) !important; color:#fff !important; }
    .visit-card { transition:box-shadow .2s; }
    .visit-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.12); }
    .date-badge { text-align:center; background:linear-gradient(135deg,var(--accent),var(--accent2,var(--accent))); border-radius:12px; padding:10px 8px; color:#fff; min-width:56px; }
    .date-day { font-family:'Inter',sans-serif; font-size:26px; font-weight:800; line-height:1; }
    .date-mon { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
    .date-yr { font-size:10px; opacity:.8; }
    .avatar-xs { width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent2,var(--accent))); display:grid; place-items:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
    .pagination { display:flex; align-items:center; gap:8px; padding:12px 0; }
    .page-info { font-size:12px; color:var(--text2); margin-right:auto; }
    .empty-row { text-align:center; color:var(--text3); padding:48px 32px; }
    .form-row-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .form-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid var(--border); }
    .alert-error { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:var(--danger); padding:10px 14px; border-radius:8px; font-size:13px; }
    .modal-lg { max-width:700px; }
    .modal-xl { max-width:900px; }
    .detail-section { background:var(--surface-2,var(--surface)); border:1px solid var(--border); border-radius:10px; padding:14px; }
    .detail-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--text3); margin-bottom:10px; }
    .detail-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border-light,rgba(0,0,0,.04)); font-size:13px; }
    .detail-row span:first-child { color:var(--text2); }
    .detail-row span:last-child { font-weight:500; }
    .star-btn { background:none; border:none; font-size:24px; cursor:pointer; color:var(--border); transition:color .15s; padding:0 2px; }
    .star-btn.filled { color:var(--warning,#f59e0b); }
    /* Calendar */
    .calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:var(--border); border-radius:0 0 10px 10px; overflow:hidden; }
    .cal-header { background:var(--surface); padding:8px; text-align:center; font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; }
    .cal-cell { background:var(--surface); min-height:80px; padding:6px; vertical-align:top; }
    .cal-cell.today { background:rgba(var(--accent-rgb,99,102,241),.05); }
    .cal-cell.empty { background:var(--surface-2,#f9f9f9); }
    .cal-day { font-size:12px; font-weight:600; color:var(--text2); margin-bottom:4px; }
    .cal-event { font-size:10px; padding:2px 5px; border-radius:4px; margin-bottom:2px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; }
    .badge-purple { background:rgba(139,92,246,.15); color:#7c3aed; }
    .btn-success { background:var(--success,#10b981); color:#fff; }
  `]
})
export class VisitListComponent implements OnInit, OnDestroy {
  items       = signal<any[]>([]);
  loading     = signal(true);
  total       = signal(0);
  page        = signal(1);
  totalPages  = signal(1);
  stats       = signal<any[]>([]);
  clients     = signal<any[]>([]);
  detailVisit = signal<any>(null);
  toast = signal<{msg:string,type:string}|null>(null);

  filterType   = '';
  filterStatus = '';
  view         = 'list';
  showForm     = false;
  saving       = signal(false);
  formError    = signal('');

  // Schedule form
  form: any = {
    client_id: '', type: 'client_visit', visit_date: '', visit_time: '',
    duration_hours: '', location: '', is_virtual: false,
    meeting_link: '', purpose: '', agenda: '', participants: []
  };
  newParticipantName = '';
  newParticipantRole = '';

  // Detail panel state
  editMinutes    = false;
  minutesDraft   = '';
  showActionForm = false;
  showFindingForm= false;
  newAction: any = { description: '', responsible: '', due_date: '' };
  newFinding: any= { finding_type: 'observation', priority: 'medium', description: '', due_date: '' };
  actionItems    = signal<any[]>([]);
  ratingDraft    = 0;
  ratingComment  = '';

  // Calendar
  calYear  = new Date().getFullYear();
  calMonth = new Date().getMonth();

  private destroy$ = new Subject<void>();

  constructor(private svc: VisitService, private uiEvents: UiEventService, public lang: LanguageService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openSchedule());
    this.load();
    this.loadStats();
    this.loadClients();
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.filterType)   p.type   = this.filterType;
    this.svc.list(p).subscribe({
      next: (r: any) => {
        this.items.set(r.data || []);
        this.total.set(r.total || 0);
        this.totalPages.set(r.last_page || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadStats() {
    this.svc.stats().subscribe({
      next: (r: any) => {
        const byStatus: any[] = r.by_status || [];
        const get = (s: string) => byStatus.find((x: any) => x.status === s)?.total || 0;
        const total = byStatus.reduce((sum: number, x: any) => sum + (x.total || 0), 0);
        this.stats.set([
          { label: 'Total Visits',  value: total,                  color: 'var(--text1)' },
          { label: 'Planned',       value: get('planned'),         color: 'var(--accent)' },
          { label: 'Confirmed',     value: get('confirmed'),       color: '#f59e0b' },
          { label: 'In Progress',   value: get('in_progress'),     color: '#8b5cf6' },
          { label: 'Completed',     value: get('completed'),       color: 'var(--success,#10b981)' },
        ]);
      }
    });
  }

  loadClients() {
    this.svc.clients().subscribe({ next: (r: any) => this.clients.set(r || []) });
  }

  openSchedule() {
    this.form = {
      client_id: '', type: 'client_visit', visit_date: '', visit_time: '',
      duration_hours: '', location: '', is_virtual: false,
      meeting_link: '', purpose: '', agenda: '', participants: []
    };
    this.formError.set('');
    this.showForm = true;
  }

  addInternalParticipant() {
    if (!this.newParticipantName.trim()) return;
    this.form = {
      ...this.form,
      participants: [
        ...this.form.participants,
        { external_name: this.newParticipantName, external_role: this.newParticipantRole, is_internal: true }
      ]
    };
    this.newParticipantName = '';
    this.newParticipantRole = '';
  }

  removeParticipant(i: number) {
    this.form = {
      ...this.form,
      participants: this.form.participants.filter((_: any, idx: number) => idx !== i)
    };
  }

  submit() {
    if (!this.form.client_id) { this.formError.set('Please select a client.'); return; }
    if (!this.form.visit_date) { this.formError.set('Visit date is required.'); return; }
    if (!this.form.purpose)   { this.formError.set('Purpose is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.duration_hours) delete payload.duration_hours;
    if (!payload.visit_time) delete payload.visit_time;
    if (!payload.is_virtual) { delete payload.meeting_link; }
    this.svc.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm = false;
        this.load(); this.loadStats();
      },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat()[0] as string || 'Failed to schedule visit.');
      }
    });
  }

  openDetail(v: any) {
    this.svc.get(v.id).subscribe({
      next: (r: any) => {
        this.detailVisit.set(r);
        this.editMinutes    = false;
        this.minutesDraft   = r.minutes || '';
        this.showActionForm = false;
        this.showFindingForm= false;
        this.ratingDraft    = 0;
        this.ratingComment  = '';
        // Load action items from JSON field
        const ai = r.action_items;
        this.actionItems.set(Array.isArray(ai) ? ai : (typeof ai === 'string' ? JSON.parse(ai || '[]') : []));
      }
    });
  }

  saveMinutes() {
    const v = this.detailVisit();
    if (!v) return;
    this.svc.update(v.id, { minutes: this.minutesDraft }).subscribe({
      next: (r: any) => { this.detailVisit.set({ ...v, minutes: this.minutesDraft }); this.editMinutes = false; }
    });
  }

  addActionItem() {
    if (!this.newAction.description.trim()) return;
    this.actionItems.update(a => [...a, { ...this.newAction, done: false }]);
    this.newAction = { description: '', responsible: '', due_date: '' };
    this.showActionForm = false;
    this.saveActionItems();
  }

  saveActionItems() {
    const v = this.detailVisit();
    if (!v) return;
    this.svc.update(v.id, { action_items: JSON.stringify(this.actionItems()) }).subscribe({
      next: () => { this.detailVisit.set({ ...v, action_items: this.actionItems() }); }
    });
  }

  submitFinding() {
    const v = this.detailVisit();
    if (!v || !this.newFinding.description.trim()) return;
    this.svc.addFinding(v.id, this.newFinding).subscribe({
      next: (r: any) => {
        const updated = { ...v, findings: [...(v.findings || []), r] };
        this.detailVisit.set(updated);
        this.newFinding = { finding_type: 'observation', priority: 'medium', description: '', due_date: '' };
        this.showFindingForm = false;
      }
    });
  }

  confirmVisit(v: any) {
    this.svc.confirm(v.id).subscribe({
      next: () => {
        this.load();
        this.loadStats();
        // Reload detail if open so status badge + footer buttons update
        if (this.detailVisit()) {
          this.svc.get(v.id).subscribe({ next: (r: any) => this.detailVisit.set(r) });
        }
      },
      error: (e: any) => {
        this.showToast('Could not confirm visit: ' + (e?.error?.message || 'Server error'), 'error');
      }
    });
  }

  startVisit(v: any) {
    this.svc.start(v.id).subscribe({
      next: () => {
        this.load();
        this.loadStats();
        if (this.detailVisit()) {
          this.svc.get(v.id).subscribe({ next: (r: any) => this.detailVisit.set(r) });
        }
      },
      error: (e: any) => {
        this.showToast('Could not start visit: ' + (e?.error?.message || 'Server error'), 'error');
      }
    });
  }

  completeVisit(v: any) {
    this.svc.complete(v.id, { minutes: this.minutesDraft, action_items: JSON.stringify(this.actionItems()) }).subscribe({
      next: () => {
        this.load();
        this.loadStats();
        if (this.detailVisit()) {
          this.svc.get(v.id).subscribe({ next: (r: any) => this.detailVisit.set(r) });
        }
      },
      error: (e: any) => {
        this.showToast('Could not complete visit: ' + (e?.error?.message || 'Server error'), 'error');
      }
    });
  }

  submitRating() {
    const v = this.detailVisit();
    if (!v || !this.ratingDraft) return;
    this.svc.rate(v.id, { rating: this.ratingDraft, rating_comments: this.ratingComment }).subscribe({
      next: () => {
        this.detailVisit.set({ ...v, rating: this.ratingDraft, rating_comments: this.ratingComment });
        this.ratingDraft = 0;
      }
    });
  }

  // Calendar
  calMonthLabel() {
    return new Date(this.calYear, this.calMonth).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  }

  changeMonth(d: number) {
    this.calMonth += d;
    if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
    if (this.calMonth < 0)  { this.calMonth = 11; this.calYear--; }
  }

  calendarCells() {
    const firstDay = new Date(this.calYear, this.calMonth, 1).getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const today = new Date();
    const cells: any[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, visits: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.calYear}-${String(this.calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const visits = this.items().filter(v => v.visit_date?.startsWith(dateStr));
      const isToday = today.getDate()===d && today.getMonth()===this.calMonth && today.getFullYear()===this.calYear;
      cells.push({ day: d, visits, isToday });
    }
    return cells;
  }

  // Helpers
  stars(r: number)      { return Array(Math.min(r, 5)).fill(0); }
  emptyStars(r: number) { return Array(Math.max(5 - r, 0)).fill(0); }
  prevPage() { if(this.page()>1){ this.page.update(p=>p-1); this.load(); } }
  nextPage() { if(this.page()<this.totalPages()){ this.page.update(p=>p+1); this.load(); } }

  statusClass(s: string) {
    return { planned:'badge-blue', confirmed:'badge-yellow', in_progress:'badge-orange',
             completed:'badge-green', cancelled:'badge-draft', rescheduled:'badge-purple' }[s] || 'badge-draft';
  }
  typeClass(t: string) {
    return { client_visit:'cal-ev-blue', insurer_audit:'cal-ev-orange', regulatory_inspection:'cal-ev-red',
             partnership_review:'cal-ev-purple', sales_meeting:'cal-ev-green', technical_review:'cal-ev-teal' }[t] || 'cal-ev-blue';
  }
  findingClass(t: string) {
    return { positive:'badge-green', observation:'badge-blue', concern:'badge-orange',
             requirement:'badge-yellow', action_item:'badge-purple' }[t] || 'badge-draft';
  }
  priorityClass(p: string) {
    return { low:'badge-draft', medium:'badge-yellow', high:'badge-orange', critical:'badge-red' }[p] || 'badge-draft';
  }
  fmt(s: string|null|undefined): string { return (s||'').replace(/_/g,' '); }
  downloadMOM() {
    const v = this.detailVisit();
    if (!v) return;

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '—';
    const formatStatus = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const participants = (v.participants || []).map((p: any) =>
      `<tr><td>${p.user?.name || p.external_name || '—'}</td><td>${p.external_role || p.user?.role?.name || '—'}</td><td>${p.is_internal ? 'Internal' : 'External'}</td><td style="text-align:center">${p.attended === 1 ? '✓' : p.attended === 0 ? '✗' : '—'}</td></tr>`
    ).join('');

    const findings = (v.findings || []).map((f: any) =>
      `<tr><td>${formatStatus(f.finding_type)}</td><td>${formatStatus(f.priority)}</td><td>${f.description}</td><td>${f.due_date ? formatDate(f.due_date) : '—'}</td></tr>`
    ).join('');

    const actionItems = this.actionItems();
    const actions = actionItems.map((a: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${a.description}</td><td>${a.responsible || '—'}</td><td>${a.due_date ? formatDate(a.due_date) : '—'}</td><td style="text-align:center">${a.done ? '✓ Done' : 'Open'}</td></tr>`
    ).join('');

    const stars = v.rating ? '★'.repeat(v.rating) + '☆'.repeat(5 - v.rating) : null;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Minutes of Meeting — ${v.reference_no}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; padding: 0; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

    /* Header */
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #4f46e5; }
    .org-name { font-size: 10pt; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .doc-title { font-size: 22pt; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
    .doc-sub { font-size: 11pt; color: #4f46e5; font-weight: 600; margin-top: 2px; }
    .ref-block { text-align: right; }
    .ref-no { font-size: 13pt; font-weight: 700; color: #4f46e5; font-family: monospace; }
    .ref-date { font-size: 10pt; color: #6b7280; margin-top: 4px; }
    .status-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 20px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #dcfce7; color: #15803d; }

    /* Section */
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1.5px solid #e0e7ff; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-row { display: flex; gap: 8px; font-size: 10.5pt; }
    .info-label { color: #6b7280; min-width: 110px; flex-shrink: 0; }
    .info-value { font-weight: 500; color: #1a1a2e; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #f0f0ff; color: #4f46e5; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border: 1px solid #e0e7ff; }
    td { padding: 7px 10px; border: 1px solid #e9e9f5; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafe; }

    /* Text blocks */
    .text-block { background: #f9f9ff; border-left: 3px solid #4f46e5; padding: 12px 16px; border-radius: 0 6px 6px 0; white-space: pre-wrap; font-size: 10.5pt; line-height: 1.6; color: #374151; }
    .text-block.empty { color: #9ca3af; font-style: italic; }

    /* Rating */
    .rating-stars { font-size: 18pt; color: #f59e0b; letter-spacing: 3px; }
    .rating-label { font-size: 10pt; color: #6b7280; margin-top: 4px; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e7ff; display: flex; justify-content: space-between; font-size: 9pt; color: #9ca3af; }

    /* Priority/type badges in table */
    .badge-pos { color: #15803d; font-weight: 600; }
    .badge-concern { color: #b45309; font-weight: 600; }
    .badge-req { color: #7c3aed; font-weight: 600; }

    @media print {
      body { padding: 0; }
      .page { padding: 20px 30px; max-width: 100%; }
      @page { margin: 15mm 15mm; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="org-name">Quality Management System</div>
      <div class="doc-title">Minutes of Meeting</div>
      <div class="doc-sub">${formatStatus(v.type || '')}</div>
    </div>
    <div class="ref-block">
      <div class="ref-no">${v.reference_no || '—'}</div>
      <div class="ref-date">Visit Date: ${formatDate(v.visit_date)}</div>
      <div class="status-badge">${formatStatus(v.status)}</div>
    </div>
  </div>

  <!-- Visit Information -->
  <div class="section">
    <div class="section-title">Visit Information</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Client / Insurer</span><span class="info-value">${v.client?.name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(v.visit_date)}</span></div>
      <div class="info-row"><span class="info-label">Time</span><span class="info-value">${v.visit_time || '—'}</span></div>
      <div class="info-row"><span class="info-label">Duration</span><span class="info-value">${v.duration_hours ? v.duration_hours + ' hour(s)' : '—'}</span></div>
      <div class="info-row"><span class="info-label">Mode</span><span class="info-value">${v.is_virtual ? '🔗 Virtual' : '📍 In-Person'}</span></div>
      <div class="info-row"><span class="info-label">Location</span><span class="info-value">${v.is_virtual ? (v.meeting_link || '—') : (v.location || '—')}</span></div>
      <div class="info-row"><span class="info-label">Host</span><span class="info-value">${v.host?.name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Follow-up Date</span><span class="info-value">${v.follow_up_date ? formatDate(v.follow_up_date) : '—'}</span></div>
    </div>
  </div>

  <!-- Purpose -->
  <div class="section">
    <div class="section-title">Purpose / Objective</div>
    <div class="text-block ${v.purpose ? '' : 'empty'}">${v.purpose || 'Not specified.'}</div>
  </div>

  ${v.agenda ? `
  <!-- Agenda -->
  <div class="section">
    <div class="section-title">Agenda</div>
    <div class="text-block">${v.agenda}</div>
  </div>` : ''}

  <!-- Participants -->
  ${participants ? `
  <div class="section">
    <div class="section-title">Participants</div>
    <table>
      <thead><tr><th>Name</th><th>Role / Title</th><th>Type</th><th style="text-align:center">Attended</th></tr></thead>
      <tbody>${participants}</tbody>
    </table>
  </div>` : ''}

  <!-- Meeting Notes / Minutes -->
  <div class="section">
    <div class="section-title">Meeting Notes / Minutes</div>
    <div class="text-block ${v.minutes ? '' : 'empty'}">${v.minutes || 'No meeting notes recorded.'}</div>
  </div>

  <!-- Action Items -->
  ${actions ? `
  <div class="section">
    <div class="section-title">Action Items</div>
    <table>
      <thead><tr><th style="width:30px">#</th><th>Action</th><th>Responsible</th><th>Due Date</th><th style="text-align:center">Status</th></tr></thead>
      <tbody>${actions}</tbody>
    </table>
  </div>` : ''}

  <!-- Findings -->
  ${findings ? `
  <div class="section">
    <div class="section-title">Findings</div>
    <table>
      <thead><tr><th>Type</th><th>Priority</th><th>Description</th><th>Due Date</th></tr></thead>
      <tbody>${findings}</tbody>
    </table>
  </div>` : ''}

  <!-- Outcome -->
  ${v.outcome ? `
  <div class="section">
    <div class="section-title">Outcome / Summary</div>
    <div class="text-block">${v.outcome}</div>
  </div>` : ''}

  <!-- Rating -->
  ${v.rating ? `
  <div class="section">
    <div class="section-title">Satisfaction Rating</div>
    <div class="rating-stars">${stars}</div>
    <div class="rating-label">${v.rating}/5 — ${v.rating_comments || ''}</div>
  </div>` : ''}

  <!-- Signature Block -->
  <div class="section" style="margin-top:36px">
    <div class="section-title">Signatures</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:16px">
      <div>
        <div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px">
          <div style="font-size:10pt;font-weight:600">Host: ${v.host?.name || '___________________'}</div>
          <div style="font-size:9pt;color:#6b7280;margin-top:2px">Date: _________________</div>
        </div>
      </div>
      <div>
        <div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px">
          <div style="font-size:10pt;font-weight:600">Client Representative: ___________________</div>
          <div style="font-size:9pt;color:#6b7280;margin-top:2px">Date: _________________</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>QMS Pro — Confidential Document</span>
    <span>Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</span>
    <span>${v.reference_no}</span>
  </div>

</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
