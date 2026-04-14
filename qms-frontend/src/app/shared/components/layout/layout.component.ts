import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiEventService } from '../../../core/services/ui-event.service';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<aside class="sidebar">
  <div class="sidebar-logo">
    <img src="assets/diamond-logo.png" alt="Diamond Insurance Broker" class="sidebar-logo-img">
  </div>

  <nav class="sidebar-nav">
    <!-- ── Overview ── -->
    <div class="nav-section">{{ lang.t('Overview') }}</div>
    <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
      <i class="fas fa-chart-line"></i> {{ lang.t('Dashboard') }}
    </a>

    <!-- ── Sales & Marketing ── -->
    @if (can('request.view') || can('request.create') || can('request.view_own')) {
      <div class="nav-section">{{ lang.t('Sales & Marketing') }}</div>
      <a class="nav-item" routerLink="/requests" routerLinkActive="active">
        <i class="fas fa-inbox"></i> {{ lang.t('Request Management') }}
        @if (counts().requests > 0) { <span class="nav-badge warn">{{ counts().requests }}</span> }
      </a>
    }

    <!-- ── Quality ── -->
    @if (can('nc.view') || can('capa.view') || can('complaint.view') || can('complaint.create') || can('survey.view')) {
      <div class="nav-section">{{ lang.t('Quality') }}</div>
    }
    @if (can('nc.view')) {
      <a class="nav-item" routerLink="/nc" routerLinkActive="active">
        <i class="fas fa-triangle-exclamation"></i> {{ lang.t('Non-Conformances') }}
        @if (counts().ncs > 0) { <span class="nav-badge">{{ counts().ncs }}</span> }
      </a>
    }
    @if (can('capa.view')) {
      <a class="nav-item" routerLink="/capa" routerLinkActive="active">
        <i class="fas fa-circle-check"></i> {{ lang.t('CAPA') }}
        @if (counts().capas > 0) { <span class="nav-badge warn">{{ counts().capas }}</span> }
      </a>
    }
    @if (can('complaint.view') || can('complaint.create')) {
      <a class="nav-item" routerLink="/complaints" routerLinkActive="active">
        <i class="fas fa-comment-exclamation"></i> {{ lang.t('Complaints') }}
        @if (counts().complaints > 0) { <span class="nav-badge">{{ counts().complaints }}</span> }
      </a>
    }
    @if (can('survey.view')) {
      <a class="nav-item" routerLink="/surveys" routerLinkActive="active">
        <i class="fas fa-face-smile"></i> {{ lang.t('Customer Satisfaction') }}
      </a>
    }

    <!-- ── Risk & Governance ── -->
    @if (can('risk.view') || can('audit.view') || can('document.view') || can('visit.view') || can('sla.view')) {
      <div class="nav-section">{{ lang.t('Risk & Governance') }}</div>
    }
    @if (can('risk.view')) {
      <a class="nav-item" routerLink="/risk" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
        <i class="fas fa-fire-flame-curved"></i> {{ lang.t('Risk Management') }}
      </a>
      <a class="nav-item nav-sub" routerLink="/risk/matrix" routerLinkActive="active">
        <i class="fas fa-table-cells"></i> {{ lang.t('Risk Matrix') }}
      </a>
    }
    @if (can('audit.view')) {
      <a class="nav-item" routerLink="/audits" routerLinkActive="active">
        <i class="fas fa-magnifying-glass-chart"></i> {{ lang.t('Audit Management') }}
      </a>
    }
    @if (can('document.view')) {
      <a class="nav-item" routerLink="/documents" routerLinkActive="active">
        <i class="fas fa-folder-open"></i> {{ lang.t('Document Control') }}
      </a>
    }
    @if (can('visit.view')) {
      <a class="nav-item" routerLink="/visits" routerLinkActive="active">
        <i class="fas fa-calendar-check"></i> {{ lang.t('Visit Planning') }}
      </a>
      <a class="nav-item" routerLink="/clients" routerLinkActive="active">
        <i class="fas fa-building-user"></i> {{ lang.t('Clients & Insurers') }}
      </a>
    }
    @if (can('sla.view')) {
      <a class="nav-item" routerLink="/sla" routerLinkActive="active">
        <i class="fas fa-file-contract"></i> {{ lang.t('SLA Management') }}
      </a>
    }

    <!-- ── Performance ── -->
    @if (can('okr.view') || can('report.view')) {
      <div class="nav-section">{{ lang.t('Performance') }}</div>
    }
    @if (can('okr.view')) {
      <a class="nav-item" routerLink="/okr" routerLinkActive="active">
        <i class="fas fa-bullseye-arrow"></i> {{ lang.t('OKR Management') }}
      </a>
      <a class="nav-item" routerLink="/kpi" routerLinkActive="active">
        <i class="fas fa-gauge-high"></i> {{ lang.t('KPI Dashboard') }}
      </a>
    }
    @if (can('report.view')) {
      <a class="nav-item" routerLink="/reports" routerLinkActive="active">
        <i class="fas fa-chart-mixed"></i> {{ lang.t('Reports & Analytics') }}
      </a>
    }

    <!-- ── Procurement ── -->
    @if (can('vendor.view')) {
      <div class="nav-section">{{ lang.t('Procurement') }}</div>
      <a class="nav-item" routerLink="/vendors" routerLinkActive="active">
        <i class="fas fa-truck-ramp-box"></i> {{ lang.t('Vendor Management') }}
      </a>
      <a class="nav-item" routerLink="/contracts" routerLinkActive="active">
        <i class="fas fa-file-signature"></i> {{ lang.t('Contract Management') }}
      </a>
    }

    <!-- ── Admin — super_admin only ── -->
    @if (can('admin.access')) {
      <div class="nav-section">{{ lang.t('Admin') }}</div>
      <a class="nav-item" routerLink="/admin" routerLinkActive="active">
        <i class="fas fa-gear"></i> {{ lang.t('Administration') }}
      </a>
    }
  </nav>

  <div class="sidebar-footer">
    <div class="user-card" style="position:relative">
      <div class="user-avatar">{{ userInitial() }}</div>
      <div style="flex:1;min-width:0">
        <div class="user-name">{{ auth.currentUser()?.name }}</div>
        <div class="user-role">{{ auth.currentUser()?.role?.display_name || auth.currentUser()?.role?.name }}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:auto">
        <div class="icon-btn" style="width:28px;height:28px;font-size:11px" (click)="logout()" [title]="lang.t('Sign Out')">
          <i class="fas fa-arrow-right-from-bracket"></i>
        </div>
      </div>
    </div>
  </div>
</aside>

<div class="main">
  <header class="header">
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700">{{ currentPageTitle() }}</div>
    <div class="header-search" style="margin-left:auto">
      <i class="fas fa-search"></i>
      <input type="text" [placeholder]="lang.t('Search records, NCs, risks...')">
    </div>
    <div class="header-actions">
      <button class="lang-toggle" (click)="lang.toggle()" [title]="lang.isArabic() ? 'Switch to English' : 'التبديل إلى العربية'">
        <span class="lang-flag">{{ lang.isArabic() ? '🇸🇦' : '🌐' }}</span>
        <span class="lang-label">{{ lang.isArabic() ? 'EN' : 'عربي' }}</span>
      </button>
      <div class="icon-btn" [title]="lang.t('Notifications')" style="position:relative" (click)="toggleNotifs()">
        <i class="fas fa-bell"></i>
        @if (counts().notifications > 0) { <div class="notif-dot"></div> }
      </div>
      <button class="btn btn-primary btn-sm" (click)="newRecord()">
        <i class="fas fa-plus"></i> {{ lang.t('New Record') }}
      </button>
    </div>
  </header>

  <!-- Access denied toast -->
  @if (showDenied()) {
    <div class="access-denied-toast">
      <i class="fas fa-shield-exclamation"></i>
      <span>Access denied — you don't have permission to view that page.</span>
      <button (click)="showDenied.set(false)"><i class="fas fa-times"></i></button>
    </div>
  }

  <div class="content">
    <router-outlet></router-outlet>
  </div>
</div>
  `,
  styles: [`
    :host { display:block; }
    .header { position:sticky; top:0; z-index:50; height:var(--header-h); background:rgba(10,11,14,.85); backdrop-filter:blur(16px); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:16px; padding:0 24px; flex-shrink:0; }
    .header-search { display:flex; align-items:center; gap:8px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:6px 12px; min-width:220px; }
    .header-search input { background:none; border:none; outline:none; color:var(--text); font-size:13px; width:100%; font-family:'DM Sans',sans-serif; }
    .header-search input::placeholder { color:var(--text3); }
    .header-search i { color:var(--text3); font-size:13px; }
    .header-actions { display:flex; align-items:center; gap:8px; }
    a.nav-item { text-decoration:none; display:flex; align-items:center; gap:10px; padding:9px 16px; cursor:pointer; border-radius:8px; margin:1px 8px; color:var(--text2); font-size:13.5px; font-weight:500; transition:all .15s; position:relative; }
    a.nav-item:hover { background:var(--surface2); color:var(--text); }
    a.nav-item.active { background:rgba(59,130,246,.12); color:var(--accent); }
    a.nav-item.active::before { content:''; position:absolute; left:-8px; top:50%; transform:translateY(-50%); width:3px; height:70%; background:var(--accent); border-radius:0 3px 3px 0; }
    :host-context([dir="rtl"]) a.nav-item.active::before { left:auto; right:-8px; border-radius:3px 0 0 3px; }
    :host-context([dir="rtl"]) .header-search { margin-left:0; margin-right:auto; }
    :host-context([dir="rtl"]) .main { margin-left:0; margin-right:var(--sidebar-w); }
    /* Access denied toast */
    .access-denied-toast { display:flex; align-items:center; gap:10px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:#fca5a5; padding:10px 20px; font-size:13px; }
    .access-denied-toast i { font-size:15px; color:#ef4444; }
    .access-denied-toast button { margin-left:auto; background:none; border:none; color:#fca5a5; cursor:pointer; font-size:13px; }
  `]
})
export class LayoutComponent implements OnInit {
  counts    = signal({ requests: 0, ncs: 0, capas: 0, complaints: 0, notifications: 0 });
  showDenied = signal(false);

  constructor(
    public auth: AuthService,
    public lang: LanguageService,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private uiEvents: UiEventService
  ) {}

  ngOnInit() {
    this.loadCounts();
    // Listen for access-denied redirects
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const denied = this.route.snapshot.queryParams['denied'];
      if (denied) {
        this.showDenied.set(true);
        setTimeout(() => this.showDenied.set(false), 4000);
        // Remove the query param from URL silently
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  /** Shorthand permission check for templates */
  can(permission: string): boolean {
    return this.auth.hasPermission(permission);
  }

  loadCounts() {
    this.api.get<any>('/dashboard/stats').subscribe({
      next: (d) => this.counts.set({
        requests:      d?.requests?.open ?? 0,
        ncs:           d?.nc_capa?.open_ncs ?? 0,
        capas:         d?.nc_capa?.open_capas ?? 0,
        complaints:    d?.complaints?.open ?? 0,
        notifications: 3
      }),
      error: () => {}
    });
  }

  userInitial(): string { return this.auth.currentUser()?.name?.charAt(0)?.toUpperCase() ?? 'U'; }
  currentPageTitle(): string { return this.lang.pageTitle(this.router.url); }
  toggleNotifs() {}
  newRecord() { this.uiEvents.triggerNewForm(); }
  logout() { this.auth.logout(); }
}
