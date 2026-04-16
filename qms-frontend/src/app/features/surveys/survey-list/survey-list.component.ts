import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SurveyService } from '../../../core/services/survey.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- Stats Row -->
<div class="stats-row">
  @for (s of statsCards(); track s.label) {
    <div class="stat-card" [style.border-top]="'3px solid ' + s.color">
      <div class="stat-icon" [style.background]="s.color + '18'" [style.color]="s.color">
        <i [class]="'fas ' + s.icon"></i>
      </div>
      <div>
        <div class="stat-num" [style.color]="s.color">{{ s.value }}</div>
        <div class="stat-lbl">{{ s.label }}</div>
      </div>
    </div>
  }
</div>

<!-- Toolbar -->
<div class="page-toolbar">
  <div class="filter-group">
    <input class="input-sm" [(ngModel)]="search" (input)="onSearch()" [placeholder]="lang.t('Search surveys…')">
    <select class="select-sm" [(ngModel)]="filterStatus" (change)="load()">
      <option value="">{{ lang.t('All Statuses') }}</option>
      <option value="draft">Draft</option>
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="closed">Closed</option>
    </select>
    <select class="select-sm" [(ngModel)]="filterType" (change)="load()">
      <option value="">{{ lang.t('All Types') }}</option>
      <option value="csat">CSAT</option>
      <option value="nps">NPS</option>
      <option value="ces">CES</option>
      <option value="custom">Custom</option>
    </select>
  </div>
  <button class="btn btn-primary btn-sm" (click)="openCreate()">
    <i class="fas fa-plus"></i> New Survey
  </button>
</div>

<!-- Survey Cards Grid -->
@if (loading()) {
  <div class="survey-grid">
    @for (i of [1,2,3,4,5,6]; track i) {
      <div class="survey-card skeleton-card"></div>
    }
  </div>
} @else if (items().length === 0) {
  <div class="empty-state">
    <i class="fas fa-chart-pie"></i>
    <p>No surveys found. Create your first survey to start collecting feedback.</p>
    <button class="btn btn-primary btn-sm" (click)="openCreate()"><i class="fas fa-plus"></i>{{ lang.t('New Survey') }}</button>
  </div>
} @else {
  <div class="survey-grid">
    @for (s of items(); track s.id) {
      <div class="survey-card" (click)="openDetail(s)">
        <div class="survey-card-header">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div class="survey-type-icon" [class]="'type-' + s.type">
              <i [class]="'fas ' + typeIcon(s.type)"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div class="survey-title">{{ s.title }}</div>
              <div class="survey-ref">{{ s.reference_no }}</div>
            </div>
          </div>
          <span class="badge" [class]="statusClass(s.status)">{{ s.status | titlecase }}</span>
        </div>

        @if (s.description) {
          <p class="survey-desc">{{ s.description }}</p>
        }

        <!-- Score display -->
        <div class="survey-metrics">
          @if (s.type === 'nps' && s.nps_score !== null) {
            <div class="metric-chip" [class]="npsColor(s.nps_score)">
              <span class="metric-val">{{ s.nps_score > 0 ? '+' : '' }}{{ s.nps_score }}</span>
              <span class="metric-lbl">NPS</span>
            </div>
          } @else if (s.avg_score !== null) {
            <div class="metric-chip" [class]="scoreColor(s.avg_score, s.type === 'ces' ? 5 : 5)">
              <span class="metric-val">{{ s.avg_score | number:'1.1-1' }}</span>
              <span class="metric-lbl">{{ s.type === 'ces' ? 'Effort' : 'Avg Score' }}</span>
            </div>
          }
          <div class="metric-chip neutral">
            <span class="metric-val">{{ s.response_count || s.responses_count || 0 }}</span>
            <span class="metric-lbl">Responses</span>
          </div>
          @if (s.questions_count !== undefined || s.questions?.length !== undefined) {
            <div class="metric-chip neutral">
              <span class="metric-val">{{ s.questions_count ?? s.questions?.length ?? 0 }}</span>
              <span class="metric-lbl">{{ lang.t('Questions') }}</span>
            </div>
          }
        </div>

        <div class="survey-card-footer">
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text3)">
            <i class="fas fa-tag" style="font-size:10px"></i>
            <span style="text-transform:uppercase;letter-spacing:.4px;font-size:10px;font-weight:600">{{ typeName(s.type) }}</span>
            @if (s.target_type && s.target_type !== 'general') {
              <span>·</span>
              <span style="text-transform:capitalize">{{ s.target_type }}</span>
            }
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            @if (s.close_date) {
              <span style="font-size:11px;color:var(--text3)">
                <i class="fas fa-calendar-xmark" style="font-size:10px"></i>
                {{ s.close_date | date:'dd MMM yy' }}
              </span>
            }
          </div>
        </div>
      </div>
    }
  </div>

  <div class="pagination">
    <span class="page-info">{{ total() }} total · Page {{ page() }} of {{ totalPages() }}</span>
    <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
    <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
  </div>
}

<!-- ========== CREATE MODAL ========== -->
@if (showCreate) {
  <div class="modal-overlay" (click)="showCreate=false">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-chart-pie" style="color:var(--accent)"></i>{{ lang.t('New Survey') }}</div>
        <button class="modal-close" (click)="showCreate=false"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">

        <div class="form-section-title">Survey Details</div>
        <div class="form-grid-3">
          <div class="form-group fg-span2">
            <label class="form-label">Title *</label>
            <input class="form-control" [(ngModel)]="cForm.title" placeholder="e.g. Q2 2024 Client Satisfaction Survey">
          </div>
          <div class="form-group">
            <label class="form-label">Survey Type *</label>
            <select class="form-control" [(ngModel)]="cForm.type" (change)="onTypeChange()">
              <option value="csat">CSAT — Customer Satisfaction</option>
              <option value="nps">NPS — Net Promoter Score</option>
              <option value="ces">CES — Customer Effort Score</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="form-group fg-span3">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="2" [(ngModel)]="cForm.description"
              placeholder="What is this survey measuring and who is it for?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Target Audience</label>
            <select class="form-control" [(ngModel)]="cForm.target_type">
              <option value="general">General</option>
              <option value="client">Client</option>
              <option value="complaint">Post-Complaint</option>
              <option value="visit">Post-Visit</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Send Date</label>
            <input type="date" class="form-control" [(ngModel)]="cForm.send_date">
          </div>
          <div class="form-group">
            <label class="form-label">Close Date</label>
            <input type="date" class="form-control" [(ngModel)]="cForm.close_date">
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <select class="form-control" [(ngModel)]="cForm.department_id">
              <option value="">— All —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Anonymous Responses</label>
            <select class="form-control" [(ngModel)]="cForm.is_anonymous">
              <option [ngValue]="false">No — Identify respondents</option>
              <option [ngValue]="true">Yes — Fully anonymous</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Thank You Message</label>
            <input class="form-control" [(ngModel)]="cForm.thank_you_message" placeholder="Thank you for your feedback!">
          </div>
        </div>

        <div class="form-section-title" style="margin-top:20px">{{ lang.t('Questions') }}</div>
        <p style="font-size:12px;color:var(--text3);margin-bottom:12px">Add questions to collect specific feedback. You can also add questions after creating the survey.</p>

        @for (q of cForm.questions; track qi; let qi = $index) {
          <div class="question-builder-row">
            <div class="q-num">{{ qi + 1 }}</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;gap:8px">
                <input class="form-control" [(ngModel)]="q.question_text" placeholder="Question text…" style="flex:1">
                <select class="form-control" [(ngModel)]="q.question_type" style="max-width:160px">
                  <option value="rating">Rating (1–5)</option>
                  <option value="nps">NPS (0–10)</option>
                  <option value="text">Open Text</option>
                  <option value="choice">Single Choice</option>
                  <option value="checkbox">Multi Choice</option>
                  <option value="yes_no">Yes / No</option>
                </select>
                <select class="form-control" style="max-width:110px" [(ngModel)]="q.is_required">
                  <option [ngValue]="true">Required</option>
                  <option [ngValue]="false">Optional</option>
                </select>
                <button class="btn btn-secondary btn-xs" style="flex-shrink:0" (click)="removeQuestion(qi)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              @if (q.question_type === 'choice' || q.question_type === 'checkbox') {
                <input class="form-control" [(ngModel)]="q.optionsRaw"
                  placeholder="Options separated by commas: e.g. Option A, Option B, Option C"
                  style="font-size:12px">
              }
            </div>
          </div>
        }

        <button class="btn btn-secondary btn-sm" style="margin-top:8px" (click)="addQuestionRow()">
          <i class="fas fa-plus"></i> Add Question
        </button>

        @if (cFormError()) { <div class="alert-error" style="margin-top:12px">{{ cFormError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showCreate=false">Cancel</button>
        <button class="btn btn-secondary" (click)="submitCreate('draft')" [disabled]="cSaving()">Save as Draft</button>
        <button class="btn btn-primary" (click)="submitCreate('active')" [disabled]="cSaving()">
          <i class="fas fa-rocket"></i> {{ cSaving() ? 'Creating…' : 'Create & Activate' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ========== DETAIL MODAL ========== -->
@if (detail()) {
  <div class="modal-overlay" (click)="closeDetail()">
    <div class="modal modal-xl" (click)="$event.stopPropagation()" style="max-height:93vh;overflow:hidden;display:flex;flex-direction:column">

      <!-- Header -->
      <div class="modal-header" style="flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="survey-type-icon sm" [class]="'type-' + detail()!.type">
              <i [class]="'fas ' + typeIcon(detail()!.type)"></i>
            </div>
            <div>
              <div class="modal-title" style="font-size:16px">{{ detail()!.title }}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:2px">
                {{ detail()!.reference_no }} · {{ typeName(detail()!.type) }}
                @if (detail()!.department) { · {{ detail()!.department.name }} }
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          <span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status | titlecase }}</span>

          @if (detail()!.status === 'draft') {
            <button class="btn btn-sm" style="background:#10b981;color:#fff" (click)="doActivate()" [disabled]="actionSaving()">
              <i class="fas fa-rocket"></i> Activate
            </button>
          }
          @if (detail()!.status === 'active') {
            <button class="btn btn-secondary btn-sm" (click)="doPause()" [disabled]="actionSaving()">
              <i class="fas fa-pause"></i> Pause
            </button>
            <button class="btn btn-secondary btn-sm" (click)="doClose()" [disabled]="actionSaving()">
              <i class="fas fa-lock"></i> Close
            </button>
          }
          @if (detail()!.status === 'paused') {
            <button class="btn btn-sm" style="background:#3b82f6;color:#fff" (click)="doActivate()" [disabled]="actionSaving()">
              <i class="fas fa-play"></i> Resume
            </button>
          }
          <button class="modal-close" (click)="closeDetail()"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar" style="flex-shrink:0">
        <button class="tab-btn" [class.active]="dTab==='overview'" (click)="dTab='overview'">
          <i class="fas fa-chart-pie"></i> Overview
        </button>
        <button class="tab-btn" [class.active]="dTab==='questions'" (click)="dTab='questions'">
          <i class="fas fa-list-check"></i> Questions
          <span class="tab-badge">{{ detail()!.questions?.length || 0 }}</span>
        </button>
        <button class="tab-btn" [class.active]="dTab==='analytics'" (click)="switchToAnalytics()">
          <i class="fas fa-chart-bar"></i> Analytics
          @if (detail()!.response_count > 0) { <span class="tab-badge">{{ detail()!.response_count }}</span> }
        </button>
        <button class="tab-btn" [class.active]="dTab==='respond'" (click)="dTab='respond';initResponseForm()">
          <i class="fas fa-pen-to-square"></i> Submit Response
        </button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:20px">

        <!-- TAB: Overview -->
        @if (dTab === 'overview') {
          <div class="overview-grid">
            <!-- Score card -->
            <div class="score-showcase">
              @if (detail()!.type === 'nps' && detail()!.nps_score !== null) {
                <div class="big-score" [class]="npsColor(detail()!.nps_score)">
                  {{ detail()!.nps_score > 0 ? '+' : '' }}{{ detail()!.nps_score }}
                </div>
                <div class="score-label">Net Promoter Score</div>
                <div class="score-sub">Industry avg: +32</div>
                <div class="nps-bar-wrap">
                  <div class="nps-seg det" [style.flex]="npsAnalytics()?.detractors?.pct || 33">
                    <span>Detractors {{ npsAnalytics()?.detractors?.pct || 0 }}%</span>
                  </div>
                  <div class="nps-seg pass" [style.flex]="npsAnalytics()?.passives?.pct || 33">
                    <span>Passives {{ npsAnalytics()?.passives?.pct || 0 }}%</span>
                  </div>
                  <div class="nps-seg prom" [style.flex]="npsAnalytics()?.promoters?.pct || 33">
                    <span>Promoters {{ npsAnalytics()?.promoters?.pct || 0 }}%</span>
                  </div>
                </div>
              } @else if (detail()!.avg_score !== null) {
                <div class="big-score-wrap">
                  <!-- Star-style gauge for CSAT/CES -->
                  <svg viewBox="0 0 120 120" width="120" height="120" style="display:block;margin:0 auto 8px">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
                    <circle cx="60" cy="60" r="52" fill="none"
                      [attr.stroke]="gaugeColor(detail()!.avg_score, 5)"
                      stroke-width="10" stroke-linecap="round"
                      stroke-dasharray="326.7"
                      [attr.stroke-dashoffset]="326.7 - (326.7 * (detail()!.avg_score / 5))"
                      transform="rotate(-90 60 60)"/>
                    <text x="60" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor" style="font-family:'Inter',sans-serif">{{ detail()!.avg_score | number:'1.1-1' }}</text>
                    <text x="60" y="72" text-anchor="middle" font-size="10" fill="var(--text3)">out of 5</text>
                  </svg>
                </div>
                <div class="score-label">{{ detail()!.type === 'ces' ? 'Average Effort Score' : 'Average Satisfaction' }}</div>
                <div class="score-sub">{{ scoreSentiment(detail()!.avg_score) }}</div>
              } @else {
                <div class="big-score" style="color:var(--text3);font-size:32px">—</div>
                <div class="score-label">No responses yet</div>
                <div class="score-sub">Activate the survey to start collecting data</div>
              }
              <div class="resp-count-chip">
                <i class="fas fa-users"></i> {{ detail()!.response_count || 0 }} responses
              </div>
            </div>

            <!-- Info panel -->
            <div style="display:flex;flex-direction:column;gap:12px">
              <div class="info-card">
                <div class="info-card-title">Survey Details</div>
                <div class="detail-row"><span>Status</span><span><span class="badge" [class]="statusClass(detail()!.status)">{{ detail()!.status | titlecase }}</span></span></div>
                <div class="detail-row"><span>Type</span><span>{{ typeName(detail()!.type) }}</span></div>
                <div class="detail-row"><span>Target</span><span style="text-transform:capitalize">{{ detail()!.target_type }}</span></div>
                <div class="detail-row"><span>Anonymous</span><span>{{ detail()!.is_anonymous ? 'Yes' : 'No' }}</span></div>
                <div class="detail-row"><span>Department</span><span>{{ detail()!.department?.name || '—' }}</span></div>
                <div class="detail-row"><span>Created By</span><span>{{ detail()!.created_by?.name || detail()!.createdBy?.name || '—' }}</span></div>
                @if (detail()!.send_date) {
                  <div class="detail-row"><span>Send Date</span><span>{{ detail()!.send_date | date:'dd MMM yyyy' }}</span></div>
                }
                @if (detail()!.close_date) {
                  <div class="detail-row"><span>Close Date</span><span>{{ detail()!.close_date | date:'dd MMM yyyy' }}</span></div>
                }
              </div>

              @if (detail()!.description) {
                <div class="info-card">
                  <div class="info-card-title">Description</div>
                  <p style="font-size:13px;color:var(--text2);margin:0;line-height:1.6">{{ detail()!.description }}</p>
                </div>
              }

              @if (detail()!.thank_you_message) {
                <div class="info-card" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.04)">
                  <div class="info-card-title" style="color:#065f46"><i class="fas fa-heart"></i> Thank You Message</div>
                  <p style="font-size:13px;color:var(--text2);margin:0;font-style:italic">"{{ detail()!.thank_you_message }}"</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB: Questions -->
        @if (dTab === 'questions') {
          <div style="max-width:720px">
            <!-- Existing questions -->
            @if (detail()!.questions?.length) {
              <div class="questions-list">
                @for (q of detail()!.questions; track q.id; let qi = $index) {
                  <div class="question-item">
                    <div class="q-number">{{ qi + 1 }}</div>
                    <div style="flex:1">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                        <div>
                          <div style="font-size:14px;font-weight:600;color:var(--text1);margin-bottom:4px">{{ q.question_text }}</div>
                          <div style="display:flex;gap:8px;flex-wrap:wrap">
                            <span class="q-type-badge" [class]="'qt-' + q.question_type">
                              <i [class]="'fas ' + questionTypeIcon(q.question_type)"></i> {{ questionTypeName(q.question_type) }}
                            </span>
                            @if (q.question_type === 'rating') {
                              <span class="q-type-badge qt-neutral">1–{{ q.rating_max }}</span>
                            }
                            <span class="q-type-badge" [class]="q.is_required ? 'qt-required' : 'qt-neutral'">
                              {{ q.is_required ? 'Required' : 'Optional' }}
                            </span>
                          </div>
                          @if (q.options?.length) {
                            <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
                              @for (opt of q.options; track opt) {
                                <span style="font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;color:var(--text2)">{{ opt }}</span>
                              }
                            </div>
                          }
                        </div>
                        @if (detail()!.status === 'draft') {
                          <button class="btn btn-secondary btn-xs" (click)="deleteQ(q.id)" title="Remove question">
                            <i class="fas fa-trash" style="color:var(--danger)"></i>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state" style="padding:32px 0">
                <i class="fas fa-list-check"></i>
                <p>No questions yet. Add questions below.</p>
              </div>
            }

            <!-- Add question form -->
            @if (detail()!.status !== 'closed') {
              <div class="add-q-form">
                <div class="form-section-title"><i class="fas fa-plus"></i>{{ lang.t('Add Question') }}</div>
                <div style="display:flex;flex-direction:column;gap:8px">
                  <textarea class="form-control" rows="2" [(ngModel)]="newQ.question_text"
                    placeholder="Question text…"></textarea>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <select class="form-control" [(ngModel)]="newQ.question_type" style="flex:1;min-width:150px">
                      <option value="rating">Rating (1–5)</option>
                      <option value="nps">NPS (0–10)</option>
                      <option value="text">Open Text</option>
                      <option value="choice">Single Choice</option>
                      <option value="checkbox">Multi Choice</option>
                      <option value="yes_no">Yes / No</option>
                    </select>
                    @if (newQ.question_type === 'rating') {
                      <select class="form-control" [(ngModel)]="newQ.rating_max" style="max-width:100px">
                        <option [value]="5">Scale 1–5</option>
                        <option [value]="10">Scale 1–10</option>
                      </select>
                    }
                    <select class="form-control" [(ngModel)]="newQ.is_required" style="max-width:120px">
                      <option [ngValue]="true">Required</option>
                      <option [ngValue]="false">Optional</option>
                    </select>
                  </div>
                  @if (newQ.question_type === 'choice' || newQ.question_type === 'checkbox') {
                    <input class="form-control" [(ngModel)]="newQ.optionsRaw"
                      placeholder="Options separated by commas: Option A, Option B, Option C">
                  }
                  <div style="display:flex;justify-content:flex-end">
                    <button class="btn btn-primary btn-sm" (click)="submitNewQ()" [disabled]="!newQ.question_text || qSaving()">
                      <i class="fas fa-plus"></i> {{ qSaving() ? 'Adding…' : 'Add Question' }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- TAB: Analytics -->
        @if (dTab === 'analytics') {
          @if (analyticsLoading()) {
            <div style="display:flex;align-items:center;gap:10px;padding:32px;color:var(--text3)">
              <i class="fas fa-spinner fa-spin"></i> Loading analytics…
            </div>
          } @else if (!analyticsData()) {
            <div class="empty-state">
              <i class="fas fa-chart-bar"></i>
              <p>No responses yet. Share this survey to start collecting data.</p>
            </div>
          } @else {
            <!-- Summary row -->
            <div class="analytics-summary">
              <div class="a-stat">
                <div class="a-stat-num">{{ analyticsData()!.total_responses }}</div>
                <div class="a-stat-lbl">Total Responses</div>
              </div>
              @if (analyticsData()!.avg_score !== null) {
                <div class="a-stat">
                  <div class="a-stat-num" [style.color]="gaugeColor(analyticsData()!.avg_score, 5)">
                    {{ analyticsData()!.avg_score | number:'1.1-1' }}
                  </div>
                  <div class="a-stat-lbl">Avg Score</div>
                </div>
              }
              @if (analyticsData()!.nps_score !== null) {
                <div class="a-stat">
                  <div class="a-stat-num" [style.color]="npsColorVal(analyticsData()!.nps_score)">
                    {{ analyticsData()!.nps_score > 0 ? '+' : '' }}{{ analyticsData()!.nps_score }}
                  </div>
                  <div class="a-stat-lbl">NPS Score</div>
                </div>
              }
              @if (analyticsData()!.nps_breakdown) {
                <div class="a-stat">
                  <div class="a-stat-num" style="color:#10b981">{{ analyticsData()!.nps_breakdown.promoters.count }}</div>
                  <div class="a-stat-lbl">Promoters (9–10)</div>
                </div>
                <div class="a-stat">
                  <div class="a-stat-num" style="color:#f59e0b">{{ analyticsData()!.nps_breakdown.passives.count }}</div>
                  <div class="a-stat-lbl">Passives (7–8)</div>
                </div>
                <div class="a-stat">
                  <div class="a-stat-num" style="color:#ef4444">{{ analyticsData()!.nps_breakdown.detractors.count }}</div>
                  <div class="a-stat-lbl">Detractors (0–6)</div>
                </div>
              }
            </div>

            <!-- Per-question analytics -->
            <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
              @for (qa of analyticsData()!.questions; track qa.question_id) {
                <div class="q-analytics-card">
                  <div class="q-analytics-header">
                    <span class="q-type-badge" [class]="'qt-' + qa.question_type">
                      <i [class]="'fas ' + questionTypeIcon(qa.question_type)"></i>
                    </span>
                    <span style="font-size:14px;font-weight:600">{{ qa.question_text }}</span>
                    <span style="margin-left:auto;font-size:12px;color:var(--text3)">{{ qa.answered }} answered</span>
                  </div>

                  @if (qa.question_type === 'rating' || qa.question_type === 'nps') {
                    <div class="rating-analytics">
                      <div class="avg-score-big" [style.color]="gaugeColor(qa.avg, qa.question_type === 'nps' ? 10 : 5)">
                        {{ qa.avg | number:'1.1-1' }}
                        <span style="font-size:12px;font-weight:400;color:var(--text3)"> / {{ qa.question_type === 'nps' ? 10 : 5 }}</span>
                      </div>
                      <div class="dist-bars">
                        @for (d of qa.distribution; track d.value) {
                          <div class="dist-row">
                            <span class="dist-label">{{ d.value }}</span>
                            <div class="dist-bar-wrap">
                              <div class="dist-bar-fill"
                                [style.width]="qa.answered > 0 ? (d.count / qa.answered * 100) + '%' : '0%'"
                                [style.background]="barColor(d.value, qa.question_type === 'nps' ? 10 : 5)">
                              </div>
                            </div>
                            <span class="dist-count">{{ d.count }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (qa.question_type === 'choice' || qa.question_type === 'checkbox' || qa.question_type === 'yes_no') {
                    <div class="choice-analytics">
                      @for (entry of choiceEntries(qa.choice_counts); track entry.key) {
                        <div class="choice-row">
                          <span class="choice-lbl">{{ entry.key }}</span>
                          <div class="choice-bar-wrap">
                            <div class="choice-bar-fill" [style.width]="qa.answered > 0 ? (entry.val / qa.answered * 100) + '%' : '0%'"></div>
                          </div>
                          <span class="choice-pct">{{ qa.answered > 0 ? (entry.val / qa.answered * 100 | number:'1.0-0') : 0 }}%</span>
                          <span class="choice-cnt">({{ entry.val }})</span>
                        </div>
                      }
                    </div>
                  }

                  @if (qa.question_type === 'text' && qa.responses?.length) {
                    <div class="text-responses">
                      @for (r of qa.responses; track ri; let ri = $index) {
                        <div class="text-resp-item">
                          <i class="fas fa-quote-left" style="color:var(--accent);opacity:.4;font-size:11px;margin-right:6px"></i>
                          {{ r }}
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- TAB: Submit Response -->
        @if (dTab === 'respond') {
          @if (detail()!.status !== 'active') {
            <div class="empty-state">
              <i class="fas fa-lock"></i>
              <p>This survey is {{ detail()!.status }}. Only active surveys accept responses.</p>
            </div>
          } @else {
            <div style="max-width:640px">
              <div class="respond-header">
                <h3 style="font-family:'Inter',sans-serif;font-size:16px;font-weight:700;margin:0 0 6px">{{ detail()!.title }}</h3>
                @if (detail()!.description) {
                  <p style="color:var(--text2);font-size:13px;margin:0">{{ detail()!.description }}</p>
                }
              </div>

              @if (!submitted()) {
                <!-- Respondent info -->
                @if (!detail()!.is_anonymous) {
                  <div class="info-card" style="margin-bottom:16px">
                    <div class="info-card-title">Your Information</div>
                    <div class="form-grid">
                      <div class="form-group">
                        <label class="form-label">Name</label>
                        <input class="form-control" [(ngModel)]="rForm.respondent_name" placeholder="Your name">
                      </div>
                      <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" [(ngModel)]="rForm.respondent_email" placeholder="your@email.com">
                      </div>
                    </div>
                  </div>
                }

                <!-- Questions -->
                <div style="display:flex;flex-direction:column;gap:20px">
                  @for (q of detail()!.questions; track q.id; let qi = $index) {
                    <div class="respond-question">
                      <div class="respond-q-num">Q{{ qi + 1 }}</div>
                      <div style="flex:1">
                        <div style="font-size:14px;font-weight:600;margin-bottom:10px">
                          {{ q.question_text }}
                          @if (q.is_required) { <span style="color:var(--danger);margin-left:2px">*</span> }
                        </div>

                        @if (q.question_type === 'rating') {
                          <div class="star-rating-row">
                            @for (n of range(1, q.rating_max); track n) {
                              <button class="star-btn" [class.active]="rForm.answers[q.id] >= n"
                                (click)="setRating(q.id, n)">
                                <i class="fas fa-star"></i>
                              </button>
                            }
                            @if (rForm.answers[q.id]) {
                              <span class="rating-val-lbl">{{ rForm.answers[q.id] }} / {{ q.rating_max }}</span>
                            }
                          </div>
                        }

                        @if (q.question_type === 'nps') {
                          <div class="nps-scale">
                            @for (n of range(0, 10); track n) {
                              <button class="nps-btn" [class.active]="rForm.answers[q.id] === n"
                                [class]="'nps-btn ' + npsClass(n) + (rForm.answers[q.id] === n ? ' active' : '')"
                                (click)="setRating(q.id, n)">{{ n }}</button>
                            }
                          </div>
                          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px">
                            <span>Not at all likely</span><span>Extremely likely</span>
                          </div>
                        }

                        @if (q.question_type === 'text') {
                          <textarea class="form-control" rows="3" [(ngModel)]="rForm.textAnswers[q.id]"
                            placeholder="Your answer…"></textarea>
                        }

                        @if (q.question_type === 'yes_no') {
                          <div style="display:flex;gap:10px">
                            <button class="yn-btn" [class.yes]="rForm.textAnswers[q.id] === 'Yes'"
                              (click)="rForm.textAnswers[q.id] = 'Yes'">
                              <i class="fas fa-check"></i> Yes
                            </button>
                            <button class="yn-btn" [class.no]="rForm.textAnswers[q.id] === 'No'"
                              (click)="rForm.textAnswers[q.id] = 'No'">
                              <i class="fas fa-times"></i> No
                            </button>
                          </div>
                        }

                        @if (q.question_type === 'choice') {
                          <div class="choice-options">
                            @for (opt of q.options; track opt) {
                              <label class="choice-option" [class.selected]="rForm.textAnswers[q.id] === opt">
                                <input type="radio" [name]="'q'+q.id" [value]="opt"
                                  (change)="rForm.textAnswers[q.id] = opt" style="display:none">
                                <i [class]="rForm.textAnswers[q.id] === opt ? 'fas fa-circle-dot' : 'far fa-circle'"
                                  style="font-size:14px"></i>
                                {{ opt }}
                              </label>
                            }
                          </div>
                        }

                        @if (q.question_type === 'checkbox') {
                          <div class="choice-options">
                            @for (opt of q.options; track opt) {
                              <label class="choice-option" [class.selected]="isChecked(q.id, opt)">
                                <input type="checkbox" [checked]="isChecked(q.id, opt)"
                                  (change)="toggleCheck(q.id, opt)" style="display:none">
                                <i [class]="isChecked(q.id, opt) ? 'fas fa-square-check' : 'far fa-square'"
                                  style="font-size:14px"></i>
                                {{ opt }}
                              </label>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (rFormError()) { <div class="alert-error" style="margin-top:16px">{{ rFormError() }}</div> }
                <div style="display:flex;justify-content:flex-end;margin-top:20px">
                  <button class="btn btn-primary" (click)="submitResponse()" [disabled]="rSaving()">
                    <i class="fas fa-paper-plane"></i> {{ rSaving() ? 'Submitting…' : 'Submit Response' }}
                  </button>
                </div>

              } @else {
                <!-- Thank you screen -->
                <div class="thankyou-screen">
                  <div class="thankyou-icon"><i class="fas fa-check-circle"></i></div>
                  <h3>{{ lang.t('Thank You!') }}</h3>
                  <p>{{ detail()!.thank_you_message || 'Your response has been submitted successfully.' }}</p>
                  <button class="btn btn-secondary btn-sm" (click)="resetResponse()">Submit Another Response</button>
                </div>
              }
            </div>
          }
        }

      </div><!-- /scroll -->
    </div>
  </div>
}
  `,
  styles: [`
    /* Layout */
    .stats-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;flex:1;min-width:130px;display:flex;align-items:center;gap:12px;transition:box-shadow .15s}
    .stat-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.06)}
    .stat-icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;font-size:15px;flex-shrink:0}
    .stat-num{font-family:'Inter',sans-serif;font-size:26px;font-weight:800;line-height:1}
    .stat-lbl{font-size:11px;color:var(--text2);margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
    .page-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .filter-group{display:flex;gap:8px;flex-wrap:wrap}
    .input-sm{height:32px;border-radius:6px;border:1px solid var(--border);padding:0 10px;font-size:13px;background:var(--surface);color:var(--text1);min-width:180px}
    .pagination{display:flex;align-items:center;gap:8px;margin-top:16px}
    .page-info{font-size:12px;color:var(--text2);margin-right:auto}
    /* Survey Cards Grid */
    .survey-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-bottom:12px}
    .skeleton-card{height:200px;border-radius:12px;background:var(--surface);border:1px solid var(--border);animation:pulse 1.4s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .survey-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;display:flex;flex-direction:column;gap:10px;transition:all .15s}
    .survey-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateY(-1px);border-color:var(--accent)}
    .survey-card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
    .survey-title{font-weight:700;font-size:14px;color:var(--text1);line-height:1.3;font-family:'Inter',sans-serif}
    .survey-ref{font-size:11px;color:var(--text3);font-family:monospace;margin-top:2px}
    .survey-desc{font-size:12px;color:var(--text2);margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .survey-type-icon{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;font-size:14px;flex-shrink:0}
    .survey-type-icon.sm{width:30px;height:30px;font-size:12px}
    .type-csat{background:rgba(79,70,229,.12);color:var(--accent)}
    .type-nps{background:rgba(16,185,129,.12);color:#059669}
    .type-ces{background:rgba(245,158,11,.12);color:#d97706}
    .type-custom{background:rgba(139,92,246,.12);color:#7c3aed}
    .survey-metrics{display:flex;gap:8px;flex-wrap:wrap}
    .metric-chip{display:flex;flex-direction:column;align-items:center;padding:6px 12px;border-radius:8px;border:1px solid var(--border);min-width:60px}
    .metric-chip.nps-good{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.25)}
    .metric-chip.nps-ok{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.25)}
    .metric-chip.nps-bad{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25)}
    .metric-chip.score-good{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.25)}
    .metric-chip.score-ok{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.25)}
    .metric-chip.score-bad{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25)}
    .metric-chip.neutral{background:var(--surface2)}
    .metric-val{font-family:'Inter',sans-serif;font-size:18px;font-weight:800;line-height:1}
    .metric-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
    .survey-card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--border)}
    /* Empty */
    .empty-state{text-align:center;padding:60px 20px;color:var(--text3)}
    .empty-state i{font-size:48px;margin-bottom:16px;opacity:.3;display:block}
    .empty-state p{font-size:14px;margin:0 0 16px}
    /* Modal */
    .modal-lg{max-width:760px}.modal-xl{max-width:980px;width:95vw}
    .tab-bar{display:flex;border-bottom:2px solid var(--border);padding:0 20px;background:var(--surface)}
    .tab-btn{padding:10px 16px;border:none;background:none;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .15s}
    .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
    .tab-badge{background:rgba(79,70,229,.12);color:var(--accent);border-radius:10px;padding:1px 6px;font-size:10px}
    /* Overview */
    .overview-grid{display:grid;grid-template-columns:240px 1fr;gap:20px}
    .score-showcase{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
    .big-score{font-family:'Inter',sans-serif;font-size:56px;font-weight:900;line-height:1}
    .score-label{font-size:13px;font-weight:600;color:var(--text2)}
    .score-sub{font-size:12px;color:var(--text3)}
    .resp-count-chip{margin-top:8px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:4px 14px;font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px}
    .nps-bar-wrap{width:100%;display:flex;height:28px;border-radius:6px;overflow:hidden;margin-top:8px;font-size:10px}
    .nps-seg{display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:10px;overflow:hidden;white-space:nowrap;padding:0 4px}
    .nps-seg.det{background:#ef4444}
    .nps-seg.pass{background:#f59e0b}
    .nps-seg.prom{background:#10b981}
    .info-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px}
    .info-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:13px}
    .detail-row span:first-child{color:var(--text2)}.detail-row span:last-child{font-weight:500}
    /* Form */
    .form-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
    .form-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .fg-span2{grid-column:span 2}
    .fg-span3{grid-column:span 3}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .alert-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--danger);padding:10px 14px;border-radius:8px;font-size:13px}
    /* Question builder */
    .question-builder-row{display:flex;gap:10px;align-items:flex-start;padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px}
    .q-num{width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:8px}
    /* Questions list */
    .questions-list{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
    .question-item{display:flex;gap:12px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:10px}
    .q-number{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#8b5cf6);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0}
    .q-type-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
    .qt-rating{background:rgba(79,70,229,.1);color:var(--accent)}
    .qt-nps{background:rgba(16,185,129,.1);color:#059669}
    .qt-text{background:rgba(107,114,128,.1);color:#475569}
    .qt-choice{background:rgba(245,158,11,.1);color:#d97706}
    .qt-checkbox{background:rgba(139,92,246,.1);color:#7c3aed}
    .qt-yes_no{background:rgba(59,130,246,.1);color:#2563eb}
    .qt-required{background:rgba(239,68,68,.1);color:#dc2626}
    .qt-neutral{background:var(--surface2);color:var(--text2)}
    .add-q-form{padding:16px;background:rgba(79,70,229,.04);border:1px dashed var(--accent);border-radius:10px;margin-top:8px}
    /* Analytics */
    .analytics-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin-bottom:4px}
    .a-stat{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center}
    .a-stat-num{font-family:'Inter',sans-serif;font-size:28px;font-weight:800;line-height:1}
    .a-stat-lbl{font-size:11px;color:var(--text3);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
    .q-analytics-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}
    .q-analytics-header{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .rating-analytics{display:flex;gap:24px;align-items:flex-start}
    .avg-score-big{font-family:'Inter',sans-serif;font-size:36px;font-weight:800;line-height:1;flex-shrink:0}
    .dist-bars{flex:1;display:flex;flex-direction:column;gap:5px}
    .dist-row{display:flex;align-items:center;gap:8px}
    .dist-label{width:20px;text-align:right;font-size:12px;font-weight:600;color:var(--text2);flex-shrink:0}
    .dist-bar-wrap{flex:1;height:20px;background:var(--surface2);border-radius:4px;overflow:hidden}
    .dist-bar-fill{height:100%;border-radius:4px;transition:width .4s ease;min-width:2px}
    .dist-count{width:28px;text-align:right;font-size:12px;color:var(--text3);flex-shrink:0}
    .choice-analytics{display:flex;flex-direction:column;gap:8px}
    .choice-row{display:flex;align-items:center;gap:10px}
    .choice-lbl{min-width:140px;font-size:13px;color:var(--text2)}
    .choice-bar-wrap{flex:1;height:22px;background:var(--surface2);border-radius:5px;overflow:hidden}
    .choice-bar-fill{height:100%;background:var(--accent);border-radius:5px;transition:width .4s;opacity:.7}
    .choice-pct{width:36px;text-align:right;font-size:12px;font-weight:600;color:var(--accent)}
    .choice-cnt{font-size:11px;color:var(--text3)}
    .text-responses{display:flex;flex-direction:column;gap:6px}
    .text-resp-item{font-size:13px;color:var(--text2);padding:8px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid var(--accent);line-height:1.5}
    /* Response form */
    .respond-header{background:linear-gradient(135deg,rgba(79,70,229,.08),rgba(139,92,246,.06));border:1px solid rgba(79,70,229,.15);border-radius:10px;padding:16px;margin-bottom:20px}
    .respond-question{display:flex;gap:14px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px}
    .respond-q-num{width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px;flex-shrink:0}
    .star-rating-row{display:flex;align-items:center;gap:4px}
    .star-btn{background:none;border:none;cursor:pointer;padding:3px;font-size:22px;color:var(--border);transition:color .1s}
    .star-btn.active{color:#f59e0b}
    .star-btn:hover{color:#f59e0b;transform:scale(1.1)}
    .rating-val-lbl{margin-left:8px;font-size:13px;color:var(--text2);font-weight:600}
    .nps-scale{display:flex;gap:4px;flex-wrap:wrap}
    .nps-btn{width:38px;height:38px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-weight:700;font-size:13px;transition:all .15s}
    .nps-btn:hover{border-color:var(--accent);background:rgba(79,70,229,.08)}
    .nps-btn.active.nps-det{background:#ef4444;border-color:#ef4444;color:#fff}
    .nps-btn.active.nps-pass{background:#f59e0b;border-color:#f59e0b;color:#fff}
    .nps-btn.active.nps-prom{background:#10b981;border-color:#10b981;color:#fff}
    .yn-btn{padding:8px 24px;border-radius:8px;border:2px solid var(--border);background:var(--surface);cursor:pointer;font-weight:700;font-size:14px;transition:all .15s}
    .yn-btn.yes{background:#10b981;border-color:#10b981;color:#fff}
    .yn-btn.no{background:#ef4444;border-color:#ef4444;color:#fff}
    .choice-options{display:flex;flex-direction:column;gap:6px}
    .choice-option{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;transition:all .15s;color:var(--text2)}
    .choice-option:hover{border-color:var(--accent);background:rgba(79,70,229,.04)}
    .choice-option.selected{border-color:var(--accent);background:rgba(79,70,229,.08);color:var(--accent);font-weight:500}
    .thankyou-screen{text-align:center;padding:40px 20px}
    .thankyou-icon{font-size:56px;color:#10b981;margin-bottom:16px}
    .thankyou-screen h3{font-family:'Inter',sans-serif;font-size:22px;font-weight:800;margin:0 0 10px}
    .thankyou-screen p{color:var(--text2);font-size:14px;margin:0 0 20px}
  `]
})
export class SurveyListComponent implements OnInit, OnDestroy {
  items      = signal<any[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  statsCards = signal<any[]>([]);
  departments= signal<any[]>([]);

  search = ''; filterStatus = ''; filterType = '';

  // Create
  showCreate = false;
  cSaving    = signal(false);
  cFormError = signal('');
  cForm: any = {};

  // Detail
  detail           = signal<any>(null);
  dTab             = 'overview';
  analyticsData    = signal<any>(null);
  analyticsLoading = signal(false);
  actionSaving     = signal(false);

  // Questions tab
  newQ: any = { question_text: '', question_type: 'rating', rating_max: 5, is_required: true, optionsRaw: '' };
  qSaving  = signal(false);

  // Respond tab
  rForm: any = {};
  rSaving    = signal(false);
  rFormError = signal('');
  submitted  = signal(false);

  private destroy$ = new Subject<void>();
  private searchTimer: any;

  constructor(private svc: SurveyService, private uiEvents: UiEventService, public lang: LanguageService) {}

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openCreate());
    this.load();
    this.loadStats();
    this.svc.departments().subscribe({ next: (r: any) => this.departments.set(r?.data || r || []) });
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page() };
    if (this.filterStatus) p.status = this.filterStatus;
    if (this.filterType)   p.type   = this.filterType;
    if (this.search)       p.search = this.search;
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

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }

  loadStats() {
    this.svc.stats().subscribe({
      next: (r: any) => {
        const s = r?.data || r;
        const avgScore = s.avg_score ? parseFloat(s.avg_score).toFixed(1) : '—';
        const avgNps   = s.avg_nps   ? (parseFloat(s.avg_nps) > 0 ? '+' : '') + parseFloat(s.avg_nps).toFixed(0) : '—';
        this.statsCards.set([
          { label: 'Total Surveys',    value: s.total           || 0,      color: 'var(--text1)',  icon: 'fa-chart-pie' },
          { label: 'Active',           value: s.active          || 0,      color: '#10b981',       icon: 'fa-circle-play' },
          { label: 'Total Responses',  value: s.total_responses || 0,      color: '#3b82f6',       icon: 'fa-users' },
          { label: 'Avg CSAT Score',   value: avgScore,                    color: '#f59e0b',       icon: 'fa-star' },
          { label: 'Avg NPS',          value: avgNps,                      color: '#8b5cf6',       icon: 'fa-thumbs-up' },
        ]);
      }
    });
  }

  openCreate() {
    this.cForm = {
      title: '', type: 'csat', description: '', target_type: 'general',
      department_id: '', send_date: this.today(), close_date: '',
      thank_you_message: 'Thank you for your valuable feedback!',
      is_anonymous: false, questions: []
    };
    this.cFormError.set('');
    this.showCreate = true;
    this.onTypeChange();
  }

  onTypeChange() {
    if (this.cForm.type === 'nps' && this.cForm.questions.length === 0) {
      this.cForm.questions = [{
        question_text: 'How likely are you to recommend us to a friend or colleague? (0 = Not at all likely, 10 = Extremely likely)',
        question_type: 'nps', rating_max: 10, is_required: true, optionsRaw: ''
      }, {
        question_text: 'What is the primary reason for your score?',
        question_type: 'text', rating_max: 5, is_required: false, optionsRaw: ''
      }];
    } else if (this.cForm.type === 'csat' && this.cForm.questions.length === 0) {
      this.cForm.questions = [{
        question_text: 'Overall, how satisfied are you with our service?',
        question_type: 'rating', rating_max: 5, is_required: true, optionsRaw: ''
      }];
    } else if (this.cForm.type === 'ces' && this.cForm.questions.length === 0) {
      this.cForm.questions = [{
        question_text: 'How easy was it to interact with us today?',
        question_type: 'rating', rating_max: 5, is_required: true, optionsRaw: ''
      }];
    }
  }

  addQuestionRow() {
    this.cForm.questions.push({ question_text: '', question_type: 'rating', rating_max: 5, is_required: true, optionsRaw: '' });
  }
  removeQuestion(i: number) { this.cForm.questions.splice(i, 1); }

  submitCreate(action: 'draft' | 'active') {
    if (!this.cForm.title?.trim()) { this.cFormError.set('Title is required.'); return; }
    this.cSaving.set(true); this.cFormError.set('');
    const payload: any = { ...this.cForm };
    if (!payload.department_id) delete payload.department_id;
    payload.questions = payload.questions
      .filter((q: any) => q.question_text?.trim())
      .map((q: any) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        rating_max: q.rating_max || (q.question_type === 'nps' ? 10 : 5),
        is_required: q.is_required,
        options: q.optionsRaw ? q.optionsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : null
      }));
    this.svc.create(payload).subscribe({
      next: (r: any) => {
        const created = r?.data || r;
        if (action === 'active') {
          this.svc.activate(created.id).subscribe({
            next: () => { this.cSaving.set(false); this.showCreate = false; this.load(); this.loadStats(); }
          });
        } else {
          this.cSaving.set(false); this.showCreate = false; this.load(); this.loadStats();
        }
      },
      error: (e: any) => {
        this.cSaving.set(false);
        this.cFormError.set(e?.error?.message || Object.values(e?.error?.errors || {}).flat().join(', ') || 'Failed to create.');
      }
    });
  }

  openDetail(s: any) {
    this.svc.get(s.id).subscribe({
      next: (r: any) => {
        this.detail.set(r?.data || r);
        this.dTab = 'overview';
        this.analyticsData.set(null);
        this.submitted.set(false);
        this.resetNewQ();
        if (this.detail()!.response_count > 0) this.loadAnalytics();
      }
    });
  }

  closeDetail() { this.detail.set(null); }

  private reloadDetail() {
    const d = this.detail(); if (!d) return;
    this.svc.get(d.id).subscribe({ next: (r: any) => this.detail.set(r?.data || r) });
  }

  doActivate() {
    const d = this.detail(); if (!d) return;
    this.actionSaving.set(true);
    this.svc.activate(d.id).subscribe({
      next: () => { this.actionSaving.set(false); this.reloadDetail(); this.load(); this.loadStats(); }
    });
  }

  doPause() {
    const d = this.detail(); if (!d) return;
    this.actionSaving.set(true);
    this.svc.pause(d.id).subscribe({
      next: () => { this.actionSaving.set(false); this.reloadDetail(); this.load(); }
    });
  }

  doClose() {
    const d = this.detail(); if (!d) return;
    
    this.actionSaving.set(true);
    this.svc.close(d.id).subscribe({
      next: () => { this.actionSaving.set(false); this.reloadDetail(); this.load(); this.loadStats(); }
    });
  }

  // Questions
  resetNewQ() {
    this.newQ = { question_text: '', question_type: 'rating', rating_max: 5, is_required: true, optionsRaw: '' };
  }

  submitNewQ() {
    if (!this.newQ.question_text?.trim()) return;
    const d = this.detail(); if (!d) return;
    this.qSaving.set(true);
    const payload: any = {
      question_text: this.newQ.question_text,
      question_type: this.newQ.question_type,
      rating_max: this.newQ.rating_max || (this.newQ.question_type === 'nps' ? 10 : 5),
      is_required: this.newQ.is_required,
      options: this.newQ.optionsRaw ? this.newQ.optionsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
    };
    this.svc.addQuestion(d.id, payload).subscribe({
      next: () => { this.qSaving.set(false); this.resetNewQ(); this.reloadDetail(); }
    });
  }

  deleteQ(qid: number) {
    const d = this.detail(); if (!d) return;
    
    this.svc.deleteQuestion(d.id, qid).subscribe({ next: () => this.reloadDetail() });
  }

  // Analytics
  switchToAnalytics() {
    this.dTab = 'analytics';
    if (!this.analyticsData() && !this.analyticsLoading()) this.loadAnalytics();
  }

  loadAnalytics() {
    const d = this.detail(); if (!d) return;
    this.analyticsLoading.set(true);
    this.svc.analytics(d.id).subscribe({
      next: (r: any) => { this.analyticsData.set(r?.data || r); this.analyticsLoading.set(false); },
      error: () => this.analyticsLoading.set(false)
    });
  }

  npsAnalytics() {
    return this.analyticsData()?.nps_breakdown || null;
  }

  // Response form
  initResponseForm() {
    const d = this.detail(); if (!d) return;
    this.rForm = { respondent_name: '', respondent_email: '', answers: {}, textAnswers: {}, checkboxAnswers: {} };
    this.rFormError.set('');
  }

  setRating(qid: number, val: number) { this.rForm.answers[qid] = val; }

  isChecked(qid: number, opt: string): boolean {
    return (this.rForm.checkboxAnswers[qid] || []).includes(opt);
  }

  toggleCheck(qid: number, opt: string) {
    const arr: string[] = this.rForm.checkboxAnswers[qid] || [];
    const idx = arr.indexOf(opt);
    if (idx === -1) arr.push(opt); else arr.splice(idx, 1);
    this.rForm.checkboxAnswers[qid] = [...arr];
  }

  submitResponse() {
    const d = this.detail(); if (!d) return;
    this.rFormError.set('');

    const answers: any[] = d.questions.map((q: any) => {
      const ans: any = { question_id: q.id };
      if (['rating','nps'].includes(q.question_type)) {
        ans.answer_rating = this.rForm.answers[q.id] ?? null;
        if (q.is_required && ans.answer_rating === null) {
          this.rFormError.set(`Please answer: "${q.question_text}"`);
          throw new Error('validation');
        }
      } else if (q.question_type === 'checkbox') {
        ans.answer_choices = this.rForm.checkboxAnswers[q.id] || [];
        ans.answer_text = ans.answer_choices.join(', ');
      } else {
        ans.answer_text = this.rForm.textAnswers[q.id] || null;
        if (q.is_required && !ans.answer_text) {
          this.rFormError.set(`Please answer: "${q.question_text}"`);
          throw new Error('validation');
        }
      }
      return ans;
    });

    if (this.rFormError()) return;
    this.rSaving.set(true);

    const payload: any = {
      answers,
      respondent_type: d.is_anonymous ? 'anonymous' : 'staff',
    };
    if (!d.is_anonymous) {
      payload.respondent_name  = this.rForm.respondent_name || null;
      payload.respondent_email = this.rForm.respondent_email || null;
    }

    this.svc.submitResponse(d.id, payload).subscribe({
      next: () => {
        this.rSaving.set(false);
        this.submitted.set(true);
        this.reloadDetail();
        this.loadStats();
        this.load();
        this.analyticsData.set(null);
      },
      error: (e: any) => {
        this.rSaving.set(false);
        this.rFormError.set(e?.error?.message || 'Failed to submit.');
      }
    });
  }

  resetResponse() {
    this.submitted.set(false);
    this.initResponseForm();
  }

  // Helpers
  today(): string { return new Date().toISOString().split('T')[0]; }
  range(start: number, end: number): number[] { return Array.from({ length: end - start + 1 }, (_, i) => start + i); }
  choiceEntries(obj: any): { key: string; val: number }[] {
    if (!obj) return [];
    return Object.entries(obj).map(([key, val]) => ({ key, val: val as number })).sort((a, b) => b.val - a.val);
  }

  typeIcon(t: string): string {
    return { csat: 'fa-face-smile', nps: 'fa-thumbs-up', ces: 'fa-bolt', custom: 'fa-sliders' }[t] || 'fa-chart-pie';
  }
  typeName(t: string): string {
    return { csat: 'CSAT', nps: 'NPS', ces: 'CES', custom: 'Custom' }[t] || t?.toUpperCase();
  }
  statusClass(s: string): string {
    return { draft: 'badge-draft', active: 'badge-green', paused: 'badge-yellow', closed: 'badge-draft' }[s] || 'badge-draft';
  }
  npsColor(score: number): string {
    if (score >= 50) return 'nps-good';
    if (score >= 0)  return 'nps-ok';
    return 'nps-bad';
  }
  npsColorVal(score: number): string {
    if (score >= 50) return '#10b981';
    if (score >= 0)  return '#f59e0b';
    return '#ef4444';
  }
  scoreColor(score: number, max: number): string {
    const pct = score / max;
    if (pct >= 0.8) return 'score-good';
    if (pct >= 0.6) return 'score-ok';
    return 'score-bad';
  }
  scoreSentiment(score: number): string {
    if (score >= 4.5) return '😊 Excellent — Clients love your service';
    if (score >= 4.0) return '🙂 Good — Above expectations';
    if (score >= 3.5) return '😐 Satisfactory — Room for improvement';
    if (score >= 3.0) return '🙁 Needs improvement';
    return '😞 Critical — Action required';
  }
  gaugeColor(score: number, max: number): string {
    const p = score / max;
    if (p >= 0.8) return '#10b981';
    if (p >= 0.6) return '#f59e0b';
    return '#ef4444';
  }
  barColor(val: number, max: number): string {
    const p = val / max;
    if (p >= 0.8) return '#10b981';
    if (p >= 0.5) return '#f59e0b';
    return '#ef4444';
  }
  npsClass(n: number): string {
    if (n >= 9) return 'nps-prom';
    if (n >= 7) return 'nps-pass';
    return 'nps-det';
  }
  questionTypeIcon(t: string): string {
    return { rating: 'fa-star', nps: 'fa-thumbs-up', text: 'fa-align-left', choice: 'fa-circle-dot', checkbox: 'fa-check-square', yes_no: 'fa-toggle-on' }[t] || 'fa-question';
  }
  questionTypeName(t: string): string {
    return { rating: 'Rating', nps: 'NPS', text: 'Open Text', choice: 'Single Choice', checkbox: 'Multi Choice', yes_no: 'Yes / No' }[t] || t;
  }

  prevPage() { if (this.page()>1) { this.page.update(p=>p-1); this.load(); } }
  nextPage() { if (this.page()<this.totalPages()) { this.page.update(p=>p+1); this.load(); } }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
