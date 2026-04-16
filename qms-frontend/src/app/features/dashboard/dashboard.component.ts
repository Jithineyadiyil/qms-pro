import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  template: `
<!-- ═══════════════════════════════════════════
     HEADER
═══════════════════════════════════════════ -->
<div class="dh">
  <div>
    <div class="dh-greet">{{ greet() }}, <span style="color:var(--accent)">{{ userName() }}</span> 👋</div>
    <div class="dh-sub">{{ dateStr() }} &nbsp;·&nbsp; {{ roleLabel() }} &nbsp;·&nbsp; {{ ar() ? 'نظرة عامة على نظام إدارة الجودة' : 'QMS Overview — Diamond Insurance Broker' }}</div>
  </div>
  <div class="dh-pills">
    <span class="pill pill-blue"><i class="fas fa-certificate"></i> ISO 9001:2015</span>
    <span class="pill pill-green"><i class="fas fa-circle" style="font-size:7px"></i> {{ ar() ? 'الأنظمة تعمل' : 'Operational' }}</span>
    <span class="pill pill-purple" (click)="refresh()" style="cursor:pointer"><i class="fas fa-rotate" style="font-size:10px"></i> {{ ar() ? 'تحديث' : 'Refresh' }}</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     KPI BAND — 10 live metrics
═══════════════════════════════════════════ -->
<div class="kpi-band">
  <!-- Requests — always visible, scoped to role -->
  <div class="kpi">
    <div class="kpi-v" style="color:var(--accent)">{{ st()?.requests?.open ?? '—' }}</div>
    <div class="kpi-l">{{ isEmployee() ? (ar()?'طلباتي':'My Requests') : isDeptMgr() ? (ar()?'طلبات قسمي':'Dept Requests') : isQAOfficer() ? (ar()?'مهامي':'My Tasks') : (ar()?'طلبات مفتوحة':'Open Requests') }}</div>
  </div>
  <div class="kpi-sep"></div>
  <!-- NCs — always visible, scoped to role -->
  <div class="kpi">
    <div class="kpi-v" style="color:var(--danger)">{{ st()?.nc_capa?.open_ncs ?? '—' }}</div>
    <div class="kpi-l">{{ ar() ? 'عدم مطابقة' : 'Open NCs' }}</div>
  </div>
  <div class="kpi-sep"></div>
  <!-- Complaints — always visible, scoped to role -->
  <div class="kpi">
    <div class="kpi-v" [style.color]="st()?.complaints?.this_month>0?'var(--danger)':'var(--success)'">{{ st()?.complaints?.this_month ?? '—' }}</div>
    <div class="kpi-l">{{ ar() ? 'شكاوى الشهر' : 'Complaints/Month' }}</div>
  </div>
  <div class="kpi-sep"></div>
  <!-- Documents — always visible -->
  <div class="kpi">
    <div class="kpi-v" style="color:var(--success)">{{ st()?.documents?.approved ?? '—' }}</div>
    <div class="kpi-l">{{ ar() ? 'وثائق معتمدة' : 'Approved Docs' }}</div>
  </div>
  @if (isQAFull() || isDeptMgr()) {
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" style="color:var(--accent)">{{ st()?.users?.active ?? '—' }}</div>
      <div class="kpi-l">{{ isQAFull() ? (ar()?'مستخدمون نشطون':'Active Users') : (ar()?'فريقي':'My Team') }}</div>
    </div>
  }
  @if (canSeeRisks()) {
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" [style.color]="st()?.risks?.critical>0?'var(--danger)':'var(--success)'">{{ st()?.risks?.critical ?? '—' }}</div>
      <div class="kpi-l">{{ ar() ? 'مخاطر حرجة' : 'Critical Risks' }}</div>
    </div>
  }
  @if (canSeeClients()) {
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" style="color:var(--success)">{{ st()?.clients?.active ?? '—' }}</div>
      <div class="kpi-l">{{ ar() ? 'عملاء نشطون' : 'Active Clients' }}</div>
    </div>
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" style="color:var(--warning)">{{ st()?.vendors?.active ?? '—' }}</div>
      <div class="kpi-l">{{ ar() ? 'موردون نشطون' : 'Active Vendors' }}</div>
    </div>
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" style="color:var(--accent3)">{{ st()?.visits?.this_month ?? '—' }}</div>
      <div class="kpi-l">{{ ar() ? 'زيارات الشهر' : 'Visits This Month' }}</div>
    </div>
  }
  @if (canSeeSurveys()) {
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" [style.color]="npsCol(st()?.surveys?.nps)">{{ st()?.surveys?.nps ?? '—' }}</div>
      <div class="kpi-l">NPS</div>
    </div>
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" style="color:var(--success)">{{ st()?.surveys?.avg_score ?? '—' }}</div>
      <div class="kpi-l">{{ ar() ? 'متوسط CSAT' : 'Avg CSAT' }}</div>
    </div>
  }
  @if (canSeeOKR()) {
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" style="color:var(--accent2)">{{ st()?.okr?.avg_progress ?? '—' }}%</div>
      <div class="kpi-l">{{ ar() ? 'تقدم OKR' : 'OKR Progress' }}</div>
    </div>
  }
  @if (canSeeSLA()) {
    <div class="kpi-sep"></div>
    <div class="kpi">
      <div class="kpi-v" [style.color]="slaCol()">{{ st()?.sla?.avg_compliance != null ? (st()?.sla?.avg_compliance + '%') : '—' }}</div>
      <div class="kpi-l">{{ ar() ? 'امتثال SLA' : 'SLA Compliance' }}</div>
    </div>
  }
</div>

<!-- ═══════════════════════════════════════════
     CORE METRICS — 8 cards
═══════════════════════════════════════════ -->
<div class="sec-label">{{ ar() ? 'المقاييس الرئيسية' : 'Core Metrics' }}</div>
<div class="mc-grid">
  @for (c of coreCards(); track c.label) {
    <div class="mc" [routerLink]="c.route">
      <div class="mc-row1">
        <div class="mc-ico" [class]="'ico-'+c.col"><i [class]="c.icon"></i></div>
        <div class="mc-tag" [class]="c.tagCls"><i [class]="c.tagIcon"></i>&nbsp;{{ c.tag }}</div>
      </div>
      <div class="mc-val">{{ loading() ? '—' : c.value }}</div>
      <div class="mc-lbl">{{ c.label }}</div>
      @if (c.sub) { <div class="mc-sub">{{ c.sub }}</div> }
    </div>
  }
</div>

<!-- ═══════════════════════════════════════════
     CHARTS ROW 1 — Trend + Risk + Requests + CAPA
═══════════════════════════════════════════ -->
@if(isQAFull() || isQASupervisor()) {
<div class="sec-label">{{ ar() ? 'التحليلات البيانية' : 'Analytics' }}</div>
<div class="ch-row">
  <div class="card ch-wide">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'اتجاه عدم المطابقة والشكاوى والطلبات' : 'NC, Complaints & Requests Trend' }}</div>
      <span class="badge badge-blue">{{ ar() ? 'آخر 6 أشهر' : 'Last 6 Months' }}</span>
    </div>
    <canvas id="trendChart" height="145"></canvas>
  </div>
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'توزيع المخاطر' : 'Risk by Level' }}</div></div>
    <div class="donut-wrap"><canvas id="riskChart" height="130"></canvas></div>
    <div id="riskLeg" class="leg"></div>
  </div>
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'حالة الطلبات' : 'Request Status' }}</div></div>
    <div class="donut-wrap"><canvas id="reqChart" height="130"></canvas></div>
    <div id="reqLeg" class="leg"></div>
  </div>
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'حالة CAPA' : 'CAPA Status' }}</div></div>
    <div class="donut-wrap"><canvas id="capaChart" height="130"></canvas></div>
    <div id="capaLeg" class="leg"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     CHARTS ROW 2 — Audit Types + Vendor Cat + OKR + Complaints Severity
═══════════════════════════════════════════ -->
<div class="ch-row">
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'المراجعات حسب النوع' : 'Audits by Type' }}</div></div>
    <canvas id="auditTypeChart" height="130"></canvas>
  </div>
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'الموردون حسب الفئة' : 'Vendors by Category' }}</div></div>
    <canvas id="vendorCatChart" height="130"></canvas>
  </div>
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'تقدم الأهداف' : 'OKR Progress' }}</div></div>
    <div class="donut-wrap"><canvas id="okrChart" height="130"></canvas></div>
    <div id="okrLeg" class="leg"></div>
  </div>
  <div class="card ch-sm">
    <div class="card-header"><div class="card-title">{{ ar() ? 'الشكاوى حسب الخطورة' : 'Complaints by Severity' }}</div></div>
    <div class="donut-wrap"><canvas id="compSevChart" height="130"></canvas></div>
    <div id="compSevLeg" class="leg"></div>
  </div>
</div>
}
<!-- ═══════════════════════════════════════════
     OPERATIONAL MODULE CARDS
═══════════════════════════════════════════ -->
<div class="sec-label">{{ ar() ? 'المقاييس التشغيلية' : 'Operational Metrics' }}</div>
<div class="op-grid">

  @if (canSeeVendors()) {
  <div class="op-card" routerLink="/vendors">
    <div class="op-hdr"><div class="op-ico" style="background:rgba(139,92,246,.13);color:#a78bfa"><i class="fas fa-truck-ramp-box"></i></div><div class="op-title">{{ ar() ? 'الموردون' : 'Vendor Management' }}</div><span class="op-arr">→</span></div>
    <div class="op-nums">
      <div class="op-n"><div class="op-nv">{{ st()?.vendors?.total ?? '—' }}</div><div class="op-nl">{{ ar() ? 'إجمالي' : 'Total' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--success)">{{ st()?.vendors?.active ?? '—' }}</div><div class="op-nl">{{ ar() ? 'نشط' : 'Active' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--accent)">{{ st()?.vendors?.qualified ?? '—' }}</div><div class="op-nl">{{ ar() ? 'مؤهل' : 'Qualified' }}</div></div>
      <div class="op-n"><div class="op-nv" [style.color]="st()?.vendors?.expiring>0?'var(--warning)':'var(--text2)'">{{ st()?.vendors?.expiring ?? '0' }}</div><div class="op-nl">{{ ar() ? 'تنتهي' : 'Expiring' }}</div></div>
    </div>
    <div class="op-bar"><div class="op-fill" [style.width.%]="pct(st()?.vendors?.qualified, st()?.vendors?.total)" style="background:#a78bfa"></div></div>
    <div class="op-bar-lbl">{{ pct(st()?.vendors?.qualified, st()?.vendors?.total) }}% {{ ar() ? 'مؤهلون' : 'Qualified' }}</div>
  </div>
  }

  @if (canSeeVisits()) {
  <div class="op-card" routerLink="/visits">
    <div class="op-hdr"><div class="op-ico" style="background:rgba(14,165,233,.13);color:var(--accent3)"><i class="fas fa-calendar-check"></i></div><div class="op-title">{{ ar() ? 'الزيارات' : 'Visit Planning' }}</div><span class="op-arr">→</span></div>
    <div class="op-nums">
      <div class="op-n"><div class="op-nv">{{ st()?.visits?.total ?? '—' }}</div><div class="op-nl">{{ ar() ? 'إجمالي' : 'Total' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--accent)">{{ st()?.visits?.scheduled ?? '—' }}</div><div class="op-nl">{{ ar() ? 'مجدول' : 'Scheduled' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--success)">{{ st()?.visits?.completed ?? '—' }}</div><div class="op-nl">{{ ar() ? 'مكتمل' : 'Completed' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--accent2)">{{ st()?.visits?.this_month ?? '—' }}</div><div class="op-nl">{{ ar() ? 'هذا الشهر' : 'This Month' }}</div></div>
    </div>
    <div class="op-bar"><div class="op-fill" [style.width.%]="pct(st()?.visits?.completed, st()?.visits?.total)" style="background:var(--success)"></div></div>
    <div class="op-bar-lbl">{{ pct(st()?.visits?.completed, st()?.visits?.total) }}% {{ ar() ? 'مكتملة' : 'Completion Rate' }}</div>
  </div>
  }

  @if (canSeeSurveys()) {
  <div class="op-card" routerLink="/surveys">
    <div class="op-hdr"><div class="op-ico" style="background:rgba(236,72,153,.13);color:#f472b6"><i class="fas fa-face-smile"></i></div><div class="op-title">{{ ar() ? 'رضا العملاء' : 'Customer Satisfaction' }}</div><span class="op-arr">→</span></div>
    <div class="op-nums">
      <div class="op-n"><div class="op-nv">{{ st()?.surveys?.total ?? '—' }}</div><div class="op-nl">{{ ar() ? 'استبيانات' : 'Surveys' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--success)">{{ st()?.surveys?.active ?? '—' }}</div><div class="op-nl">{{ ar() ? 'نشط' : 'Active' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--accent)">{{ st()?.surveys?.responses ?? '—' }}</div><div class="op-nl">{{ ar() ? 'ردود' : 'Responses' }}</div></div>
      <div class="op-n"><div class="op-nv" [style.color]="npsCol(st()?.surveys?.nps)">{{ st()?.surveys?.nps ?? '—' }}</div><div class="op-nl">NPS</div></div>
    </div>
    <div class="op-bar"><div class="op-fill" [style.width.%]="((st()?.surveys?.avg_score??0)/5)*100" style="background:#f472b6"></div></div>
    <div class="op-bar-lbl">{{ ar() ? 'متوسط الرضا' : 'Avg Satisfaction' }} {{ st()?.surveys?.avg_score ?? 0 }}/5</div>
  </div>
  }

  @if (canSeeOKR()) {
  <div class="op-card" routerLink="/okr">
    <div class="op-hdr"><div class="op-ico" style="background:rgba(99,102,241,.13);color:var(--accent2)"><i class="fas fa-bullseye-arrow"></i></div><div class="op-title">{{ ar() ? 'الأهداف والنتائج' : 'OKR Management' }}</div><span class="op-arr">→</span></div>
    <div class="op-nums">
      <div class="op-n"><div class="op-nv">{{ st()?.okr?.total ?? '—' }}</div><div class="op-nl">{{ ar() ? 'أهداف' : 'Objectives' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--success)">{{ st()?.okr?.on_track ?? '—' }}</div><div class="op-nl">{{ ar() ? 'في المسار' : 'On Track' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--warning)">{{ st()?.okr?.at_risk ?? '—' }}</div><div class="op-nl">{{ ar() ? 'في خطر' : 'At Risk' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--danger)">{{ st()?.okr?.behind ?? '—' }}</div><div class="op-nl">{{ ar() ? 'متأخر' : 'Behind' }}</div></div>
    </div>
    <div class="op-bar"><div class="op-fill" [style.width.%]="st()?.okr?.avg_progress??0" style="background:var(--accent2)"></div></div>
    <div class="op-bar-lbl">{{ st()?.okr?.avg_progress ?? 0 }}% {{ ar() ? 'متوسط التقدم' : 'Average Progress' }}</div>
  </div>
  }

  <div class="op-card" routerLink="/documents">
    <div class="op-hdr"><div class="op-ico" style="background:rgba(16,185,129,.13);color:var(--success)"><i class="fas fa-folder-open"></i></div><div class="op-title">{{ ar() ? 'ضبط الوثائق' : 'Document Control' }}</div><span class="op-arr">→</span></div>
    <div class="op-nums">
      <div class="op-n"><div class="op-nv">{{ st()?.documents?.total ?? '—' }}</div><div class="op-nl">{{ ar() ? 'إجمالي' : 'Total' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--success)">{{ st()?.documents?.approved ?? '—' }}</div><div class="op-nl">{{ ar() ? 'معتمد' : 'Approved' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--text2)">{{ st()?.documents?.draft ?? '—' }}</div><div class="op-nl">{{ ar() ? 'مسودة' : 'Draft' }}</div></div>
      <div class="op-n"><div class="op-nv" [style.color]="st()?.documents?.expiring>0?'var(--warning)':'var(--text2)'">{{ st()?.documents?.expiring ?? '0' }}</div><div class="op-nl">{{ ar() ? 'ينتهي' : 'Expiring' }}</div></div>
    </div>
    <div class="op-bar"><div class="op-fill" [style.width.%]="pct(st()?.documents?.approved, st()?.documents?.total)" style="background:var(--success)"></div></div>
    <div class="op-bar-lbl">{{ pct(st()?.documents?.approved, st()?.documents?.total) }}% {{ ar() ? 'معتمدة' : 'Approved' }}</div>
  </div>

  @if (canSeeClients()) {
  <div class="op-card" routerLink="/clients">
    <div class="op-hdr"><div class="op-ico" style="background:rgba(59,130,246,.13);color:var(--accent)"><i class="fas fa-building-user"></i></div><div class="op-title">{{ ar() ? 'العملاء وشركات التأمين' : 'Clients & Insurers' }}</div><span class="op-arr">→</span></div>
    <div class="op-nums">
      <div class="op-n"><div class="op-nv">{{ st()?.clients?.total ?? '—' }}</div><div class="op-nl">{{ ar() ? 'إجمالي' : 'Total' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--success)">{{ st()?.clients?.active ?? '—' }}</div><div class="op-nl">{{ ar() ? 'نشط' : 'Active' }}</div></div>
      <div class="op-n"><div class="op-nv" style="color:var(--accent2)">{{ st()?.vendors?.contracts ?? '—' }}</div><div class="op-nl">{{ ar() ? 'عقود' : 'Contracts' }}</div></div>
      <div class="op-n"><div class="op-nv" [style.color]="st()?.sla?.breached_30d>0?'var(--danger)':'var(--success)'">{{ st()?.sla?.breached_30d ?? '0' }}</div><div class="op-nl">{{ ar() ? 'خروقات SLA' : 'SLA Breaches' }}</div></div>
    </div>
    <div class="op-bar"><div class="op-fill" [style.width.%]="pct(st()?.clients?.active, st()?.clients?.total)" style="background:var(--accent)"></div></div>
    <div class="op-bar-lbl">{{ pct(st()?.clients?.active, st()?.clients?.total) }}% {{ ar() ? 'نشطون' : 'Active Clients' }}</div>
  </div>
  }

</div>

<!-- ═══════════════════════════════════════════
     MODULE HEALTH — 10 modules
═══════════════════════════════════════════ -->
<div class="sec-label">{{ ar() ? 'صحة الوحدات' : 'Module Health' }}</div>
<div class="health-strip">
  @for (m of healthModules(); track m.name) {
    <div class="hm" [routerLink]="m.route" [class.hm-warn]="m.warn" [class.hm-danger]="m.danger">
      <div class="hm-ico" [style.background]="m.bg" [style.color]="m.col"><i [class]="m.icon"></i></div>
      <div class="hm-body">
        <div class="hm-name">{{ m.name }}</div>
        <div class="hm-status" [style.color]="m.stCol"><i [class]="m.stIcon" style="font-size:9px"></i> {{ m.status }}</div>
      </div>
      <div class="hm-metric" [style.color]="m.metCol">{{ m.metric }}</div>
    </div>
  }
</div>

<!-- ═══════════════════════════════════════════
     RECENT RECORDS — 4 tables
═══════════════════════════════════════════ -->
<div class="sec-label">{{ ar() ? 'أحدث السجلات' : 'Recent Records' }}</div>
<div class="rec-grid">

  <!-- Recent Requests -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'أحدث الطلبات' : 'Recent Requests' }}</div>
      <a routerLink="/requests" class="btn btn-secondary btn-xs">{{ ar() ? 'الكل' : 'All' }}</a>
    </div>
    <table class="table">
      <thead><tr><th>{{ ar() ? 'مرجع' : 'REF' }}</th><th>{{ ar() ? 'العنوان' : 'TITLE' }}</th><th>{{ ar() ? 'الأولوية' : 'PRI' }}</th><th>{{ ar() ? 'الحالة' : 'STATUS' }}</th></tr></thead>
      <tbody>
        @if (loading()) { @for (i of [1,2,3,4]; track i) { <tr><td colspan="4"><div class="sk"></div></td></tr> } }
        @for (r of requests(); track r.id) {
          <tr class="trow" (click)="go('/requests')">
            <td><span class="ref">{{ r.reference_no }}</span></td>
            <td class="clamp">{{ r.title }}</td>
            <td><span class="badge" [class]="priCls(r.priority)">{{ r.priority }}</span></td>
            <td><span class="badge" [class]="stCls(r.status)">{{ (r.status||'').replace('_',' ') }}</span></td>
          </tr>
        }
        @if (!loading() && !requests().length) { <tr><td colspan="4" class="empty">{{ ar() ? 'لا توجد بيانات' : 'No data' }}</td></tr> }
      </tbody>
    </table>
  </div>

  <!-- Recent NCs -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'عدم المطابقة الأخيرة' : 'Recent Non-Conformances' }}</div>
      <a routerLink="/nc" class="btn btn-secondary btn-xs">{{ ar() ? 'الكل' : 'All' }}</a>
    </div>
    <table class="table">
      <thead><tr><th>{{ ar() ? 'مرجع' : 'REF' }}</th><th>{{ ar() ? 'العنوان' : 'TITLE' }}</th><th>{{ ar() ? 'الخطورة' : 'SEV' }}</th><th>{{ ar() ? 'الحالة' : 'STATUS' }}</th></tr></thead>
      <tbody>
        @if (loading()) { @for (i of [1,2,3,4]; track i) { <tr><td colspan="4"><div class="sk"></div></td></tr> } }
        @for (r of ncs(); track r.id) {
          <tr class="trow" (click)="go('/nc-capa')">
            <td><span class="ref">{{ r.reference_no }}</span></td>
            <td class="clamp">{{ r.title }}</td>
            <td><span class="badge" [class]="sevCls(r.severity)">{{ r.severity }}</span></td>
            <td><span class="badge" [class]="ncStCls(r.status)">{{ (r.status||'').replace('_',' ') }}</span></td>
          </tr>
        }
        @if (!loading() && !ncs().length) { <tr><td colspan="4" class="empty">{{ ar() ? 'لا توجد بيانات' : 'No data' }}</td></tr> }
      </tbody>
    </table>
  </div>

  <!-- Open CAPAs -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'الإجراءات التصحيحية المفتوحة' : 'Open CAPAs' }}</div>
      <a routerLink="/capa" class="btn btn-secondary btn-xs">{{ ar() ? 'الكل' : 'All' }}</a>
    </div>
    <table class="table">
      <thead><tr><th>{{ ar() ? 'مرجع' : 'REF' }}</th><th>{{ ar() ? 'العنوان' : 'TITLE' }}</th><th>{{ ar() ? 'الأولوية' : 'PRI' }}</th><th>{{ ar() ? 'الاستحقاق' : 'DUE' }}</th></tr></thead>
      <tbody>
        @if (loading()) { @for (i of [1,2,3,4]; track i) { <tr><td colspan="4"><div class="sk"></div></td></tr> } }
        @for (r of capas(); track r.id) {
          <tr class="trow" (click)="go('/nc-capa/capas')">
            <td><span class="ref">{{ r.reference_no }}</span></td>
            <td class="clamp">{{ r.title }}</td>
            <td><span class="badge" [class]="priCls(r.priority)">{{ r.priority }}</span></td>
            <td style="font-size:12px;white-space:nowrap" [style.color]="isOD(r.target_date)?'var(--danger)':'var(--text2)'">
              {{ r.target_date | date:'dd MMM' }}
              @if (isOD(r.target_date)) { <i class="fas fa-clock" style="font-size:9px;margin-left:2px"></i> }
            </td>
          </tr>
        }
        @if (!loading() && !capas().length) { <tr><td colspan="4" class="empty">{{ ar() ? 'لا توجد بيانات' : 'No data' }}</td></tr> }
      </tbody>
    </table>
  </div>

  <!-- Recent Complaints -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'الشكاوى الأخيرة' : 'Recent Complaints' }}</div>
      <a routerLink="/complaints" class="btn btn-secondary btn-xs">{{ ar() ? 'الكل' : 'All' }}</a>
    </div>
    <table class="table">
      <thead><tr><th>{{ ar() ? 'مرجع' : 'REF' }}</th><th>{{ ar() ? 'العنوان' : 'TITLE' }}</th><th>{{ ar() ? 'الخطورة' : 'SEV' }}</th><th>{{ ar() ? 'الحالة' : 'STATUS' }}</th></tr></thead>
      <tbody>
        @if (loading()) { @for (i of [1,2,3,4]; track i) { <tr><td colspan="4"><div class="sk"></div></td></tr> } }
        @for (r of complaints(); track r.id) {
          <tr class="trow" (click)="go('/complaints')">
            <td><span class="ref">{{ r.reference_no }}</span></td>
            <td class="clamp">{{ r.title }}</td>
            <td><span class="badge" [class]="sevCls(r.severity)">{{ r.severity }}</span></td>
            <td><span class="badge" [class]="stCls(r.status)">{{ (r.status||'').replace('_',' ') }}</span></td>
          </tr>
        }
        @if (!loading() && !complaints().length) { <tr><td colspan="4" class="empty">{{ ar() ? 'لا توجد بيانات' : 'No data' }}</td></tr> }
      </tbody>
    </table>
  </div>

</div>

<!-- ═══════════════════════════════════════════
     BOTTOM ROW — Risks | Audits | My Tasks | Activity
═══════════════════════════════════════════ -->
<div class="sec-label">{{ ar() ? 'عناصر إضافية' : 'Additional Items' }}</div>
<div class="bot-grid">

  <!-- Critical Risks -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'المخاطر الحرجة والمرتفعة' : 'Critical & High Risks' }}</div>
      <a routerLink="/risk" class="btn btn-secondary btn-xs">{{ ar() ? 'السجل' : 'Register' }}</a>
    </div>
    <table class="table">
      <thead><tr><th>{{ ar() ? 'المخاطرة' : 'RISK' }}</th><th>{{ ar() ? 'المستوى' : 'LEVEL' }}</th><th>{{ ar() ? 'التأثير' : 'IMPACT' }}</th><th>{{ ar() ? 'الاحتمال' : 'LIKL.' }}</th></tr></thead>
      <tbody>
        @if (loading()) { @for (i of [1,2,3]; track i) { <tr><td colspan="4"><div class="sk"></div></td></tr> } }
        @for (r of risks(); track r.id) {
          <tr class="trow" (click)="go('/risk')">
            <td class="clamp">{{ r.title }}</td>
            <td><span class="badge" [class]="riskCls(r.risk_level)">{{ r.risk_level }}</span></td>
            <td style="font-size:11px;color:var(--text2);text-transform:capitalize">{{ r.impact_level }}</td>
            <td style="font-size:11px;color:var(--text2);text-transform:capitalize">{{ r.likelihood_level }}</td>
          </tr>
        }
        @if (!loading() && !risks().length) { <tr><td colspan="4" class="empty">{{ ar() ? 'لا توجد مخاطر حرجة' : 'No critical risks' }}</td></tr> }
      </tbody>
    </table>
  </div>

  <!-- Upcoming Audits -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">{{ ar() ? 'المراجعات القادمة' : 'Upcoming Audits' }}</div>
      <a routerLink="/audits" class="btn btn-secondary btn-xs">{{ ar() ? 'الكل' : 'All' }}</a>
    </div>
    <table class="table">
      <thead><tr><th>{{ ar() ? 'مرجع' : 'REF' }}</th><th>{{ ar() ? 'العنوان' : 'TITLE' }}</th><th>{{ ar() ? 'النوع' : 'TYPE' }}</th><th>{{ ar() ? 'التاريخ' : 'DATE' }}</th></tr></thead>
      <tbody>
        @if (loading()) { @for (i of [1,2,3]; track i) { <tr><td colspan="4"><div class="sk"></div></td></tr> } }
        @for (a of audits(); track a.id) {
          <tr class="trow" (click)="go('/audits')">
            <td><span class="ref">{{ a.reference_no }}</span></td>
            <td class="clamp">{{ a.title }}</td>
            <td style="font-size:11px;color:var(--text2);text-transform:capitalize">{{ a.type }}</td>
            <td style="font-size:12px;color:var(--text2);white-space:nowrap">{{ a.planned_start_date | date:'dd MMM' }}</td>
          </tr>
        }
        @if (!loading() && !audits().length) { <tr><td colspan="4" class="empty">{{ ar() ? 'لا مراجعات قادمة' : 'No upcoming audits' }}</td></tr> }
      </tbody>
    </table>
  </div>

  <!-- My Tasks -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">
        {{ isQAFull()       ? (ar()?'قائمة الانتظار وإدارة الفريق':'QA Queue & My Work') :
           isQASupervisor() ? (ar()?'مهام الفريق المسندة إليّ':'Supervisor Queue') :
           isDeptMgr()      ? (ar()?'طلبات تنتظر موافقتي':'Pending My Approval') :
           isCompliance()   ? (ar()?'شكاوى وحالات الامتثال':'Compliance Queue') :
           isAuditor()      ? (ar()?'جداول المراجعة الخاصة بي':'My Audit Schedule') :
           (isQAOfficer())  ? (ar()?'مهامي المسندة':'Assigned to Me') :
           (ar()?'طلباتي النشطة':'My Active Requests') }}
      </div>
      <span class="badge badge-blue">{{ myTaskCount() }}</span>
    </div>
    <div class="tasks-list">
      @if (tasksLoading()) { @for (i of [1,2,3]; track i) { <div class="task-item"><div class="sk" style="width:100%"></div></div> } }
      @for (t of myTasks().requests || []; track t.id) {
        <div class="task-item" (click)="go('/requests')">
          <div class="task-dot" style="background:var(--accent)"></div>
          <div class="task-body">
            <div class="task-title">{{ t.title }}</div>
            <div class="task-meta">{{ ar() ? 'طلب' : 'Request' }} · {{ t.reference_no }}</div>
          </div>
          <span class="badge" [class]="priCls(t.priority)">{{ t.priority }}</span>
        </div>
      }
      @for (t of myTasks().capa_tasks || []; track t.id) {
        <div class="task-item" (click)="go('/nc-capa/capas')">
          <div class="task-dot" style="background:var(--warning)"></div>
          <div class="task-body">
            <div class="task-title">{{ t.capa_title }}</div>
            <div class="task-meta">{{ ar() ? 'إجراء تصحيحي' : 'CAPA' }} · {{ t.capa_ref }}</div>
          </div>
          <span class="badge badge-yellow">{{ t.status }}</span>
        </div>
      }
      @if (!tasksLoading() && myTaskCount() === 0) {
        <div class="empty" style="padding:24px;text-align:center">
          <i class="fas fa-circle-check" style="font-size:22px;color:var(--success);margin-bottom:6px;display:block"></i>
          {{ isDeptMgr()      ? (ar()?'لا طلبات تنتظر موافقتك':'No requests pending your approval') :
             isQAFull()       ? (ar()?'لا طلبات في قائمة الانتظار':'QA queue is clear') :
             isQASupervisor() ? (ar()?'لا توجد مهام معلقة للمتابعة':'Supervisor queue is clear') :
             isCompliance()   ? (ar()?'لا شكاوى مفتوحة حالياً':'No open compliance cases') :
             isAuditor()      ? (ar()?'لا مراجعات مجدولة':'No audits scheduled') :
             (ar()?'لا توجد مهام معلقة':'All caught up!') }}
        </div>
      }
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="card">
    <div class="card-header"><div class="card-title">{{ ar() ? 'آخر النشاطات' : 'Recent Activity' }}</div></div>
    <div class="act-feed">
      @if (loading()) { @for (i of [1,2,3,4,5]; track i) { <div class="act-row"><div class="sk" style="width:100%"></div></div> } }
      @for (a of activity(); track a.id) {
        <div class="act-row">
          <div class="act-av" [style.background]="avCol(a.user?.name)">{{ initial(a.user?.name) }}</div>
          <div class="act-body">
            <div class="act-txt"><strong>{{ a.user?.name ?? 'System' }}</strong> {{ a.action }} {{ a.module }}</div>
            <div class="act-time">{{ a.created_at | date:'dd MMM, h:mm a' }}</div>
          </div>
          <div class="act-badge" [style.background]="actBg(a.action)" [style.color]="actCol(a.action)">
            <i [class]="actIcon(a.action)"></i>
          </div>
        </div>
      }
      @if (!loading() && !activity().length) { <div class="empty" style="padding:24px">{{ ar() ? 'لا يوجد نشاط' : 'No recent activity' }}</div> }
    </div>
  </div>

</div>

<!-- ═══════════════════════════════════════════
     SLA COMPLIANCE STRIP
═══════════════════════════════════════════ -->
@if (st()?.sla?.total > 0 && canSeeSLA()) {
  <div class="sec-label">{{ ar() ? 'اتفاقيات مستوى الخدمة (SLA)' : 'SLA Compliance' }}</div>
  <div class="sla-strip" routerLink="/sla">
    <div class="sla-item">
      <div class="sla-v" style="color:var(--accent)">{{ st()?.sla?.total ?? '—' }}</div>
      <div class="sla-l">{{ ar() ? 'اتفاقيات نشطة' : 'Active SLAs' }}</div>
    </div>
    <div class="sla-bar-wrap">
      <div class="sla-bar-label">
        <span>{{ ar() ? 'متوسط الامتثال' : 'Avg Compliance' }}</span>
        <span [style.color]="slaCol()" style="font-weight:700">{{ st()?.sla?.avg_compliance != null ? (st()?.sla?.avg_compliance + '%') : 'N/A' }}</span>
      </div>
      <div class="sla-track">
        <div class="sla-fill" [style.width.%]="st()?.sla?.avg_compliance??0" [style.background]="slaCol()"></div>
      </div>
    </div>
    <div class="sla-item">
      <div class="sla-v" [style.color]="st()?.sla?.breached_30d>0?'var(--danger)':'var(--success)'">{{ st()?.sla?.breached_30d ?? '0' }}</div>
      <div class="sla-l">{{ ar() ? 'خروقات (30 يوم)' : 'Breaches (30d)' }}</div>
    </div>
    <span class="op-arr" style="color:var(--text3);font-size:18px">→</span>
  </div>
}

<!-- ═══════════════════════════════════════════
     OVERDUE ALERT BANNER
═══════════════════════════════════════════ -->
@if (hasOverdue()) {
  <div class="sec-label" style="color:var(--danger)">
    <i class="fas fa-triangle-exclamation"></i>
    {{ ar() ? 'عناصر متأخرة تتطلب الانتباه الفوري' : 'Overdue Items Require Immediate Attention' }}
    <span class="badge badge-red" style="margin-left:6px">{{ overdueList().length }}</span>
  </div>
  <div class="od-grid">
    @for (item of overdueList(); track item.ref) {
      <div class="od-card" [routerLink]="item.route">
        <div class="od-ico"><i [class]="item.icon"></i></div>
        <div class="od-body">
          <div class="od-ref">{{ item.ref }}</div>
          <div class="od-title">{{ item.title }}</div>
          <div class="od-due">{{ ar() ? 'كان مقرراً في' : 'Was due' }}: {{ item.due | date:'dd MMM yyyy' }}</div>
        </div>
        <div>
          <span class="badge badge-red">{{ ar() ? 'متأخر' : 'Overdue' }}</span>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;text-align:center">{{ daysPast(item.due) }}d</div>
        </div>
      </div>
    }
  </div>
}
  `,
  styles: [`
    .dh { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:12px; }
    .dh-greet { font-family:'Inter',sans-serif; font-size:22px; font-weight:800; }
    .dh-sub { font-size:13px; color:var(--text2); margin-top:3px; }
    .dh-pills { display:flex; gap:8px; flex-wrap:wrap; }
    .pill { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; font-size:11px; font-weight:600; }
    .pill-blue   { background:rgba(59,130,246,.12); color:var(--accent);  border:1px solid rgba(59,130,246,.2); }
    .pill-green  { background:rgba(16,185,129,.12); color:var(--success); border:1px solid rgba(16,185,129,.2); }
    .pill-purple { background:rgba(99,102,241,.12); color:var(--accent2); border:1px solid rgba(99,102,241,.2); }
    /* KPI Band */
    .kpi-band { display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 20px; margin-bottom:4px; flex-wrap:wrap; overflow-x:auto; }
    .kpi { display:flex; flex-direction:column; align-items:center; flex:1; min-width:80px; padding:4px 10px; }
    .kpi-v { font-family:'Inter',sans-serif; font-size:21px; font-weight:800; line-height:1.1; }
    .kpi-l { font-size:10px; color:var(--text2); font-weight:500; margin-top:2px; text-align:center; white-space:nowrap; }
    .kpi-sep { width:1px; height:36px; background:var(--border); flex-shrink:0; }
    /* Section Label */
    .sec-label { font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin:18px 0 10px; display:flex; align-items:center; gap:6px; }
    /* Core Metric Cards */
    .mc-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media(max-width:1200px){ .mc-grid { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:600px)  { .mc-grid { grid-template-columns:1fr 1fr; } }
    .mc { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px 20px; cursor:pointer; transition:all .15s; }
    .mc:hover { transform:translateY(-2px); border-color:var(--border2); box-shadow:0 4px 20px rgba(0,0,0,.15); }
    .mc-row1 { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .mc-ico { width:38px; height:38px; border-radius:10px; display:grid; place-items:center; font-size:14px; }
    .ico-blue   { background:rgba(59,130,246,.15);  color:var(--accent); }
    .ico-red    { background:rgba(239,68,68,.15);   color:var(--danger); }
    .ico-orange { background:rgba(245,158,11,.15);  color:var(--warning); }
    .ico-green  { background:rgba(16,185,129,.15);  color:var(--success); }
    .ico-purple { background:rgba(99,102,241,.15);  color:var(--accent2); }
    .ico-sky    { background:rgba(14,165,233,.15);  color:var(--accent3); }
    .mc-tag { font-size:11px; font-weight:600; display:flex; align-items:center; gap:3px; padding:3px 9px; border-radius:10px; white-space:nowrap; }
    .tag-up     { background:rgba(16,185,129,.12); color:var(--success); }
    .tag-down   { background:rgba(239,68,68,.12);  color:var(--danger); }
    .tag-warn   { background:rgba(245,158,11,.12); color:var(--warning); }
    .tag-neutral{ background:var(--surface2); color:var(--text2); }
    .mc-val { font-family:'Inter',sans-serif; font-size:36px; font-weight:800; line-height:1; margin-bottom:6px; }
    .mc-lbl { font-size:12px; font-weight:600; color:var(--text2); text-transform:uppercase; letter-spacing:.4px; }
    .mc-sub { font-size:11px; color:var(--text3); margin-top:3px; }
    /* Operational Cards */
    .op-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    @media(max-width:1100px){ .op-grid { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:600px)  { .op-grid { grid-template-columns:1fr; } }
    .op-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px 18px; cursor:pointer; transition:all .15s; display:flex; flex-direction:column; gap:10px; }
    .op-card:hover { border-color:var(--accent); transform:translateY(-1px); }
    .op-hdr { display:flex; align-items:center; gap:10px; }
    .op-ico { width:32px; height:32px; border-radius:8px; display:grid; place-items:center; font-size:13px; flex-shrink:0; }
    .op-title { font-size:13px; font-weight:700; flex:1; }
    .op-arr { font-size:13px; color:var(--text3); }
    .op-nums { display:flex; }
    .op-n { flex:1; text-align:center; }
    .op-nv { font-family:'Inter',sans-serif; font-size:19px; font-weight:800; }
    .op-nl { font-size:10px; color:var(--text3); font-weight:500; margin-top:1px; }
    .op-bar { height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
    .op-fill { height:100%; border-radius:2px; transition:width .7s ease; }
    .op-bar-lbl { font-size:10px; color:var(--text3); }
    /* Charts */
    .ch-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:0; }
    .ch-wide { flex:2.2; min-width:280px; }
    .ch-sm   { flex:1; min-width:160px; }
    .donut-wrap { display:flex; justify-content:center; }
    .leg { display:flex; flex-wrap:wrap; gap:6px; padding:6px 0 2px; justify-content:center; }
    /* Health Strip */
    .health-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
    @media(max-width:1100px){ .health-strip { grid-template-columns:repeat(3,1fr); } }
    @media(max-width:600px)  { .health-strip { grid-template-columns:repeat(2,1fr); } }
    .hm { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all .15s; }
    .hm:hover { border-color:var(--accent); }
    .hm-warn   { border-color:rgba(245,158,11,.4) !important; }
    .hm-danger { border-color:rgba(239,68,68,.4) !important; }
    .hm-ico { width:32px; height:32px; border-radius:8px; display:grid; place-items:center; font-size:12px; flex-shrink:0; }
    .hm-body { flex:1; min-width:0; }
    .hm-name { font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .hm-status { font-size:10px; font-weight:600; margin-top:2px; display:flex; align-items:center; gap:3px; }
    .hm-metric { font-family:'Inter',sans-serif; font-size:16px; font-weight:800; flex-shrink:0; }
    /* Recent Records - 4 column */
    .rec-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media(max-width:1400px){ .rec-grid { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:700px)  { .rec-grid { grid-template-columns:1fr; } }
    /* Bottom Grid */
    .bot-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; }
    @media(max-width:1300px){ .bot-grid { grid-template-columns:1fr 1fr; } }
    @media(max-width:700px)  { .bot-grid { grid-template-columns:1fr; } }
    /* My Tasks */
    .tasks-list { max-height:260px; overflow-y:auto; }
    .task-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .1s; }
    .task-item:last-child { border-bottom:none; }
    .task-item:hover { background:var(--surface2); }
    .task-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .task-body { flex:1; min-width:0; }
    .task-title { font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .task-meta { font-size:10px; color:var(--text3); margin-top:1px; }
    /* Activity Feed */
    .act-feed { max-height:260px; overflow-y:auto; }
    .act-feed::-webkit-scrollbar,.tasks-list::-webkit-scrollbar { width:3px; }
    .act-feed::-webkit-scrollbar-thumb,.tasks-list::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
    .act-row { display:flex; align-items:flex-start; gap:10px; padding:9px 16px; border-bottom:1px solid var(--border); }
    .act-row:last-child { border-bottom:none; }
    .act-av { width:26px; height:26px; border-radius:50%; display:grid; place-items:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; margin-top:2px; }
    .act-body { flex:1; min-width:0; }
    .act-txt { font-size:12px; line-height:1.4; }
    .act-time { font-size:10px; color:var(--text3); margin-top:1px; }
    .act-badge { width:20px; height:20px; border-radius:5px; display:grid; place-items:center; font-size:9px; flex-shrink:0; margin-top:2px; }
    /* SLA Strip */
    .sla-strip { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px 24px; display:flex; align-items:center; gap:24px; cursor:pointer; transition:all .15s; margin-bottom:4px; }
    .sla-strip:hover { border-color:var(--accent); }
    .sla-item { text-align:center; min-width:80px; }
    .sla-v { font-family:'Inter',sans-serif; font-size:26px; font-weight:800; }
    .sla-l { font-size:10px; color:var(--text2); font-weight:500; margin-top:2px; }
    .sla-bar-wrap { flex:1; }
    .sla-bar-label { display:flex; justify-content:space-between; font-size:12px; color:var(--text2); margin-bottom:6px; }
    .sla-track { height:8px; background:var(--border); border-radius:4px; overflow:hidden; }
    .sla-fill { height:100%; border-radius:4px; transition:width .7s ease; }
    /* Overdue */
    .od-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:10px; margin-bottom:16px; }
    .od-card { background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.2); border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all .1s; }
    .od-card:hover { background:rgba(239,68,68,.1); }
    .od-ico { width:32px; height:32px; border-radius:8px; background:rgba(239,68,68,.12); color:var(--danger); display:grid; place-items:center; font-size:13px; flex-shrink:0; }
    .od-body { flex:1; min-width:0; }
    .od-ref { font-size:10px; font-family:monospace; color:var(--danger); }
    .od-title { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .od-due { font-size:11px; color:var(--text2); margin-top:2px; }
    /* Table helpers */
    .trow { cursor:pointer; transition:background .1s; }
    .trow:hover { background:var(--surface2); }
    .clamp { max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ref { font-family:monospace; font-size:12px; color:var(--accent); }
    .empty { text-align:center; color:var(--text3); padding:18px; font-size:13px; }
    /* Skeleton */
    .sk { height:13px; background:var(--surface2); border-radius:4px; animation:pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }
    /* Badge colours */
    .badge-red    { background:rgba(239,68,68,.15);  color:var(--danger);  border:1px solid rgba(239,68,68,.2); }
    .badge-orange { background:rgba(249,115,22,.15); color:#fb923c;        border:1px solid rgba(249,115,22,.2); }
    .badge-yellow { background:rgba(234,179,8,.15);  color:#ca8a04;        border:1px solid rgba(234,179,8,.2); }
    .badge-green  { background:rgba(16,185,129,.15); color:var(--success); border:1px solid rgba(16,185,129,.2); }
    .badge-blue   { background:rgba(59,130,246,.15); color:var(--accent);  border:1px solid rgba(59,130,246,.2); }
    .badge-draft  { background:var(--surface2); color:var(--text2); border:1px solid var(--border); }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  private api    = inject(ApiService);
  public  lang   = inject(LanguageService);
  public  auth   = inject(AuthService);
  private router_= inject(Router);

  loading      = signal(true);
  tasksLoading = signal(true);
  st           = signal<any>(null);
  requests     = signal<any[]>([]);
  ncs          = signal<any[]>([]);
  capas        = signal<any[]>([]);
  complaints   = signal<any[]>([]);
  risks        = signal<any[]>([]);
  audits       = signal<any[]>([]);
  activity     = signal<any[]>([]);
  myTasks_     = signal<any>({ requests: [], capa_tasks: [], nc_tasks: [] });
  od           = signal<any>({ requests:[], capas:[], complaints:[] });

  private charts: any[] = [];
  ar = () => this.lang.isArabic();

  // ── Role computed signals ─────────────────────────────────────────────
  private roleSlug  = computed(() => (this.auth.currentUser() as any)?.role?.slug ?? '');
  private rolePerms = computed((): string[] => (this.auth.currentUser() as any)?.role?.permissions ?? []);

  // Explicit role booleans — no catch-all fallbacks
  isQAFull          = computed(() => ['super_admin','qa_manager'].includes(this.roleSlug()));
  isQASupervisor    = computed(() => this.roleSlug() === 'quality_supervisor');
  isQAOfficer       = computed(() => this.roleSlug() === 'qa_officer');
  isQATeam          = computed(() => ['super_admin','qa_manager','quality_supervisor','qa_officer'].includes(this.roleSlug()));
  isDeptMgr         = computed(() => this.roleSlug() === 'dept_manager');
  isComplianceMgr   = computed(() => this.roleSlug() === 'compliance_manager');
  isComplianceOfc   = computed(() => this.roleSlug() === 'compliance_officer');
  isCompliance      = computed(() => ['compliance_manager','compliance_officer'].includes(this.roleSlug()));
  isAuditor         = computed(() => this.roleSlug() === 'auditor');
  isEmployee        = computed(() => this.roleSlug() === 'employee');
  isClient          = computed(() => this.roleSlug() === 'client');

  // Permission check helper
  private hasPerm(perm: string): boolean {
    const perms = this.rolePerms();
    const mod   = perm.split('.')[0];
    return perms.includes('*') || perms.includes(perm) || perms.includes(mod + '.*');
  }

  // Module visibility — permission-based
  canSeeVendors  = computed(() => this.hasPerm('vendor.view'));
  canSeeVisits   = computed(() => this.hasPerm('visit.view'));
  canSeeAudits   = computed(() => this.hasPerm('audit.view'));
  canSeeRisks    = computed(() => this.hasPerm('risk.view'));
  canSeeOKR      = computed(() => this.hasPerm('okr.view'));
  canSeeSurveys  = computed(() => this.hasPerm('survey.view'));
  canSeeClients  = computed(() => this.hasPerm('visit.view'));
  canSeeSLA      = computed(() => this.hasPerm('sla.view'));
  canSeeReports  = computed(() => this.hasPerm('report.view'));
  canSeeAdmin    = computed(() => this.hasPerm('admin.access'));

  // Role label for greeting bar
  roleLabel = computed(() => {
    const m: Record<string,string> = {
      super_admin:        'Super Administrator',
      qa_manager:         'QA Manager',
      quality_supervisor: 'Quality Supervisor',
      qa_officer:         'Quality Officer',
      compliance_manager: 'Compliance Manager',
      compliance_officer: 'Compliance Officer',
      dept_manager:       'Department Manager',
      auditor:            'Auditor',
      employee:           'Staff',
      client:             'Client',
    };
    return m[this.roleSlug()] ?? this.roleSlug();
  });

  // ── Greeting / header ──────────────────────────────────────────────────
  greet() {
    const h = new Date().getHours(), a = this.ar();
    if (h < 12) return a ? 'صباح الخير' : 'Good morning';
    if (h < 17) return a ? 'مساء الخير' : 'Good afternoon';
    return a ? 'مساء الخير' : 'Good evening';
  }
  userName() { return this.auth.currentUser()?.name?.split(' ')[0] ?? ''; }
  dateStr()  { return new Date().toLocaleDateString(this.ar() ? 'ar-SA' : 'en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' }); }
  slaCol()   { const v = this.st()?.sla?.avg_compliance; return v == null ? 'var(--text2)' : v >= 90 ? 'var(--success)' : v >= 70 ? 'var(--warning)' : 'var(--danger)'; }

  // ── Core cards — role-aware ───────────────────────────────────────────
  coreCards() {
    const d = this.st(), a = this.ar(); if (!d) return [];
    const mk = (label:string, value:any, icon:string, col:string, tag:string, tagCls:string, tagIcon:string, sub:string|null, route:string, show = true) =>
      ({ label, value, icon, col, tag, tagCls, tagIcon, sub, route, show });

    const reqLabel = this.isEmployee()                        ? (a ? 'طلباتي'         : 'My Requests')
                   : this.isDeptMgr()                         ? (a ? 'طلبات قسمي'     : 'Dept Requests')
                   : (this.isQAOfficer() || this.isAuditor()) ? (a ? 'مهامي'           : 'My Tasks')
                   : this.isCompliance()                      ? (a ? 'شكاوى مفتوحة'   : 'Open Complaints')
                   :                                            (a ? 'طلبات مفتوحة'   : 'Open Requests');

    const reqSub   = this.isEmployee()
                   ? `${d.requests?.submitted??0} ${a ? 'مقدم' : 'submitted'}`
                   : `${d.requests?.total??0} ${a ? 'إجمالي' : 'total'}`;

    const cards = [
      mk(reqLabel, d.requests?.open??0, 'fas fa-inbox', 'blue',
         `${d.requests?.overdue??0} ${a?'متأخر':'overdue'}`,
         d.requests?.overdue>0?'tag-down':'tag-neutral',
         d.requests?.overdue>0?'fas fa-arrow-up':'fas fa-minus',
         reqSub, '/requests'),

      mk(a?'حالات عدم المطابقة':'Open NCs', d.nc_capa?.open_ncs??0,
         'fas fa-triangle-exclamation', 'red',
         `${d.nc_capa?.closed_ncs??0} ${a?'مغلق':'closed'}`,
         'tag-neutral', 'fas fa-check-circle', null, '/nc'),

      mk(a?'إجراءات تصحيحية':'Open CAPAs', d.nc_capa?.open_capas??0,
         'fas fa-circle-check', 'orange',
         `${d.nc_capa?.overdue??0} ${a?'متأخر':'overdue'}`,
         d.nc_capa?.overdue>0?'tag-down':'tag-neutral',
         d.nc_capa?.overdue>0?'fas fa-clock':'fas fa-check',
         null, '/capa'),

      mk(a?'مخاطر حرجة':'Critical Risks', d.risks?.critical??0,
         'fas fa-fire-flame-curved', 'red',
         `${d.risks?.high??0} ${a?'مرتفع':'high'}`,
         d.risks?.critical>0?'tag-down':'tag-neutral',
         d.risks?.critical>0?'fas fa-arrow-up':'fas fa-shield-halved',
         `${d.risks?.open??0} ${a?'مفتوح':'open'}`, '/risk',
         this.canSeeRisks()),

      mk(a?'مراجعات مخططة':'Planned Audits', d.audits?.planned??0,
         'fas fa-magnifying-glass-chart', 'purple',
         `${d.audits?.in_progress??0} ${a?'جارية':'in progress'}`,
         'tag-neutral', 'fas fa-spinner',
         `${d.audits?.open_findings??0} ${a?'نتائج':'findings'}`, '/audits',
         this.canSeeAudits()),

      mk(a?'الشكاوى المفتوحة':'Open Complaints', d.complaints?.open??0,
         'fas fa-comment-exclamation', 'red',
         `${d.complaints?.overdue??0} ${a?'متأخر':'overdue'}`,
         d.complaints?.overdue>0?'tag-down':'tag-neutral', 'fas fa-arrow-up',
         `${d.complaints?.resolved??0} ${a?'تم الحل':'resolved'}`, '/complaints'),

      mk(a?'نتائج المراجعة':'Audit Findings', d.audits?.open_findings??0,
         'fas fa-clipboard-list', 'sky',
         `${d.audits?.closed_findings??0} ${a?'مغلق':'closed'}`,
         d.audits?.open_findings>0?'tag-warn':'tag-up',
         d.audits?.open_findings>0?'fas fa-exclamation':'fas fa-check',
         `${d.audits?.total_findings??0} ${a?'إجمالي':'total'}`, '/audits',
         this.canSeeAudits()),

      mk(a?'وثائق معتمدة':'Approved Documents', d.documents?.approved??0,
         'fas fa-file-shield', 'green',
         `${d.documents?.expiring??0} ${a?'ينتهي':'expiring'}`,
         d.documents?.expiring>0?'tag-warn':'tag-up',
         d.documents?.expiring>0?'fas fa-clock':'fas fa-check',
         `${d.documents?.total??0} ${a?'إجمالي':'total'}`, '/documents'),
    ];

    return cards.filter(c => c.show !== false);
  }

  // ── Module health — filtered by role permissions ────────────────────
  healthModules() {
    const d = this.st(), a = this.ar(); if (!d) return [];
    const chk='fas fa-circle-check', dot='fas fa-circle', clk='fas fa-clock';
    const OK='var(--success)', WN='var(--warning)', DG='var(--danger)';

    const all = [
      { key:'requests',  show:true,                    name:a?'الطلبات':'Requests',        icon:'fas fa-inbox',                 bg:'rgba(59,130,246,.12)',  col:'var(--accent)',  route:'/requests',  metric:d.requests?.open??0,                              metCol:d.requests?.overdue>0?DG:'var(--accent)', status:d.requests?.overdue>0?(a?'متأخرة':'Overdue'):(a?'طبيعي':'Normal'),           stCol:d.requests?.overdue>0?DG:OK, stIcon:d.requests?.overdue>0?dot:chk, warn:false, danger:d.requests?.overdue>0 },
      { key:'nc',        show:true,                    name:a?'عدم المطابقة':'NC/CAPA',    icon:'fas fa-triangle-exclamation',  bg:'rgba(239,68,68,.12)',   col:'var(--danger)', route:'/nc-capa',        metric:(d.nc_capa?.open_ncs??0)+(d.nc_capa?.open_capas??0),metCol:'var(--danger)', status:d.nc_capa?.overdue>0?(a?'متأخرة':'Overdue'):(a?'طبيعي':'Normal'),             stCol:d.nc_capa?.overdue>0?DG:OK, stIcon:d.nc_capa?.overdue>0?dot:chk, warn:false, danger:d.nc_capa?.overdue>0 },
      { key:'risk',      show:this.canSeeRisks(),      name:a?'المخاطر':'Risk',            icon:'fas fa-fire-flame-curved',     bg:'rgba(239,68,68,.12)',   col:'var(--danger)', route:'/risk',      metric:d.risks?.critical??0,                             metCol:d.risks?.critical>0?DG:OK, status:d.risks?.critical>0?(a?'حرج':'Critical'):(a?'طبيعي':'Normal'),              stCol:d.risks?.critical>0?DG:OK, stIcon:d.risks?.critical>0?dot:chk, warn:false, danger:d.risks?.critical>0 },
      { key:'audits',    show:this.canSeeAudits(),     name:a?'المراجعات':'Audits',        icon:'fas fa-magnifying-glass-chart',bg:'rgba(99,102,241,.12)',  col:'var(--accent2)',route:'/audits',    metric:d.audits?.planned??0,                             metCol:'var(--accent2)', status:d.audits?.in_progress>0?(a?'جارية':'In Progress'):(a?'مخطط':'Planned'),    stCol:d.audits?.in_progress>0?WN:OK, stIcon:d.audits?.in_progress>0?dot:chk, warn:d.audits?.in_progress>0, danger:false },
      { key:'documents', show:true,                    name:a?'الوثائق':'Documents',       icon:'fas fa-folder-open',           bg:'rgba(16,185,129,.12)',  col:'var(--success)',route:'/documents', metric:d.documents?.approved??0,                         metCol:'var(--success)', status:d.documents?.expiring>0?(a?'ينتهي قريباً':'Expiring'):(a?'محدّث':'Current'),stCol:d.documents?.expiring>0?WN:OK, stIcon:d.documents?.expiring>0?clk:chk, warn:d.documents?.expiring>0, danger:false },
      { key:'complaints',show:true,                    name:a?'الشكاوى':'Complaints',      icon:'fas fa-comment-exclamation',   bg:'rgba(239,68,68,.12)',   col:'var(--danger)', route:'/complaints',metric:d.complaints?.open??0,                            metCol:d.complaints?.overdue>0?DG:'var(--text)', status:d.complaints?.overdue>0?(a?'متأخرة':'Overdue'):(a?'طبيعي':'Normal'),        stCol:d.complaints?.overdue>0?DG:OK, stIcon:d.complaints?.overdue>0?dot:chk, warn:false, danger:d.complaints?.overdue>0 },
      { key:'vendors',   show:this.canSeeVendors(),    name:a?'الموردون':'Vendors',        icon:'fas fa-truck-ramp-box',        bg:'rgba(139,92,246,.12)',  col:'#a78bfa',       route:'/vendors',   metric:d.vendors?.active??0,                             metCol:'var(--accent2)', status:d.vendors?.expiring>0?(a?'عقود تنتهي':'Expiring'):(a?'طبيعي':'Normal'),       stCol:d.vendors?.expiring>0?WN:OK, stIcon:d.vendors?.expiring>0?clk:chk, warn:d.vendors?.expiring>0, danger:false },
      { key:'visits',    show:this.canSeeVisits(),     name:a?'الزيارات':'Visits',         icon:'fas fa-calendar-check',        bg:'rgba(14,165,233,.12)',  col:'var(--accent3)',route:'/visits',    metric:d.visits?.scheduled??0,                           metCol:'var(--accent3)', status:a?'مجدول':'Scheduled',                                                      stCol:OK, stIcon:chk, warn:false, danger:false },
      { key:'surveys',   show:this.canSeeSurveys(),    name:a?'رضا العملاء':'Surveys',     icon:'fas fa-face-smile',            bg:'rgba(236,72,153,.12)',  col:'#f472b6',       route:'/surveys',   metric:d.surveys?.active??0,                             metCol:'#f472b6', status:a?'نشط':'Active',                                                                stCol:OK, stIcon:chk, warn:false, danger:false },
      { key:'okr',       show:this.canSeeOKR(),        name:a?'الأهداف':'OKR',             icon:'fas fa-bullseye-arrow',        bg:'rgba(99,102,241,.12)',  col:'var(--accent2)',route:'/okr',       metric:`${d.okr?.avg_progress??0}%`,                     metCol:d.okr?.avg_progress>=70?OK:d.okr?.avg_progress>=40?WN:DG, status:d.okr?.behind>0?(a?'متأخر':'Behind'):(a?'في المسار':'On Track'), stCol:d.okr?.behind>0?DG:OK, stIcon:d.okr?.behind>0?dot:chk, warn:false, danger:d.okr?.behind>0 },
    ];

    return all.filter(m => m.show !== false);
  }

  // ── Overdue ───────────────────────────────────────────────────────────
  hasOverdue() {
    const o = this.od();
    return (o?.requests?.length||0) + (o?.capas?.length||0) + (o?.complaints?.length||0) > 0;
  }
  overdueList() {
    const o = this.od(), items: any[] = [];
    (o?.requests||[]).slice(0,5).forEach((r:any)=>items.push({ ref:r.reference_no, title:r.title, due:r.due_date,              icon:'fas fa-inbox',              route:'/requests' }));
    (o?.capas||[]).slice(0,5).forEach((c:any)=>items.push({ ref:c.reference_no,   title:c.title, due:c.target_date,            icon:'fas fa-circle-check',       route:'/nc-capa/capas' }));
    (o?.complaints||[]).slice(0,5).forEach((c:any)=>items.push({ ref:c.reference_no, title:c.title, due:c.target_resolution_date, icon:'fas fa-comment-exclamation', route:'/complaints' }));
    return items;
  }
  myTasks()     { return this.myTasks_(); }
  myTaskCount() { const t = this.myTasks_(); return (t?.requests?.length||0)+(t?.capa_tasks?.length||0); }

  // ── Lifecycle ────────────────────────────────────────────────────────
  ngOnInit()        { this.loadAll(); }
  ngAfterViewInit() { setTimeout(() => this.loadCharts(), 900); }
  ngOnDestroy()     { this.charts.forEach(c => { try { c.destroy(); } catch {} }); }
  refresh()         { this.loading.set(true); this.loadAll(); }

  loadAll() {
    this.api.get<any>('/dashboard/stats').subscribe({ next:d=>{ this.st.set(d); this.loading.set(false); }, error:()=>this.loading.set(false) });
    this.api.get<any>('/requests?per_page=5').subscribe({ next:r=>this.requests.set(r?.data||[]), error:()=>{} });
    this.api.get<any>('/nonconformances?per_page=5').subscribe({ next:r=>this.ncs.set(r?.data||[]), error:()=>{} });
    this.api.get<any>('/capas?per_page=5').subscribe({ next:r=>this.capas.set(r?.data||[]), error:()=>{} });
    this.api.get<any>('/complaints?per_page=5').subscribe({ next:r=>this.complaints.set(r?.data||[]), error:()=>{} });
    this.api.get<any>('/risks?per_page=6').subscribe({ next:r=>this.risks.set((r?.data||[]).filter((x:any)=>['critical','high'].includes(x.risk_level)).slice(0,6)), error:()=>{} });
    this.api.get<any>('/audits?per_page=5&status=planned,in_progress').subscribe({ next:r=>this.audits.set(r?.data||[]), error:()=>{} });
    this.api.get<any>('/dashboard/recent-activities').subscribe({ next:r=>this.activity.set(Array.isArray(r)?r:r?.data||[]), error:()=>{} });
    this.api.get<any>('/dashboard/overdue').subscribe({ next:r=>this.od.set(r), error:()=>{} });
    this.api.get<any>('/dashboard/my-tasks').subscribe({ next:r=>{ this.myTasks_.set(r); this.tasksLoading.set(false); }, error:()=>this.tasksLoading.set(false) });
  }

  loadCharts() {
    const C = (window as any).Chart;
    if (!C) { setTimeout(()=>this.loadCharts(), 500); return; }
    this.api.get<any>('/dashboard/charts').subscribe({
      next: d => { this.mkTrend(d,C); this.mkRisk(d,C); this.mkReq(d,C); this.mkCapa(d,C); this.mkAuditType(d,C); this.mkVendorCat(d,C); this.mkOkr(d,C); this.mkCompSev(d,C); },
      error:  () => { this.mkTrend(null,C); this.mkRisk(null,C); this.mkReq(null,C); this.mkCapa(null,C); this.mkAuditType(null,C); this.mkVendorCat(null,C); this.mkOkr(null,C); this.mkCompSev(null,C); }
    });
  }

  mkTrend(d:any, C:any) {
    const el = document.getElementById('trendChart') as HTMLCanvasElement; if (!el) return;
    const nc=d?.nc_trend||[], cp=d?.complaints_trend||[], rq=d?.requests_trend||[];
    const labels = nc.length ? nc.map((x:any)=>x.month) : ['Aug','Sep','Oct','Nov','Dec','Jan'];
    const a = this.ar();
    this.charts.push(new C(el, {
      type:'line',
      data:{ labels, datasets:[
        { label:a?'عدم المطابقة':'NCs',      data:nc.length?nc.map((x:any)=>x.count):[4,7,3,9,5,8], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.07)', tension:.4, fill:true, pointRadius:3, pointBackgroundColor:'#3b82f6' },
        { label:a?'الشكاوى':'Complaints',   data:cp.length?cp.map((x:any)=>x.count):[2,3,5,2,4,3], borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.05)',  tension:.4, fill:true, pointRadius:3, pointBackgroundColor:'#ef4444' },
        { label:a?'الطلبات':'Requests',     data:rq.length?rq.map((x:any)=>x.count):[6,8,5,11,7,9],borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.05)', tension:.4, fill:true, pointRadius:3, pointBackgroundColor:'#10b981' },
      ]},
      options:{ responsive:true, interaction:{mode:'index',intersect:false}, plugins:{ legend:{labels:{color:'#8b93a8',font:{size:11},boxWidth:14}} }, scales:{ x:{grid:{color:'#1e2330'},ticks:{color:'#8b93a8',font:{size:10}}}, y:{grid:{color:'#1e2330'},ticks:{color:'#8b93a8',stepSize:1,font:{size:10}}} } }
    }));
  }

  mkDonut(elId:string, legId:string, raw:any[], fbLabels:string[], fbVals:number[], colorMap:Record<string,string>, C:any) {
    const el = document.getElementById(elId) as HTMLCanvasElement; if (!el) return;
    const labels = raw.length ? raw.map((x:any)=>x[Object.keys(x)[0]]) : fbLabels;
    const vals   = raw.length ? raw.map((x:any)=>x.total||x.count||0)  : fbVals;
    const bgs    = labels.map((l:string)=>colorMap[l]||'#6b7280');
    const leg    = document.getElementById(legId);
    if (leg) leg.innerHTML = labels.map((l:string,i:number)=>`<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2)"><span style="width:8px;height:8px;border-radius:50%;background:${bgs[i]};flex-shrink:0"></span>${l.replace('_',' ')} (${vals[i]})</span>`).join('');
    this.charts.push(new C(el,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:bgs,borderWidth:0,hoverOffset:4}]},options:{responsive:true,cutout:'68%',plugins:{legend:{display:false}}}}));
  }

  mkBar(elId:string, raw:any[], fbLabels:string[], fbVals:number[], colors:string[], C:any) {
    const el = document.getElementById(elId) as HTMLCanvasElement; if (!el) return;
    const labels = raw.length ? raw.map((x:any)=>x[Object.keys(x)[0]]) : fbLabels;
    const vals   = raw.length ? raw.map((x:any)=>x.total||x.count||0)  : fbVals;
    const bgs    = labels.map((_:any,i:number)=>colors[i%colors.length]);
    this.charts.push(new C(el,{
      type:'bar',
      data:{labels,datasets:[{data:vals,backgroundColor:bgs,borderRadius:6,borderWidth:0}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#8b93a8',font:{size:9}}},y:{grid:{color:'#1e2330'},ticks:{color:'#8b93a8',font:{size:10},stepSize:1}}}}
    }));
  }

  mkRisk(d:any,C:any)     { const raw=d?.risks_by_level?d.risks_by_level.map((x:any)=>({risk_level:x.risk_level,total:x.total})):[];  this.mkDonut('riskChart','riskLeg',raw,['critical','high','medium','low'],[2,5,8,12],{critical:'#ef4444',high:'#f97316',medium:'#f59e0b',low:'#10b981'},C); }
  mkReq(d:any,C:any)      { const raw=d?.requests_by_status?d.requests_by_status.map((x:any)=>({status:x.status,total:x.total})):[]; this.mkDonut('reqChart','reqLeg',raw,['submitted','in_progress','approved','closed'],[5,3,8,12],{submitted:'#3b82f6',in_review:'#f59e0b',in_progress:'#f97316',approved:'#10b981',rejected:'#ef4444',closed:'#6366f1',draft:'#6b7280'},C); }
  mkCapa(d:any,C:any)     { const raw=d?.capa_by_status?d.capa_by_status.map((x:any)=>({status:x.status,total:x.total})):[];          this.mkDonut('capaChart','capaLeg',raw,['open','in_progress','closed','cancelled'],[4,6,10,2],{open:'#ef4444',in_progress:'#f97316',pending_review:'#f59e0b',closed:'#10b981',cancelled:'#6b7280'},C); }
  mkOkr(d:any,C:any)      { const raw=d?.okr_by_status?d.okr_by_status.map((x:any)=>({track:x.track,total:x.total})):[];              this.mkDonut('okrChart','okrLeg',raw,['on_track','at_risk','behind'],[5,3,2],{on_track:'#10b981',at_risk:'#f59e0b',behind:'#ef4444'},C); }
  mkCompSev(d:any,C:any)  { const raw=d?.complaints_by_severity?d.complaints_by_severity.map((x:any)=>({severity:x.severity,total:x.total})):[];  this.mkDonut('compSevChart','compSevLeg',raw,['minor','major','critical'],[3,5,2],{minor:'#10b981',major:'#f59e0b',critical:'#ef4444'},C); }
  mkAuditType(d:any,C:any){ const raw=d?.audit_by_type?d.audit_by_type.map((x:any)=>({type:x.type,total:x.total})):[];               this.mkBar('auditTypeChart',raw,['internal','external','supplier','regulatory'],[3,2,2,1],['#6366f1','#3b82f6','#0ea5e9','#8b5cf6'],C); }
  mkVendorCat(d:any,C:any){ const raw=d?.vendor_by_category?d.vendor_by_category.map((x:any)=>({name:x.name,total:x.total})):[];     this.mkBar('vendorCatChart',raw,['IT','Facilities','Legal','HR','Logistics'],[2,3,2,1,2],['#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6'],C); }

  // ── Helpers ──────────────────────────────────────────────────────────
  pct(a:number, b:number) { return b ? Math.round((a/b)*100) : 0; }
  isOD(d:string)  { return d && new Date(d) < new Date(); }
  daysPast(d:string) { return d ? Math.max(0, Math.floor((Date.now()-new Date(d).getTime())/86400000)) : 0; }
  npsCol(n:number)   { return n>=50?'var(--success)':n>=0?'var(--warning)':'var(--danger)'; }
  go(path:string) { this.router_.navigate([path]); }

  sevCls(s:string)  { return ({minor:'badge-draft',major:'badge-yellow',critical:'badge-red',high:'badge-red',medium:'badge-yellow',low:'badge-draft'} as any)[s]||'badge-draft'; }
  ncStCls(s:string) { return ({open:'badge-red',under_investigation:'badge-yellow',capa_in_progress:'badge-blue',closed:'badge-green',cancelled:'badge-draft'} as any)[s]||'badge-draft'; }
  stCls(s:string)   { return ({open:'badge-red',submitted:'badge-blue',in_review:'badge-yellow',in_progress:'badge-blue',pending_approval:'badge-yellow',approved:'badge-green',resolved:'badge-green',closed:'badge-green',pending:'badge-yellow',rejected:'badge-red',withdrawn:'badge-draft'} as any)[s]||'badge-draft'; }
  priCls(p:string)  { return ({low:'badge-draft',medium:'badge-yellow',high:'badge-orange',critical:'badge-red',urgent:'badge-red'} as any)[p]||'badge-draft'; }
  riskCls(l:string) { return ({low:'badge-green',medium:'badge-yellow',high:'badge-orange',critical:'badge-red'} as any)[l]||'badge-draft'; }
  initial(n?:string){ return n?.charAt(0)?.toUpperCase()||'?'; }
  avCol(n?:string)  { const c=['#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#0ea5e9','#f97316','#8b5cf6']; return c[(n?.charCodeAt(0)??0)%c.length]; }
  actBg(a?:string)  { return ({created:'rgba(16,185,129,.15)',updated:'rgba(59,130,246,.15)',deleted:'rgba(239,68,68,.15)',approved:'rgba(16,185,129,.15)',rejected:'rgba(239,68,68,.15)'} as any)[a||'']||'var(--surface2)'; }
  actCol(a?:string) { return ({created:'var(--success)',updated:'var(--accent)',deleted:'var(--danger)',approved:'var(--success)',rejected:'var(--danger)'} as any)[a||'']||'var(--text2)'; }
  actIcon(a?:string){ return ({created:'fas fa-plus',updated:'fas fa-pen',deleted:'fas fa-trash',approved:'fas fa-check',rejected:'fas fa-times',closed:'fas fa-lock',submitted:'fas fa-paper-plane'} as any)[a||'']||'fas fa-circle-dot'; }
}
