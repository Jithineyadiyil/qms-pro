import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RiskService } from '../../../core/services/risk.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-risk-register',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule],
  template: `
<div class="rsk-shell">

  <!-- ═══ STATS BAR ═══ -->
  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-val">{{ stats()?.total ?? '—' }}</div>
      <div class="stat-lbl">Total Risks</div>
    </div>
    <div class="stat-div"></div>
    <div class="stat-item">
      <div class="stat-val crit">{{ statByLevel('critical') }}</div>
      <div class="stat-lbl">Critical</div>
    </div>
    <div class="stat-item">
      <div class="stat-val high">{{ statByLevel('high') }}</div>
      <div class="stat-lbl">High</div>
    </div>
    <div class="stat-item">
      <div class="stat-val med">{{ statByLevel('medium') }}</div>
      <div class="stat-lbl">Medium</div>
    </div>
    <div class="stat-item">
      <div class="stat-val low">{{ statByLevel('low') }}</div>
      <div class="stat-lbl">Low</div>
    </div>
    <div class="stat-div"></div>
    <div class="stat-item">
      <div class="stat-val warn">{{ stats()?.overdue_reviews ?? '0' }}</div>
      <div class="stat-lbl">Overdue Reviews</div>
    </div>
    <button class="btn btn-primary btn-sm" style="margin-left:auto" (click)="openForm()">
      <i class="fas fa-plus"></i> New Risk
    </button>
  </div>

  <!-- ═══ HEAT MAP ═══ -->
  <div class="card heat-card">
    <div class="heat-header">
      <div class="card-title"><i class="fas fa-fire-flame-curved" style="color:var(--danger)"></i> Risk Heat Matrix</div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="heat-legend">
          <span class="hl hl-l">Low ≤4</span>
          <span class="hl hl-m">Medium 5–9</span>
          <span class="hl hl-h">High 10–16</span>
          <span class="hl hl-c">Critical 17–25</span>
        </div>
        @if (activeCell) {
          <button class="btn btn-secondary btn-xs" (click)="clearCell()"><i class="fas fa-times"></i> Clear Filter</button>
        }
      </div>
    </div>
    <div class="heat-body">
      <div class="heat-y-label">Likelihood ↑</div>
      <div class="heat-grid">
        @for (L of [5,4,3,2,1]; track L) {
          <div class="heat-row-lbl">{{ L }}</div>
          @for (I of [1,2,3,4,5]; track I) {
            <div class="heat-cell" [class]="hCls(L,I)" (click)="filterByCell(L,I)"
                 [class.heat-active]="activeCell===L+','+I"
                 [title]="matrixTooltip(L,I)">
              @if (matrixCount(L,I)) {
                <span class="hc-n">{{ matrixCount(L,I) }}</span>
              }
              <span class="hc-s">{{ L*I }}</span>
            </div>
          }
        }
        <div></div>
        @for (lbl of ['Very Low','Low','Medium','High','Very High']; track lbl) {
          <div class="heat-col-lbl">{{ lbl }}</div>
        }
        <div></div>
        <div class="heat-x-label" style="grid-column:span 5;text-align:center">Impact →</div>
      </div>

      <!-- Cell drill-down panel -->
      @if (activeCell && cellRisks().length) {
        <div class="cell-panel">
          <div class="cell-panel-title">
            L{{ activeCellL }} × I{{ activeCellI }} — Score {{ activeCellL * activeCellI }}
            <span class="badge sm-badge" [class]="hCls(activeCellL, activeCellI)">{{ riskLevel(activeCellL, activeCellI) }}</span>
          </div>
          @for (r of cellRisks(); track r.id) {
            <div class="cell-risk-row" (click)="goDetail(r.id)">
              <span class="ref-sm">{{ r.reference_no }}</span>
              <span class="cell-title">{{ r.title }}</span>
              <span class="badge sm-badge" [class]="stCls(r.status)">{{ r.status }}</span>
            </div>
          }
        </div>
      }
    </div>
  </div>

  <!-- ═══ FILTERS + TABLE ═══ -->
  <div class="card">
    <div class="tbl-toolbar">
      <div class="filter-row">
        <div class="search-box">
          <i class="fas fa-magnifying-glass"></i>
          <input [(ngModel)]="search" (input)="onSearch()" placeholder="Search reference or title…">
          @if (search) {
            <button (click)="search='';resetPage()"><i class="fas fa-times"></i></button>
          }
        </div>
        <select class="sel" [(ngModel)]="filterLevel" (change)="resetPage()">
          <option value="">All Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select class="sel" [(ngModel)]="filterStatus" (change)="resetPage()">
          <option value="">All Statuses</option>
          <option value="identified">Identified</option>
          <option value="assessed">Assessed</option>
          <option value="treatment_in_progress">Treatment In Progress</option>
          <option value="monitored">Monitored</option>
          <option value="closed">Closed</option>
          <option value="accepted">Accepted</option>
        </select>
        <select class="sel" [(ngModel)]="filterType" (change)="resetPage()">
          <option value="">All Types</option>
          <option value="operational">Operational</option>
          <option value="strategic">Strategic</option>
          <option value="financial">Financial</option>
          <option value="compliance">Compliance</option>
          <option value="technology">Technology</option>
          <option value="reputational">Reputational</option>
        </select>
        @if (filterLevel || filterStatus || filterType || activeCell) {
          <button class="btn btn-secondary btn-xs" (click)="clearFilters()">
            <i class="fas fa-filter-slash"></i> Clear
          </button>
        }
      </div>
      <span class="total-badge">{{ total() }} risks</span>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>REF</th>
          <th>TITLE</th>
          <th>TYPE</th>
          <th>CATEGORY</th>
          <th style="text-align:center">L</th>
          <th style="text-align:center">I</th>
          <th style="text-align:center">SCORE</th>
          <th>LEVEL</th>
          <th>TREATMENT</th>
          <th>STATUS</th>
          <th>OWNER</th>
          <th>NEXT REVIEW</th>
          <th></th>
        </tr></thead>
        <tbody>
          @if (loading()) {
            @for (i of [1,2,3,4,5,6,7]; track i) {
              <tr><td colspan="13"><div class="sk-row"></div></td></tr>
            }
          }
          @for (r of items(); track r.id) {
            <tr class="tbl-row" (click)="goDetail(r.id)">
              <td><span class="ref-code">{{ r.reference_no }}</span></td>
              <td class="td-title" [title]="r.title">{{ r.title }}</td>
              <td><span class="type-tag">{{ r.type }}</span></td>
              <td class="sm">{{ r.category?.name || '—' }}</td>
              <td class="tc fw7">{{ r.likelihood }}</td>
              <td class="tc fw7">{{ r.impact }}</td>
              <td class="tc">
                <span class="score-pill" [class]="hCls(r.likelihood, r.impact)">{{ r.likelihood * r.impact }}</span>
              </td>
              <td><span class="badge" [class]="lvlCls(r.risk_level)">{{ r.risk_level }}</span></td>
              <td class="sm">{{ (r.treatment_strategy || '—') | titlecase }}</td>
              <td><span class="badge" [class]="stCls(r.status)">{{ r.status?.replace('_',' ') }}</span></td>
              <td>
                @if (r.owner) {
                  <div class="ava" [title]="r.owner.name">{{ r.owner.name?.charAt(0) }}</div>
                }
              </td>
              <td class="sm" [class.overdue]="isOverdue(r.next_review_date, r.status)">
                {{ r.next_review_date | date:'dd MMM yy' }}
              </td>
              <td (click)="$event.stopPropagation()">
                <div class="row-actions">
                  <button class="ra-btn" title="View Detail" (click)="goDetail(r.id)"><i class="fas fa-arrow-up-right-from-square"></i></button>
                  <button class="ra-btn" title="Edit" (click)="openEdit(r)"><i class="fas fa-pen"></i></button>
                  <button class="ra-btn ra-del" title="Delete" (click)="confirmDelete(r)"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          }
          @if (!loading() && !items().length) {
            <tr><td colspan="13" class="empty-cell">
              <i class="fas fa-fire-flame-curved"></i>
              <div>No risks found</div>
              <div class="empty-sub">Adjust filters or <button class="link-btn" (click)="openForm()">add a new risk</button></div>
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <span class="pg-info">{{ total() }} total · Page {{ page() }} of {{ totalPages() }}</span>
      <button class="btn btn-secondary btn-xs" [disabled]="page()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
      @for (p of pageRange(); track p) {
        <button class="btn btn-xs" [class.btn-primary]="p===page()" [class.btn-secondary]="p!==page()" (click)="goPage(p)">{{ p }}</button>
      }
      <button class="btn btn-secondary btn-xs" [disabled]="page()>=totalPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
    </div>
  </div>
</div>

<!-- ═══ ADD / EDIT MODAL ═══ -->
@if (showForm()) {
  <div class="overlay" (click)="closeForm()">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-fire-flame-curved" style="color:var(--danger)"></i>
          {{ editId() ? 'Edit Risk' : 'Add New Risk' }}
        </div>
        <button class="modal-close" (click)="closeForm()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg fg-2">
            <label class="lbl">Title *</label>
            <input class="fc" [(ngModel)]="form.title" placeholder="Concise risk title">
          </div>
          <div class="fg fg-2">
            <label class="lbl">Description *</label>
            <textarea class="fc" [(ngModel)]="form.description" rows="2" placeholder="Describe the risk scenario…"></textarea>
          </div>
          <div class="fg">
            <label class="lbl">Risk Type *</label>
            <select class="fc" [(ngModel)]="form.type">
              <option value="operational">Operational</option>
              <option value="strategic">Strategic</option>
              <option value="financial">Financial</option>
              <option value="compliance">Compliance</option>
              <option value="technology">Technology</option>
              <option value="reputational">Reputational</option>
            </select>
          </div>
          <div class="fg">
            <label class="lbl">Category</label>
            <select class="fc" [(ngModel)]="form.category_id">
              <option value="">— Select Category —</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="fg">
            <label class="lbl">Department</label>
            <select class="fc" [(ngModel)]="form.department_id">
              <option value="">— Select Department —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div class="fg">
            <label class="lbl">Status</label>
            <select class="fc" [(ngModel)]="form.status">
              <option value="identified">Identified</option>
              <option value="assessed">Assessed</option>
              <option value="treatment_in_progress">Treatment In Progress</option>
              <option value="monitored">Monitored</option>
              <option value="accepted">Accepted</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <!-- Score inputs with live preview -->
          <div class="fg score-section">
            <div class="score-inputs">
              <div>
                <label class="lbl">Likelihood (1–5) *</label>
                <div class="score-btns">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button class="sb" [class.sb-active]="form.likelihood===n" (click)="form.likelihood=n">{{ n }}</button>
                  }
                </div>
              </div>
              <div>
                <label class="lbl">Impact (1–5) *</label>
                <div class="score-btns">
                  @for (n of [1,2,3,4,5]; track n) {
                    <button class="sb" [class.sb-active]="form.impact===n" (click)="form.impact=n">{{ n }}</button>
                  }
                </div>
              </div>
            </div>
            <div class="score-preview" [class]="hCls(form.likelihood, form.impact)">
              <div class="sp-score">{{ form.likelihood * form.impact }}</div>
              <div class="sp-lbl">Risk Score</div>
              <div class="sp-lvl">{{ riskLevel(form.likelihood, form.impact) | uppercase }}</div>
            </div>
          </div>

          <div class="fg">
            <label class="lbl">Treatment Strategy</label>
            <select class="fc" [(ngModel)]="form.treatment_strategy">
              <option value="">— Select —</option>
              <option value="mitigate">Mitigate — reduce probability/impact</option>
              <option value="avoid">Avoid — eliminate the risk</option>
              <option value="transfer">Transfer — insurance/contract</option>
              <option value="accept">Accept — acknowledge & monitor</option>
            </select>
          </div>
          <div class="fg">
            <label class="lbl">Next Review Date</label>
            <input type="date" class="fc" [(ngModel)]="form.next_review_date">
          </div>
          <div class="fg fg-2">
            <label class="lbl">Treatment Plan</label>
            <textarea class="fc" [(ngModel)]="form.treatment_plan" rows="2" placeholder="Describe planned actions…"></textarea>
          </div>
        </div>
        @if (formError()) { <div class="form-err">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="saving()">
          {{ saving() ? 'Saving…' : (editId() ? 'Update Risk' : 'Add Risk') }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ═══ DELETE CONFIRM ═══ -->
@if (deleteTarget()) {
  <div class="overlay" (click)="deleteTarget.set(null)">
    <div class="modal modal-sm" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title" style="color:var(--danger)"><i class="fas fa-trash"></i> Delete Risk</div>
        <button class="modal-close" (click)="deleteTarget.set(null)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--text2)">Delete <strong style="color:var(--text)">{{ deleteTarget()?.reference_no }}</strong>?</p>
        <p style="font-size:12px;color:var(--text3);margin-top:4px">{{ deleteTarget()?.title }}</p>
        <p style="font-size:12px;color:var(--danger);margin-top:8px">This cannot be undone. All controls and reviews will be deleted.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="deleteTarget.set(null)">Cancel</button>
        <button class="btn btn-danger" (click)="doDelete()" [disabled]="saving()">
          {{ saving() ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    :host { display:block; }
    .rsk-shell { display:flex; flex-direction:column; gap:14px; }

    .stats-bar { display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:12px 20px; flex-wrap:wrap; gap:8px; }
    .stat-item { display:flex; flex-direction:column; align-items:center; padding:0 16px; }
    .stat-div  { width:1px; height:32px; background:var(--border); }
    .stat-val  { font-family:'Inter',sans-serif; font-size:24px; font-weight:800; line-height:1; }
    .stat-lbl  { font-size:10px; color:var(--text2); margin-top:2px; text-transform:uppercase; letter-spacing:.4px; }
    .crit { color:var(--danger); } .high { color:#fb923c; } .med { color:var(--warning); } .low { color:var(--success); } .warn { color:var(--warning); }

    .heat-card { padding:16px 20px; }
    .heat-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
    .heat-legend { display:flex; gap:8px; flex-wrap:wrap; }
    .hl { font-size:10px; font-weight:700; padding:2px 8px; border-radius:5px; }
    .hl-l  { background:rgba(16,185,129,.12); color:var(--success); }
    .hl-m  { background:rgba(245,158,11,.12); color:var(--warning); }
    .hl-h  { background:rgba(249,115,22,.12); color:#fb923c; }
    .hl-c  { background:rgba(239,68,68,.12);  color:var(--danger); }
    .heat-body { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; }
    .heat-y-label { writing-mode:vertical-rl; transform:rotate(180deg); font-size:10px; color:var(--text3); font-weight:700; white-space:nowrap; padding-top:20px; }
    .heat-grid { display:grid; grid-template-columns:24px repeat(5,1fr); gap:4px; flex:1; max-width:460px; }
    .heat-row-lbl { font-size:10px; color:var(--text3); display:flex; align-items:center; justify-content:flex-end; padding-right:6px; font-weight:700; }
    .heat-col-lbl { font-size:9px; color:var(--text3); text-align:center; padding-top:3px; }
    .heat-x-label { font-size:10px; color:var(--text3); font-weight:700; }
    .heat-cell { height:48px; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; position:relative; }
    .heat-cell:hover { transform:scale(1.07); box-shadow:0 4px 14px rgba(0,0,0,.3); }
    .heat-active { outline:2px solid white; outline-offset:1px; }
    .hc-n { font-family:'Inter',sans-serif; font-size:16px; font-weight:800; line-height:1; }
    .hc-s { font-size:9px; opacity:.6; }
    .h-low  { background:rgba(16,185,129,.2); color:#10b981; }
    .h-med  { background:rgba(245,158,11,.25); color:#f59e0b; }
    .h-high { background:rgba(249,115,22,.3);  color:#fb923c; }
    .h-crit { background:rgba(239,68,68,.35);  color:#ef4444; }

    /* Cell drill-down panel */
    .cell-panel { flex:1; min-width:220px; background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 14px; max-height:280px; overflow-y:auto; }
    .cell-panel-title { font-family:'Inter',sans-serif; font-size:12px; font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
    .cell-risk-row { display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:7px; cursor:pointer; transition:background .1s; margin-bottom:4px; }
    .cell-risk-row:hover { background:var(--border); }
    .ref-sm { font-family:monospace; font-size:10px; color:var(--accent); white-space:nowrap; }
    .cell-title { flex:1; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .sm-badge { font-size:10px; padding:1px 6px; }

    .tbl-toolbar { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:8px; }
    .filter-row  { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .search-box  { display:flex; align-items:center; gap:7px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:6px 11px; min-width:220px; }
    .search-box i { color:var(--text3); font-size:11px; }
    .search-box input { background:none; border:none; outline:none; color:var(--text); font-size:12px; font-family:'Inter',sans-serif; flex:1; }
    .search-box button { background:none; border:none; color:var(--text3); cursor:pointer; font-size:11px; }
    .sel { background:var(--surface2); border:1px solid var(--border); border-radius:7px; color:var(--text); font-size:12px; font-family:'Inter',sans-serif; padding:6px 10px; outline:none; cursor:pointer; }
    .total-badge { font-size:12px; font-weight:700; color:var(--text2); background:var(--surface2); border:1px solid var(--border); border-radius:7px; padding:5px 10px; }
    .table-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; }
    th { background:var(--surface2); padding:10px 14px; text-align:left; font-weight:700; font-size:10px; color:var(--text2); text-transform:uppercase; letter-spacing:.8px; border-bottom:1px solid var(--border); white-space:nowrap; }
    td { padding:11px 14px; border-bottom:1px solid var(--border); color:var(--text); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    .tbl-row { cursor:pointer; transition:background .1s; }
    .tbl-row:hover td { background:rgba(59,130,246,.04); }
    .td-title { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; font-size:13px; }
    .sm { font-size:11px; color:var(--text2); white-space:nowrap; }
    .tc { text-align:center; }
    .fw7 { font-family:'Inter',sans-serif; font-weight:800; font-size:14px; }
    .overdue { color:var(--danger) !important; font-weight:700; }
    .ref-code { font-family:monospace; font-size:11px; color:var(--accent); background:rgba(59,130,246,.08); padding:2px 6px; border-radius:4px; }
    .type-tag { font-size:10px; color:var(--text3); background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:1px 5px; text-transform:capitalize; }
    .score-pill { display:inline-flex; align-items:center; justify-content:center; width:28px; height:22px; border-radius:6px; font-family:'Inter',sans-serif; font-weight:800; font-size:12px; }
    .ava { width:27px; height:27px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent2)); display:grid; place-items:center; font-size:11px; font-weight:800; color:#fff; }
    .row-actions { display:flex; gap:4px; opacity:0; transition:opacity .15s; }
    .tbl-row:hover .row-actions { opacity:1; }
    .ra-btn { width:27px; height:27px; border:1px solid var(--border); border-radius:6px; background:none; color:var(--text2); font-size:11px; cursor:pointer; display:grid; place-items:center; transition:all .13s; }
    .ra-btn:hover { background:var(--surface2); color:var(--text); }
    .ra-del:hover { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.3); color:var(--danger); }
    .sk-row { height:10px; background:var(--border); border-radius:3px; animation:shimmer 1.5s infinite ease-in-out; }
    @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.9} }
    .empty-cell { text-align:center; color:var(--text3); padding:48px 20px !important; font-size:13px; }
    .empty-cell i { font-size:28px; margin-bottom:8px; display:block; }
    .empty-sub { font-size:11px; margin-top:6px; }
    .link-btn { background:none; border:none; color:var(--accent); font-size:11px; cursor:pointer; text-decoration:underline; font-family:'Inter',sans-serif; }
    .pagination { display:flex; align-items:center; gap:5px; padding:12px 16px; border-top:1px solid var(--border); flex-wrap:wrap; }
    .pg-info { font-size:11px; color:var(--text2); margin-right:auto; }

    .overlay  { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(3px); display:grid; place-items:center; z-index:1000; padding:16px; }
    .modal    { background:var(--surface); border:1px solid var(--border); border-radius:16px; width:100%; overflow:hidden; display:flex; flex-direction:column; max-height:90vh; }
    .modal-lg { max-width:680px; }
    .modal-sm { max-width:400px; }
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
    .score-section { grid-column:span 2; display:flex; gap:16px; align-items:center; background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 16px; }
    .score-inputs  { flex:1; display:flex; gap:20px; flex-wrap:wrap; }
    .score-btns    { display:flex; gap:5px; margin-top:6px; }
    .sb { width:34px; height:34px; border:1px solid var(--border); border-radius:8px; background:none; color:var(--text2); font-size:14px; font-family:'Inter',sans-serif; font-weight:800; cursor:pointer; transition:all .13s; }
    .sb:hover { background:var(--border); }
    .sb.sb-active { background:var(--accent); border-color:var(--accent); color:#fff; }
    .score-preview { display:flex; flex-direction:column; align-items:center; justify-content:center; width:80px; height:80px; border-radius:14px; flex-shrink:0; }
    .sp-score { font-family:'Inter',sans-serif; font-size:28px; font-weight:800; line-height:1; }
    .sp-lbl   { font-size:9px; opacity:.7; margin-top:1px; }
    .sp-lvl   { font-size:10px; font-weight:800; margin-top:2px; }
    .btn-danger { background:var(--danger); color:#fff; border:none; }
    .btn-danger:hover:not([disabled]) { opacity:.88; }
  `]
})
export class RiskRegisterComponent implements OnInit, OnDestroy {
  items        = signal<any[]>([]);
  loading      = signal(true);
  total        = signal(0);
  page         = signal(1);
  totalPages   = signal(1);
  stats        = signal<any>(null);
  matrixData   = signal<any>(null);
  categories   = signal<any[]>([]);
  departments  = signal<any[]>([]);
  showForm     = signal(false);
  editId       = signal<number|null>(null);
  deleteTarget = signal<any>(null);
  saving       = signal(false);
  formError    = signal('');

  search = ''; filterLevel = ''; filterStatus = ''; filterType = '';
  activeCell = ''; activeCellL = 0; activeCellI = 0;
  private searchTimer: any;
  private destroy$ = new Subject<void>();
  form: any = this.blankForm();

  constructor(
    private svc: RiskService,
    private router: Router,
    private uiEvents: UiEventService,
    public lang: LanguageService, private auth: AuthService) {}


  private slug = () => (this.auth.currentUser() as any)?.role?.slug ?? '';
  canCreate = () => ['super_admin','qa_manager','quality_supervisor','compliance_manager'].includes(this.slug());
  canEdit   = () => ['super_admin','qa_manager','quality_supervisor'].includes(this.slug());
  canDelete = () => ['super_admin','qa_manager'].includes(this.slug());

  ngOnInit() {
    this.uiEvents.openNewForm$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openForm());
    this.load();
    this.loadStats();
    this.loadMatrix();
    this.svc.categories().subscribe(d => this.categories.set(d));
    this.svc.departments().subscribe(d => this.departments.set(d));
  }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  blankForm() {
    return { title:'', description:'', type:'operational', category_id:'', department_id:'',
             likelihood:3, impact:3, treatment_strategy:'mitigate', treatment_plan:'',
             next_review_date:'', status:'identified' };
  }

  load() {
    this.loading.set(true);
    const p: any = { page: this.page(), per_page: 15 };
    if (this.filterLevel)  p.risk_level  = this.filterLevel;
    if (this.filterStatus) p.status      = this.filterStatus;
    if (this.filterType)   p.type        = this.filterType;
    if (this.search)       p.search      = this.search;
    if (this.activeCell) { p.likelihood = this.activeCellL; p.impact = this.activeCellI; }
    this.svc.list(p).subscribe({
      next: r => { this.items.set(r.data||[]); this.total.set(r.total||0); this.totalPages.set(r.last_page||1); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadStats() { this.svc.stats().subscribe(d => this.stats.set(d)); }
  loadMatrix() { this.svc.matrix().subscribe(d => this.matrixData.set(d)); }

  statByLevel(l: string): number {
    return this.stats()?.by_level?.find((x: any) => x.risk_level === l)?.total ?? 0;
  }

  matrixCount(L: number, I: number): number {
    return this.matrixData()?.matrix?.[L]?.[I]?.length ?? 0;
  }

  matrixTooltip(L: number, I: number): string {
    const risks = this.matrixData()?.matrix?.[L]?.[I] ?? [];
    if (!risks.length) return `L${L} × I${I} = ${L*I} — No risks`;
    return risks.map((r: any) => r.title).join('\n');
  }

  cellRisks(): any[] {
    if (!this.activeCell) return [];
    return this.matrixData()?.matrix?.[this.activeCellL]?.[this.activeCellI] ?? [];
  }

  filterByCell(L: number, I: number) {
    const key = L+','+I;
    if (this.activeCell === key) { this.clearCell(); return; }
    this.activeCell = key;
    this.activeCellL = L; this.activeCellI = I;
    this.page.set(1); this.load();
  }

  clearCell() { this.activeCell=''; this.activeCellL=0; this.activeCellI=0; this.page.set(1); this.load(); }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.resetPage(), 400); }
  resetPage() { this.page.set(1); this.load(); }
  clearFilters() { this.search=''; this.filterLevel=''; this.filterStatus=''; this.filterType=''; this.clearCell(); }
  prevPage() { if (this.page()>1) { this.page.update(p=>p-1); this.load(); } }
  nextPage() { if (this.page()<this.totalPages()) { this.page.update(p=>p+1); this.load(); } }
  goPage(p: number) { this.page.set(p); this.load(); }
  pageRange(): number[] {
    const t=this.totalPages(), c=this.page();
    const start=Math.max(1,c-2), end=Math.min(t,c+2);
    return Array.from({length:end-start+1},(_,i)=>start+i);
  }

  goDetail(id: number) { this.router.navigate(['/risk', id]); }

  openForm() { this.editId.set(null); this.form=this.blankForm(); this.formError.set(''); this.showForm.set(true); }
  openEdit(r: any) {
    this.editId.set(r.id);
    this.form = { title:r.title, description:r.description, type:r.type,
      category_id:r.category_id||'', department_id:r.department_id||'',
      likelihood:r.likelihood, impact:r.impact, treatment_strategy:r.treatment_strategy||'',
      treatment_plan:r.treatment_plan||'', next_review_date:r.next_review_date||'', status:r.status };
    this.formError.set(''); this.showForm.set(true);
  }
  closeForm() { this.showForm.set(false); this.editId.set(null); }

  submit() {
    if (!this.form.title?.trim()) { this.formError.set('Title is required.'); return; }
    if (!this.form.description?.trim()) { this.formError.set('Description is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const req = this.editId()
      ? this.svc.update(this.editId()!, this.form)
      : this.svc.create(this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); this.loadStats(); this.loadMatrix(); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors||{})?.[0] as string || 'Failed.'); }
    });
  }

  confirmDelete(r: any) { this.deleteTarget.set(r); }
  doDelete() {
    this.saving.set(true);
    this.svc.delete(this.deleteTarget()!.id).subscribe({
      next: () => { this.saving.set(false); this.deleteTarget.set(null); this.load(); this.loadStats(); this.loadMatrix(); },
      error: () => this.saving.set(false)
    });
  }

  hCls(L: number, I: number): string {
    const s=L*I; return s>=17?'h-crit':s>=10?'h-high':s>=5?'h-med':'h-low';
  }
  riskLevel(L: number, I: number): string {
    const s=L*I; return s>=17?'critical':s>=10?'high':s>=5?'medium':'low';
  }
  lvlCls(l: string): string {
    return ({critical:'badge-red',high:'badge-orange',medium:'badge-yellow',low:'badge-green'} as any)[l]||'badge-draft';
  }
  stCls(s: string): string {
    return ({identified:'badge-blue',assessed:'badge-purple',treatment_in_progress:'badge-yellow',
             monitored:'badge-green',closed:'badge-draft',accepted:'badge-amber'} as any)[s]||'badge-draft';
  }
  isOverdue(d: string, status: string): boolean {
    return !!d && status !== 'closed' && new Date(d) < new Date();
  }
}
