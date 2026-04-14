import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { LanguageService } from '../../core/services/language.service';

type RecordType = 'complaints'|'ncs'|'capas'|'risks'|'audits'|'requests';

@Component({
  selector: 'app-report-records',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
<div class="rec-shell">

  <!-- ══ SIDEBAR ══ -->
  <aside class="rec-aside">
    <div class="aside-logo"><i class="fas fa-table-list"></i></div>
    <div class="aside-section">{{ ar() ? 'السجلات' : 'Record Reports' }}</div>
    @for (t of recordTypes; track t.key) {
      <button class="aside-btn" [class.active]="active()===t.key" (click)="switchType(t.key)">
        <i [class]="t.icon"></i>
        <span>{{ ar() ? t.ar : t.en }}</span>
        @if (active()===t.key) { <div class="aside-dot"></div> }
      </button>
    }
    <div class="aside-spacer"></div>

    <!-- Filters -->
    <div class="aside-section">{{ ar() ? 'الفلاتر' : 'Filters' }}</div>
    <div class="filter-wrap">
      <label class="filter-label">{{ ar() ? 'من' : 'From' }}</label>
      <input type="date" class="filter-input" [(ngModel)]="dateFrom" (change)="load()">
      <label class="filter-label">{{ ar() ? 'إلى' : 'To' }}</label>
      <input type="date" class="filter-input" [(ngModel)]="dateTo" (change)="load()">

      @if (filters()?.statuses?.length) {
        <label class="filter-label">{{ ar() ? 'الحالة' : 'Status' }}</label>
        <select class="filter-input" [(ngModel)]="filterStatus" (change)="load()">
          <option value="">{{ ar() ? 'الكل' : 'All' }}</option>
          @for (s of filters()?.statuses||[]; track s) { <option [value]="s">{{ s | titlecase }}</option> }
        </select>
      }
      @if (filters()?.severities?.length) {
        <label class="filter-label">{{ ar() ? 'الخطورة' : 'Severity' }}</label>
        <select class="filter-input" [(ngModel)]="filterSeverity" (change)="load()">
          <option value="">{{ ar() ? 'الكل' : 'All' }}</option>
          @for (s of filters()?.severities||[]; track s) { <option [value]="s">{{ s | titlecase }}</option> }
        </select>
      }
      @if (filters()?.priorities?.length) {
        <label class="filter-label">{{ ar() ? 'الأولوية' : 'Priority' }}</label>
        <select class="filter-input" [(ngModel)]="filterPriority" (change)="load()">
          <option value="">{{ ar() ? 'الكل' : 'All' }}</option>
          @for (p of filters()?.priorities||[]; track p) { <option [value]="p">{{ p | titlecase }}</option> }
        </select>
      }
      @if (filters()?.types?.length) {
        <label class="filter-label">{{ ar() ? 'النوع' : 'Type' }}</label>
        <select class="filter-input" [(ngModel)]="filterType" (change)="load()">
          <option value="">{{ ar() ? 'الكل' : 'All' }}</option>
          @for (t of filters()?.types||[]; track t) { <option [value]="t">{{ t | titlecase }}</option> }
        </select>
      }
      @if (filters()?.levels?.length) {
        <label class="filter-label">{{ ar() ? 'مستوى الخطر' : 'Risk Level' }}</label>
        <select class="filter-input" [(ngModel)]="filterLevel" (change)="load()">
          <option value="">{{ ar() ? 'الكل' : 'All' }}</option>
          @for (l of filters()?.levels||[]; track l) { <option [value]="l">{{ l | titlecase }}</option> }
        </select>
      }
      <button class="btn btn-secondary btn-xs" style="margin-top:8px;width:100%" (click)="clearFilters()">
        <i class="fas fa-filter-slash"></i> {{ ar() ? 'مسح الفلاتر' : 'Clear Filters' }}
      </button>
    </div>

    <div class="aside-section" style="margin-top:8px">{{ ar() ? 'تصدير' : 'Export' }}</div>
    <button class="exp-btn exp-pdf"   (click)="exportPDF()"   [disabled]="!rows().length || exporting()">
      @if (exporting()==='pdf') { <i class="fas fa-circle-notch fa-spin"></i> } @else { <i class="fas fa-file-pdf"></i> } PDF
    </button>
    <button class="exp-btn exp-xl"    (click)="exportExcel()" [disabled]="!rows().length || exporting()">
      @if (exporting()==='excel') { <i class="fas fa-circle-notch fa-spin"></i> } @else { <i class="fas fa-file-excel"></i> } Excel
    </button>
    <button class="exp-btn exp-csv"   (click)="exportCSV()"   [disabled]="!rows().length || exporting()">
      @if (exporting()==='csv') { <i class="fas fa-circle-notch fa-spin"></i> } @else { <i class="fas fa-file-csv"></i> } CSV
    </button>
  </aside>

  <!-- ══ MAIN ══ -->
  <div class="rec-body">

    <!-- Topbar -->
    <div class="rec-topbar">
      <div>
        <div class="rec-heading">{{ ar() ? activeInfo()?.ar : activeInfo()?.en }}</div>
        <div class="rec-sub">{{ total() }} {{ ar() ? 'سجل' : 'records' }} · {{ dateFrom }} → {{ dateTo }}</div>
      </div>
      <div class="rec-top-right">
        <div class="search-wrap">
          <i class="fas fa-magnifying-glass"></i>
          <input type="text" class="search-input" [(ngModel)]="search" (input)="onSearch()" [placeholder]="ar() ? 'بحث...' : 'Search reference or title...'">
          @if (search) { <button class="search-clear" (click)="clearSearch()"><i class="fas fa-times"></i></button> }
        </div>
        <button class="icon-btn" (click)="load()" [class.spin]="loading()"><i class="fas fa-rotate"></i></button>
      </div>
    </div>

    <!-- Summary chips -->
    @if (!loading() && summary().length) {
      <div class="summary-strip">
        @for (s of summary(); track s.label) {
          <div class="sum-chip" [class]="s.cls">
            <div class="sum-v">{{ s.value }}</div>
            <div class="sum-l">{{ s.label }}</div>
          </div>
        }
      </div>
    }

    <!-- Table -->
    @if (loading()) {
      <div class="table-skeleton">
        @for (i of [1,2,3,4,5,6,7,8]; track i) {
          <div class="sk-row"><div class="sk-cell w80"></div><div class="sk-cell w200"></div><div class="sk-cell w80"></div><div class="sk-cell w80"></div><div class="sk-cell w100"></div><div class="sk-cell w100"></div></div>
        }
      </div>
    }
    @else if (!rows().length) {
      <div class="empty-state"><i class="fas fa-inbox"></i><div>{{ ar() ? 'لا توجد سجلات' : 'No records found' }}</div><div class="empty-sub">{{ ar() ? 'جرب تغيير الفلاتر' : 'Try adjusting filters or date range' }}</div></div>
    }
    @else {

      <!-- ── Complaints table ── -->
      @if (active()==='complaints') {
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>{{ ar()?'المرجع':'REF' }}</th>
              <th>{{ ar()?'العنوان':'TITLE' }}</th>
              <th>{{ ar()?'الخطورة':'SEVERITY' }}</th>
              <th>{{ ar()?'الحالة':'STATUS' }}</th>
              <th>{{ ar()?'المصدر':'SOURCE' }}</th>
              <th>{{ ar()?'العميل':'CLIENT' }}</th>
              <th>{{ ar()?'الإدارة':'DEPARTMENT' }}</th>
              <th>{{ ar()?'المسؤول':'ASSIGNEE' }}</th>
              <th>{{ ar()?'تاريخ الاستلام':'RECEIVED' }}</th>
              <th>{{ ar()?'الموعد المستهدف':'TARGET' }}</th>
              <th>{{ ar()?'تاريخ الحل':'RESOLVED' }}</th>
              <th>{{ ar()?'الرضا':'SAT' }}</th>
              <th>{{ ar()?'تنظيمي':'REG' }}</th>
            </tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td><span class="ref">{{ r.reference_no }}</span></td>
                  <td class="td-title">{{ r.title }}</td>
                  <td><span class="badge" [class]="sevCls(r.severity)">{{ r.severity }}</span></td>
                  <td><span class="badge" [class]="complaintStCls(r.status)">{{ r.status | titlecase }}</span></td>
                  <td class="td-sm">{{ r.source }}</td>
                  <td class="td-sm">{{ r.client || '—' }}</td>
                  <td class="td-sm">{{ r.department || '—' }}</td>
                  <td class="td-sm">{{ r.assignee || '—' }}</td>
                  <td class="td-date">{{ r.received_date | date:'dd MMM yy' }}</td>
                  <td class="td-date" [class.overdue]="isOverdue(r.target_resolution, r.status)">{{ r.target_resolution | date:'dd MMM yy' }}</td>
                  <td class="td-date">{{ r.actual_resolution | date:'dd MMM yy' }}</td>
                  <td class="tc">{{ r.customer_satisfaction ? (r.customer_satisfaction+'/5') : '—' }}</td>
                  <td class="tc">@if(r.is_regulatory){<i class="fas fa-check" style="color:var(--danger)"></i>}@else{<span class="muted">—</span>}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── NCs table ── -->
      @if (active()==='ncs') {
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>REF</th><th>TITLE</th><th>SEVERITY</th><th>STATUS</th><th>SOURCE</th>
              <th>DEPARTMENT</th><th>ASSIGNED TO</th><th>DETECTED</th><th>TARGET CLOSURE</th><th>ACTUAL CLOSURE</th>
            </tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td><span class="ref">{{ r.reference_no }}</span></td>
                  <td class="td-title">{{ r.title }}</td>
                  <td><span class="badge" [class]="sevCls(r.severity)">{{ r.severity }}</span></td>
                  <td><span class="badge" [class]="ncStCls(r.status)">{{ r.status?.replace('_',' ') }}</span></td>
                  <td class="td-sm">{{ r.source }}</td>
                  <td class="td-sm">{{ r.department || '—' }}</td>
                  <td class="td-sm">{{ r.assigned_to || '—' }}</td>
                  <td class="td-date">{{ r.detection_date | date:'dd MMM yy' }}</td>
                  <td class="td-date" [class.overdue]="isOverdue(r.target_closure, r.status)">{{ r.target_closure | date:'dd MMM yy' }}</td>
                  <td class="td-date">{{ r.actual_closure | date:'dd MMM yy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── CAPAs table ── -->
      @if (active()==='capas') {
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>REF</th><th>TITLE</th><th>TYPE</th><th>PRIORITY</th><th>STATUS</th>
              <th>OWNER</th><th>DEPARTMENT</th><th>TARGET DATE</th><th>COMPLETION</th><th>DAYS OPEN</th><th>OVERDUE</th>
            </tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr [class.row-overdue]="r.is_overdue">
                  <td><span class="ref">{{ r.reference_no }}</span></td>
                  <td class="td-title">{{ r.title }}</td>
                  <td class="td-sm">{{ r.type }}</td>
                  <td><span class="badge" [class]="priCls(r.priority)">{{ r.priority }}</span></td>
                  <td><span class="badge" [class]="capaStCls(r.status)">{{ r.status }}</span></td>
                  <td class="td-sm">{{ r.owner || '—' }}</td>
                  <td class="td-sm">{{ r.department || '—' }}</td>
                  <td class="td-date" [class.overdue]="r.is_overdue">{{ r.target_date | date:'dd MMM yy' }}</td>
                  <td class="td-date">{{ r.actual_completion | date:'dd MMM yy' }}</td>
                  <td class="tc">{{ r.days_open }}d</td>
                  <td class="tc">@if(r.is_overdue){<span class="badge badge-red">Overdue</span>}@else{<span class="muted">—</span>}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── Risks table ── -->
      @if (active()==='risks') {
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>REF</th><th>TITLE</th><th>LEVEL</th><th>STATUS</th><th>CATEGORY</th>
              <th>LIKELIHOOD</th><th>IMPACT</th><th>SCORE</th><th>TREATMENT</th><th>OWNER</th><th>DEPARTMENT</th><th>NEXT REVIEW</th>
            </tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td><span class="ref">{{ r.reference_no }}</span></td>
                  <td class="td-title">{{ r.title }}</td>
                  <td><span class="badge" [class]="riskCls(r.risk_level)">{{ r.risk_level }}</span></td>
                  <td class="td-sm">{{ r.status?.replace('_',' ') }}</td>
                  <td class="td-sm">{{ r.category || '—' }}</td>
                  <td class="tc">{{ r.likelihood }}</td>
                  <td class="tc">{{ r.impact }}</td>
                  <td><span class="score-pill" [class]="riskCls(r.risk_level)">{{ r.score }}</span></td>
                  <td class="td-sm">{{ r.treatment_strategy }}</td>
                  <td class="td-sm">{{ r.owner || '—' }}</td>
                  <td class="td-sm">{{ r.department || '—' }}</td>
                  <td class="td-date">{{ r.next_review_date | date:'dd MMM yy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── Audits table ── -->
      @if (active()==='audits') {
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>REF</th><th>TITLE</th><th>TYPE</th><th>STATUS</th><th>RESULT</th>
              <th>LEAD AUDITOR</th><th>DEPARTMENT</th><th>PLANNED START</th><th>PLANNED END</th><th>ACTUAL START</th><th>FINDINGS</th><th>OPEN FINDINGS</th>
            </tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td><span class="ref">{{ r.reference_no }}</span></td>
                  <td class="td-title">{{ r.title }}</td>
                  <td class="td-sm">{{ r.type }}</td>
                  <td><span class="badge" [class]="auditStCls(r.status)">{{ r.status?.replace('_',' ') }}</span></td>
                  <td class="td-sm">{{ r.overall_result || '—' }}</td>
                  <td class="td-sm">{{ r.lead_auditor || '—' }}</td>
                  <td class="td-sm">{{ r.department || '—' }}</td>
                  <td class="td-date">{{ r.planned_start_date | date:'dd MMM yy' }}</td>
                  <td class="td-date">{{ r.planned_end_date | date:'dd MMM yy' }}</td>
                  <td class="td-date">{{ r.actual_start_date | date:'dd MMM yy' }}</td>
                  <td class="tc">{{ r.findings_count }}</td>
                  <td class="tc" [style.color]="r.open_findings>0?'var(--danger)':'var(--text3)'">{{ r.open_findings || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── Requests table ── -->
      @if (active()==='requests') {
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>REF</th><th>TITLE</th><th>TYPE</th><th>PRIORITY</th><th>STATUS</th>
              <th>REQUESTER</th><th>ASSIGNEE</th><th>DEPARTMENT</th><th>DUE DATE</th><th>CLOSED AT</th><th>OVERDUE</th>
            </tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr [class.row-overdue]="r.is_overdue">
                  <td><span class="ref">{{ r.reference_no }}</span></td>
                  <td class="td-title">{{ r.title }}</td>
                  <td class="td-sm">{{ r.type }}</td>
                  <td><span class="badge" [class]="priCls(r.priority)">{{ r.priority }}</span></td>
                  <td><span class="badge" [class]="requestStCls(r.status)">{{ r.status }}</span></td>
                  <td class="td-sm">{{ r.requester || '—' }}</td>
                  <td class="td-sm">{{ r.assignee || '—' }}</td>
                  <td class="td-sm">{{ r.department || '—' }}</td>
                  <td class="td-date" [class.overdue]="r.is_overdue">{{ r.due_date | date:'dd MMM yy' }}</td>
                  <td class="td-date">{{ r.closed_at | date:'dd MMM yy' }}</td>
                  <td class="tc">@if(r.is_overdue){<span class="badge badge-red">Overdue</span>}@else{<span class="muted">—</span>}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

    }
  </div>
</div>
  `,
  styles: [`
    :host { display:block; }
    .rec-shell { display:flex; gap:0; min-height:calc(100vh - 60px); }

    /* Sidebar */
    .rec-aside { width:210px; flex-shrink:0; background:var(--surface); border-right:1px solid var(--border); border-radius:14px 0 0 14px; padding:16px 0; display:flex; flex-direction:column; }
    .aside-logo { font-size:22px; color:var(--accent); text-align:center; padding:4px 0 12px; border-bottom:1px solid var(--border); margin-bottom:12px; }
    .aside-section { font-size:10px; font-weight:700; color:var(--text3); letter-spacing:1px; text-transform:uppercase; padding:8px 16px 4px; }
    .aside-btn { display:flex; align-items:center; gap:9px; padding:8px 16px; border:none; background:none; color:var(--text2); font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; text-align:left; width:100%; transition:all .13s; border-left:2px solid transparent; position:relative; }
    .aside-btn:hover { background:var(--surface2); color:var(--text); }
    .aside-btn.active { background:rgba(59,130,246,.1); color:var(--accent); border-left-color:var(--accent); font-weight:600; }
    .aside-btn i { width:14px; text-align:center; font-size:12px; }
    .aside-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); margin-left:auto; }
    .aside-spacer { flex:1; }
    .filter-wrap { padding:4px 12px; display:flex; flex-direction:column; gap:4px; }
    .filter-label { font-size:10px; color:var(--text3); font-weight:600; }
    .filter-input { background:var(--surface2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:11px; font-family:'DM Sans',sans-serif; padding:5px 8px; width:100%; outline:none; }
    select.filter-input option { background:var(--surface); }
    .exp-btn { display:flex; align-items:center; gap:7px; margin:2px 12px; padding:7px 12px; border:1px solid var(--border); border-radius:8px; background:none; color:var(--text2); font-size:11px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .13s; }
    .exp-btn:hover:not([disabled]) { background:var(--surface2); color:var(--text); }
    .exp-btn[disabled] { opacity:.4; cursor:default; }
    .exp-pdf:hover:not([disabled])  { color:#ef4444; border-color:rgba(239,68,68,.3); }
    .exp-xl:hover:not([disabled])   { color:#10b981; border-color:rgba(16,185,129,.3); }
    .exp-csv:hover:not([disabled])  { color:#f59e0b; border-color:rgba(245,158,11,.3); }

    /* Body */
    .rec-body { flex:1; padding:20px; min-width:0; background:var(--bg); border-radius:0 14px 14px 0; display:flex; flex-direction:column; gap:12px; }
    .rec-topbar { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .rec-heading { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; }
    .rec-sub { font-size:11px; color:var(--text2); margin-top:2px; }
    .rec-top-right { display:flex; align-items:center; gap:10px; }
    .search-wrap { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:7px 12px; min-width:260px; }
    .search-wrap i { color:var(--text3); font-size:12px; }
    .search-input { background:none; border:none; outline:none; color:var(--text); font-size:12px; font-family:'DM Sans',sans-serif; flex:1; }
    .search-clear { background:none; border:none; color:var(--text3); cursor:pointer; font-size:11px; padding:0; }
    .search-clear:hover { color:var(--text); }
    .spin { animation:spin .8s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    /* Summary strip */
    .summary-strip { display:flex; flex-wrap:wrap; gap:8px; }
    .sum-chip { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:7px 14px; display:flex; flex-direction:column; align-items:center; min-width:80px; }
    .sum-v { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; }
    .sum-l { font-size:10px; color:var(--text2); margin-top:1px; }
    .sum-chip.chip-red    { border-color:rgba(239,68,68,.25);  }
    .sum-chip.chip-red .sum-v   { color:var(--danger); }
    .sum-chip.chip-green  { border-color:rgba(16,185,129,.25); }
    .sum-chip.chip-green .sum-v { color:var(--success); }
    .sum-chip.chip-warn   { border-color:rgba(245,158,11,.25); }
    .sum-chip.chip-warn .sum-v  { color:var(--warning); }
    .sum-chip.chip-blue   { border-color:rgba(59,130,246,.25); }
    .sum-chip.chip-blue .sum-v  { color:var(--accent); }

    /* Table */
    .table-wrap { flex:1; overflow-x:auto; border-radius:12px; border:1px solid var(--border); }
    .td-title { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
    .td-sm    { font-size:11px; color:var(--text2); white-space:nowrap; }
    .td-date  { font-size:11px; color:var(--text2); white-space:nowrap; }
    .td-date.overdue { color:var(--danger); font-weight:600; }
    .tc       { text-align:center; }
    .muted    { color:var(--text3); }
    .row-overdue { background:rgba(239,68,68,.04); }
    .score-pill { display:inline-block; padding:1px 7px; border-radius:5px; font-family:'Syne',sans-serif; font-weight:700; font-size:12px; }
    .ref { font-family:monospace; font-size:12px; color:var(--accent); }

    /* Skeleton */
    .table-skeleton { display:flex; flex-direction:column; gap:4px; }
    .sk-row  { display:flex; gap:8px; padding:10px; background:var(--surface); border-radius:6px; animation:shimmer 1.5s infinite ease-in-out; }
    .sk-cell { height:10px; background:var(--border); border-radius:3px; }
    .w80{width:80px} .w200{width:200px} .w100{width:100px}
    @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }

    /* Empty */
    .empty-state { display:flex; flex-direction:column; align-items:center; gap:8px; padding:60px 20px; color:var(--text3); }
    .empty-state i { font-size:36px; }
    .empty-sub { font-size:11px; }
  `]
})
export class ReportRecordsComponent implements OnInit {
  private api  = inject(ApiService);
  public  lang = inject(LanguageService);

  active    = signal<RecordType>('complaints');
  loading   = signal(true);
  exporting = signal<string|false>(false);
  rows      = signal<any[]>([]);
  total     = signal(0);
  filters   = signal<any>(null);

  dateFrom      = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10);
  dateTo        = new Date().toISOString().slice(0,10);
  search        = '';
  filterStatus  = '';
  filterSeverity= '';
  filterPriority= '';
  filterType    = '';
  filterLevel   = '';
  private searchTimer: any;

  ar = () => this.lang.isArabic();

  recordTypes = [
    { key:'complaints', en:'All Complaints',     ar:'جميع الشكاوى',            icon:'fas fa-comment-exclamation' },
    { key:'ncs',        en:'All NCs',            ar:'جميع عدم المطابقة',       icon:'fas fa-triangle-exclamation' },
    { key:'capas',      en:'All CAPAs',          ar:'جميع CAPA',               icon:'fas fa-circle-check' },
    { key:'risks',      en:'All Risks',          ar:'جميع المخاطر',            icon:'fas fa-fire-flame-curved' },
    { key:'audits',     en:'All Audits',         ar:'جميع المراجعات',          icon:'fas fa-magnifying-glass-chart' },
    { key:'requests',   en:'All Requests',       ar:'جميع الطلبات',            icon:'fas fa-inbox' },
  ];

  activeInfo() { return this.recordTypes.find(t => t.key === this.active()); }

  summary = computed(() => {
    const r = this.rows(), t = this.total();
    const a = this.active();
    if (!r.length) return [];
    if (a === 'complaints') return [
      { label:'Total', value:t, cls:'' },
      { label:'Critical', value:r.filter(x=>x.severity==='critical').length, cls:'chip-red' },
      { label:'Open', value:r.filter(x=>!['resolved','closed'].includes(x.status)).length, cls:'chip-warn' },
      { label:'Resolved', value:r.filter(x=>['resolved','closed'].includes(x.status)).length, cls:'chip-green' },
    ];
    if (a === 'ncs') return [
      { label:'Total', value:t, cls:'' },
      { label:'Critical', value:r.filter(x=>x.severity==='critical').length, cls:'chip-red' },
      { label:'Open', value:r.filter(x=>x.status==='open').length, cls:'chip-warn' },
      { label:'Closed', value:r.filter(x=>x.status==='closed').length, cls:'chip-green' },
    ];
    if (a === 'capas') return [
      { label:'Total', value:t, cls:'' },
      { label:'Overdue', value:r.filter(x=>x.is_overdue).length, cls:'chip-red' },
      { label:'Open', value:r.filter(x=>x.status!=='closed').length, cls:'chip-warn' },
      { label:'Closed', value:r.filter(x=>x.status==='closed').length, cls:'chip-green' },
    ];
    if (a === 'risks') return [
      { label:'Total', value:t, cls:'' },
      { label:'Critical', value:r.filter(x=>x.risk_level==='critical').length, cls:'chip-red' },
      { label:'High', value:r.filter(x=>x.risk_level==='high').length, cls:'chip-warn' },
      { label:'Low/Med', value:r.filter(x=>['low','medium'].includes(x.risk_level)).length, cls:'chip-green' },
    ];
    if (a === 'audits') return [
      { label:'Total', value:t, cls:'' },
      { label:'Completed', value:r.filter(x=>x.status==='completed').length, cls:'chip-green' },
      { label:'In Progress', value:r.filter(x=>x.status==='in_progress').length, cls:'chip-blue' },
      { label:'Open Findings', value:r.reduce((s:number,x:any)=>s+x.open_findings,0), cls:'chip-red' },
    ];
    if (a === 'requests') return [
      { label:'Total', value:t, cls:'' },
      { label:'Overdue', value:r.filter(x=>x.is_overdue).length, cls:'chip-red' },
      { label:'Open', value:r.filter(x=>!['closed','approved','rejected'].includes(x.status)).length, cls:'chip-warn' },
      { label:'Closed', value:r.filter(x=>x.status==='closed').length, cls:'chip-green' },
    ];
    return [];
  });

  ngOnInit() { this.load(); }

  switchType(t: string) {
    this.active.set(t as RecordType);
    this.filterStatus = ''; this.filterSeverity = ''; this.filterPriority = ''; this.filterType = ''; this.filterLevel = '';
    this.search = '';
    this.load();
  }

  load() {
    this.loading.set(true);
    const ep = `/reports/records/${this.active()}`;
    const params: any = { from: this.dateFrom, to: this.dateTo };
    if (this.filterStatus)   params['status']   = this.filterStatus;
    if (this.filterSeverity) params['severity'] = this.filterSeverity;
    if (this.filterPriority) params['priority'] = this.filterPriority;
    if (this.filterType)     params['type']     = this.filterType;
    if (this.filterLevel)    params['level']    = this.filterLevel;
    if (this.search)         params['search']   = this.search;

    this.api.get<any>(ep, params).subscribe({
      next: d => {
        this.rows.set(d.data || []);
        this.total.set(d.total || 0);
        if (d.filters) this.filters.set(d.filters);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 400);
  }
  clearSearch() { this.search = ''; this.load(); }
  clearFilters() {
    this.filterStatus = ''; this.filterSeverity = ''; this.filterPriority = '';
    this.filterType = ''; this.filterLevel = ''; this.search = '';
    this.load();
  }

  /* ── Exports ── */
  exportCSV() {
    this.exporting.set('csv');
    this.fetchAll(data => {
      const cols = this.getCols();
      const rows = [cols.map(c=>c.label), ...data.map((r:any) => cols.map(c => r[c.key] ?? ''))];
      const csv  = rows.map(r => r.map((v:any)=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
      this.download(csv, `QMS_${this.active()}_${this.dateFrom}_${this.dateTo}.csv`, 'text/csv');
      this.exporting.set(false);
    });
  }

  exportExcel() {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert('XLSX not loaded'); return; }
    this.exporting.set('excel');
    this.fetchAll(data => {
      const cols = this.getCols();
      const ws   = XLSX.utils.aoa_to_sheet([cols.map(c=>c.label), ...data.map((r:any)=>cols.map(c=>r[c.key]??''))]);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.active());
      XLSX.writeFile(wb, `QMS_${this.active()}_${this.dateFrom}_${this.dateTo}.xlsx`);
      this.exporting.set(false);
    });
  }

  exportPDF() {
    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) { alert('jsPDF not loaded'); return; }
    this.exporting.set('pdf');
    this.fetchAll(data => {
      const doc  = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
      doc.setFillColor(10,11,14); doc.rect(0,0,300,20,'F');
      doc.setTextColor(232,236,244); doc.setFontSize(13); doc.setFont('helvetica','bold');
      doc.text(`QMS Pro — ${this.activeInfo()?.en}`, 14, 10);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(139,147,168);
      doc.text(`Period: ${this.dateFrom} → ${this.dateTo}  |  Total: ${data.length} records  |  Generated: ${new Date().toLocaleString()}`, 14, 17);
      const cols = this.getCols();
      (doc as any).autoTable({
        head: [cols.map(c=>c.label)],
        body: data.map((r:any)=>cols.map((c:any)=>String(r[c.key]??''))),
        startY: 24, margin:{left:8,right:8},
        styles:{fontSize:7,cellPadding:2,textColor:[200,205,215],fillColor:[17,19,24],lineColor:[30,35,48],lineWidth:.2},
        headStyles:{fillColor:[24,28,36],textColor:[139,147,168],fontStyle:'bold',fontSize:7},
        alternateRowStyles:{fillColor:[14,15,18]},
      });
      doc.save(`QMS_${this.active()}_${this.dateFrom}_${this.dateTo}.pdf`);
      this.exporting.set(false);
    });
  }

  private fetchAll(cb: (data: any[]) => void) {
    const ep = `/reports/records/${this.active()}`;
    const params: any = { from:this.dateFrom, to:this.dateTo, all:true };
    if (this.filterStatus)   params['status']   = this.filterStatus;
    if (this.filterSeverity) params['severity'] = this.filterSeverity;
    if (this.filterPriority) params['priority'] = this.filterPriority;
    if (this.filterType)     params['type']     = this.filterType;
    if (this.filterLevel)    params['level']    = this.filterLevel;
    if (this.search)         params['search']   = this.search;
    this.api.get<any>(ep, params).subscribe({ next: d => cb(d.data||[]), error: () => this.exporting.set(false) });
  }

  private download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], {type:mime});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  }

  getCols(): { label:string; key:string }[] {
    const map: Record<RecordType, { label:string; key:string }[]> = {
      complaints: [
        {label:'Ref',key:'reference_no'},{label:'Title',key:'title'},{label:'Severity',key:'severity'},
        {label:'Status',key:'status'},{label:'Source',key:'source'},{label:'Client',key:'client'},
        {label:'Department',key:'department'},{label:'Assignee',key:'assignee'},
        {label:'Received',key:'received_date'},{label:'Target',key:'target_resolution'},
        {label:'Resolved',key:'actual_resolution'},{label:'Satisfaction',key:'customer_satisfaction'},
      ],
      ncs: [
        {label:'Ref',key:'reference_no'},{label:'Title',key:'title'},{label:'Severity',key:'severity'},
        {label:'Status',key:'status'},{label:'Source',key:'source'},{label:'Department',key:'department'},
        {label:'Assigned To',key:'assigned_to'},{label:'Detected',key:'detection_date'},
        {label:'Target Closure',key:'target_closure'},{label:'Actual Closure',key:'actual_closure'},
      ],
      capas: [
        {label:'Ref',key:'reference_no'},{label:'Title',key:'title'},{label:'Type',key:'type'},
        {label:'Priority',key:'priority'},{label:'Status',key:'status'},{label:'Owner',key:'owner'},
        {label:'Department',key:'department'},{label:'Target Date',key:'target_date'},
        {label:'Completion',key:'actual_completion'},{label:'Days Open',key:'days_open'},{label:'Overdue',key:'is_overdue'},
      ],
      risks: [
        {label:'Ref',key:'reference_no'},{label:'Title',key:'title'},{label:'Level',key:'risk_level'},
        {label:'Status',key:'status'},{label:'Category',key:'category'},{label:'Likelihood',key:'likelihood'},
        {label:'Impact',key:'impact'},{label:'Score',key:'score'},{label:'Treatment',key:'treatment_strategy'},
        {label:'Owner',key:'owner'},{label:'Department',key:'department'},{label:'Next Review',key:'next_review_date'},
      ],
      audits: [
        {label:'Ref',key:'reference_no'},{label:'Title',key:'title'},{label:'Type',key:'type'},
        {label:'Status',key:'status'},{label:'Result',key:'overall_result'},{label:'Lead Auditor',key:'lead_auditor'},
        {label:'Department',key:'department'},{label:'Planned Start',key:'planned_start_date'},
        {label:'Planned End',key:'planned_end_date'},{label:'Findings',key:'findings_count'},{label:'Open Findings',key:'open_findings'},
      ],
      requests: [
        {label:'Ref',key:'reference_no'},{label:'Title',key:'title'},{label:'Type',key:'type'},
        {label:'Priority',key:'priority'},{label:'Status',key:'status'},{label:'Requester',key:'requester'},
        {label:'Assignee',key:'assignee'},{label:'Department',key:'department'},
        {label:'Due Date',key:'due_date'},{label:'Closed At',key:'closed_at'},{label:'Overdue',key:'is_overdue'},
      ],
    };
    return map[this.active()];
  }

  /* ── Badge helpers ── */
  isOverdue(date: string, status: string): boolean {
    if (!date || ['closed','resolved','approved'].includes(status)) return false;
    return new Date(date) < new Date();
  }
  sevCls(s: string): string  { return ({critical:'badge-red',major:'badge-yellow',minor:'badge-draft'} as any)[s]||'badge-draft'; }
  priCls(s: string): string  { return ({critical:'badge-red',high:'badge-orange',medium:'badge-yellow',low:'badge-green'} as any)[s]||'badge-draft'; }
  riskCls(l: string): string { return ({critical:'badge-red',high:'badge-orange',medium:'badge-yellow',low:'badge-green'} as any)[l]||'badge-draft'; }
  ncStCls(s: string): string { return ({open:'badge-red',under_investigation:'badge-yellow',capa_in_progress:'badge-blue',pending_capa:'badge-orange',closed:'badge-green'} as any)[s]||'badge-draft'; }
  capaStCls(s: string): string { return ({open:'badge-red',in_progress:'badge-yellow',closed:'badge-green'} as any)[s]||'badge-draft'; }
  auditStCls(s: string): string { return ({planned:'badge-blue',in_progress:'badge-yellow',completed:'badge-green',cancelled:'badge-draft'} as any)[s]||'badge-draft'; }
  requestStCls(s: string): string { return ({draft:'badge-draft',submitted:'badge-blue',under_review:'badge-yellow',approved:'badge-green',rejected:'badge-red',closed:'badge-green'} as any)[s]||'badge-draft'; }
  complaintStCls(s: string): string { return ({open:'badge-red',in_progress:'badge-yellow',resolved:'badge-green',closed:'badge-draft',withdrawn:'badge-draft'} as any)[s]||'badge-draft'; }
}
