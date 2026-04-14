import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RiskService } from '../../../core/services/risk.service';

@Component({
  selector: 'app-risk-matrix',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, RouterModule],
  template: `
<div class="mx-shell">

  <!-- Header -->
  <div class="mx-header">
    <div>
      <div class="mx-title"><i class="fas fa-fire-flame-curved" style="color:var(--danger)"></i> Risk Heat Matrix</div>
      <div class="mx-sub">Full portfolio view — click any cell to explore risks</div>
    </div>
    <div class="mx-actions">
      <a routerLink="/risk" class="btn btn-secondary btn-sm"><i class="fas fa-list"></i> Risk Register</a>
    </div>
  </div>

  <!-- Summary chips -->
  @if (!loading()) {
    <div class="summary-row">
      <div class="sum-chip chip-total">
        <div class="chip-val">{{ matrixData()?.total ?? 0 }}</div>
        <div class="chip-lbl">Total Risks</div>
      </div>
      <div class="sum-chip chip-crit">
        <div class="chip-val">{{ byLevel('critical') }}</div>
        <div class="chip-lbl">Critical</div>
      </div>
      <div class="sum-chip chip-high">
        <div class="chip-val">{{ byLevel('high') }}</div>
        <div class="chip-lbl">High</div>
      </div>
      <div class="sum-chip chip-med">
        <div class="chip-val">{{ byLevel('medium') }}</div>
        <div class="chip-lbl">Medium</div>
      </div>
      <div class="sum-chip chip-low">
        <div class="chip-val">{{ byLevel('low') }}</div>
        <div class="chip-lbl">Low</div>
      </div>
    </div>
  }

  <!-- Main content: matrix + sidebar -->
  <div class="mx-body">

    <!-- Heat Matrix -->
    <div class="card mx-card">
      @if (loading()) {
        <div class="loading-wrap"><div class="spinner"></div></div>
      } @else {
        <div class="legend-row">
          <span class="hl hl-l">Low (1–4)</span>
          <span class="hl hl-m">Medium (5–9)</span>
          <span class="hl hl-h">High (10–16)</span>
          <span class="hl hl-c">Critical (17–25)</span>
        </div>

        <div class="matrix-wrap">
          <div class="y-axis-lbl">Likelihood ↑</div>
          <div class="matrix-inner">
            <div class="matrix-grid">
              @for (L of [5,4,3,2,1]; track L) {
                <div class="row-lbl">{{ L }}</div>
                @for (I of [1,2,3,4,5]; track I) {
                  <div class="cell" [class]="hCls(L,I)"
                       [class.cell-active]="selected===L+','+I"
                       [class.cell-empty]="!count(L,I)"
                       (click)="select(L,I)"
                       [title]="tooltip(L,I)">
                    <div class="cell-inner">
                      <span class="cell-count">{{ count(L,I) || '' }}</span>
                      <span class="cell-score">{{ L*I }}</span>
                    </div>
                  </div>
                }
              }
              <!-- X axis labels -->
              <div></div>
              @for (lbl of impactLabels; track lbl) {
                <div class="col-lbl">{{ lbl }}</div>
              }
              <div></div>
              <div class="x-axis-lbl" style="grid-column:span 5">Impact →</div>
            </div>
          </div>
        </div>

        <!-- Status breakdown bar -->
        <div class="breakdown-row">
          @for (s of statusBreakdown(); track s.status) {
            <div class="bk-item" [class]="stCls(s.status)">
              <span class="bk-val">{{ s.total }}</span>
              <span class="bk-lbl">{{ s.status?.replace('_',' ') }}</span>
            </div>
          }
        </div>
      }
    </div>

    <!-- Sidebar: selected cell or top risks -->
    <div class="sidebar-panel">
      @if (selected && selectedRisks().length) {
        <div class="card panel-card">
          <div class="panel-header">
            <div class="panel-title">
              L{{ selL }} × I{{ selI }}
              <span class="score-badge" [class]="hCls(selL, selI)">Score {{ selL * selI }}</span>
              <span class="level-txt">{{ riskLevel(selL, selI) | titlecase }}</span>
            </div>
            <button class="icon-btn sm" (click)="selected=''" title="Clear"><i class="fas fa-times"></i></button>
          </div>
          <div class="risk-list">
            @for (r of selectedRisks(); track r.id) {
              <div class="risk-card" (click)="goDetail(r.id)">
                <div class="rc-top">
                  <span class="rc-ref">{{ r.reference_no }}</span>
                  <span class="badge sm-badge" [class]="stCls(r.status)">{{ r.status?.replace('_',' ') }}</span>
                </div>
                <div class="rc-title">{{ r.title }}</div>
                @if (r.owner || r.department) {
                  <div class="rc-meta">
                    @if (r.owner) { <span><i class="fas fa-user"></i> {{ r.owner }}</span> }
                    @if (r.department) { <span><i class="fas fa-sitemap"></i> {{ r.department }}</span> }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Top risks by score -->
        <div class="card panel-card">
          <div class="panel-header">
            <div class="panel-title"><i class="fas fa-arrow-up-right-dots" style="color:var(--danger)"></i> Top Risks by Score</div>
          </div>
          <div class="risk-list">
            @if (loading()) {
              @for (i of [1,2,3,4,5]; track i) {
                <div class="sk-card"></div>
              }
            }
            @for (r of topRisks(); track r.id) {
              <div class="risk-card" (click)="goDetail(r.id)">
                <div class="rc-top">
                  <span class="rc-ref">{{ r.reference_no }}</span>
                  <span class="score-pill sm" [class]="hCls(r.likelihood, r.impact)">{{ r.score }}</span>
                  <span class="badge sm-badge" [class]="stCls(r.status)">{{ r.status?.replace('_',' ') }}</span>
                </div>
                <div class="rc-title">{{ r.title }}</div>
                @if (r.owner || r.type) {
                  <div class="rc-meta">
                    @if (r.type) { <span><i class="fas fa-shapes"></i> {{ r.type }}</span> }
                    @if (r.owner) { <span><i class="fas fa-user"></i> {{ r.owner }}</span> }
                  </div>
                }
              </div>
            }
            @if (!loading() && !topRisks().length) {
              <div class="empty-panel"><i class="fas fa-fire-flame-curved"></i><div>No risks yet</div></div>
            }
          </div>
        </div>

        <!-- Treatment breakdown -->
        <div class="card panel-card">
          <div class="panel-header">
            <div class="panel-title"><i class="fas fa-shield-halved" style="color:var(--accent)"></i> By Status</div>
          </div>
          <div class="donut-list">
            @for (s of statusBreakdown(); track s.status) {
              <div class="dl-row">
                <span class="dl-label">{{ s.status?.replace('_',' ') | titlecase }}</span>
                <div class="dl-bar-wrap">
                  <div class="dl-bar" [class]="stCls(s.status)"
                       [style.width]="barPct(s.total) + '%'"></div>
                </div>
                <span class="dl-count">{{ s.total }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  </div>
</div>
  `,
  styles: [`
    :host { display:block; }
    .mx-shell { display:flex; flex-direction:column; gap:14px; }

    .mx-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:8px; }
    .mx-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; display:flex; align-items:center; gap:8px; }
    .mx-sub { font-size:12px; color:var(--text2); margin-top:3px; }
    .mx-actions { display:flex; gap:8px; }

    /* Summary chips */
    .summary-row { display:flex; gap:10px; flex-wrap:wrap; }
    .sum-chip { display:flex; flex-direction:column; align-items:center; padding:10px 20px; border-radius:12px; border:1px solid var(--border); flex:1; min-width:80px; }
    .chip-val { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; line-height:1; }
    .chip-lbl { font-size:10px; color:var(--text2); margin-top:3px; text-transform:uppercase; letter-spacing:.4px; }
    .chip-total { background:var(--surface); }
    .chip-crit  { background:rgba(239,68,68,.07); border-color:rgba(239,68,68,.2); } .chip-crit .chip-val { color:var(--danger); }
    .chip-high  { background:rgba(249,115,22,.07); border-color:rgba(249,115,22,.2); } .chip-high .chip-val { color:#fb923c; }
    .chip-med   { background:rgba(245,158,11,.07); border-color:rgba(245,158,11,.2); } .chip-med .chip-val  { color:var(--warning); }
    .chip-low   { background:rgba(16,185,129,.07); border-color:rgba(16,185,129,.2); } .chip-low .chip-val  { color:var(--success); }

    .mx-body { display:grid; grid-template-columns:1fr 320px; gap:14px; align-items:start; }
    @media(max-width:1000px) { .mx-body { grid-template-columns:1fr; } }

    .mx-card { padding:20px; }
    .loading-wrap { display:grid; place-items:center; height:360px; }
    .spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    .legend-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
    .hl { font-size:10px; font-weight:700; padding:3px 10px; border-radius:5px; }
    .hl-l { background:rgba(16,185,129,.12); color:var(--success); }
    .hl-m { background:rgba(245,158,11,.12); color:var(--warning); }
    .hl-h { background:rgba(249,115,22,.12); color:#fb923c; }
    .hl-c { background:rgba(239,68,68,.12);  color:var(--danger); }

    .matrix-wrap { display:flex; align-items:center; gap:8px; margin-bottom:20px; }
    .y-axis-lbl { writing-mode:vertical-rl; transform:rotate(180deg); font-size:11px; color:var(--text3); font-weight:700; white-space:nowrap; flex-shrink:0; }
    .matrix-inner { flex:1; }
    .matrix-grid { display:grid; grid-template-columns:28px repeat(5,1fr); gap:5px; }
    .row-lbl { font-size:11px; color:var(--text3); font-weight:700; display:flex; align-items:center; justify-content:flex-end; padding-right:6px; }
    .col-lbl { font-size:10px; color:var(--text3); text-align:center; padding-top:4px; }
    .x-axis-lbl { font-size:11px; color:var(--text3); font-weight:700; text-align:center; padding-top:4px; }

    .cell { height:60px; border-radius:10px; cursor:pointer; transition:all .15s; border:2px solid transparent; }
    .cell:hover { transform:scale(1.05); box-shadow:0 4px 16px rgba(0,0,0,.3); }
    .cell-active { border-color:white; box-shadow:0 0 0 3px rgba(255,255,255,.3); }
    .cell-empty { opacity:.55; }
    .cell-inner { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; }
    .cell-count { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; line-height:1; }
    .cell-score { font-size:10px; opacity:.65; }
    .h-low  { background:rgba(16,185,129,.2); color:#10b981; }
    .h-med  { background:rgba(245,158,11,.25); color:#f59e0b; }
    .h-high { background:rgba(249,115,22,.3);  color:#fb923c; }
    .h-crit { background:rgba(239,68,68,.35);  color:#ef4444; }

    /* Breakdown bar */
    .breakdown-row { display:flex; gap:6px; flex-wrap:wrap; padding-top:12px; border-top:1px solid var(--border); }
    .bk-item { display:flex; flex-direction:column; align-items:center; padding:6px 12px; border-radius:8px; background:var(--surface2); border:1px solid var(--border); }
    .bk-val  { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; }
    .bk-lbl  { font-size:9px; color:var(--text2); margin-top:1px; text-transform:capitalize; }

    /* Sidebar */
    .sidebar-panel { display:flex; flex-direction:column; gap:12px; }
    .panel-card { padding:14px 16px; overflow:hidden; }
    .panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .panel-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:800; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    .score-badge { font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; }
    .level-txt { font-size:11px; color:var(--text2); font-family:'DM Sans',sans-serif; }
    .icon-btn.sm { width:26px; height:26px; border:1px solid var(--border); border-radius:6px; background:none; color:var(--text2); cursor:pointer; font-size:11px; display:grid; place-items:center; }
    .risk-list { display:flex; flex-direction:column; gap:7px; max-height:420px; overflow-y:auto; }
    .risk-card { background:var(--surface2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; cursor:pointer; transition:all .13s; }
    .risk-card:hover { border-color:var(--accent); background:rgba(59,130,246,.04); }
    .rc-top { display:flex; align-items:center; gap:6px; margin-bottom:5px; flex-wrap:wrap; }
    .rc-ref { font-family:monospace; font-size:10px; color:var(--accent); background:rgba(59,130,246,.08); padding:1px 5px; border-radius:3px; }
    .rc-title { font-size:12px; font-weight:600; line-height:1.35; }
    .rc-meta { display:flex; gap:10px; margin-top:5px; flex-wrap:wrap; }
    .rc-meta span { font-size:10px; color:var(--text2); display:flex; align-items:center; gap:3px; }
    .sm-badge { font-size:10px; padding:1px 6px; }
    .score-pill.sm { font-size:11px; padding:1px 7px; border-radius:5px; font-family:'Syne',sans-serif; font-weight:800; }
    .sk-card { height:72px; background:var(--border); border-radius:9px; animation:shimmer 1.5s infinite ease-in-out; }
    @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.9} }
    .empty-panel { text-align:center; color:var(--text3); padding:30px; font-size:13px; }
    .empty-panel i { font-size:28px; display:block; margin-bottom:8px; }

    /* Bar chart */
    .donut-list { display:flex; flex-direction:column; gap:8px; }
    .dl-row { display:flex; align-items:center; gap:8px; }
    .dl-label { font-size:11px; color:var(--text2); width:130px; flex-shrink:0; text-transform:capitalize; }
    .dl-bar-wrap { flex:1; height:8px; background:var(--surface2); border-radius:4px; overflow:hidden; }
    .dl-bar { height:100%; border-radius:4px; transition:width .4s ease; }
    .dl-count { font-size:11px; font-weight:700; color:var(--text); width:20px; text-align:right; }

    /* Status badge colors on bar */
    .badge-blue    .dl-bar, .bk-item.badge-blue    { background:rgba(59,130,246,.2); }
    .badge-purple  .dl-bar, .bk-item.badge-purple  { background:rgba(99,102,241,.2); }
    .badge-yellow  .dl-bar, .bk-item.badge-yellow  { background:rgba(245,158,11,.2); }
    .badge-green   .dl-bar, .bk-item.badge-green   { background:rgba(16,185,129,.2); }
    .badge-amber   .dl-bar, .bk-item.badge-amber   { background:rgba(245,158,11,.15); }
    .badge-draft   .dl-bar, .bk-item.badge-draft   { background:rgba(107,114,128,.15); }
    .dl-bar { background:var(--accent); }
  `]
})
export class RiskMatrixComponent implements OnInit {
  loading    = signal(true);
  matrixData = signal<any>(null);

  selected = ''; selL = 0; selI = 0;
  impactLabels = ['Very Low','Low','Medium','High','Very High'];

  constructor(private svc: RiskService, private router: Router) {}

  ngOnInit() {
    this.svc.matrix().subscribe({
      next: d => { this.matrixData.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  count(L: number, I: number): number {
    return this.matrixData()?.matrix?.[L]?.[I]?.length ?? 0;
  }

  tooltip(L: number, I: number): string {
    const risks = this.matrixData()?.matrix?.[L]?.[I] ?? [];
    if (!risks.length) return `L${L} × I${I} = ${L*I} — No risks`;
    return `${risks.length} risk(s)\n` + risks.map((r:any) => r.title).join('\n');
  }

  select(L: number, I: number) {
    const key = L+','+I;
    if (this.selected === key) { this.selected=''; return; }
    this.selected = key; this.selL = L; this.selI = I;
  }

  selectedRisks(): any[] {
    if (!this.selected) return [];
    return this.matrixData()?.matrix?.[this.selL]?.[this.selI] ?? [];
  }

  topRisks(): any[] {
    const m = this.matrixData()?.matrix;
    if (!m) return [];
    const all: any[] = [];
    for (const L of Object.keys(m)) {
      for (const I of Object.keys(m[L])) {
        all.push(...m[L][I]);
      }
    }
    return all.sort((a,b) => (b.score||0) - (a.score||0)).slice(0, 10);
  }

  statusBreakdown(): any[] {
    return this.matrixData()?.by_status ?? [];
  }

  byLevel(l: string): number {
    return this.matrixData()?.by_level?.find((x:any) => x.risk_level === l)?.total ?? 0;
  }

  barPct(val: number): number {
    const max = Math.max(...(this.statusBreakdown().map((s:any) => s.total)), 1);
    return Math.round(val / max * 100);
  }

  goDetail(id: number) { this.router.navigate(['/risk', id]); }

  hCls(L: number, I: number): string {
    const s = L * I; return s>=17?'h-crit':s>=10?'h-high':s>=5?'h-med':'h-low';
  }
  riskLevel(L: number, I: number): string {
    const s = L * I; return s>=17?'critical':s>=10?'high':s>=5?'medium':'low';
  }
  stCls(s: string): string {
    return ({identified:'badge-blue',assessed:'badge-purple',treatment_in_progress:'badge-yellow',
             monitored:'badge-green',closed:'badge-draft',accepted:'badge-amber'} as any)[s]||'badge-draft';
  }
}
