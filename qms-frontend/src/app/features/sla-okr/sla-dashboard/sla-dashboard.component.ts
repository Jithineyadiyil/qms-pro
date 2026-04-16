import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-sla-dashboard',
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

<!-- Compliance Gauges (active SLAs) -->
@if (gauges().length > 0) {
  <div style="margin-bottom:20px">
    <div style="font-family:'Inter',sans-serif;font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <i class="fas fa-tachometer-alt" style="color:var(--accent)"></i> SLA Compliance Overview
    </div>
    <div class="gauges-grid">
      @for (g of gauges(); track g.id) {
        <div class="gauge-card" (click)="openDetail(g)">
          <div class="gauge-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg)">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border)" stroke-width="9"/>
              <circle cx="60" cy="60" r="48" fill="none"
                [attr.stroke]="gaugeColor(g.compliance_percent)"
                stroke-width="9" stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset(g.compliance_percent)"/>
            </svg>
            <div class="gauge-label">
              <div class="gauge-pct" [style.color]="gaugeColor(g.compliance_percent)">
                {{ g.compliance_percent != null ? g.compliance_percent + '%' : 'N/A' }}
              </div>
              <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">compliance</div>
            </div>
          </div>
          <div class="gauge-name">{{ g.name }}</div>
          <div class="gauge-client">{{ g.client?.name || 'Internal' }}</div>
          <div class="gauge-times">
            @if (g.response_time_hours) { <span>Response: {{ g.response_time_hours }}h</span> }
            @if (g.resolution_time_hours) { <span>Resolution: {{ g.resolution_time_hours }}h</span> }
          </div>
        </div>
      }
    </div>
  </div>
}

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" placeholder="Search SLAs…">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="draft">Draft</option>
      <option value="active">Active</option>
      <option value="expired">Expired</option>
      <option value="suspended">Suspended</option>
    </select>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openCreate()">
    <i class="fas fa-plus"></i> New SLA
  </button>
</div>

<!-- Table -->
<div class="card">
  <div class="card-header">
    <div class="card-title">SLA Definitions <span class="badge badge-blue">{{ total() }}</span></div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>SLA NAME</th><th>{{ lang.t('CATEGORY') }}</th><th>CLIENT</th>
          <th>RESPONSE</th><th>RESOLUTION</th><th>AVAILABILITY</th>
          <th>EFFECTIVE</th><th>{{ lang.t('STATUS') }}</th><th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <tr><td colspan="9"><div class="skeleton-row"></div></td></tr> }
        }
        @for (s of items(); track s.id) {
          <tr class="row-hover" (click)="openDetail(s)">
            <td>
              <div class="font-medium">{{ s.name }}</div>
              @if (s.description) { <div style="font-size:11px;color:var(--text3);margin-top:1px">{{ s.description | slice:0:50 }}…</div> }
            </td>
            <td style="font-size:12px;color:var(--text2)">{{ s.category || '—' }}</td>
            <td style="font-size:12px;color:var(--text2)">{{ s.client?.name || 'Internal' }}</td>
            <td><span class="badge badge-blue" style="font-size:11px">{{ s.response_time_hours ? s.response_time_hours + 'h' : '—' }}</span></td>
            <td><span class="badge badge-draft" style="font-size:11px">{{ s.resolution_time_hours ? s.resolution_time_hours + 'h' : '—' }}</span></td>
            <td>
              @if (s.availability_percent) {
                <div class="avail-bar">
                  <div class="avail-fill" [style.width]="s.availability_percent + '%'"
                    [style.background]="s.availability_percent>=99 ? 'var(--success)' : s.availability_percent>=95 ? 'var(--warning)' : 'var(--danger)'"></div>
                </div>
                <span style="font-size:11px;color:var(--text2)">{{ s.availability_percent }}%</span>
              } @else { <span style="font-size:12px;color:var(--text3)">N/A</span> }
            </td>
            <td style="font-size:12px;color:var(--text2)">
              {{ s.effective_from | date:'dd MMM yy' }}
              @if (s.effective_to) { <span style="color:var(--text3)"> → {{ s.effective_to | date:'dd MMM yy' }}</span> }
            </td>
            <td><span class="badge" [class]="statusClass(s.status)">{{ s.status | titlecase }}</span></td>
            <td (click)="$event.stopPropagation()">
              <button class="btn btn-secondary btn-xs" (click)="openEdit(s)"><i class="fas fa-edit"></i></button>
            </td>
          </tr>
        }
        @if (!loading() && items().length === 0) {
          <tr><td colspan="9" class="empty-row">No SLAs found. <span style="color:var(--accent);cursor:pointer" (click)="openCreate()">Create one.</span></td></tr>
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
          {{ editId ? 'Edit SLA' : 'New SLA Definition' }}
        </div>
        <button class="modal-close" (click)="showForm=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-section-title">Basic Information</div>
        <div class="form-grid">
          <div class="form-group fg-full">
            <label class="form-label">SLA Name *</label>
            <input class="form-control" [(ngModel)]="form.name" placeholder="e.g. Enterprise Support SLA">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <input class="form-control" [(ngModel)]="form.category" placeholder="e.g. Support, IT, Compliance">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="form.status">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Client</label>
            <select class="form-control" [(ngModel)]="form.client_id">
              <option value="">— Internal / None —</option>
              @for (c of clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <select class="form-control" [(ngModel)]="form.department_id">
              <option value="">— None —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div class="form-group fg-full">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.description" placeholder="Brief description of this SLA's scope…"></textarea>
          </div>
        </div>

        <div class="form-section-title mt16">Service Levels</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Response Time (hours)</label>
            <input type="number" class="form-control" [(ngModel)]="form.response_time_hours" min="1" placeholder="e.g. 4">
          </div>
          <div class="form-group">
            <label class="form-label">Resolution Time (hours)</label>
            <input type="number" class="form-control" [(ngModel)]="form.resolution_time_hours" min="1" placeholder="e.g. 24">
          </div>
          <div class="form-group">
            <label class="form-label">Availability Target (%)</label>
            <input type="number" class="form-control" [(ngModel)]="form.availability_percent" min="0" max="100" step="0.01" placeholder="e.g. 99.9">
          </div>
        </div>

        <div class="form-section-title mt16">Validity Period</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Effective From *</label>
            <input type="date" class="form-control" [(ngModel)]="form.effective_from">
          </div>
          <div class="form-group">
            <label class="form-label">Effective To</label>
            <input type="date" class="form-control" [(ngModel)]="form.effective_to">
          </div>
        </div>

        <div class="form-section-title mt16">Clauses</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Penalty Clause</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.penalty_clause" placeholder="Describe penalties for breach…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Reward Clause</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.reward_clause" placeholder="Describe rewards for meeting targets…"></textarea>
          </div>
        </div>

        @if (formError()) { <div class="alert-error mt8">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showForm=false">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          <i class="fas fa-save"></i> {{ saving() ? 'Saving…' : (editId ? 'Update SLA' : 'Create SLA') }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ====== DETAIL MODAL ====== -->
@if (detail()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header" style="flex-shrink:0">
        <div>
          <div class="modal-title">
            <i class="fas fa-file-contract" style="color:var(--accent)"></i> {{ detail()!.name }}
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            {{ detail()!.client?.name || 'Internal' }}
            @if (detail()!.category) { · {{ detail()!.category }} }
            · {{ detail()!.effective_from | date:'dd MMM yyyy' }}
            @if (detail()!.effective_to) { → {{ detail()!.effective_to | date:'dd MMM yyyy' }} }
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status | titlecase }}</span>
          @if (detail()!.status === 'draft') {
            <button class="btn btn-sm" style="background:#10b981;color:#fff" (click)="doActivate()">Activate</button>
          }
          @if (detail()!.status === 'active') {
            <button class="btn btn-secondary btn-sm" (click)="doSuspend()">Suspend</button>
          }
          <button class="btn btn-secondary btn-xs" (click)="openEdit(detail())"><i class="fas fa-edit"></i></button>
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar" style="flex-shrink:0">
        <button class="tab-btn" [class.active]="dTab==='overview'" (click)="dTab='overview'">
          <i class="fas fa-info-circle"></i> Overview
        </button>
        <button class="tab-btn" [class.active]="dTab==='metrics'" (click)="dTab='metrics'">
          <i class="fas fa-chart-bar"></i> Metrics
          @if (detail()!.metrics?.length) { <span class="badge badge-blue tab-cnt">{{ detail()!.metrics.length }}</span> }
        </button>
        <button class="tab-btn" [class.active]="dTab==='measurements'" (click)="dTab='measurements';loadMeasurements()">
          <i class="fas fa-clipboard-list"></i> Measurements
          @if (measurements().length) { <span class="badge badge-blue tab-cnt">{{ measurements().length }}</span> }
        </button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- TAB: Overview -->
        @if (dTab === 'overview') {
          <div class="two-col">
            <div style="display:flex;flex-direction:column;gap:14px">
              <!-- Gauge -->
              <div class="detail-section" style="text-align:center;padding:24px">
                <div style="position:relative;width:150px;height:150px;margin:0 auto 16px">
                  <svg width="150" height="150" viewBox="0 0 150 150" style="transform:rotate(-90deg)">
                    <circle cx="75" cy="75" r="60" fill="none" stroke="var(--border)" stroke-width="11"/>
                    <circle cx="75" cy="75" r="60" fill="none"
                      [attr.stroke]="gaugeColor(detail()!.compliance_percent)"
                      stroke-width="11" stroke-linecap="round"
                      [attr.stroke-dasharray]="circBig"
                      [attr.stroke-dashoffset]="dashBig(detail()!.compliance_percent)"/>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                    <span class="gauge-pct-big" [style.color]="gaugeColor(detail()!.compliance_percent)">
                      {{ detail()!.compliance_percent != null ? detail()!.compliance_percent + '%' : 'N/A' }}
                    </span>
                    <span style="font-size:10px;color:var(--text3)">compliance</span>
                  </div>
                </div>
                <div style="font-size:13px;font-weight:600">Overall SLA Compliance</div>
                <div style="font-size:12px;color:var(--text3);margin-top:4px">Based on all recorded measurements</div>
              </div>

              <!-- SLA Info -->
              <div class="detail-section">
                <div class="detail-section-title">Service Levels</div>
                <div class="detail-row"><span>Response Time</span><span>{{ detail()!.response_time_hours ? detail()!.response_time_hours + ' hours' : '—' }}</span></div>
                <div class="detail-row"><span>Resolution Time</span><span>{{ detail()!.resolution_time_hours ? detail()!.resolution_time_hours + ' hours' : '—' }}</span></div>
                <div class="detail-row"><span>Availability Target</span>
                  <span [style.color]="detail()!.availability_percent ? 'var(--success)' : ''">
                    {{ detail()!.availability_percent ? detail()!.availability_percent + '%' : '—' }}
                  </span>
                </div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="detail-section">
                <div class="detail-section-title">{{ lang.t('Details') }}</div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status }}</span></span></div>
                <div class="detail-row"><span>Client</span><span>{{ detail()!.client?.name || 'Internal' }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detail()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Category</span><span>{{ detail()!.category || '—' }}</span></div>
                <div class="detail-row"><span>Effective From</span><span>{{ detail()!.effective_from | date:'dd MMM yyyy' }}</span></div>
                <div class="detail-row"><span>Expires</span>
                  <span [style.color]="isExpiringSoon(detail()!.effective_to) ? 'var(--warning)' : ''">
                    {{ detail()!.effective_to ? (detail()!.effective_to | date:'dd MMM yyyy') : 'No expiry' }}
                    @if (isExpiringSoon(detail()!.effective_to)) { <span style="font-size:11px"> (soon)</span> }
                  </span>
                </div>
              </div>

              @if (detail()!.description) {
                <div class="detail-section">
                  <div class="detail-section-title">Description</div>
                  <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6">{{ detail()!.description }}</p>
                </div>
              }

              @if (detail()!.penalty_clause || detail()!.reward_clause) {
                <div class="detail-section">
                  @if (detail()!.penalty_clause) {
                    <div class="detail-section-title" style="color:#ef4444"><i class="fas fa-exclamation-triangle"></i> Penalty Clause</div>
                    <p style="font-size:13px;color:var(--text2);margin:0 0 10px;line-height:1.6">{{ detail()!.penalty_clause }}</p>
                  }
                  @if (detail()!.reward_clause) {
                    <div class="detail-section-title" style="color:#10b981"><i class="fas fa-star"></i> Reward Clause</div>
                    <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6">{{ detail()!.reward_clause }}</p>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB: Metrics -->
        @if (dTab === 'metrics') {
          <!-- Add metric form -->
          <div class="inline-card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div class="form-section-title" style="margin:0">Add Metric</div>
              <button class="btn btn-secondary btn-xs" (click)="showMetricForm=!showMetricForm">
                <i class="fas" [class.fa-plus]="!showMetricForm" [class.fa-times]="showMetricForm"></i>
              </button>
            </div>
            @if (showMetricForm) {
              <div class="form-grid" style="grid-template-columns:repeat(3,1fr)">
                <div class="form-group">
                  <label class="form-label">Metric Name *</label>
                  <input class="form-control" [(ngModel)]="mForm.metric_name" placeholder="e.g. Uptime">
                </div>
                <div class="form-group">
                  <label class="form-label">Target Value *</label>
                  <input type="number" class="form-control" [(ngModel)]="mForm.target_value">
                </div>
                <div class="form-group">
                  <label class="form-label">Unit</label>
                  <input class="form-control" [(ngModel)]="mForm.unit" placeholder="%, h, #…">
                </div>
                <div class="form-group">
                  <label class="form-label">Frequency</label>
                  <select class="form-control" [(ngModel)]="mForm.measurement_frequency">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Warning Threshold</label>
                  <input type="number" class="form-control" [(ngModel)]="mForm.threshold_warning">
                </div>
                <div class="form-group">
                  <label class="form-label">Critical Threshold</label>
                  <input type="number" class="form-control" [(ngModel)]="mForm.threshold_critical">
                </div>
              </div>
              <button class="btn btn-primary btn-sm" (click)="submitMetric()" [disabled]="saving()">
                Add Metric
              </button>
            }
          </div>

          @if (detail()!.metrics?.length) {
            <div class="metrics-grid">
              @for (m of detail()!.metrics; track m.id) {
                <div class="metric-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div class="metric-name">{{ m.metric_name }}</div>
                    <span class="badge badge-draft" style="font-size:10px">{{ m.measurement_frequency }}</span>
                  </div>
                  <div class="metric-target">
                    <span style="font-family:'Inter',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">{{ m.target_value }}</span>
                    <span style="font-size:13px;color:var(--text2);margin-left:4px">{{ m.unit || '' }}</span>
                  </div>
                  @if (m.threshold_warning || m.threshold_critical) {
                    <div style="display:flex;gap:8px;margin-top:8px">
                      @if (m.threshold_warning) {
                        <span class="badge badge-yellow" style="font-size:10px">⚠ {{ m.threshold_warning }}{{ m.unit }}</span>
                      }
                      @if (m.threshold_critical) {
                        <span class="badge badge-red" style="font-size:10px">🔴 {{ m.threshold_critical }}{{ m.unit }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty-row">No metrics defined yet. Add the first metric above.</div>
          }
        }

        <!-- TAB: Measurements -->
        @if (dTab === 'measurements') {
          <!-- Record measurement form -->
          <div class="inline-card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div class="form-section-title" style="margin:0">Record Measurement</div>
              <button class="btn btn-secondary btn-xs" (click)="showMeasureForm=!showMeasureForm">
                <i class="fas" [class.fa-plus]="!showMeasureForm" [class.fa-times]="showMeasureForm"></i>
              </button>
            </div>
            @if (showMeasureForm) {
              <div class="form-grid" style="grid-template-columns:repeat(3,1fr)">
                <div class="form-group">
                  <label class="form-label">Metric *</label>
                  <select class="form-control" [(ngModel)]="msForm.metric_id">
                    <option value="">— Select —</option>
                    @for (m of detail()!.metrics; track m.id) { <option [value]="m.id">{{ m.metric_name }}</option> }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Period Start *</label>
                  <input type="date" class="form-control" [(ngModel)]="msForm.period_start">
                </div>
                <div class="form-group">
                  <label class="form-label">Period End *</label>
                  <input type="date" class="form-control" [(ngModel)]="msForm.period_end">
                </div>
                <div class="form-group">
                  <label class="form-label">Actual Value *</label>
                  <input type="number" class="form-control" [(ngModel)]="msForm.actual_value" step="0.01">
                </div>
                <div class="form-group">
                  <label class="form-label">Target Value *</label>
                  <input type="number" class="form-control" [(ngModel)]="msForm.target_value" step="0.01">
                </div>
                <div class="form-group">
                  <label class="form-label">Warning Threshold</label>
                  <input type="number" class="form-control" [(ngModel)]="msForm.threshold_warning" step="0.01">
                </div>
                <div class="form-group fg-full">
                  <label class="form-label">Notes</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="msForm.notes" placeholder="Any observations…"></textarea>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" (click)="submitMeasurement()" [disabled]="saving()">
                Record Measurement
              </button>
            }
          </div>

          @if (loadingMeasurements()) {
            @for (i of [1,2,3]; track i) { <div class="skeleton-row" style="height:48px;border-radius:8px;margin-bottom:8px"></div> }
          } @else if (measurements().length) {
            <table class="table">
              <thead>
                <tr><th>PERIOD</th><th>METRIC</th><th>ACTUAL</th><th>TARGET</th><th>{{ lang.t('STATUS') }}</th><th>RECORDED BY</th><th>NOTES</th></tr>
              </thead>
              <tbody>
                @for (m of measurements(); track m.id) {
                  <tr>
                    <td style="font-size:12px">{{ m.period_start | date:'dd MMM' }} – {{ m.period_end | date:'dd MMM yy' }}</td>
                    <td style="font-size:13px">{{ m.metric?.metric_name || '—' }}</td>
                    <td>
                      <span class="font-medium" [style.color]="m.status==='met' ? 'var(--success)' : m.status==='warning' ? 'var(--warning)' : 'var(--danger)'">
                        {{ m.actual_value }}
                      </span>
                    </td>
                    <td style="font-size:13px;color:var(--text2)">{{ m.target_value }}</td>
                    <td>
                      <span class="badge" [class]="m.status==='met' ? 'badge-green' : m.status==='warning' ? 'badge-yellow' : 'badge-red'">
                        {{ m.status | titlecase }}
                      </span>
                    </td>
                    <td style="font-size:12px;color:var(--text2)">{{ m.recorded_by?.name || '—' }}</td>
                    <td style="font-size:12px;color:var(--text3);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ m.notes || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-row">No measurements recorded yet.</div>
          }
        }

      </div><!-- /scroll -->

      <div class="modal-footer" style="border-top:1px solid var(--border);flex-shrink:0">
        <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
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
    .gauges-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
    .gauge-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:box-shadow .15s}
    .gauge-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
    .gauge-wrap{position:relative;width:120px;height:120px;margin:0 auto 12px}
    .gauge-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
    .gauge-pct{font-family:'Inter',sans-serif;font-size:20px;font-weight:800;line-height:1}
    .gauge-pct-big{font-family:'Inter',sans-serif;font-size:28px;font-weight:800;line-height:1}
    .gauge-name{font-size:13px;font-weight:600;margin-bottom:2px}
    .gauge-client{font-size:11px;color:var(--text3);margin-bottom:8px}
    .gauge-times{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .gauge-times span{font-size:11px;color:var(--text2)}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .row-hover{cursor:pointer}.row-hover:hover td{background:rgba(79,70,229,.03)}
    .font-medium{font-weight:600}
    .avail-bar{height:4px;background:var(--border);border-radius:2px;margin-bottom:3px;width:80px}
    .avail-fill{height:100%;border-radius:2px}
    .pagination{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    .empty-row{text-align:center;color:var(--text3);padding:48px 0}
    .modal-lg{max-width:760px}
    .modal-xl{max-width:980px;width:95vw}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .fg-full{grid-column:span 2}
    .form-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
    .mt16{margin-top:16px}.mt8{margin-top:8px}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface)}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .tab-cnt{font-size:10px;padding:1px 5px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .detail-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .detail-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}
    .detail-row span:last-child{font-weight:500}
    .inline-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .metrics-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
    .metric-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}
    .metric-name{font-size:13px;font-weight:600;margin-bottom:8px}
    .metric-target{display:flex;align-items:baseline;gap:4px;margin-top:6px}
  `]
})
export class SlaDashboardComponent implements OnInit, OnDestroy {
  items      = signal<any[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  statsCards = signal<any[]>([]);
  gauges     = signal<any[]>([]);
  clients    = signal<any[]>([]);
  departments= signal<any[]>([]);

  detail             = signal<any>(null);
  measurements       = signal<any[]>([]);
  loadingMeasurements= signal(false);
  dTab = 'overview';
  showMetricForm  = false;
  showMeasureForm = false;

  search = ''; filterStatus = '';
  showForm = false; editId: any = null;
  saving   = signal(false);
  formError= signal('');
  form: any = {};
  mForm: any  = { metric_name:'', target_value:'', unit:'', measurement_frequency:'monthly', threshold_warning:'', threshold_critical:'' };
  msForm: any = { metric_id:'', period_start:'', period_end:'', actual_value:'', target_value:'', threshold_warning:'', notes:'' };

  readonly circumference = 2 * Math.PI * 48;
  readonly circBig       = 2 * Math.PI * 60;

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private api: ApiService, private uiEvents: UiEventService, public lang: LanguageService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.loadDashboard();
    this.api.get('/sla/clients').subscribe({ next: (r: any) => this.clients.set(r || []) });
    this.api.get('/sla/departments').subscribe({ next: (r: any) => this.departments.set(r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.search)       p.search = this.search;
    this.api.get<any>('/sla', p).subscribe({
      next: (r: any) => { this.items.set(r.data||[]); this.total.set(r.total||0); this.totalPages.set(r.last_page||1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }

  loadStats() {
    this.api.get<any>('/sla/stats').subscribe({
      next: (s: any) => {
        this.statsCards.set([
          { label: 'Total SLAs',     value: s.total,          color: 'var(--text1)' },
          { label: 'Active',         value: s.active,         color: '#10b981' },
          { label: 'Avg Compliance', value: s.avg_compliance != null ? s.avg_compliance + '%' : 'N/A', color: '#3b82f6' },
          { label: 'Expiring (30d)', value: s.expiring_soon,  color: '#f59e0b' },
          { label: 'Breached (30d)', value: s.breached_30d,   color: '#ef4444' },
        ]);
      }
    });
  }

  loadDashboard() {
    this.api.get<any>('/sla/dashboard').subscribe({
      next: (r: any) => this.gauges.set(r || [])
    });
  }

  openCreate() {
    this.editId = null;
    this.form = { name:'', description:'', category:'', client_id:'', department_id:'', response_time_hours:'', resolution_time_hours:'', availability_percent:'', effective_from: new Date().toISOString().substring(0,10), effective_to:'', penalty_clause:'', reward_clause:'', status:'draft' };
    this.formError.set(''); this.showForm = true;
  }

  openEdit(s: any) {
    this.editId = s.id;
    this.form = { name: s.name, description: s.description||'', category: s.category||'', client_id: s.client_id||'', department_id: s.department_id||'', response_time_hours: s.response_time_hours||'', resolution_time_hours: s.resolution_time_hours||'', availability_percent: s.availability_percent||'', effective_from: s.effective_from?.substring?.(0,10)||'', effective_to: s.effective_to?.substring?.(0,10)||'', penalty_clause: s.penalty_clause||'', reward_clause: s.reward_clause||'', status: s.status||'draft' };
    this.formError.set(''); this.showForm = true;
  }

  submit() {
    if (!this.form.name?.trim())     { this.formError.set('SLA name is required.'); return; }
    if (!this.form.effective_from)   { this.formError.set('Effective From date is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.form };
    if (!payload.client_id)     delete payload.client_id;
    if (!payload.department_id) delete payload.department_id;
    const req = this.editId
      ? this.api.put(`/sla/${this.editId}`, payload)
      : this.api.post('/sla', payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm = false; this.load(); this.loadStats(); this.loadDashboard(); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors||{}).flat().join(', ') || 'Save failed.'); }
    });
  }

  openDetail(s: any) {
    this.api.get<any>(`/sla/${s.id}`).subscribe({
      next: (r: any) => {
        this.detail.set(r);
        this.dTab = 'overview';
        this.measurements.set([]);
        this.showMetricForm = false;
        this.showMeasureForm = false;
        this.mForm  = { metric_name:'', target_value:'', unit:'', measurement_frequency:'monthly', threshold_warning:'', threshold_critical:'' };
        this.msForm = { metric_id:'', period_start:'', period_end:'', actual_value:'', target_value:'', threshold_warning:'', notes:'' };
      }
    });
  }

  closeDetail() { this.detail.set(null); }

  doActivate() {
    const d = this.detail(); if (!d) return;
    this.api.post(`/sla/${d.id}/activate`, {}).subscribe({ next: (r: any) => { this.detail.set({...d,...r}); this.load(); this.loadStats(); this.loadDashboard(); } });
  }

  doSuspend() {
    const d = this.detail(); if (!d) return;
    this.api.post(`/sla/${d.id}/suspend`, {}).subscribe({ next: (r: any) => { this.detail.set({...d,...r}); this.load(); this.loadStats(); this.loadDashboard(); } });
  }

  submitMetric() {
    const d = this.detail(); if (!d || !this.mForm.metric_name || !this.mForm.target_value) return;
    this.saving.set(true);
    this.api.post(`/sla/${d.id}/metrics`, this.mForm).subscribe({
      next: (m: any) => {
        this.saving.set(false);
        this.detail.update(d => ({ ...d, metrics: [...(d.metrics||[]), m] }));
        this.mForm = { metric_name:'', target_value:'', unit:'', measurement_frequency:'monthly', threshold_warning:'', threshold_critical:'' };
        this.showMetricForm = false;
      }
    });
  }

  loadMeasurements() {
    const d = this.detail(); if (!d || this.measurements().length) return;
    this.loadingMeasurements.set(true);
    this.api.get<any>(`/sla/${d.id}/measurements`).subscribe({
      next: (r: any) => { this.measurements.set(r||[]); this.loadingMeasurements.set(false); },
      error: () => this.loadingMeasurements.set(false)
    });
  }

  submitMeasurement() {
    const d = this.detail(); if (!d || !this.msForm.metric_id || !this.msForm.actual_value) return;
    this.saving.set(true);
    this.api.post(`/sla/${d.id}/measurements`, this.msForm).subscribe({
      next: (m: any) => {
        this.saving.set(false);
        this.measurements.update(ms => [m, ...ms]);
        this.msForm = { metric_id:'', period_start:'', period_end:'', actual_value:'', target_value:'', threshold_warning:'', notes:'' };
        this.showMeasureForm = false;
      }
    });
  }

  gaugeColor(p: number | null): string {
    if (p == null) return 'var(--text3)';
    if (p >= 95) return 'var(--success)';
    if (p >= 80) return '#3b82f6';
    return 'var(--danger)';
  }

  dashOffset(p: number | null): number {
    if (p == null) return this.circumference;
    return this.circumference - (p / 100) * this.circumference;
  }

  dashBig(p: number | null): number {
    if (p == null) return this.circBig;
    return this.circBig - (p / 100) * this.circBig;
  }

  isExpiringSoon(d: string | null): boolean {
    if (!d) return false;
    const days = (new Date(d).getTime() - Date.now()) / 86400000;
    return days > 0 && days <= 30;
  }

  statusClass(s: string): string {
    return { draft: 'badge-draft', active: 'badge-green', expired: 'badge-red', suspended: 'badge-yellow' }[s] || 'badge-draft';
  }

  prevPage() { if (this.page()>1) { this.page.update(p=>p-1); this.load(); } }
  nextPage() { if (this.page()<this.totalPages()) { this.page.update(p=>p+1); this.load(); } }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
