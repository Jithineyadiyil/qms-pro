import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RiskService } from '../../../core/services/risk.service';

@Component({
  selector: 'app-risk-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule, RouterModule],
  template: `
@if (loading()) {
  <div class="loading-wrap"><div class="spinner"></div></div>
}
@if (!loading() && risk()) {
<div class="rd-shell">

  <!-- Back -->
  <a routerLink="/risk" class="back-link"><i class="fas fa-arrow-left"></i> Risk Register</a>

  <!-- Header card -->
  <div class="header-card" [class]="hdrCls()">
    <div class="hdr-left">
      <div class="hdr-ref">{{ risk()?.reference_no }}</div>
      <div class="hdr-title">{{ risk()?.title }}</div>
      <div class="hdr-meta">
        @if (risk()?.category) { <span class="meta-tag"><i class="fas fa-tag"></i> {{ risk()?.category?.name }}</span> }
        @if (risk()?.type) { <span class="meta-tag"><i class="fas fa-shapes"></i> {{ risk()?.type | titlecase }}</span> }
        @if (risk()?.department) { <span class="meta-tag"><i class="fas fa-sitemap"></i> {{ risk()?.department?.name }}</span> }
        @if (risk()?.owner) { <span class="meta-tag"><i class="fas fa-user"></i> {{ risk()?.owner?.name }}</span> }
      </div>
      <p class="hdr-desc">{{ risk()?.description }}</p>
    </div>
    <div class="hdr-right">
      <div class="score-ring" [class]="rCls(risk()?.risk_level)">
        <div class="sr-score">{{ risk()?.likelihood * risk()?.impact }}</div>
        <div class="sr-label">RISK SCORE</div>
        <div class="sr-level">{{ risk()?.risk_level | uppercase }}</div>
      </div>
      <div class="hdr-badges">
        <span class="badge" [class]="stCls(risk()?.status)">{{ fmtStatus(risk()?.status) }}</span>
        @if (isOverdue()) { <span class="badge badge-red"><i class="fas fa-clock"></i> Review Overdue</span> }
      </div>
      <div class="hdr-actions">
        <button class="btn btn-secondary btn-sm" (click)="openEdit()"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn btn-sm" [class]="assessBtnCls()" (click)="openAssess()"><i class="fas fa-chart-line"></i> Assess</button>
      </div>
    </div>
  </div>

  <!-- Main grid -->
  <div class="detail-grid">

    <!-- LEFT: info + treatment + residual -->
    <div class="left-col">

      <!-- Score cards -->
      <div class="card score-row">
        <div class="sc-item">
          <div class="sc-label">Inherent Risk</div>
          <div class="sc-lxi">L {{ risk()?.likelihood }} × I {{ risk()?.impact }}</div>
          <div class="sc-score" [class]="rCls(risk()?.risk_level)">{{ risk()?.likelihood * risk()?.impact }}</div>
          <div><span class="badge sm-badge" [class]="rCls(risk()?.risk_level)">{{ risk()?.risk_level }}</span></div>
        </div>
        @if (risk()?.residual_likelihood && risk()?.residual_impact) {
          <div class="sc-divider"></div>
          <div class="sc-item">
            <div class="sc-label">Residual Risk</div>
            <div class="sc-lxi">L {{ risk()?.residual_likelihood }} × I {{ risk()?.residual_impact }}</div>
            <div class="sc-score" [class]="rCls(residualLevel())">{{ risk()?.residual_likelihood * risk()?.residual_impact }}</div>
            <div><span class="badge sm-badge" [class]="rCls(residualLevel())">{{ residualLevel() }}</span></div>
          </div>
          <div class="sc-divider"></div>
          <div class="sc-item">
            <div class="sc-label">Risk Reduction</div>
            <div class="sc-score" [style.color]="reductionPct()>0?'var(--success)':'var(--danger)'">
              {{ reductionPct() > 0 ? ('↓ '+reductionPct()+'%') : '—' }}
            </div>
            <div class="sc-label" style="margin-top:4px">from controls</div>
          </div>
        }
        <div class="sc-divider"></div>
        <div class="sc-item">
          <div class="sc-label">Next Review</div>
          <div class="sc-score" style="font-size:16px" [class.overdue]="isOverdue()">
            {{ risk()?.next_review_date | date:'dd MMM yy' }}
          </div>
          @if (isOverdue()) { <div class="overdue-badge">Overdue!</div> }
        </div>
      </div>

      <!-- Treatment -->
      <div class="card">
        <div class="sec-title"><i class="fas fa-shield-halved"></i> Treatment</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-lbl">Strategy</div>
            <div class="info-val strategy-pill" [class]="'strat-'+risk()?.treatment_strategy">
              {{ (risk()?.treatment_strategy || '—') | titlecase }}
            </div>
          </div>
          <div class="info-item" style="grid-column:span 2">
            <div class="info-lbl">Treatment Plan</div>
            <div class="info-val" style="white-space:pre-wrap">{{ risk()?.treatment_plan || '—' }}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Review Date</div>
            <div class="info-val">{{ risk()?.review_date | date:'dd MMM yyyy' }}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Next Review</div>
            <div class="info-val" [class.overdue]="isOverdue()">{{ risk()?.next_review_date | date:'dd MMM yyyy' }}</div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="card">
        <div class="sec-hdr">
          <div class="sec-title"><i class="fas fa-lock"></i> Controls <span class="count-badge">{{ risk()?.controls?.length || 0 }}</span></div>
          <button class="btn btn-secondary btn-xs" (click)="openAddControl()"><i class="fas fa-plus"></i> Add Control</button>
        </div>
        @if (!risk()?.controls?.length) {
          <div class="empty-sec"><i class="fas fa-lock-open"></i> No controls defined yet</div>
        }
        @for (c of risk()?.controls||[]; track c.id) {
          <div class="ctrl-item">
            <div class="ctrl-top">
              <span class="ctrl-type" [class]="'ct-'+c.control_type">{{ c.control_type }}</span>
              <span class="eff-badge" [class]="'eff-'+c.effectiveness">{{ (c.effectiveness||'not_tested') | titlecase }}</span>
              <button class="icon-del" (click)="deleteControl(c)"><i class="fas fa-trash"></i></button>
            </div>
            <div class="ctrl-desc">{{ c.control_description }}</div>
            @if (c.owner) { <div class="ctrl-meta"><i class="fas fa-user"></i> {{ c.owner.name }}</div> }
            @if (c.last_tested_date || c.next_test_date) {
              <div class="ctrl-meta">
                @if (c.last_tested_date) { <span><i class="fas fa-history"></i> Last: {{ c.last_tested_date | date:'dd MMM yy' }}</span> }
                @if (c.next_test_date)   { <span><i class="fas fa-calendar"></i> Next: {{ c.next_test_date | date:'dd MMM yy' }}</span> }
              </div>
            }
          </div>
        }
      </div>

    </div><!-- /left-col -->

    <!-- RIGHT: reviews -->
    <div class="right-col">
      <div class="card">
        <div class="sec-hdr">
          <div class="sec-title"><i class="fas fa-magnifying-glass-chart"></i> Reviews <span class="count-badge">{{ risk()?.reviews?.length || 0 }}</span></div>
          <button class="btn btn-secondary btn-xs" (click)="openAddReview()"><i class="fas fa-plus"></i> Add Review</button>
        </div>
        @if (!risk()?.reviews?.length) {
          <div class="empty-sec"><i class="fas fa-clipboard-list"></i> No reviews recorded yet</div>
        }
        @for (r of risk()?.reviews||[]; track r.id; let first = $first) {
          <div class="review-item" [class.review-latest]="first">
            @if (first) { <div class="latest-tag">Latest</div> }
            <div class="rev-hdr">
              <div class="rev-date">{{ r.review_date | date:'dd MMM yyyy' }}</div>
              @if (r.reviewed_by) { <div class="rev-by"><i class="fas fa-user"></i> {{ r.reviewedBy?.name }}</div> }
            </div>
            @if (r.likelihood_reviewed || r.impact_reviewed) {
              <div class="rev-scores">
                @if (r.likelihood_reviewed) { <span class="rev-sc">L: {{ r.likelihood_reviewed }}</span> }
                @if (r.impact_reviewed)     { <span class="rev-sc">I: {{ r.impact_reviewed }}</span> }
                @if (r.likelihood_reviewed && r.impact_reviewed) {
                  <span class="rev-sc" [class]="rCls(rLevel(r.likelihood_reviewed, r.impact_reviewed))">
                    Score: {{ r.likelihood_reviewed * r.impact_reviewed }}
                  </span>
                }
              </div>
            }
            @if (r.status_after) { <span class="badge sm-badge" [class]="stCls(r.status_after)">→ {{ fmtStatus(r.status_after) }}</span> }
            @if (r.comments) { <p class="rev-comments">{{ r.comments }}</p> }
          </div>
        }
      </div>
    </div>

  </div><!-- /detail-grid -->
</div>
}

<!-- ═══ EDIT MODAL ═══ -->
@if (showEdit()) {
  <div class="overlay" (click)="showEdit.set(false)">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-pen"></i> Edit Risk</div>
        <button class="modal-close" (click)="showEdit.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg fg-2"><label class="lbl">Title *</label><input class="fc" [(ngModel)]="editForm.title"></div>
          <div class="fg fg-2"><label class="lbl">Description *</label><textarea class="fc" [(ngModel)]="editForm.description" rows="2"></textarea></div>
          <div class="fg"><label class="lbl">Type</label>
            <select class="fc" [(ngModel)]="editForm.type">
              <option value="operational">Operational</option><option value="strategic">Strategic</option>
              <option value="financial">Financial</option><option value="compliance">Compliance</option>
              <option value="technology">Technology</option><option value="reputational">Reputational</option>
            </select>
          </div>
          <div class="fg"><label class="lbl">Status</label>
            <select class="fc" [(ngModel)]="editForm.status">
              <option value="identified">Identified</option><option value="assessed">Assessed</option>
              <option value="treatment_in_progress">Treatment In Progress</option>
              <option value="monitored">Monitored</option><option value="accepted">Accepted</option><option value="closed">Closed</option>
            </select>
          </div>
          <div class="fg"><label class="lbl">Treatment Strategy</label>
            <select class="fc" [(ngModel)]="editForm.treatment_strategy">
              <option value="">— Select —</option>
              <option value="mitigate">Mitigate</option><option value="avoid">Avoid</option>
              <option value="transfer">Transfer</option><option value="accept">Accept</option>
            </select>
          </div>
          <div class="fg"><label class="lbl">Next Review Date</label><input type="date" class="fc" [(ngModel)]="editForm.next_review_date"></div>
          <div class="fg fg-2"><label class="lbl">Treatment Plan</label><textarea class="fc" [(ngModel)]="editForm.treatment_plan" rows="2"></textarea></div>
        </div>
        @if (editError()) { <div class="form-err">{{ editError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showEdit.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="saveEdit()" [disabled]="saving()">{{ saving()?'Saving…':'Update' }}</button>
      </div>
    </div>
  </div>
}

<!-- ═══ ASSESS MODAL ═══ -->
@if (showAssess()) {
  <div class="overlay" (click)="showAssess.set(false)">
    <div class="modal modal-md" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-chart-line"></i> Risk Assessment</div>
        <button class="modal-close" (click)="showAssess.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="assess-grid">
          <div>
            <div class="sec-title" style="margin-bottom:8px">Inherent Risk</div>
            <div class="score-row-sm">
              <div><label class="lbl">Likelihood</label>
                <div class="score-btns">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button class="sb" [class.sb-active]="assessForm.likelihood===n" (click)="assessForm.likelihood=n">{{ n }}</button>
                  }
                </div>
              </div>
              <div><label class="lbl">Impact</label>
                <div class="score-btns">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button class="sb" [class.sb-active]="assessForm.impact===n" (click)="assessForm.impact=n">{{ n }}</button>
                  }
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="sec-title" style="margin-bottom:8px">Residual Risk (after controls)</div>
            <div class="score-row-sm">
              <div><label class="lbl">Residual Likelihood</label>
                <div class="score-btns">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button class="sb" [class.sb-active]="assessForm.residual_likelihood===n" (click)="assessForm.residual_likelihood=n">{{ n }}</button>
                  }
                </div>
              </div>
              <div><label class="lbl">Residual Impact</label>
                <div class="score-btns">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button class="sb" [class.sb-active]="assessForm.residual_impact===n" (click)="assessForm.residual_impact=n">{{ n }}</button>
                  }
                </div>
              </div>
            </div>
          </div>
          <div class="assess-preview">
            <div class="ap-item" [class]="hCls(assessForm.likelihood, assessForm.impact)">
              <div class="ap-score">{{ assessForm.likelihood * assessForm.impact }}</div>
              <div class="ap-lbl">Inherent</div>
            </div>
            <i class="fas fa-arrow-right" style="color:var(--text3)"></i>
            <div class="ap-item" [class]="hCls(assessForm.residual_likelihood, assessForm.residual_impact)">
              <div class="ap-score">{{ assessForm.residual_likelihood * assessForm.residual_impact }}</div>
              <div class="ap-lbl">Residual</div>
            </div>
          </div>
          <div><label class="lbl">Status After Assessment</label>
            <select class="fc" [(ngModel)]="assessForm.status">
              <option value="assessed">Assessed</option><option value="treatment_in_progress">Treatment In Progress</option>
              <option value="monitored">Monitored</option><option value="accepted">Accepted</option>
            </select>
          </div>
          <div><label class="lbl">Next Review Date</label><input type="date" class="fc" [(ngModel)]="assessForm.next_review_date"></div>
        </div>
        @if (assessError()) { <div class="form-err">{{ assessError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showAssess.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="saveAssess()" [disabled]="saving()">{{ saving()?'Saving…':'Save Assessment' }}</button>
      </div>
    </div>
  </div>
}

<!-- ═══ ADD CONTROL MODAL ═══ -->
@if (showControl()) {
  <div class="overlay" (click)="showControl.set(false)">
    <div class="modal modal-md" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-lock"></i> Add Control</div>
        <button class="modal-close" (click)="showControl.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg fg-2"><label class="lbl">Control Description *</label>
            <textarea class="fc" [(ngModel)]="controlForm.control_description" rows="3" placeholder="Describe the control…"></textarea>
          </div>
          <div class="fg"><label class="lbl">Control Type *</label>
            <select class="fc" [(ngModel)]="controlForm.control_type">
              <option value="preventive">Preventive — prevents risk event</option>
              <option value="detective">Detective — detects if it occurs</option>
              <option value="corrective">Corrective — reduces impact after</option>
            </select>
          </div>
          <div class="fg"><label class="lbl">Effectiveness</label>
            <select class="fc" [(ngModel)]="controlForm.effectiveness">
              <option value="not_tested">Not Tested</option>
              <option value="effective">Effective</option>
              <option value="partially_effective">Partially Effective</option>
              <option value="ineffective">Ineffective</option>
            </select>
          </div>
          <div class="fg"><label class="lbl">Last Tested</label><input type="date" class="fc" [(ngModel)]="controlForm.last_tested_date"></div>
          <div class="fg"><label class="lbl">Next Test Date</label><input type="date" class="fc" [(ngModel)]="controlForm.next_test_date"></div>
        </div>
        @if (controlError()) { <div class="form-err">{{ controlError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showControl.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="saveControl()" [disabled]="saving()">{{ saving()?'Saving…':'Add Control' }}</button>
      </div>
    </div>
  </div>
}

<!-- ═══ ADD REVIEW MODAL ═══ -->
@if (showReview()) {
  <div class="overlay" (click)="showReview.set(false)">
    <div class="modal modal-md" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-magnifying-glass-chart"></i> Add Review</div>
        <button class="modal-close" (click)="showReview.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg"><label class="lbl">Review Date *</label><input type="date" class="fc" [(ngModel)]="reviewForm.review_date"></div>
          <div class="fg"><label class="lbl">Next Review Date</label><input type="date" class="fc" [(ngModel)]="reviewForm.next_review_date"></div>
          <div class="fg"><label class="lbl">Reviewed Likelihood</label>
            <div class="score-btns" style="margin-top:6px">
              <button class="sb sb-sm" [class.sb-active]="reviewForm.likelihood_reviewed===0" (click)="reviewForm.likelihood_reviewed=0">—</button>
              @for (n of [1,2,3,4,5]; track n) {
                <button class="sb sb-sm" [class.sb-active]="reviewForm.likelihood_reviewed===n" (click)="reviewForm.likelihood_reviewed=n">{{ n }}</button>
              }
            </div>
          </div>
          <div class="fg"><label class="lbl">Reviewed Impact</label>
            <div class="score-btns" style="margin-top:6px">
              <button class="sb sb-sm" [class.sb-active]="reviewForm.impact_reviewed===0" (click)="reviewForm.impact_reviewed=0">—</button>
              @for (n of [1,2,3,4,5]; track n) {
                <button class="sb sb-sm" [class.sb-active]="reviewForm.impact_reviewed===n" (click)="reviewForm.impact_reviewed=n">{{ n }}</button>
              }
            </div>
          </div>
          <div class="fg"><label class="lbl">Status After</label>
            <select class="fc" [(ngModel)]="reviewForm.status_after">
              <option value="">— Unchanged —</option>
              <option value="identified">Identified</option><option value="assessed">Assessed</option>
              <option value="treatment_in_progress">Treatment In Progress</option>
              <option value="monitored">Monitored</option><option value="accepted">Accepted</option><option value="closed">Closed</option>
            </select>
          </div>
          <div class="fg fg-2"><label class="lbl">Comments</label>
            <textarea class="fc" [(ngModel)]="reviewForm.comments" rows="3" placeholder="Review findings…"></textarea>
          </div>
        </div>
        @if (reviewError()) { <div class="form-err">{{ reviewError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showReview.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="saveReview()" [disabled]="saving()">{{ saving()?'Saving…':'Save Review' }}</button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    :host { display:block; }
    .loading-wrap { display:grid; place-items:center; height:300px; }
    .spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    .rd-shell { display:flex; flex-direction:column; gap:14px; }
    .back-link { display:inline-flex; align-items:center; gap:7px; color:var(--text2); font-size:12px; font-weight:600; text-decoration:none; padding:5px 0; transition:color .13s; }
    .back-link:hover { color:var(--accent); }

    /* Header card */
    .header-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:22px 24px; display:flex; align-items:flex-start; gap:20px; flex-wrap:wrap; border-left:4px solid var(--border); }
    .hdr-crit { border-left-color:var(--danger); }
    .hdr-high { border-left-color:#fb923c; }
    .hdr-med  { border-left-color:var(--warning); }
    .hdr-low  { border-left-color:var(--success); }
    .hdr-left { flex:1; min-width:250px; }
    .hdr-ref  { font-family:monospace; font-size:11px; color:var(--accent); background:rgba(59,130,246,.08); display:inline-block; padding:2px 7px; border-radius:4px; margin-bottom:6px; }
    .hdr-title { font-family:'Inter',sans-serif; font-size:20px; font-weight:800; line-height:1.2; margin-bottom:8px; }
    .hdr-meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
    .meta-tag { font-size:11px; color:var(--text2); display:flex; align-items:center; gap:4px; background:var(--surface2); border:1px solid var(--border); padding:2px 8px; border-radius:5px; }
    .hdr-desc { font-size:13px; color:var(--text2); line-height:1.55; }
    .hdr-right { display:flex; flex-direction:column; align-items:flex-end; gap:10px; }
    .score-ring { width:110px; height:110px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; border:6px solid currentColor; }
    .score-ring.h-crit { color:var(--danger); }
    .score-ring.h-high { color:#fb923c; }
    .score-ring.h-med  { color:var(--warning); }
    .score-ring.h-low  { color:var(--success); }
    .sr-score { font-family:'Inter',sans-serif; font-size:30px; font-weight:800; line-height:1; }
    .sr-label { font-size:8px; color:var(--text3); letter-spacing:.5px; }
    .sr-level { font-size:10px; font-weight:800; margin-top:1px; }
    .hdr-badges { display:flex; gap:5px; flex-wrap:wrap; }
    .hdr-actions { display:flex; gap:6px; }
    .overdue { color:var(--danger) !important; font-weight:700; }
    .overdue-badge { font-size:10px; font-weight:700; color:var(--danger); background:rgba(239,68,68,.1); border-radius:4px; padding:1px 5px; }

    /* Detail grid */
    .detail-grid { display:grid; grid-template-columns:3fr 2fr; gap:14px; align-items:start; }
    @media(max-width:900px) { .detail-grid { grid-template-columns:1fr; } }
    .left-col,.right-col { display:flex; flex-direction:column; gap:14px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px 18px; }
    .sec-title { font-family:'Inter',sans-serif; font-size:13px; font-weight:800; display:flex; align-items:center; gap:7px; margin-bottom:12px; }
    .sec-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .sec-hdr .sec-title { margin-bottom:0; }
    .count-badge { background:var(--surface2); border:1px solid var(--border); border-radius:5px; padding:1px 6px; font-size:10px; color:var(--text2); font-family:'Inter',sans-serif; font-weight:700; }

    /* Score row */
    .score-row { display:flex; align-items:center; gap:0; padding:12px 16px; }
    .sc-item { flex:1; text-align:center; padding:8px 12px; }
    .sc-divider { width:1px; height:60px; background:var(--border); flex-shrink:0; }
    .sc-label { font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px; }
    .sc-lxi   { font-size:11px; color:var(--text2); margin-bottom:3px; }
    .sc-score { font-family:'Inter',sans-serif; font-size:26px; font-weight:800; }
    .sc-score.h-crit { color:var(--danger); } .sc-score.h-high { color:#fb923c; } .sc-score.h-med { color:var(--warning); } .sc-score.h-low { color:var(--success); }
    .sm-badge { font-size:10px; padding:1px 7px; }

    /* Info grid */
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .info-item { display:flex; flex-direction:column; gap:3px; }
    .info-lbl  { font-size:10px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.4px; }
    .info-val  { font-size:13px; color:var(--text); }
    .strategy-pill { display:inline-block; font-weight:700; font-size:12px; padding:2px 9px; border-radius:6px; text-transform:capitalize; }
    .strat-mitigate { background:rgba(59,130,246,.1); color:var(--accent); }
    .strat-avoid    { background:rgba(239,68,68,.1);  color:var(--danger); }
    .strat-transfer { background:rgba(99,102,241,.1); color:var(--accent2); }
    .strat-accept   { background:rgba(16,185,129,.1); color:var(--success); }

    /* Controls */
    .ctrl-item { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:11px 13px; margin-bottom:8px; }
    .ctrl-item:last-child { margin-bottom:0; }
    .ctrl-top  { display:flex; align-items:center; gap:7px; margin-bottom:6px; }
    .ctrl-type { font-size:10px; font-weight:700; padding:2px 7px; border-radius:5px; text-transform:capitalize; }
    .ct-preventive { background:rgba(59,130,246,.1); color:var(--accent); }
    .ct-detective  { background:rgba(99,102,241,.1); color:var(--accent2); }
    .ct-corrective { background:rgba(16,185,129,.1); color:var(--success); }
    .eff-badge { font-size:10px; padding:2px 6px; border-radius:5px; text-transform:capitalize; margin-left:auto; }
    .eff-effective         { background:rgba(16,185,129,.1); color:var(--success); }
    .eff-partially_effective { background:rgba(245,158,11,.1); color:var(--warning); }
    .eff-ineffective       { background:rgba(239,68,68,.1);  color:var(--danger); }
    .eff-not_tested        { background:var(--surface); color:var(--text3); }
    .ctrl-desc { font-size:13px; color:var(--text); line-height:1.45; }
    .ctrl-meta { font-size:11px; color:var(--text2); margin-top:5px; display:flex; gap:12px; }
    .icon-del  { width:24px; height:24px; background:none; border:none; color:var(--text3); cursor:pointer; font-size:11px; border-radius:4px; display:grid; place-items:center; transition:all .13s; }
    .icon-del:hover { background:rgba(239,68,68,.1); color:var(--danger); }
    .empty-sec { text-align:center; color:var(--text3); padding:20px; font-size:12px; display:flex; flex-direction:column; align-items:center; gap:5px; }
    .empty-sec i { font-size:22px; }

    /* Reviews */
    .review-item  { border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin-bottom:8px; position:relative; }
    .review-item:last-child { margin-bottom:0; }
    .review-latest { border-color:rgba(59,130,246,.3); background:rgba(59,130,246,.03); }
    .latest-tag { position:absolute; top:-8px; left:14px; background:var(--accent); color:#fff; font-size:9px; font-weight:800; padding:1px 7px; border-radius:4px; letter-spacing:.4px; }
    .rev-hdr  { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
    .rev-date { font-family:'Inter',sans-serif; font-size:13px; font-weight:700; }
    .rev-by   { font-size:11px; color:var(--text2); display:flex; align-items:center; gap:4px; }
    .rev-scores { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:6px; }
    .rev-sc   { font-size:11px; font-weight:700; background:var(--surface2); border:1px solid var(--border); padding:2px 7px; border-radius:5px; }
    .rev-comments { font-size:12px; color:var(--text2); line-height:1.45; margin-top:6px; }

    /* Modals */
    .overlay  { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(3px); display:grid; place-items:center; z-index:1000; padding:16px; }
    .modal    { background:var(--surface); border:1px solid var(--border); border-radius:16px; width:100%; overflow:hidden; display:flex; flex-direction:column; max-height:90vh; }
    .modal-lg { max-width:640px; } .modal-md { max-width:560px; }
    .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
    .modal-title  { font-family:'Inter',sans-serif; font-size:15px; font-weight:800; display:flex; align-items:center; gap:8px; }
    .modal-close  { width:30px; height:30px; border:1px solid var(--border); border-radius:7px; background:none; color:var(--text2); cursor:pointer; font-size:12px; }
    .modal-body   { padding:20px; overflow-y:auto; flex:1; }
    .modal-footer { padding:14px 20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:8px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .fg    { display:flex; flex-direction:column; gap:4px; }
    .fg-2  { grid-column:span 2; }
    .lbl   { font-size:11px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:.4px; }
    .fc    { background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:13px; font-family:'Inter',sans-serif; padding:9px 12px; outline:none; width:100%; transition:border-color .13s; }
    .fc:focus { border-color:var(--accent); }
    select.fc option { background:var(--surface); }
    .form-err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:var(--danger); padding:10px 14px; border-radius:8px; font-size:12px; margin-top:10px; }
    .score-btns { display:flex; gap:5px; margin-top:4px; }
    .sb { width:34px; height:34px; border:1px solid var(--border); border-radius:8px; background:none; color:var(--text2); font-size:13px; font-family:'Inter',sans-serif; font-weight:800; cursor:pointer; transition:all .13s; }
    .sb-sm { width:28px; height:28px; font-size:11px; }
    .sb:hover { background:var(--border); }
    .sb.sb-active { background:var(--accent); border-color:var(--accent); color:#fff; }
    .assess-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .score-row-sm { display:flex; flex-direction:column; gap:12px; }
    .assess-preview { grid-column:span 2; display:flex; align-items:center; justify-content:center; gap:16px; padding:12px; background:var(--surface2); border-radius:10px; border:1px solid var(--border); }
    .ap-item { display:flex; flex-direction:column; align-items:center; width:70px; height:70px; border-radius:12px; justify-content:center; }
    .ap-score { font-family:'Inter',sans-serif; font-size:24px; font-weight:800; }
    .ap-lbl   { font-size:9px; opacity:.7; }
    .h-low  { background:rgba(16,185,129,.2); color:#10b981; }
    .h-med  { background:rgba(245,158,11,.25); color:#f59e0b; }
    .h-high { background:rgba(249,115,22,.3);  color:#fb923c; }
    .h-crit { background:rgba(239,68,68,.35);  color:#ef4444; }
  `]
})
export class RiskDetailComponent implements OnInit {
  risk     = signal<any>(null);
  loading  = signal(true);
  saving   = signal(false);
  showEdit    = signal(false);
  showAssess  = signal(false);
  showControl = signal(false);
  showReview  = signal(false);
  editError    = signal('');
  assessError  = signal('');
  controlError = signal('');
  reviewError  = signal('');

  editForm: any = {};
  assessForm: any = {};
  controlForm: any = { control_description:'', control_type:'preventive', effectiveness:'not_tested', last_tested_date:'', next_test_date:'' };
  reviewForm: any = { review_date:'', next_review_date:'', likelihood_reviewed:0, impact_reviewed:0, status_after:'', comments:'' };

  constructor(private route: ActivatedRoute, private router: Router, private svc: RiskService, private auth: AuthService) {}


  private slug = () => (this.auth.currentUser() as any)?.role?.slug ?? '';
  canEdit   = () => ['super_admin','qa_manager','quality_supervisor'].includes(this.slug());
  canDelete = () => ['super_admin','qa_manager'].includes(this.slug());

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.get(id).subscribe({
      next: d => { this.risk.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/risk']); }
    });
  }

  reload() {
    this.svc.get(this.risk()!.id).subscribe(d => this.risk.set(d));
  }

  /* Edit */
  openEdit() {
    const r = this.risk()!;
    this.editForm = { title:r.title, description:r.description, type:r.type, status:r.status,
      treatment_strategy:r.treatment_strategy||'', treatment_plan:r.treatment_plan||'', next_review_date:r.next_review_date||'' };
    this.editError.set(''); this.showEdit.set(true);
  }
  saveEdit() {
    if (!this.editForm.title) { this.editError.set('Title required.'); return; }
    this.saving.set(true);
    this.svc.update(this.risk()!.id, this.editForm).subscribe({
      next: d => { this.risk.set(d); this.saving.set(false); this.showEdit.set(false); },
      error: e => { this.saving.set(false); this.editError.set(e?.error?.message||'Failed.'); }
    });
  }

  /* Assess */
  openAssess() {
    const r = this.risk()!;
    this.assessForm = { likelihood:r.likelihood, impact:r.impact,
      residual_likelihood:r.residual_likelihood||r.likelihood, residual_impact:r.residual_impact||r.impact,
      status:r.status, next_review_date:r.next_review_date||'' };
    this.assessError.set(''); this.showAssess.set(true);
  }
  saveAssess() {
    this.saving.set(true);
    this.svc.assess(this.risk()!.id, this.assessForm).subscribe({
      next: d => { this.risk.set(d); this.reload(); this.saving.set(false); this.showAssess.set(false); },
      error: e => { this.saving.set(false); this.assessError.set(e?.error?.message||'Failed.'); }
    });
  }

  /* Control */
  openAddControl() { this.controlForm={control_description:'',control_type:'preventive',effectiveness:'not_tested',last_tested_date:'',next_test_date:''}; this.controlError.set(''); this.showControl.set(true); }
  saveControl() {
    if (!this.controlForm.control_description) { this.controlError.set('Description required.'); return; }
    this.saving.set(true);
    this.svc.addControl(this.risk()!.id, this.controlForm).subscribe({
      next: () => { this.reload(); this.saving.set(false); this.showControl.set(false); },
      error: e => { this.saving.set(false); this.controlError.set(e?.error?.message||'Failed.'); }
    });
  }
  deleteControl(c: any) {
    
    this.svc.deleteControl(this.risk()!.id, c.id).subscribe({ next: () => this.reload() });
  }

  /* Review */
  openAddReview() {
    this.reviewForm = { review_date:new Date().toISOString().slice(0,10), next_review_date:'', likelihood_reviewed:0, impact_reviewed:0, status_after:'', comments:'' };
    this.reviewError.set(''); this.showReview.set(true);
  }
  saveReview() {
    if (!this.reviewForm.review_date) { this.reviewError.set('Review date required.'); return; }
    this.saving.set(true);
    const payload: any = { ...this.reviewForm };
    if (!payload.likelihood_reviewed) delete payload.likelihood_reviewed;
    if (!payload.impact_reviewed) delete payload.impact_reviewed;
    this.svc.addReview(this.risk()!.id, payload).subscribe({
      next: () => { this.reload(); this.saving.set(false); this.showReview.set(false); },
      error: e => { this.saving.set(false); this.reviewError.set(e?.error?.message||'Failed.'); }
    });
  }

  /* Helpers */
  hCls(L: number, I: number): string { const s=L*I; return s>=17?'h-crit':s>=10?'h-high':s>=5?'h-med':'h-low'; }
  rLevel(L: number, I: number): string { const s=L*I; return s>=17?'critical':s>=10?'high':s>=5?'medium':'low'; }
  rCls(l: string): string { return ({critical:'h-crit',high:'h-high',medium:'h-med',low:'h-low'} as any)[l]||'h-low'; }
  stCls(s: string): string {
    return ({identified:'badge-blue',assessed:'badge-purple',treatment_in_progress:'badge-yellow',
             monitored:'badge-green',closed:'badge-draft',accepted:'badge-amber'} as any)[s]||'badge-draft';
  }
  hdrCls(): string { return ({critical:'hdr-crit',high:'hdr-high',medium:'hdr-med',low:'hdr-low'} as any)[this.risk()?.risk_level]||''; }
  assessBtnCls(): string { return this.risk()?.status==='identified' ? 'btn-primary' : 'btn-secondary'; }
  isOverdue(): boolean {
    const d = this.risk()?.next_review_date;
    return !!d && this.risk()?.status !== 'closed' && new Date(d) < new Date();
  }
  residualLevel(): string { return this.rLevel(this.risk()?.residual_likelihood, this.risk()?.residual_impact); }
  reductionPct(): number {
    const r = this.risk();
    if (!r?.residual_likelihood || !r?.residual_impact) return 0;
    const inherent = r.likelihood * r.impact;
    const residual = r.residual_likelihood * r.residual_impact;
    return Math.round((inherent - residual) / inherent * 100);
  }

  fmtStatus(s: string): string { return s ? s.replace(/_/g,' ') : ''; }
}
