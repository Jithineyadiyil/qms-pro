import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService }      from '../../core/services/api.service';
import { LanguageService } from '../../core/services/language.service';

type Tab = 'kpi'|'nc'|'capa'|'risk'|'complaints'|'audits'|'sla'|'okr'|'vendors'|'visits'
          |'rec_complaints'|'rec_ncs'|'rec_capas'|'rec_risks'|'rec_audits'|'rec_requests'|'rec_visits';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe, DecimalPipe, FormsModule],
  template: `
<div class="rpt-shell">

  <!-- ══ SIDEBAR ══ -->
  <aside class="rpt-aside">
    <div class="aside-header">
      <i class="fas fa-chart-mixed"></i>
      <span>{{ ar() ? 'التقارير' : 'Reports' }}</span>
    </div>

    <div class="aside-group">{{ ar() ? 'التحليلات' : 'Analytics' }}</div>
    @for (t of analyticsTabs; track t.key) {
      <button class="aside-btn" [class.active]="activeTab()===t.key" (click)="switchTab(t.key)">
        <i [class]="t.icon"></i><span>{{ ar() ? t.ar : t.en }}</span>
      </button>
    }

    <div class="aside-group" style="margin-top:8px">{{ ar() ? 'سجلات كاملة' : 'Full Records' }}</div>
    @for (t of recordTabs; track t.key) {
      <button class="aside-btn" [class.active]="activeTab()===t.key" (click)="switchTab(t.key)">
        <i [class]="t.icon"></i><span>{{ ar() ? t.ar : t.en }}</span>
      </button>
    }

    <div class="aside-spacer"></div>

    <!-- Period -->
    <div class="aside-group">{{ ar() ? 'الفترة' : 'Period' }}</div>
    <div class="aside-dr">
      <input type="date" [(ngModel)]="dateFrom" (change)="reload()">
      <span>→</span>
      <input type="date" [(ngModel)]="dateTo" (change)="reload()">
    </div>

    <!-- Export -->
    <div class="aside-group" style="margin-top:6px">{{ ar() ? 'تصدير' : 'Export' }}</div>
    <button class="exp-btn" (click)="exportPDF()"   [disabled]="loading()"><i class="fas fa-file-pdf"></i> PDF</button>
    <button class="exp-btn" (click)="exportExcel()" [disabled]="loading()"><i class="fas fa-file-excel"></i> Excel</button>
    <button class="exp-btn" (click)="exportCSV()"   [disabled]="loading()"><i class="fas fa-file-csv"></i> CSV</button>
  </aside>

  <!-- ══ BODY ══ -->
  <div class="rpt-body">

    <!-- Topbar -->
    <div class="rpt-topbar">
      <div>
        <div class="rpt-title">{{ ar() ? activeLabel('ar') : activeLabel('en') }}</div>
        <div class="rpt-sub">{{ dateFrom }} → {{ dateTo }} · ISO 9001:2015</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        @if (isRecordTab()) {
          <div class="search-box">
            <i class="fas fa-magnifying-glass"></i>
            <input [(ngModel)]="search" (input)="onSearch()" [placeholder]="ar()?'بحث...':'Search ref or title...'">
            @if (search) { <button (click)="clearSearch()"><i class="fas fa-times"></i></button> }
          </div>
        }
        <button class="icon-btn" (click)="reload()" [class.spinning]="loading()"><i class="fas fa-rotate"></i></button>
      </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
      <div class="loading-grid">
        @for (i of [1,2,3,4]; track i) {
          <div class="sk-card"><div class="sk-h"></div><div class="sk-v"></div><div class="sk-b"></div></div>
        }
      </div>
      <div class="sk-chart"></div>
    }

    <!-- ═══════════════ KPI ═══════════════ -->
    @if (activeTab()==='kpi' && !loading()) {
      <div class="band">
        <div class="bc"><div class="bv">{{d()?.period_summary?.requests??'—'}}</div><div class="bl">Requests</div></div>
        <div class="bd"></div>
        <div class="bc"><div class="bv">{{d()?.period_summary?.ncs??'—'}}</div><div class="bl">NCs</div></div>
        <div class="bd"></div>
        <div class="bc"><div class="bv">{{d()?.period_summary?.complaints??'—'}}</div><div class="bl">Complaints</div></div>
        <div class="bd"></div>
        <div class="bc"><div class="bv health-val" [class]="healthCls()">{{healthScore()}}</div><div class="bl">Health Score</div></div>
      </div>
      <div class="kpi-grid">
        @for (k of d()?.kpis||[]; track k.key) {
          <div class="kpi-card" [class]="kpiCardCls(k)">
            <div class="kpi-top">
              <div class="kpi-ico" [class]="'ico-'+k.color"><i [class]="k.icon"></i></div>
              <span class="kpi-badge" [class]="kpiSt(k)">{{ kpiStLbl(k) }}</span>
            </div>
            <div class="kpi-num">{{ k.value!=null ? (k.unit==='h' ? k.value+'h' : k.value+'%') : 'N/A' }}</div>
            <div class="kpi-lbl">{{ ar() ? kpiAr(k.key) : k.label }}</div>
            <div class="kpi-tgt">{{ ar()?'الهدف':'Target' }}: {{ k.unit==='h' ? '≤'+k.target+'h' : '≥'+k.target+'%' }}</div>
            @if (k.value!=null && k.unit!=='h') {
              <div class="kpi-bar"><div [style.width.%]="min(k.value,100)" [class]="'kfill-'+k.color"></div><div class="kpi-mk" [style.left.%]="k.target"></div></div>
              <div class="kpi-delta" [style.color]="k.value>=k.target?'var(--success)':'var(--danger)'">
                {{ k.value>=k.target?'▲ +':'▼ ' }}{{ abs(k.value-k.target) }}% vs target
              </div>
            }
          </div>
        }
      </div>
      <div class="two-col" style="margin-top:14px">
        <div class="card"><div class="ch-title">KPI Radar</div><div class="ch-c"><canvas id="kpiRadar" width="260" height="260"></canvas></div></div>
        <div class="card"><div class="ch-title">Status Breakdown</div>
          <div class="kpi-status-list">
            @for (k of d()?.kpis||[]; track k.key) {
              <div class="ks-row">
                <div class="ks-dot" [class]="kpiSt(k)"></div>
                <div class="ks-name">{{ ar() ? kpiAr(k.key) : k.label }}</div>
                <div class="ks-val">{{ k.value!=null?(k.unit==='h'?k.value+'h':k.value+'%'):'N/A' }}</div>
                <div class="ks-tgt">/ {{ k.unit==='h'?'≤'+k.target+'h':'≥'+k.target+'%' }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════ NC ═══════════════ -->
    @if (activeTab()==='nc' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v">{{d()?.avg_closure_days??'—'}}</div><div class="ss-l">Avg Closure Days</div></div>
        <div class="ss-item"><div class="ss-v red">{{byKey(d()?.status_breakdown,'status','open')}}</div><div class="ss-l">Open</div></div>
        <div class="ss-item"><div class="ss-v grn">{{byKey(d()?.status_breakdown,'status','closed')}}</div><div class="ss-l">Closed</div></div>
        <div class="ss-item"><div class="ss-v red">{{byKey(d()?.by_severity,'severity','critical')}}</div><div class="ss-l">Critical</div></div>
        <div class="ss-item"><div class="ss-v warn">{{byKey(d()?.by_severity,'severity','major')}}</div><div class="ss-l">Major</div></div>
        <div class="ss-item"><div class="ss-v grn">{{byKey(d()?.by_severity,'severity','minor')}}</div><div class="ss-l">Minor</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex2"><div class="ch-title">NC Trend — 12 Months</div><canvas id="ncTrend" height="145"></canvas></div>
        <div class="card flex1"><div class="ch-title">By Severity</div><div class="dnu"><canvas id="ncSev" width="155" height="155"></canvas></div><div id="ncSevL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">By Source</div><div class="dnu"><canvas id="ncSrc" width="155" height="155"></canvas></div><div id="ncSrcL" class="leg"></div></div>
      </div>
      <div class="ch-row">
        <div class="card flex1"><div class="ch-title">By Department</div><canvas id="ncDept" height="150"></canvas></div>
        <div class="card flex1"><div class="ch-title">By Status</div><div class="dnu"><canvas id="ncSt" width="155" height="155"></canvas></div><div id="ncStL" class="leg"></div></div>
      </div>
    }

    <!-- ═══════════════ CAPA ═══════════════ -->
    @if (activeTab()==='capa' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v">{{d()?.summary?.total??'—'}}</div><div class="ss-l">Total</div></div>
        <div class="ss-item"><div class="ss-v red">{{d()?.summary?.open??'—'}}</div><div class="ss-l">Open</div></div>
        <div class="ss-item"><div class="ss-v grn">{{d()?.summary?.closed??'—'}}</div><div class="ss-l">Closed</div></div>
        <div class="ss-item"><div class="ss-v" [style.color]="d()?.summary?.on_time_rate>=85?'var(--success)':'var(--warning)'">{{d()?.summary?.on_time_rate??'—'}}%</div><div class="ss-l">On-Time</div></div>
        <div class="ss-item"><div class="ss-v red">{{d()?.summary?.overdue??'—'}}</div><div class="ss-l">Overdue</div></div>
        <div class="ss-item"><div class="ss-v muted">{{d()?.avg_days_to_close??'—'}}d</div><div class="ss-l">Avg to Close</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex2"><div class="ch-title">CAPA Trend — 12 Months</div><canvas id="capaTrend" height="145"></canvas></div>
        <div class="card flex1"><div class="ch-title">By Type</div><div class="dnu"><canvas id="capaType" width="155" height="155"></canvas></div><div id="capaTypeL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">By Priority</div><div class="dnu"><canvas id="capaPri" width="155" height="155"></canvas></div><div id="capaPriL" class="leg"></div></div>
      </div>
    }

    <!-- ═══════════════ RISK ═══════════════ -->
    @if (activeTab()==='risk' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v red">{{byKey(d()?.by_level,'risk_level','critical')}}</div><div class="ss-l">Critical</div></div>
        <div class="ss-item"><div class="ss-v ora">{{byKey(d()?.by_level,'risk_level','high')}}</div><div class="ss-l">High</div></div>
        <div class="ss-item"><div class="ss-v warn">{{byKey(d()?.by_level,'risk_level','medium')}}</div><div class="ss-l">Medium</div></div>
        <div class="ss-item"><div class="ss-v grn">{{byKey(d()?.by_level,'risk_level','low')}}</div><div class="ss-l">Low</div></div>
        <div class="ss-item"><div class="ss-v">{{tot(d()?.by_level)}}</div><div class="ss-l">Total</div></div>
      </div>
      <div class="ch-row" style="align-items:flex-start">
        <div class="card heat-card">
          <div class="ch-title">Risk Heat Matrix — Likelihood × Impact</div>
          <div class="heat-outer">
            <div class="heat-ylabel">{{ ar()?'الاحتمال ↑':'Likelihood ↑' }}</div>
            <div class="heat-inner">
              @for (l of [5,4,3,2,1]; track l) {
                <div class="heat-row">
                  <span class="heat-ax">{{l}}</span>
                  @for (i of [1,2,3,4,5]; track i) {
                    <div class="heat-cell" [class]="hCls(l,i)" [title]="hTip(l,i)">{{ hN(l,i) }}</div>
                  }
                </div>
              }
              <div class="heat-xrow"><span class="heat-ax"></span>@for(i of [1,2,3,4,5];track i){<div class="heat-xl">{{i}}</div>}</div>
            </div>
          </div>
          <div class="heat-leg"><span class="hl hl-l">Low</span><span class="hl hl-m">Medium</span><span class="hl hl-h">High</span><span class="hl hl-c">Critical</span></div>
        </div>
        <div class="flex1" style="display:flex;flex-direction:column;gap:12px">
          <div class="card"><div class="ch-title">By Category</div><canvas id="riskCat" height="130"></canvas></div>
          <div class="card"><div class="ch-title">Treatment Strategy</div><div class="dnu"><canvas id="riskTreat" width="155" height="120"></canvas></div><div id="riskTreatL" class="leg"></div></div>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="ch-title">Top 10 Risks by Score</div>
        <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Level</th><th>L</th><th>I</th><th>Score</th><th>Treatment</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>@for(r of d()?.top_risks||[];track r.id){
            <tr><td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
              <td><span class="badge" [class]="rCls(r.risk_level)">{{r.risk_level}}</span></td>
              <td class="tc">{{r.likelihood}}</td><td class="tc">{{r.impact}}</td>
              <td><span class="score-pill" [class]="rCls(r.risk_level)">{{r.score}}</span></td>
              <td class="sm">{{r.treatment_strategy}}</td><td class="sm">{{r.owner||'—'}}</td>
              <td class="sm">{{r.status?.replace('_',' ')}}</td></tr>}
          </tbody>
        </table>
      </div>
    }

    <!-- ═══════════════ COMPLAINTS analytics ═══════════════ -->
    @if (activeTab()==='complaints' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v">{{tot(d()?.by_status)}}</div><div class="ss-l">Total</div></div>
        <div class="ss-item"><div class="ss-v grn">{{byKey(d()?.by_status,'status','resolved')+byKey(d()?.by_status,'status','closed')}}</div><div class="ss-l">Resolved</div></div>
        <div class="ss-item"><div class="ss-v muted">{{d()?.avg_resolution_h??'—'}}h</div><div class="ss-l">Avg Resolution</div></div>
        <div class="ss-item"><div class="ss-v" [style.color]="satCol(d()?.avg_satisfaction)">{{d()?.avg_satisfaction??'—'}}/5</div><div class="ss-l">Satisfaction</div></div>
        <div class="ss-item"><div class="ss-v red">{{byKey(d()?.by_severity,'severity','critical')}}</div><div class="ss-l">Critical</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex2"><div class="ch-title">Complaint Trend — 12 Months</div><canvas id="compTrend" height="145"></canvas></div>
        <div class="card flex1"><div class="ch-title">By Severity</div><div class="dnu"><canvas id="compSev" width="155" height="155"></canvas></div><div id="compSevL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">By Source</div><div class="dnu"><canvas id="compSrc" width="155" height="155"></canvas></div><div id="compSrcL" class="leg"></div></div>
      </div>
      <div class="card" style="margin-top:0">
        <div class="ch-title">Top Clients by Complaints</div>
        @for (c of d()?.top_clients||[];track c.name) {
          <div class="top-bar-row">
            <span class="tbr-name">{{c.name}}</span>
            <div class="tbr-bar"><div [style.width.%]="pct(c.total,tot(d()?.top_clients||[]))"></div></div>
            <span class="tbr-val">{{c.total}}</span>
          </div>
        }
      </div>
    }

    <!-- ═══════════════ AUDITS ═══════════════ -->
    @if (activeTab()==='audits' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v">{{tot(d()?.by_status)}}</div><div class="ss-l">Total</div></div>
        <div class="ss-item"><div class="ss-v acc">{{d()?.completion_rate??'—'}}%</div><div class="ss-l">Completion</div></div>
        <div class="ss-item"><div class="ss-v red">{{d()?.findings?.open??'—'}}</div><div class="ss-l">Open Findings</div></div>
        <div class="ss-item"><div class="ss-v grn">{{d()?.findings?.closed??'—'}}</div><div class="ss-l">Closed Findings</div></div>
        <div class="ss-item"><div class="ss-v">{{d()?.findings?.total??'—'}}</div><div class="ss-l">Total Findings</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex1"><div class="ch-title">By Type</div><div class="dnu"><canvas id="audType" width="155" height="155"></canvas></div><div id="audTypeL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">By Status</div><div class="dnu"><canvas id="audSt" width="155" height="155"></canvas></div><div id="audStL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">Finding Types</div><div class="dnu"><canvas id="findType" width="155" height="155"></canvas></div><div id="findTypeL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">Finding Priority</div><div class="dnu"><canvas id="findPri" width="155" height="155"></canvas></div><div id="findPriL" class="leg"></div></div>
      </div>
      <div class="card">
        <div class="ch-title">Recent Audits</div>
        <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Type</th><th>Status</th><th>Planned</th><th>Result</th><th>Lead Auditor</th></tr></thead>
          <tbody>@for(a of d()?.recent||[];track a.id){
            <tr><td><span class="ref">{{a.reference_no}}</span></td><td class="td-t">{{a.title}}</td>
              <td class="sm">{{a.type}}</td>
              <td><span class="badge" [class]="auditCls(a.status)">{{a.status?.replace('_',' ')}}</span></td>
              <td class="sm">{{a.planned_start_date|date:'dd MMM yy'}}</td>
              <td class="sm">{{a.overall_result||'—'}}</td><td class="sm">{{a.lead_auditor||'—'}}</td></tr>}
          </tbody>
        </table>
      </div>
    }

    <!-- ═══════════════ SLA ═══════════════ -->
    @if (activeTab()==='sla' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v" [style.color]="slaCol(d()?.overall_rate)">{{d()?.overall_rate!=null?(d()?.overall_rate+'%'):'N/A'}}</div><div class="ss-l">Overall</div></div>
        <div class="ss-item"><div class="ss-v acc">{{d()?.total_active??'—'}}</div><div class="ss-l">Active SLAs</div></div>
        <div class="ss-item"><div class="ss-v" [style.color]="d()?.breaches_30d>0?'var(--danger)':'var(--success)'">{{d()?.breaches_30d??'0'}}</div><div class="ss-l">Breaches (30d)</div></div>
      </div>
      @if (!d()?.slas?.length) {
        <div class="empty-st"><i class="fas fa-file-contract"></i><div>No SLA data. Create SLA definitions first.</div></div>
      } @else {
        <div class="sla-list">
          @for (s of d()?.slas||[];track s.id) {
            <div class="sla-row" [class]="'sla-'+s.status">
              <div class="sla-info"><div class="sla-name">{{s.name}}</div>
                <div class="sla-tags">
                  @if(s.client){<span class="tag"><i class="fas fa-building-user"></i>{{s.client}}</span>}
                  @if(s.department){<span class="tag"><i class="fas fa-sitemap"></i>{{s.department}}</span>}
                </div>
              </div>
              <div class="sla-bar-wrap">
                <div class="sla-track"><div class="sla-fill" [style.width.%]="s.compliance_rate??0" [class]="'slaf-'+s.status"></div></div>
                <span class="sla-pct" [class]="'slap-'+s.status">{{s.compliance_rate!=null?(s.compliance_rate+'%'):'—'}}</span>
              </div>
              <div class="sla-pills">
                <span class="sp sp-m">{{s.met}} met</span>
                <span class="sp sp-w">{{s.warning}} warn</span>
                <span class="sp sp-b">{{s.breached}} breach</span>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- ═══════════════ OKR ═══════════════ -->
    @if (activeTab()==='okr' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v">{{d()?.summary?.total??'—'}}</div><div class="ss-l">Total</div></div>
        <div class="ss-item"><div class="ss-v" [style.color]="progCol(d()?.summary?.avg_progress)">{{d()?.summary?.avg_progress??'—'}}%</div><div class="ss-l">Avg Progress</div></div>
        <div class="ss-item"><div class="ss-v grn">{{d()?.summary?.on_track??'—'}}</div><div class="ss-l">On Track</div></div>
        <div class="ss-item"><div class="ss-v warn">{{d()?.summary?.at_risk??'—'}}</div><div class="ss-l">At Risk</div></div>
        <div class="ss-item"><div class="ss-v red">{{d()?.summary?.behind??'—'}}</div><div class="ss-l">Behind</div></div>
        <div class="ss-item"><div class="ss-v acc2">{{d()?.summary?.completed??'—'}}</div><div class="ss-l">Completed</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex1"><div class="ch-title">By Type</div><div class="dnu"><canvas id="okrType" width="155" height="155"></canvas></div><div id="okrTypeL" class="leg"></div></div>
        <div class="card flex2"><div class="ch-title">By Department</div><canvas id="okrDept" height="155"></canvas></div>
      </div>
      <div class="okr-list">
        @for (o of d()?.objectives||[];track o.id) {
          <div class="okr-row">
            <span class="okr-type" [class]="'okrt-'+o.type">{{o.type}}</span>
            <div class="okr-mid"><div class="okr-title">{{o.title}}</div><div class="okr-sub">{{o.owner||'—'}}@if(o.department){ · {{o.department}}} · {{o.key_results_done}}/{{o.key_results_count}} KRs</div></div>
            <div class="okr-right">
              <div class="okr-bar"><div [style.width.%]="o.progress_percent" [class]="okrFill(o.progress_percent)"></div></div>
              <span class="okr-pct" [style.color]="progCol(o.progress_percent)">{{o.progress_percent}}%</span>
              <span class="badge" [class]="okrStCls(o.status,o.progress_percent)">{{okrLbl(o.status,o.progress_percent)}}</span>
            </div>
          </div>
        }
      </div>
    }

    <!-- ═══════════════ VENDORS ═══════════════ -->
    @if (activeTab()==='vendors' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v">{{d()?.contract_summary?.active??'—'}}</div><div class="ss-l">Active Contracts</div></div>
        <div class="ss-item"><div class="ss-v warn">{{d()?.contract_summary?.expiring??'0'}}</div><div class="ss-l">Expiring (60d)</div></div>
        <div class="ss-item"><div class="ss-v acc2">{{(d()?.contract_summary?.total_value??0)|number:'1.0-0'}}</div><div class="ss-l">Total Value</div></div>
        <div class="ss-item"><div class="ss-v grn">{{byKey(d()?.by_qualification,'qualification_status','qualified')}}</div><div class="ss-l">Qualified</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex1"><div class="ch-title">By Category</div><canvas id="vCat" height="155"></canvas></div>
        <div class="card flex1"><div class="ch-title">By Status</div><div class="dnu"><canvas id="vSt" width="155" height="155"></canvas></div><div id="vStL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">Qualification</div><div class="dnu"><canvas id="vQual" width="155" height="155"></canvas></div><div id="vQualL" class="leg"></div></div>
      </div>
      <div class="card">
        <div class="ch-title">Vendor Performance Table</div>
        <table class="table"><thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Status</th><th>Qualification</th><th>Avg Score</th><th>Evals</th><th>Contracts</th><th>Expiring</th></tr></thead>
          <tbody>@for(v of d()?.vendors||[];track v.id){
            <tr><td><span class="ref">{{v.code}}</span></td><td class="td-t fw6">{{v.name}}</td><td class="sm">{{v.category}}</td>
              <td><span class="badge" [class]="vStCls(v.status)">{{v.status}}</span></td>
              <td><span class="badge" [class]="qualCls(v.qualification_status)">{{v.qualification_status}}</span></td>
              <td>@if(v.avg_eval_score!=null){<span [style.color]="scoreCol(v.avg_eval_score)" class="fw7">{{v.avg_eval_score}}</span>}@else{<span class="muted">—</span>}</td>
              <td class="tc sm">{{v.eval_count}}</td><td class="tc acc">{{v.active_contracts}}</td>
              <td class="tc" [style.color]="v.expiring_contracts>0?'var(--warning)':'var(--text3)'">{{v.expiring_contracts||'—'}}</td></tr>}
          </tbody>
        </table>
      </div>
    }

    <!-- ═══════════════ VISITS ═══════════════ -->
    @if (activeTab()==='visits' && !loading()) {
      <div class="stat-strip">
        <div class="ss-item"><div class="ss-v acc">{{d()?.summary?.total??'—'}}</div><div class="ss-l">Total Visits</div></div>
        <div class="ss-item"><div class="ss-v grn">{{d()?.summary?.completed??'—'}}</div><div class="ss-l">Completed</div></div>
        <div class="ss-item"><div class="ss-v" [style.color]="d()?.summary?.completion_rate>=80?'var(--success)':'var(--warning)'">{{d()?.summary?.completion_rate??'—'}}%</div><div class="ss-l">Completion Rate</div></div>
        <div class="ss-item"><div class="ss-v red">{{d()?.summary?.cancelled??'—'}}</div><div class="ss-l">Cancelled</div></div>
        <div class="ss-item"><div class="ss-v" [style.color]="satCol(d()?.summary?.avg_rating)">{{d()?.summary?.avg_rating??'—'}}/5</div><div class="ss-l">Avg Rating</div></div>
        <div class="ss-item"><div class="ss-v acc2">{{d()?.summary?.virtual??'—'}}</div><div class="ss-l">Virtual</div></div>
        <div class="ss-item"><div class="ss-v red">{{d()?.summary?.open_findings??'—'}}</div><div class="ss-l">Open Findings</div></div>
      </div>
      <div class="ch-row">
        <div class="card flex2"><div class="ch-title">Visit Trend — 12 Months</div><canvas id="visitTrend" height="145"></canvas></div>
        <div class="card flex1"><div class="ch-title">By Type</div><div class="dnu"><canvas id="visitType" width="155" height="155"></canvas></div><div id="visitTypeL" class="leg"></div></div>
        <div class="card flex1"><div class="ch-title">By Status</div><div class="dnu"><canvas id="visitStatus" width="155" height="155"></canvas></div><div id="visitStatusL" class="leg"></div></div>
      </div>
      <div class="ch-row">
        <div class="card flex1"><div class="ch-title">Top Clients by Visits</div><canvas id="visitClient" height="140"></canvas></div>
        <div class="card flex1"><div class="ch-title">Findings by Type</div><div class="dnu"><canvas id="findingType" width="155" height="140"></canvas></div><div id="findingTypeL" class="leg"></div></div>
      </div>
      <div class="card">
        <div class="ch-title">Recent Visits</div>
        <table class="table"><thead><tr><th>Ref</th><th>Client</th><th>Type</th><th>Status</th><th>Date</th><th>Host</th><th>Rating</th><th>Virtual</th></tr></thead>
          <tbody>@for(v of d()?.recent||[];track v.id){
            <tr>
              <td><span class="ref">{{v.reference_no}}</span></td>
              <td class="td-t">{{v.client||'—'}}</td>
              <td class="sm">{{fmtSlug(v.type)}}</td>
              <td><span class="badge" [class]="visitStCls(v.status)">{{fmtSlug(v.status)}}</span></td>
              <td class="sm">{{v.visit_date|date:'dd MMM yy'}}</td>
              <td class="sm">{{v.host||'—'}}</td>
              <td class="tc">@if(v.rating){<span style="color:#f59e0b">{{ratingStars(v.rating)}}</span>}@else{<span class="muted">—</span>}</td>
              <td class="tc">@if(v.is_virtual){<i class="fas fa-video" style="color:var(--accent)"></i>}@else{<span class="muted">—</span>}</td>
            </tr>}
          </tbody>
        </table>
      </div>
    }

    <!-- ═══════════════ RECORD TABS ═══════════════ -->
    @if (isRecordTab() && !loading()) {
      <!-- Filter bar -->
      <div class="rec-filters">
        @if (recFilters()?.statuses?.length) {
          <select class="flt-sel" [(ngModel)]="fStatus" (change)="reload()">
            <option value="">All Statuses</option>
            @for (s of recFilters()?.statuses||[];track s) { <option [value]="s">{{s|titlecase}}</option> }
          </select>
        }
        @if (recFilters()?.severities?.length) {
          <select class="flt-sel" [(ngModel)]="fSeverity" (change)="reload()">
            <option value="">All Severities</option>
            @for (s of recFilters()?.severities||[];track s) { <option [value]="s">{{s|titlecase}}</option> }
          </select>
        }
        @if (recFilters()?.priorities?.length) {
          <select class="flt-sel" [(ngModel)]="fPriority" (change)="reload()">
            <option value="">All Priorities</option>
            @for (p of recFilters()?.priorities||[];track p) { <option [value]="p">{{p|titlecase}}</option> }
          </select>
        }
        @if (recFilters()?.types?.length) {
          <select class="flt-sel" [(ngModel)]="fType" (change)="reload()">
            <option value="">All Types</option>
            @for (t of recFilters()?.types||[];track t) { <option [value]="t">{{t|titlecase}}</option> }
          </select>
        }
        @if (recFilters()?.levels?.length) {
          <select class="flt-sel" [(ngModel)]="fLevel" (change)="reload()">
            <option value="">All Levels</option>
            @for (l of recFilters()?.levels||[];track l) { <option [value]="l">{{l|titlecase}}</option> }
          </select>
        }
        <span class="rec-total">{{ recTotal() }} records</span>
        <button class="flt-clr" (click)="clearFilters()"><i class="fas fa-filter-slash"></i> Clear</button>
      </div>

      <!-- Summary chips -->
      <div class="rec-chips">
        @for (c of recSummary(); track c.label) {
          <div class="rec-chip" [class]="c.cls"><div class="rc-v">{{c.value}}</div><div class="rc-l">{{c.label}}</div></div>
        }
      </div>

      <!-- Records Pagination -->
      @if (recLastPage() > 1) {
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:12px;color:var(--text2)">Page {{ recPage() }} of {{ recLastPage() }}</span>
          <button class="exp-btn" [disabled]="recPage()<=1" (click)="prevRecPage()">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="exp-btn" [disabled]="recPage()>=recLastPage()" (click)="nextRecPage()">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      }

      @if (!recRows().length) {
        <div class="empty-st"><i class="fas fa-inbox"></i><div>No records. Adjust filters or date range.</div></div>
      } @else {
        <div class="table-wrap">
          <!-- Complaints records -->
          @if (activeTab()==='rec_complaints') {
            <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Severity</th><th>Status</th><th>Source</th><th>Client</th><th>Department</th><th>Assignee</th><th>Received</th><th>Target</th><th>Resolved</th><th>Satisfaction</th><th>Regulatory</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr>
                <td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
                <td><span class="badge" [class]="sevCls(r.severity)">{{r.severity}}</span></td>
                <td><span class="badge" [class]="compStCls(r.status)">{{r.status|titlecase}}</span></td>
                <td class="sm">{{r.source}}</td><td class="sm">{{r.client||'—'}}</td><td class="sm">{{r.department||'—'}}</td><td class="sm">{{r.assignee||'—'}}</td>
                <td class="sm">{{r.received_date|date:'dd MMM yy'}}</td>
                <td class="sm" [class.ov]="isOv(r.target_resolution,r.status)">{{r.target_resolution|date:'dd MMM yy'}}</td>
                <td class="sm">{{r.actual_resolution|date:'dd MMM yy'}}</td>
                <td class="tc sm">{{r.customer_satisfaction?(r.customer_satisfaction+'/5'):'—'}}</td>
                <td class="tc">@if(r.is_regulatory){<i class="fas fa-check" style="color:var(--danger)"></i>}@else{<span class="muted">—</span>}</td>
              </tr>}</tbody>
            </table>
          }
          <!-- NC records -->
          @if (activeTab()==='rec_ncs') {
            <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Severity</th><th>Status</th><th>Source</th><th>Department</th><th>Assigned To</th><th>Detected</th><th>Target Closure</th><th>Actual Closure</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr>
                <td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
                <td><span class="badge" [class]="sevCls(r.severity)">{{r.severity}}</span></td>
                <td><span class="badge" [class]="ncStCls(r.status)">{{r.status?.replace('_',' ')}}</span></td>
                <td class="sm">{{r.source}}</td><td class="sm">{{r.department||'—'}}</td><td class="sm">{{r.assigned_to||'—'}}</td>
                <td class="sm">{{r.detection_date|date:'dd MMM yy'}}</td>
                <td class="sm" [class.ov]="isOv(r.target_closure,r.status)">{{r.target_closure|date:'dd MMM yy'}}</td>
                <td class="sm">{{r.actual_closure|date:'dd MMM yy'}}</td>
              </tr>}</tbody>
            </table>
          }
          <!-- CAPA records -->
          @if (activeTab()==='rec_capas') {
            <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Owner</th><th>Department</th><th>Target</th><th>Completed</th><th>Days Open</th><th>Overdue</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr [class.row-ov]="r.is_overdue">
                <td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
                <td class="sm">{{r.type}}</td>
                <td><span class="badge" [class]="priCls(r.priority)">{{r.priority}}</span></td>
                <td><span class="badge" [class]="capaStCls(r.status)">{{r.status}}</span></td>
                <td class="sm">{{r.owner||'—'}}</td><td class="sm">{{r.department||'—'}}</td>
                <td class="sm" [class.ov]="r.is_overdue">{{r.target_date|date:'dd MMM yy'}}</td>
                <td class="sm">{{r.actual_completion|date:'dd MMM yy'}}</td>
                <td class="tc sm">{{r.days_open}}d</td>
                <td class="tc">@if(r.is_overdue){<span class="badge badge-red">Yes</span>}@else{<span class="muted">—</span>}</td>
              </tr>}</tbody>
            </table>
          }
          <!-- Risk records -->
          @if (activeTab()==='rec_risks') {
            <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Level</th><th>L</th><th>I</th><th>Score</th><th>Status</th><th>Category</th><th>Treatment</th><th>Owner</th><th>Next Review</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr>
                <td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
                <td><span class="badge" [class]="rCls(r.risk_level)">{{r.risk_level}}</span></td>
                <td class="tc">{{r.likelihood}}</td><td class="tc">{{r.impact}}</td>
                <td><span class="score-pill" [class]="rCls(r.risk_level)">{{r.score}}</span></td>
                <td class="sm">{{r.status?.replace('_',' ')}}</td><td class="sm">{{r.category||'—'}}</td>
                <td class="sm">{{r.treatment_strategy||'—'}}</td><td class="sm">{{r.owner||'—'}}</td>
                <td class="sm">{{r.next_review_date|date:'dd MMM yy'}}</td>
              </tr>}</tbody>
            </table>
          }
          <!-- Audit records -->
          @if (activeTab()==='rec_audits') {
            <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Type</th><th>Status</th><th>Result</th><th>Lead Auditor</th><th>Department</th><th>Planned Start</th><th>Planned End</th><th>Findings</th><th>Open</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr>
                <td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
                <td class="sm">{{r.type}}</td>
                <td><span class="badge" [class]="auditCls(r.status)">{{r.status?.replace('_',' ')}}</span></td>
                <td class="sm">{{r.overall_result||'—'}}</td><td class="sm">{{r.lead_auditor||'—'}}</td><td class="sm">{{r.department||'—'}}</td>
                <td class="sm">{{r.planned_start_date|date:'dd MMM yy'}}</td>
                <td class="sm">{{r.planned_end_date|date:'dd MMM yy'}}</td>
                <td class="tc sm">{{r.findings_count}}</td>
                <td class="tc sm" [style.color]="r.open_findings>0?'var(--danger)':'var(--text3)'">{{r.open_findings||'—'}}</td>
              </tr>}</tbody>
            </table>
          }
          <!-- Request records -->
          @if (activeTab()==='rec_requests') {
            <table class="table"><thead><tr><th>Ref</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Requester</th><th>Assignee</th><th>Department</th><th>Due Date</th><th>Closed</th><th>Overdue</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr [class.row-ov]="r.is_overdue">
                <td><span class="ref">{{r.reference_no}}</span></td><td class="td-t">{{r.title}}</td>
                <td class="sm">{{r.type}}</td>
                <td><span class="badge" [class]="priCls(r.priority)">{{r.priority}}</span></td>
                <td><span class="badge" [class]="reqStCls(r.status)">{{r.status}}</span></td>
                <td class="sm">{{r.requester||'—'}}</td><td class="sm">{{r.assignee||'—'}}</td><td class="sm">{{r.department||'—'}}</td>
                <td class="sm" [class.ov]="r.is_overdue">{{r.due_date|date:'dd MMM yy'}}</td>
                <td class="sm">{{r.closed_at|date:'dd MMM yy'}}</td>
                <td class="tc">@if(r.is_overdue){<span class="badge badge-red">Yes</span>}@else{<span class="muted">—</span>}</td>
              </tr>}</tbody>
            </table>
          }
          <!-- Visit records -->
          @if (activeTab()==='rec_visits') {
            <table class="table"><thead><tr><th>Ref</th><th>Client</th><th>Type</th><th>Status</th><th>Date</th><th>Host</th><th>Location</th><th>Duration(h)</th><th>Virtual</th><th>Rating</th><th>Follow-Up</th><th>Findings</th><th>Open</th></tr></thead>
              <tbody>@for(r of recRows();track r.id){<tr>
                <td><span class="ref">{{r.reference_no}}</span></td>
                <td class="sm">{{r.client||'—'}}</td>
                <td class="sm">{{r.type}}</td>
                <td><span class="badge" [class]="reqStCls(r.status)">{{r.status}}</span></td>
                <td class="sm">{{r.visit_date|date:'dd MMM yy'}}</td>
                <td class="sm">{{r.host||'—'}}</td>
                <td class="sm">{{r.location||'—'}}</td>
                <td class="tc">{{r.duration_hours||'—'}}</td>
                <td class="tc">@if(r.is_virtual){<span class="badge badge-blue">Yes</span>}@else{<span class="muted">No</span>}</td>
                <td class="tc">{{r.rating||'—'}}</td>
                <td class="sm">{{r.follow_up_date|date:'dd MMM yy'}}</td>
                <td class="tc">{{r.findings_count||0}}</td>
                <td class="tc">@if(r.open_findings>0){<span class="badge badge-red">{{r.open_findings}}</span>}@else{<span class="muted">0</span>}</td>
              </tr>}</tbody>
            </table>
          }
        </div>
      }
    }

  </div><!-- /rpt-body -->
</div><!-- /rpt-shell -->
@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    :host { display:block; }
    .rpt-shell { display:flex; min-height:calc(100vh - 60px); }

    /* Sidebar */
    .rpt-aside { width:200px; flex-shrink:0; background:var(--surface); border-right:1px solid var(--border); border-radius:14px 0 0 14px; padding:0 0 12px; display:flex; flex-direction:column; overflow-y:auto; }
    .aside-header { display:flex; align-items:center; gap:8px; padding:14px 16px 12px; border-bottom:1px solid var(--border); font-family:'Inter',sans-serif; font-size:14px; font-weight:800; color:var(--accent); }
    .aside-group { font-size:10px; font-weight:700; color:var(--text3); letter-spacing:1px; text-transform:uppercase; padding:10px 16px 3px; }
    .aside-btn { display:flex; align-items:center; gap:8px; padding:7px 16px; border:none; background:none; color:var(--text2); font-size:12px; font-weight:500; cursor:pointer; font-family:'Inter',sans-serif; text-align:left; width:100%; transition:all .13s; border-left:2px solid transparent; }
    .aside-btn:hover { background:var(--surface2); color:var(--text); }
    .aside-btn.active { background:rgba(59,130,246,.1); color:var(--accent); border-left-color:var(--accent); font-weight:700; }
    .aside-btn i { width:13px; text-align:center; font-size:11px; }
    .aside-spacer { flex:1; min-height:8px; }
    .aside-dr { display:flex; align-items:center; gap:6px; padding:4px 12px 8px; flex-wrap:wrap; }
    .aside-dr input { background:var(--surface2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:10px; padding:4px 6px; width:100%; outline:none; font-family:'Inter',sans-serif; }
    .aside-dr span { font-size:11px; color:var(--text3); }
    .exp-btn { display:flex; align-items:center; gap:6px; margin:2px 10px; padding:6px 10px; border:1px solid var(--border); border-radius:7px; background:none; color:var(--text2); font-size:11px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all .13s; }
    .exp-btn:hover:not([disabled]) { background:var(--surface2); color:var(--text); }
    .exp-btn[disabled] { opacity:.35; cursor:default; }

    /* Body */
    .rpt-body { flex:1; padding:18px; min-width:0; background:var(--bg); border-radius:0 14px 14px 0; display:flex; flex-direction:column; gap:12px; }
    .rpt-topbar { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:8px; }
    .rpt-title { font-family:'Inter',sans-serif; font-size:17px; font-weight:800; }
    .rpt-sub { font-size:11px; color:var(--text2); margin-top:2px; }
    .search-box { display:flex; align-items:center; gap:7px; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:6px 11px; min-width:240px; }
    .search-box i { color:var(--text3); font-size:11px; }
    .search-box input { background:none; border:none; outline:none; color:var(--text); font-size:12px; font-family:'Inter',sans-serif; flex:1; }
    .search-box button { background:none; border:none; color:var(--text3); cursor:pointer; padding:0; font-size:10px; }
    .spinning { animation:spin .8s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    /* Skeleton */
    .loading-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .sk-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; animation:shimmer 1.5s infinite ease-in-out; }
    .sk-h { height:10px; width:60%; background:var(--border); border-radius:3px; margin-bottom:10px; }
    .sk-v { height:26px; width:40%; background:var(--border); border-radius:3px; margin-bottom:10px; }
    .sk-b { height:5px; width:100%; background:var(--border); border-radius:3px; }
    .sk-chart { height:180px; background:var(--surface); border:1px solid var(--border); border-radius:12px; animation:shimmer 1.5s infinite ease-in-out; }
    @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.9} }

    /* Band */
    .band { display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:10px 0; }
    .bc { flex:1; text-align:center; padding:4px 12px; }
    .bv { font-family:'Inter',sans-serif; font-size:22px; font-weight:800; }
    .bl { font-size:10px; color:var(--text2); margin-top:1px; }
    .bd { width:1px; height:28px; background:var(--border); }
    .health-val { font-size:20px !important; }

    /* KPI */
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px; }
    .kpi-card { background:var(--surface); border:1px solid var(--border); border-radius:13px; padding:16px; transition:border-color .15s; }
    .kpi-card.kgood { border-color:rgba(16,185,129,.28); }
    .kpi-card.kwarn { border-color:rgba(245,158,11,.28); }
    .kpi-card.kbad  { border-color:rgba(239,68,68,.28); }
    .kpi-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .kpi-ico { width:36px; height:36px; border-radius:9px; display:grid; place-items:center; font-size:14px; }
    .ico-blue   { background:rgba(59,130,246,.15);  color:var(--accent); }
    .ico-green  { background:rgba(16,185,129,.15);  color:var(--success); }
    .ico-danger { background:rgba(239,68,68,.15);   color:var(--danger); }
    .ico-warning{ background:rgba(245,158,11,.15);  color:var(--warning); }
    .ico-orange { background:rgba(249,115,22,.15);  color:#fb923c; }
    .ico-purple { background:rgba(99,102,241,.15);  color:var(--accent2); }
    .kpi-badge { font-size:10px; font-weight:700; padding:2px 7px; border-radius:7px; }
    .kgood-badge,.kst-good { background:rgba(16,185,129,.15); color:var(--success); }
    .kwarn-badge,.kst-warn { background:rgba(245,158,11,.15); color:var(--warning); }
    .kbad-badge,.kst-bad   { background:rgba(239,68,68,.15);  color:var(--danger); }
    .kst-na { background:var(--surface2); color:var(--text3); }
    .kpi-num { font-family:'Inter',sans-serif; font-size:30px; font-weight:800; line-height:1; margin-bottom:4px; }
    .kpi-lbl { font-size:11px; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:.4px; }
    .kpi-tgt { font-size:10px; color:var(--text3); margin-top:2px; }
    .kpi-bar { height:4px; background:var(--border); border-radius:2px; margin-top:10px; position:relative; overflow:hidden; }
    .kpi-bar > div:first-child { height:100%; border-radius:2px; transition:width .7s; }
    .kfill-blue   { background:var(--accent); }   .kfill-green { background:var(--success); }
    .kfill-danger { background:var(--danger); }   .kfill-warning { background:var(--warning); }
    .kfill-orange { background:#fb923c; }          .kfill-purple  { background:var(--accent2); }
    .kpi-mk { position:absolute; top:0; bottom:0; width:2px; background:rgba(255,255,255,.2); }
    .kpi-delta { font-size:10px; margin-top:4px; font-weight:600; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .kpi-status-list { display:flex; flex-direction:column; gap:7px; padding:4px 0; }
    .ks-row { display:flex; align-items:center; gap:8px; }
    .ks-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .ks-dot.kst-good { background:var(--success); } .ks-dot.kst-warn { background:var(--warning); } .ks-dot.kst-bad { background:var(--danger); } .ks-dot.kst-na { background:var(--text3); }
    .ks-name { flex:1; font-size:12px; color:var(--text2); }
    .ks-val { font-family:'Inter',sans-serif; font-size:13px; font-weight:800; }
    .ks-tgt { font-size:10px; color:var(--text3); }

    /* Stat strip */
    .stat-strip { display:flex; flex-wrap:wrap; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:10px 0; }
    .ss-item { flex:1; min-width:80px; text-align:center; padding:4px 12px; border-right:1px solid var(--border); }
    .ss-item:last-child { border-right:none; }
    .ss-v { font-family:'Inter',sans-serif; font-size:20px; font-weight:800; }
    .ss-l { font-size:10px; color:var(--text2); margin-top:1px; }
    .red  { color:var(--danger); }  .grn { color:var(--success); }
    .warn { color:var(--warning); } .muted { color:var(--text2); }
    .ora  { color:#fb923c; }        .acc  { color:var(--accent); }  .acc2 { color:var(--accent2); }
    .fw6  { font-weight:600; }      .fw7  { font-family:'Inter',sans-serif; font-weight:700; }
    .tc   { text-align:center; }    .sm   { font-size:11px; color:var(--text2); white-space:nowrap; }

    /* Charts */
    .ch-row { display:flex; gap:10px; flex-wrap:wrap; }
    .flex1  { flex:1; min-width:140px; } .flex2 { flex:2; min-width:220px; }
    .card   { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; }
    .ch-title { font-size:12px; font-weight:700; color:var(--text2); margin-bottom:10px; text-transform:uppercase; letter-spacing:.4px; }
    .ch-c   { display:flex; justify-content:center; }
    .dnu    { display:flex; justify-content:center; }
    .leg    { display:flex; flex-wrap:wrap; gap:5px; padding:6px 0 0; justify-content:center; }

    /* Heat map */
    .heat-card { flex:1.8; min-width:260px; }
    .heat-outer { display:flex; align-items:center; gap:8px; }
    .heat-ylabel { writing-mode:vertical-rl; transform:rotate(180deg); font-size:9px; color:var(--text3); font-weight:700; }
    .heat-inner { flex:1; }
    .heat-row { display:flex; gap:3px; margin-bottom:3px; align-items:center; }
    .heat-ax { width:14px; font-size:10px; color:var(--text3); text-align:center; flex-shrink:0; }
    .heat-cell { flex:1; aspect-ratio:1; border-radius:5px; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; font-size:12px; font-weight:800; min-height:32px; cursor:default; }
    .h-low  { background:rgba(16,185,129,.18); color:#10b981; }
    .h-med  { background:rgba(245,158,11,.22);  color:#f59e0b; }
    .h-high { background:rgba(249,115,22,.28);  color:#fb923c; }
    .h-crit { background:rgba(239,68,68,.32);   color:#ef4444; }
    .heat-xrow { display:flex; margin-top:3px; }
    .heat-xl { flex:1; text-align:center; font-size:10px; color:var(--text3); }
    .heat-leg { display:flex; gap:8px; flex-wrap:wrap; padding:8px 0 0; }
    .hl { font-size:10px; padding:2px 6px; border-radius:5px; font-weight:700; }
    .hl-l { background:rgba(16,185,129,.12); color:var(--success); } .hl-m { background:rgba(245,158,11,.12); color:var(--warning); }
    .hl-h { background:rgba(249,115,22,.12); color:#fb923c; }        .hl-c { background:rgba(239,68,68,.12); color:var(--danger); }
    .score-pill { display:inline-block; padding:1px 6px; border-radius:5px; font-family:'Inter',sans-serif; font-weight:700; font-size:11px; }

    /* Top bar chart */
    .top-bar-row { display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid var(--border); }
    .top-bar-row:last-child { border-bottom:none; }
    .tbr-name { font-size:12px; font-weight:600; min-width:90px; }
    .tbr-bar  { flex:1; height:5px; background:var(--border); border-radius:3px; overflow:hidden; }
    .tbr-bar div { height:100%; background:var(--danger); border-radius:3px; }
    .tbr-val  { font-family:'Inter',sans-serif; font-size:13px; font-weight:800; color:var(--danger); }

    /* SLA */
    .sla-list { display:flex; flex-direction:column; gap:8px; }
    .sla-row  { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .sla-good    { border-color:rgba(16,185,129,.3); } .sla-warning { border-color:rgba(245,158,11,.3); } .sla-critical { border-color:rgba(239,68,68,.3); }
    .sla-info { min-width:140px; }
    .sla-name { font-weight:700; font-size:13px; }
    .sla-tags { display:flex; gap:8px; flex-wrap:wrap; margin-top:2px; }
    .tag { font-size:10px; color:var(--text2); display:flex; align-items:center; gap:3px; }
    .sla-bar-wrap { flex:1; min-width:100px; display:flex; align-items:center; gap:9px; }
    .sla-track { flex:1; height:7px; background:var(--border); border-radius:4px; overflow:hidden; }
    .sla-fill  { height:100%; border-radius:4px; transition:width .7s; }
    .slaf-good { background:var(--success); } .slaf-warning { background:var(--warning); } .slaf-critical { background:var(--danger); } .slaf-no_data { background:var(--text3); }
    .sla-pct { font-family:'Inter',sans-serif; font-size:14px; font-weight:800; min-width:42px; text-align:right; }
    .slap-good { color:var(--success); } .slap-warning { color:var(--warning); } .slap-critical { color:var(--danger); } .slap-no_data { color:var(--text3); }
    .sla-pills { display:flex; gap:5px; }
    .sp { font-size:10px; font-weight:700; padding:2px 6px; border-radius:5px; }
    .sp-m { background:rgba(16,185,129,.12); color:var(--success); } .sp-w { background:rgba(245,158,11,.12); color:var(--warning); } .sp-b { background:rgba(239,68,68,.12); color:var(--danger); }

    /* OKR */
    .okr-list { display:flex; flex-direction:column; gap:8px; }
    .okr-row  { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .okr-type { font-size:10px; font-weight:700; padding:2px 6px; border-radius:5px; text-transform:uppercase; letter-spacing:.4px; flex-shrink:0; }
    .okrt-company    { background:rgba(99,102,241,.15); color:var(--accent2); }
    .okrt-department { background:rgba(59,130,246,.15);  color:var(--accent); }
    .okrt-team       { background:rgba(14,165,233,.15);  color:var(--accent3); }
    .okrt-individual { background:rgba(16,185,129,.15);  color:var(--success); }
    .okr-mid   { flex:1; min-width:140px; }
    .okr-title { font-size:13px; font-weight:600; }
    .okr-sub   { font-size:11px; color:var(--text2); margin-top:2px; }
    .okr-right { display:flex; align-items:center; gap:9px; min-width:160px; }
    .okr-bar   { flex:1; height:5px; background:var(--border); border-radius:3px; overflow:hidden; }
    .okr-bar > div { height:100%; border-radius:3px; transition:width .7s; }
    .of-good   { background:var(--success); } .of-warn { background:var(--warning); } .of-bad { background:var(--danger); }
    .okr-pct   { font-family:'Inter',sans-serif; font-size:13px; font-weight:800; min-width:34px; text-align:right; }

    /* Records */
    .rec-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 14px; }
    .flt-sel { background:var(--surface2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:12px; font-family:'Inter',sans-serif; padding:5px 8px; outline:none; }
    .flt-sel option { background:var(--surface); }
    .rec-total { font-size:12px; font-weight:700; color:var(--text2); margin-left:auto; }
    .flt-clr { display:flex; align-items:center; gap:5px; background:none; border:1px solid var(--border); border-radius:6px; color:var(--text2); font-size:11px; font-weight:600; padding:5px 9px; cursor:pointer; font-family:'Inter',sans-serif; }
    .flt-clr:hover { background:var(--surface2); }
    .rec-chips { display:flex; flex-wrap:wrap; gap:8px; }
    .rec-chip { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:7px 14px; display:flex; flex-direction:column; align-items:center; min-width:70px; }
    .rc-v { font-family:'Inter',sans-serif; font-size:18px; font-weight:800; }
    .rc-l { font-size:10px; color:var(--text2); margin-top:1px; }
    .chip-red .rc-v  { color:var(--danger); }  .chip-red  { border-color:rgba(239,68,68,.2); }
    .chip-grn .rc-v  { color:var(--success); } .chip-grn  { border-color:rgba(16,185,129,.2); }
    .chip-warn .rc-v { color:var(--warning); } .chip-warn { border-color:rgba(245,158,11,.2); }
    .chip-blue .rc-v { color:var(--accent); }  .chip-blue { border-color:rgba(59,130,246,.2); }
    .table-wrap { overflow-x:auto; border-radius:12px; border:1px solid var(--border); }
    .td-t { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
    .ov   { color:var(--danger) !important; font-weight:600; }
    .row-ov { background:rgba(239,68,68,.04); }
    .ref  { font-family:monospace; font-size:12px; color:var(--accent); }
    .empty-st { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px 20px; color:var(--text3); font-size:13px; }
    .empty-st i { font-size:32px; }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  private api  = inject(ApiService);
  public  lang = inject(LanguageService);

  activeTab  = signal<Tab>('kpi');
  loading    = signal(true);
  data       = signal<any>(null);
  recRows    = signal<any[]>([]);
  recTotal   = signal(0);
  recPage    = signal(1);
  recLastPage= signal(1);
  recFilters = signal<any>(null);
  recSummaryData = signal<any>(null);
  toast = signal<{msg:string,type:string}|null>(null);

  dateFrom = (() => { const d = new Date(new Date().getFullYear(), 0, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  dateTo   = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  search = ''; fStatus = ''; fSeverity = ''; fPriority = ''; fType = ''; fLevel = '';
  private charts: any[] = [];
  private searchTimer: any;

  ar = () => this.lang.isArabic();
  d  = () => this.data();

  analyticsTabs = [
    { key:'kpi',        en:'KPI Summary',       ar:'ملخص المؤشرات',      icon:'fas fa-gauge-high' },
    { key:'nc',         en:'NC Trend',           ar:'عدم المطابقة',        icon:'fas fa-triangle-exclamation' },
    { key:'capa',       en:'CAPA Effectiveness', ar:'فعالية CAPA',        icon:'fas fa-circle-check' },
    { key:'risk',       en:'Risk Heat Map',      ar:'مصفوفة المخاطر',     icon:'fas fa-fire-flame-curved' },
    { key:'complaints', en:'Complaints',         ar:'الشكاوى',            icon:'fas fa-comment-exclamation' },
    { key:'audits',     en:'Audit Summary',      ar:'ملخص التدقيق',       icon:'fas fa-magnifying-glass-chart' },
    { key:'sla',        en:'SLA Compliance',     ar:'امتثال SLA',         icon:'fas fa-file-contract' },
    { key:'okr',        en:'OKR Progress',       ar:'تقدم الأهداف',       icon:'fas fa-bullseye-arrow' },
    { key:'vendors',    en:'Vendor Performance', ar:'أداء الموردين',      icon:'fas fa-truck-ramp-box' },
    { key:'visits',     en:'Visit Summary',      ar:'ملخص الزيارات',      icon:'fas fa-building-user' },
  ];
  recordTabs = [
    { key:'rec_complaints', en:'All Complaints',  ar:'جميع الشكاوى',       icon:'fas fa-list-check' },
    { key:'rec_ncs',        en:'All NCs',         ar:'جميع NC',            icon:'fas fa-list-check' },
    { key:'rec_capas',      en:'All CAPAs',       ar:'جميع CAPA',          icon:'fas fa-list-check' },
    { key:'rec_risks',      en:'All Risks',       ar:'جميع المخاطر',       icon:'fas fa-list-check' },
    { key:'rec_audits',     en:'All Audits',      ar:'جميع التدقيق',       icon:'fas fa-list-check' },
    { key:'rec_requests',   en:'All Requests',    ar:'جميع الطلبات',       icon:'fas fa-list-check' },
    { key:'rec_visits',     en:'All Visits',      ar:'جميع الزيارات',      icon:'fas fa-list-check' },
  ];

  isRecordTab() { return this.activeTab().startsWith('rec_'); }

  activeLabel(lang: 'en'|'ar') {
    const all = [...this.analyticsTabs, ...this.recordTabs];
    return all.find(t => t.key === this.activeTab())?.[lang] || '';
  }

  ngOnInit()    { this.reload(); }
  ngOnDestroy() { this.killCharts(); }

  switchTab(t: string) {
    this.killCharts(); this.activeTab.set(t as Tab);
    this.fStatus=''; this.fSeverity=''; this.fPriority=''; this.fType=''; this.fLevel=''; this.search=''; this.recPage.set(1); this.recSummaryData.set(null);
    this.reload();
  }

  reload() {
    // Validate date range
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.showToast('Start date must be before end date', 'error');
      return;
    }
    this.killCharts(); this.loading.set(true);
    if (this.isRecordTab()) { this.loadRecords(); return; }
    const epMap: Partial<Record<Tab,string>> = {
      kpi:'/reports/kpi-summary', nc:'/reports/nc-trend', capa:'/reports/capa-effectiveness',
      risk:'/reports/risk-heat-map', complaints:'/reports/complaint-trend',
      audits:'/reports/audit-summary', sla:'/reports/sla-compliance',
      okr:'/reports/okr-progress', vendors:'/reports/vendor-performance',
      visits:'/reports/visit-summary'
    };
    this.api.get<any>(epMap[this.activeTab()]!, { from:this.dateFrom, to:this.dateTo }).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); setTimeout(() => this.buildCharts(), 160); },
      error: () => this.loading.set(false)
    });
  }

  loadRecords() {
    const recMap: Partial<Record<Tab,string>> = {
      rec_complaints:'/reports/records/complaints', rec_ncs:'/reports/records/ncs',
      rec_capas:'/reports/records/capas', rec_risks:'/reports/records/risks',
      rec_audits:'/reports/records/audits', rec_requests:'/reports/records/requests',
      rec_visits:'/reports/records/visits'
    };
    const params: any = { from:this.dateFrom, to:this.dateTo };
    if (this.fStatus)   params['status']   = this.fStatus;
    if (this.fSeverity) params['severity'] = this.fSeverity;
    if (this.fPriority) params['priority'] = this.fPriority;
    if (this.fType)     params['type']     = this.fType;
    if (this.fLevel)    params['level']    = this.fLevel;
    if (this.search)    params['search']   = this.search;
    params['page'] = this.recPage();
    this.api.get<any>(recMap[this.activeTab()]!, params).subscribe({
      next: d => {
        this.recRows.set(d.data || []);
        this.recTotal.set(d.total || 0);
        this.recLastPage.set(d.last_page || 1);
        if (d.filters) this.recFilters.set(d.filters);
        if (d.summary) this.recSummaryData.set(d.summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  recSummary() {
    const r = this.recRows(), a = this.activeTab();
    if (!r.length) return [];
    // Use backend summary totals (accurate across full dataset, not just current page)
    const s = this.recSummaryData();
    if (a==='rec_complaints') return [
      {label:'Total',    value:s?.total    ?? this.recTotal(), cls:''},
      {label:'Critical', value:s?.critical ?? 0,              cls:'chip-red'},
      {label:'Open',     value:s?.open     ?? 0,              cls:'chip-warn'},
      {label:'Resolved', value:s?.resolved ?? 0,              cls:'chip-grn'},
    ];
    if (a==='rec_ncs') return [
      {label:'Total',    value:s?.total    ?? this.recTotal(), cls:''},
      {label:'Critical', value:s?.critical ?? 0,              cls:'chip-red'},
      {label:'Open',     value:s?.open     ?? 0,              cls:'chip-warn'},
      {label:'Closed',   value:s?.closed   ?? 0,              cls:'chip-grn'},
    ];
    if (a==='rec_capas') return [
      {label:'Total',   value:s?.total   ?? this.recTotal(), cls:''},
      {label:'Overdue', value:s?.overdue ?? 0,               cls:'chip-red'},
      {label:'Open',    value:s?.open    ?? 0,               cls:'chip-warn'},
      {label:'Closed',  value:s?.closed  ?? 0,               cls:'chip-grn'},
    ];
    if (a==='rec_risks') return [
      {label:'Total',    value:s?.total    ?? this.recTotal(), cls:''},
      {label:'Critical', value:s?.critical ?? 0,              cls:'chip-red'},
      {label:'High',     value:s?.high     ?? 0,              cls:'chip-warn'},
      {label:'Low/Med',  value:s?.low_med  ?? 0,              cls:'chip-grn'},
    ];
    if (a==='rec_audits') return [
      {label:'Total',         value:s?.total         ?? this.recTotal(), cls:''},
      {label:'Completed',     value:s?.completed     ?? 0,               cls:'chip-grn'},
      {label:'In Progress',   value:s?.in_progress   ?? 0,               cls:'chip-blue'},
      {label:'Open Findings', value:s?.open_findings ?? 0,               cls:'chip-red'},
    ];
    if (a==='rec_visits') return [
      {label:'Total',     value:s?.total     ?? this.recTotal(), cls:''},
      {label:'Completed', value:s?.completed ?? 0,               cls:'chip-grn'},
      {label:'Cancelled', value:s?.cancelled ?? 0,               cls:'chip-red'},
      {label:'Virtual',   value:s?.virtual   ?? 0,               cls:'chip-blue'},
    ];
    if (a==='rec_requests') return [
      {label:'Total',   value:s?.total   ?? this.recTotal(), cls:''},
      {label:'Overdue', value:s?.overdue ?? 0,               cls:'chip-red'},
      {label:'Open',    value:s?.open    ?? 0,               cls:'chip-warn'},
      {label:'Closed',  value:s?.closed  ?? 0,               cls:'chip-grn'},
    ];
    return [];
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.loadRecords(), 400); }
  prevRecPage() { if (this.recPage() > 1) { this.recPage.update(p => p - 1); this.loadRecords(); } }
  nextRecPage() { if (this.recPage() < this.recLastPage()) { this.recPage.update(p => p + 1); this.loadRecords(); } }
  clearSearch()  { this.search=''; this.loadRecords(); }
  clearFilters() { this.fStatus='';this.fSeverity='';this.fPriority='';this.fType='';this.fLevel='';this.search=''; this.recPage.set(1); this.reload(); }

  /* ── Charts ── */
  killCharts() { this.charts.forEach(c=>{try{c.destroy();}catch{}}); this.charts=[]; }

  buildCharts() {
    const C = (window as any).Chart;
    if (!C) {
      // Chart.js not available as window global — show a hint once
      console.warn('[QMS Reports] Chart.js not found on window. Charts require Chart.js loaded via CDN.');
      return;
    }
    const t = this.activeTab(), d = this.data(); if (!d) return;
    if (t==='kpi')        this.buildKpi(d,C);
    if (t==='nc')         this.buildNc(d,C);
    if (t==='capa')       this.buildCapa(d,C);
    if (t==='risk')       this.buildRisk(d,C);
    if (t==='complaints') this.buildComp(d,C);
    if (t==='audits')     this.buildAudit(d,C);
    if (t==='okr')        this.buildOkr(d,C);
    if (t==='vendors')    this.buildVendor(d,C);
    if (t==='visits')     this.buildVisit(d,C);
  }

  buildKpi(d:any,C:any) {
    const kpis=d.kpis||[]; if (!kpis.length) return;
    const el=document.getElementById('kpiRadar') as HTMLCanvasElement; if(!el) return;
    const labels=kpis.map((k:any)=>k.label.replace(' Rate','').replace(' Compliance','').replace(' Hours',''));
    // For hours KPI: score = 100 when value=0, 100 at target, 0 at 2× target
    // Formula: Math.max(0, 100 - Math.max(0, value - target) / target * 100)
    const vals=kpis.map((k:any)=>k.unit==='h'
      ? (k.value == null ? 0 : Math.max(0, Math.round(100 - Math.max(0, k.value - k.target) / k.target * 100)))
      : (k.value ?? 0));
    const tgts=kpis.map((k:any)=>k.unit==='h'?100:k.target);
    this.charts.push(new C(el,{type:'radar',data:{labels,datasets:[
      {label:'Actual',data:vals,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.12)',pointBackgroundColor:'#3b82f6',pointRadius:3,tension:.3},
      {label:'Target',data:tgts,borderColor:'rgba(255,255,255,.12)',backgroundColor:'transparent',borderDash:[4,4],pointRadius:0}
    ]},options:{responsive:true,plugins:{legend:{labels:{color:'#8b93a8',font:{size:10},boxWidth:12}}},
      scales:{r:{min:0,max:100,ticks:{display:false},grid:{color:'#1e2330'},angleLines:{color:'#1e2330'},pointLabels:{color:'#8b93a8',font:{size:9}}}}}}));
  }
  buildNc(d:any,C:any) {
    this.mkLine('ncTrend',d.monthly||[],'month',[{key:'raised',label:'Raised',col:'#ef4444'},{key:'closed',label:'Closed',col:'#10b981'}],C);
    this.mkDonut('ncSev','ncSevL',d.by_severity||[],'severity',{critical:'#ef4444',major:'#f59e0b',minor:'#10b981'},C);
    this.mkDonut('ncSrc','ncSrcL',d.by_source||[],'source',{internal_audit:'#3b82f6',client_complaint:'#ef4444',regulatory:'#f59e0b',process_review:'#10b981',supplier:'#8b5cf6'},C);
    this.mkHBar('ncDept',d.by_department||[],'name',['#3b82f6','#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'],C);
    this.mkDonut('ncSt','ncStL',d.status_breakdown||[],'status',{open:'#ef4444',under_investigation:'#f59e0b',capa_in_progress:'#3b82f6',pending_capa:'#f97316',closed:'#10b981'},C);
  }
  buildCapa(d:any,C:any) {
    this.mkLine('capaTrend',d.monthly||[],'month',[{key:'opened',label:'Opened',col:'#ef4444'},{key:'closed',label:'Closed',col:'#10b981'}],C);
    this.mkDonut('capaType','capaTypeL',d.by_type||[],'type',{corrective:'#ef4444',preventive:'#3b82f6',improvement:'#10b981'},C);
    this.mkDonut('capaPri','capaPriL',d.by_priority||[],'priority',{critical:'#ef4444',high:'#f97316',medium:'#f59e0b',low:'#10b981'},C);
  }
  buildRisk(d:any,C:any) {
    this.mkHBar('riskCat',d.by_category||[],'name',['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b','#ef4444'],C);
    this.mkDonut('riskTreat','riskTreatL',d.by_treatment||[],'treatment_strategy',{mitigate:'#3b82f6',transfer:'#6366f1',accept:'#10b981',avoid:'#ef4444'},C);
  }
  buildComp(d:any,C:any) {
    this.mkLine('compTrend',d.monthly||[],'month',[{key:'received',label:'Received',col:'#ef4444'},{key:'resolved',label:'Resolved',col:'#10b981'}],C);
    this.mkDonut('compSev','compSevL',d.by_severity||[],'severity',{critical:'#ef4444',high:'#f97316',medium:'#f59e0b',low:'#10b981'},C);
    this.mkDonut('compSrc','compSrcL',d.by_source||[],'source',{email:'#3b82f6',phone:'#10b981',portal:'#6366f1',walk_in:'#f59e0b',regulator:'#ef4444'},C);
  }
  buildAudit(d:any,C:any) {
    this.mkDonut('audType','audTypeL',d.by_type||[],'type',{internal:'#6366f1',external:'#3b82f6',supplier:'#0ea5e9',regulatory:'#f59e0b'},C);
    this.mkDonut('audSt','audStL',d.by_status||[],'status',{planned:'#3b82f6',in_progress:'#f59e0b',completed:'#10b981',cancelled:'#6b7280'},C);
    this.mkDonut('findType','findTypeL',d.findings?.by_type||[],'finding_type',{nonconformance:'#ef4444',observation:'#f59e0b',action_item:'#3b82f6',opportunity:'#10b981'},C);
    this.mkDonut('findPri','findPriL',d.findings?.by_priority||[],'priority',{critical:'#ef4444',high:'#f97316',medium:'#f59e0b',low:'#10b981'},C);
  }
  buildOkr(d:any,C:any) {
    this.mkDonut('okrType','okrTypeL',d.by_type||[],'type',{company:'#6366f1',department:'#3b82f6',team:'#0ea5e9',individual:'#10b981'},C);
    this.mkHBar('okrDept',d.by_department||[],'name',['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b'],C);
  }
  buildVendor(d:any,C:any) {
    this.mkHBar('vCat',d.by_category||[],'name',['#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6'],C);
    this.mkDonut('vSt','vStL',d.by_status||[],'status',{active:'#10b981',suspended:'#ef4444',inactive:'#6b7280',under_review:'#f59e0b'},C);
    this.mkDonut('vQual','vQualL',d.by_qualification||[],'qualification_status',{qualified:'#10b981',provisional:'#f59e0b',disqualified:'#ef4444',pending:'#6b7280'},C);
  }

  buildVisit(d:any,C:any) {
    this.mkLine('visitTrend',d.monthly||[],'month',[{key:'scheduled',label:'Scheduled',col:'#6366f1'},{key:'completed',label:'Completed',col:'#10b981'}],C);
    this.mkDonut('visitType','visitTypeL',d.by_type||[],'type',{client_visit:'#6366f1',insurer_audit:'#3b82f6',regulatory_inspection:'#ef4444',partnership_review:'#10b981',sales_meeting:'#f59e0b',technical_review:'#0ea5e9'},C);
    this.mkDonut('visitStatus','visitStatusL',d.by_status||[],'status',{planned:'#6b7280',confirmed:'#3b82f6',in_progress:'#f59e0b',completed:'#10b981',cancelled:'#ef4444',rescheduled:'#8b5cf6'},C);
    this.mkDonut('findingType','findingTypeL',d.findings_by_type||[],'finding_type',{positive:'#10b981',concern:'#f59e0b',requirement:'#3b82f6',action_item:'#ef4444',observation:'#6b7280'},C);
    this.mkHBar('visitClient',d.by_client||[],'name',['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'],C);
  }
  mkLine(id:string,rows:any[],lk:string,ds:any[],C:any) {
    const el=document.getElementById(id) as HTMLCanvasElement; if(!el||!rows.length) return;
    this.charts.push(new C(el,{type:'line',
      data:{labels:rows.map((r:any)=>r[lk]),datasets:ds.map((d:any)=>({label:d.label,data:rows.map((r:any)=>r[d.key]||0),
        borderColor:d.col,backgroundColor:d.col+'15',tension:.4,fill:true,pointRadius:3,pointBackgroundColor:d.col}))},
      options:{responsive:true,interaction:{mode:'index',intersect:false},
        plugins:{legend:{labels:{color:'#8b93a8',font:{size:10},boxWidth:11}}},
        scales:{x:{grid:{color:'#1e2330'},ticks:{color:'#8b93a8',font:{size:9},maxTicksLimit:8}},
                y:{grid:{color:'#1e2330'},ticks:{color:'#8b93a8',font:{size:9}},min:0}}}}));
  }
  mkDonut(id:string,legId:string,raw:any[],lk:string,colors:Record<string,string>,C:any) {
    const el=document.getElementById(id) as HTMLCanvasElement; if(!el||!raw.length) return;
    const labels=raw.map((x:any)=>x[lk]||'unknown');
    const vals=raw.map((x:any)=>Number(x.total)||0);
    const bgs=labels.map((l:string)=>colors[l]||'#6b7280');
    const leg=document.getElementById(legId);
    if(leg) leg.innerHTML=labels.map((l:string,i:number)=>
      `<span style="display:flex;align-items:center;gap:3px;font-size:10px;color:var(--text2)"><span style="width:7px;height:7px;border-radius:50%;background:${bgs[i]};flex-shrink:0"></span>${l.replace(/_/g,' ')} (${vals[i]})</span>`
    ).join('');
    this.charts.push(new C(el,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:bgs,borderWidth:0,hoverOffset:4}]},options:{responsive:true,cutout:'62%',plugins:{legend:{display:false}}}}));
  }
  mkHBar(id:string,raw:any[],lk:string,colors:string[],C:any) {
    const el=document.getElementById(id) as HTMLCanvasElement; if(!el||!raw.length) return;
    const labels=raw.map((x:any)=>(x[lk]||'—').replace(/_/g,' ').replace('departments.',''));
    const vals=raw.map((x:any)=>Number(x.total)||0);
    this.charts.push(new C(el,{type:'bar',
      data:{labels,datasets:[{data:vals,backgroundColor:labels.map((_:any,i:number)=>colors[i%colors.length]),borderRadius:4,borderWidth:0}]},
      options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}},
        scales:{x:{grid:{color:'#1e2330'},ticks:{color:'#8b93a8',font:{size:9}}},
                y:{grid:{display:false},ticks:{color:'#8b93a8',font:{size:9}}}}}}));
  }

  /* ── Exports ── */
  exportCSV() {
    const d=this.data(); const r=this.recRows();
    if (!d && !r.length) return;
    let rows:string[][]=[];
    if (this.isRecordTab()) {
      const cols=this.getRecCols();
      rows=[cols.map(c=>c.l),...r.map((row:any)=>cols.map(c=>String(row[c.k]??'')))];
    } else {
      rows=this.analyticsToRows(d);
    }
    const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`QMS_${this.activeTab()}_${this.dateFrom}.csv`; a.click();
  }
  exportExcel() {
    const XLSX=(window as any).XLSX; if(!XLSX){ this.showToast('Export library not loaded', 'error'); return; }
    const r=this.recRows();
    let data:any[][]=[];
    if (this.isRecordTab() && r.length) {
      const cols=this.getRecCols();
      data=[cols.map(c=>c.l),...r.map((row:any)=>cols.map(c=>row[c.k]??''))];
    } else {
      const d=this.data(); if (!d) return;
      data=this.analyticsToRows(d);
    }
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),this.activeTab().substring(0,31));
    XLSX.writeFile(wb,`QMS_${this.activeTab()}_${this.dateFrom}.xlsx`);
  }
  exportPDF() {
    const jsPDF=(window as any).jspdf?.jsPDF; if(!jsPDF){ this.showToast('Export library not loaded', 'error'); return; }
    const r=this.recRows(); if(!r.length && this.isRecordTab()) return;
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    doc.setFillColor(10,11,14); doc.rect(0,0,300,20,'F');
    doc.setTextColor(232,236,244); doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(`QMS Pro — ${this.activeLabel('en')}`,14,11);
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(139,147,168);
    doc.text(`Period: ${this.dateFrom} → ${this.dateTo}  |  Total: ${r.length||'—'} records  |  ${new Date().toLocaleString()}`,14,17);
    const pdfRows = this.isRecordTab()
      ? (r.length ? this.getRecCols().map(c=>c.l) && r.map((row:any)=>this.getRecCols().map((c:any)=>String(row[c.k]??''))) : null)
      : null;
    const analytRows = !this.isRecordTab() ? this.analyticsToRows(this.data()) : null;
    if (this.isRecordTab() && r.length) {
      const cols=this.getRecCols();
      (doc as any).autoTable({head:[cols.map(c=>c.l)],body:r.map((row:any)=>cols.map((c:any)=>String(row[c.k]??''))),startY:24,margin:{left:8,right:8},
        styles:{fontSize:7,cellPadding:2,textColor:[200,205,215],fillColor:[17,19,24],lineColor:[30,35,48],lineWidth:.2},
        headStyles:{fillColor:[24,28,36],textColor:[139,147,168],fontStyle:'bold'},alternateRowStyles:{fillColor:[14,15,18]}});
    } else if (analytRows && analytRows.length > 1) {
      const [head, ...body] = analytRows;
      (doc as any).autoTable({head:[head],body,startY:24,margin:{left:8,right:8},
        styles:{fontSize:8,cellPadding:2.5,textColor:[200,205,215],fillColor:[17,19,24],lineColor:[30,35,48],lineWidth:.2},
        headStyles:{fillColor:[24,28,36],textColor:[139,147,168],fontStyle:'bold'},alternateRowStyles:{fillColor:[14,15,18]}});
    }
    doc.save(`QMS_${this.activeTab()}_${this.dateFrom}.pdf`);
  }


  /** Serialise current analytics data() into a 2D array for CSV/Excel/PDF export */
  analyticsToRows(d: any): string[][] {
    const tab = this.activeTab();
    const header = ['Report', this.activeLabel('en'), '', 'Period', `${this.dateFrom} → ${this.dateTo}`];
    if (!d) return [header];

    if (tab === 'kpi') {
      const rows: string[][] = [header, [], ['KPI', 'Value', 'Target', 'Unit', 'Status']];
      (d.kpis || []).forEach((k: any) => {
        rows.push([k.label, k.value != null ? String(k.value) : 'N/A',
                   String(k.target), k.unit, this.kpiStLbl(k)]);
      });
      return rows;
    }
    if (tab === 'nc') {
      const rows: string[][] = [header, [],
        ['Month', 'Raised', 'Closed'],
        ...(d.monthly || []).map((m: any) => [m.month, String(m.raised || 0), String(m.closed || 0)]),
        [], ['Severity', 'Count'],
        ...(d.by_severity || []).map((x: any) => [x.severity, String(x.total)]),
        [], ['Source', 'Count'],
        ...(d.by_source || []).map((x: any) => [x.source, String(x.total)]),
      ];
      return rows;
    }
    if (tab === 'capa') {
      const s = d.summary || {};
      const rows: string[][] = [header, [],
        ['Total', String(s.total || 0)], ['Open', String(s.open || 0)],
        ['Closed', String(s.closed || 0)], ['Overdue', String(s.overdue || 0)],
        ['On-Time Rate', `${s.on_time_rate || 0}%`], ['Avg Days to Close', String(d.avg_days_to_close || '—')],
        [], ['Month', 'Opened', 'Closed'],
        ...(d.monthly || []).map((m: any) => [m.month, String(m.opened || 0), String(m.closed || 0)]),
      ];
      return rows;
    }
    if (tab === 'risk') {
      const rows: string[][] = [header, [],
        ['Ref', 'Title', 'Level', 'Likelihood', 'Impact', 'Score', 'Treatment', 'Owner', 'Status'],
        ...(d.top_risks || []).map((r: any) => [
          r.reference_no, r.title, r.risk_level,
          String(r.likelihood), String(r.impact), String(r.score),
          r.treatment_strategy || '—', r.owner || '—', r.status || '—'
        ]),
      ];
      return rows;
    }
    if (tab === 'complaints') {
      const rows: string[][] = [header, [],
        ['Avg Resolution (h)', String(d.avg_resolution_h || '—')],
        ['Avg Satisfaction', String(d.avg_satisfaction || '—')],
        [], ['Month', 'Received', 'Resolved'],
        ...(d.monthly || []).map((m: any) => [m.month, String(m.received || 0), String(m.resolved || 0)]),
        [], ['Top Clients', 'Complaints'],
        ...(d.top_clients || []).map((c: any) => [c.name, String(c.total)]),
      ];
      return rows;
    }
    if (tab === 'audits') {
      const rows: string[][] = [header, [],
        ['Completion Rate', `${d.completion_rate || 0}%`],
        ['Total Findings', String(d.findings?.total || 0)],
        ['Open Findings', String(d.findings?.open || 0)],
        [], ['Ref', 'Title', 'Type', 'Status', 'Planned Start', 'Lead Auditor', 'Findings'],
        ...(d.recent || []).map((a: any) => [
          a.reference_no, a.title, a.type, a.status,
          a.planned_start_date, a.lead_auditor || '—', String(a.findings_count || 0)
        ]),
      ];
      return rows;
    }
    if (tab === 'sla') {
      const rows: string[][] = [header, [],
        ['Overall Rate', `${d.overall_rate ?? 'N/A'}%`],
        ['Active SLAs', String(d.total_active || 0)],
        ['Breaches (30d)', String(d.breaches_30d || 0)],
        [], ['SLA Name', 'Client', 'Dept', 'Compliance %', 'Met', 'Warning', 'Breached', 'Status'],
        ...(d.slas || []).map((s: any) => [
          s.name, s.client || '—', s.department || '—',
          s.compliance_rate != null ? `${s.compliance_rate}%` : 'No Data',
          String(s.met || 0), String(s.warning || 0), String(s.breached || 0), s.status
        ]),
      ];
      return rows;
    }
    if (tab === 'okr') {
      const sum = d.summary || {};
      const rows: string[][] = [header, [],
        ['Total', String(sum.total || 0)], ['Avg Progress', `${sum.avg_progress || 0}%`],
        ['On Track', String(sum.on_track || 0)], ['At Risk', String(sum.at_risk || 0)],
        ['Behind', String(sum.behind || 0)], ['Completed', String(sum.completed || 0)],
        [], ['Title', 'Type', 'Owner', 'Department', 'Progress %', 'Status', 'KRs'],
        ...(d.objectives || []).map((o: any) => [
          o.title, o.type, o.owner || '—', o.department || '—',
          `${o.progress_percent || 0}%`, o.status, `${o.key_results_done}/${o.key_results_count}`
        ]),
      ];
      return rows;
    }
    if (tab === 'vendors') {
      const cs = d.contract_summary || {};
      const rows: string[][] = [header, [],
        ['Active Contracts', String(cs.active || 0)],
        ['Expiring (60d)', String(cs.expiring || 0)],
        ['Total Value', String(cs.total_value || 0)],
        [], ['Vendor', 'Category', 'Status', 'Qualification', 'Avg Score', 'Evaluations', 'Active Contracts'],
        ...(d.vendors || []).map((v: any) => [
          v.name, v.category || '—', v.status, v.qualification_status,
          v.avg_eval_score != null ? String(v.avg_eval_score) : '—',
          String(v.eval_count || 0), String(v.active_contracts || 0)
        ]),
      ];
      return rows;
    }
    return [header];
  }

  getRecCols():{l:string;k:string}[] {
    const m:Partial<Record<Tab,{l:string;k:string}[]>>={
      rec_complaints:[{l:'Ref',k:'reference_no'},{l:'Title',k:'title'},{l:'Severity',k:'severity'},{l:'Status',k:'status'},{l:'Source',k:'source'},{l:'Client',k:'client'},{l:'Department',k:'department'},{l:'Assignee',k:'assignee'},{l:'Received',k:'received_date'},{l:'Target',k:'target_resolution'},{l:'Resolved',k:'actual_resolution'},{l:'Satisfaction',k:'customer_satisfaction'}],
      rec_ncs:[{l:'Ref',k:'reference_no'},{l:'Title',k:'title'},{l:'Severity',k:'severity'},{l:'Status',k:'status'},{l:'Source',k:'source'},{l:'Department',k:'department'},{l:'Assigned To',k:'assigned_to'},{l:'Detected',k:'detection_date'},{l:'Target',k:'target_closure'},{l:'Closed',k:'actual_closure'}],
      rec_capas:[{l:'Ref',k:'reference_no'},{l:'Title',k:'title'},{l:'Type',k:'type'},{l:'Priority',k:'priority'},{l:'Status',k:'status'},{l:'Owner',k:'owner'},{l:'Department',k:'department'},{l:'Target',k:'target_date'},{l:'Completed',k:'actual_completion'},{l:'Days Open',k:'days_open'},{l:'Overdue',k:'is_overdue'}],
      rec_risks:[{l:'Ref',k:'reference_no'},{l:'Title',k:'title'},{l:'Level',k:'risk_level'},{l:'Likelihood',k:'likelihood'},{l:'Impact',k:'impact'},{l:'Score',k:'score'},{l:'Status',k:'status'},{l:'Category',k:'category'},{l:'Treatment',k:'treatment_strategy'},{l:'Owner',k:'owner'}],
      rec_audits:[{l:'Ref',k:'reference_no'},{l:'Title',k:'title'},{l:'Type',k:'type'},{l:'Status',k:'status'},{l:'Result',k:'overall_result'},{l:'Lead Auditor',k:'lead_auditor'},{l:'Department',k:'department'},{l:'Planned Start',k:'planned_start_date'},{l:'Findings',k:'findings_count'},{l:'Open Findings',k:'open_findings'}],
      rec_requests:[{l:'Ref',k:'reference_no'},{l:'Title',k:'title'},{l:'Type',k:'type'},{l:'Priority',k:'priority'},{l:'Status',k:'status'},{l:'Requester',k:'requester'},{l:'Assignee',k:'assignee'},{l:'Department',k:'department'},{l:'Due Date',k:'due_date'},{l:'Closed',k:'closed_at'},{l:'Overdue',k:'is_overdue'}],
      rec_visits:[{l:'Ref',k:'reference_no'},{l:'Client',k:'client'},{l:'Type',k:'type'},{l:'Status',k:'status'},{l:'Date',k:'visit_date'},{l:'Host',k:'host'},{l:'Location',k:'location'},{l:'Duration',k:'duration_hours'},{l:'Virtual',k:'is_virtual'},{l:'Rating',k:'rating'},{l:'Follow-Up',k:'follow_up_date'},{l:'Findings',k:'findings_count'},{l:'Open Findings',k:'open_findings'}],
    };
    return m[this.activeTab()]||[];
  }

  /* ── Helpers ── */
  byKey(arr:any[],key:string,val:string):number { if(!arr) return 0; const r=arr.find((x:any)=>x[key]===val); return Number(r?.total)||0; }
  tot(arr:any[]):number { return (arr||[]).reduce((s:number,x:any)=>s+Number(x.total||0),0); }
  pct(a:number,b:number):number { return b?Math.round(a/b*100):0; }
  min(a:number,b:number):number { return Math.min(a,b); }
  abs(v:number):number { return Math.abs(Math.round(v)); }

  hCls(l:number,i:number):string { const s=l*i; return s>=17?'h-crit':s>=10?'h-high':s>=5?'h-med':'h-low'; }
  hN(l:number,i:number):string   { const m=this.data()?.matrix; const c=m?.[l]?.[i]?.length||0; return c?String(c):''; }
  hTip(l:number,i:number):string { const m=this.data()?.matrix; return (m?.[l]?.[i]||[]).map((r:any)=>r.title).join('\n')||`L${l}×I${i}`; }

  healthScore():number {
    const kpis=this.data()?.kpis||[]; if(!kpis.length) return 0;
    const sc=kpis.map((k:any)=>{ if(k.value==null) return 50; if(k.unit==='h') return k.value<=k.target?100:Math.max(0,100-(k.value-k.target)*5); return Math.min(100,Math.round(k.value/k.target*100)); });
    return Math.round(sc.reduce((a:number,b:number)=>a+b,0)/sc.length);
  }
  healthCls():string { const s=this.healthScore(); return s>=80?'grn':s>=60?'warn':'red'; }

  kpiSt(k:any):string { if(k.value==null) return 'kst-na'; if(k.unit==='h') return k.value<=k.target?'kst-good':k.value<=k.target*1.5?'kst-warn':'kst-bad'; return k.value>=k.target?'kst-good':k.value>=k.target*.8?'kst-warn':'kst-bad'; }
  kpiStLbl(k:any):string { if(k.value==null) return 'N/A'; if(k.unit==='h') return k.value<=k.target?'On Target':'Above Target'; return k.value>=k.target?'On Target':k.value>=k.target*.8?'Near Target':'Below'; }
  kpiCardCls(k:any):string { const s=this.kpiSt(k); return s==='kst-good'?'kgood':s==='kst-warn'?'kwarn':'kbad'; }
  kpiAr(key:string):string { return ({nc_closure_rate:'إغلاق NC',capa_on_time:'CAPA',audit_completion:'التدقيق',document_compliance:'الوثائق',sla_compliance:'SLA',risk_treatment:'المخاطر',avg_resolution_hours:'الشكاوى'} as any)[key]||key; }

  slaCol(v:any):string  { return v==null?'var(--text2)':v>=90?'var(--success)':v>=70?'var(--warning)':'var(--danger)'; }
  satCol(v:any):string  { return v==null?'var(--text2)':v>=4?'var(--success)':v>=3?'var(--warning)':'var(--danger)'; }
  progCol(v:any):string { return v==null?'var(--text2)':v>=70?'var(--success)':v>=30?'var(--warning)':'var(--danger)'; }
  scoreCol(v:number):string { return v>=4?'var(--success)':v>=3?'var(--warning)':'var(--danger)'; }

  okrFill(p:number):string { return p>=70?'of-good':p>=30?'of-warn':'of-bad'; }
  okrStCls(s:string,p:number):string { if(s==='completed') return 'badge-green'; return p>=70?'badge-green':p>=30?'badge-yellow':'badge-red'; }
  okrLbl(s:string,p:number):string { if(s==='completed') return 'Completed'; return p>=70?'On Track':p>=30?'At Risk':'Behind'; }

  sevCls(s:string):string  { return ({critical:'badge-red',major:'badge-yellow',minor:'badge-draft'} as any)[s]||'badge-draft'; }
  auStCls(s:string):string  { return ({planned:'badge-blue',in_progress:'badge-yellow',completed:'badge-green',report_issued:'badge-green',cancelled:'badge-red',deferred:'badge-draft'} as any)[s]||'badge-draft'; }
  priCls(s:string):string  { return ({critical:'badge-red',high:'badge-orange',medium:'badge-yellow',low:'badge-green'} as any)[s]||'badge-draft'; }
  rCls(l:string):string    { return ({critical:'badge-red',high:'badge-orange',medium:'badge-yellow',low:'badge-green'} as any)[l]||'badge-draft'; }
  ncStCls(s:string):string { return ({open:'badge-red',under_investigation:'badge-yellow',capa_in_progress:'badge-blue',pending_capa:'badge-orange',closed:'badge-green'} as any)[s]||'badge-draft'; }
  capaStCls(s:string):string { return ({open:'badge-red',in_progress:'badge-yellow',closed:'badge-green'} as any)[s]||'badge-draft'; }
  auditCls(s:string):string { return ({planned:'badge-blue',in_progress:'badge-yellow',completed:'badge-green',cancelled:'badge-draft',report_issued:'badge-green'} as any)[s]||'badge-draft'; }
  vStCls(s:string):string  { return ({active:'badge-green',suspended:'badge-red',inactive:'badge-draft',under_review:'badge-yellow'} as any)[s]||'badge-draft'; }
  qualCls(s:string):string { return ({qualified:'badge-green',provisional:'badge-yellow',disqualified:'badge-red',pending:'badge-draft'} as any)[s]||'badge-draft'; }
  compStCls(s:string):string { return ({open:'badge-red',in_progress:'badge-yellow',resolved:'badge-green',closed:'badge-draft',withdrawn:'badge-draft'} as any)[s]||'badge-draft'; }
  reqStCls(s:string):string  { return ({draft:'badge-draft',submitted:'badge-blue',under_review:'badge-yellow',approved:'badge-green',rejected:'badge-red',closed:'badge-green'} as any)[s]||'badge-draft'; }
  fmtSlug(s: string|null|undefined): string { return (s ?? '').replace(/_/g, ' '); }
  visitStCls(s:string):string { return ({planned:'badge-draft',confirmed:'badge-blue',in_progress:'badge-yellow',completed:'badge-green',cancelled:'badge-red',rescheduled:'badge-purple'} as any)[s]||'badge-draft'; }
  ratingStars(r:number):string { const n=Math.min(5,Math.max(0,Math.round(r))); return '★'.repeat(n)+'☆'.repeat(5-n); }
  isOv(date:string,status:string):boolean { if(!date||['closed','resolved','approved'].includes(status)) return false; return new Date(date)<new Date(); }
  showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

}
