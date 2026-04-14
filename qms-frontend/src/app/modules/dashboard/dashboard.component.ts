// ============================================================
// src/app/modules/dashboard/dashboard.component.ts
// Diamond-QMS — ISO 9001:2015 Quality Management System
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

/** Summary record returned by /api/dashboard */
interface DashboardSummary {
  open_requests: number;
  open_nc: number;
  open_capa: number;
  open_risks: number;
  open_complaints: number;
  pending_docs: number;
  upcoming_audits: number;
  sla_breaches: number;
}

/** One tile in the core metrics grid */
interface CoreCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  route: string;
}

/** Health check row for each QMS module */
interface HealthModule {
  label: string;
  status: 'ok' | 'warning' | 'critical';
  metric: string;
  route: string;
}

/** Document due for review */
interface ReviewItem {
  id: number;
  document_no: string;
  title: string;
  review_date: string;
  owner: string;
}

/** Task assigned to the current user */
interface TaskItem {
  id: number;
  reference_no: string;
  title: string;
  type: string;
  review_date: string;
  route: string;
}

/** Recent activity feed entry */
interface ActivityItem {
  id: number;
  user: string;
  action: string;
  module: string;
  created_at: string;
}

/** Overdue QMS record */
interface OverdueItem {
  id: number;
  reference_no: string;
  title: string;
  module: string;
  due: string;
  route: string;
}

/**
 * DashboardComponent
 *
 * Landing page for Diamond-QMS. Displays real-time QMS health metrics,
 * overdue items, upcoming document reviews, my-tasks, and an activity
 * feed — all powered by the /api/dashboard endpoint.
 *
 * @standalone true
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  // ── DI ────────────────────────────────────────────────────────────────────
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);

  // ── State signals ──────────────────────────────────────────────────────────
  readonly loading = signal<boolean>(true);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly reviewItems = signal<ReviewItem[]>([]);
  readonly myTasks = signal<TaskItem[]>([]);
  readonly activity = signal<ActivityItem[]>([]);
  readonly overdueList = signal<OverdueItem[]>([]);

  // ── Derived signals ────────────────────────────────────────────────────────

  /**
   * Core metric cards derived from the summary signal.
   * Displayed as the top grid of KPI tiles.
   */
  readonly coreCards = computed<CoreCard[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Open Requests',    value: s.open_requests,    icon: '📋', color: 'blue',   route: '/requests' },
      { label: 'Open NCs',         value: s.open_nc,          icon: '⚠️',  color: 'orange', route: '/nc-capa' },
      { label: 'Open CAPAs',       value: s.open_capa,        icon: '🔧', color: 'purple', route: '/nc-capa/capas' },
      { label: 'Open Risks',       value: s.open_risks,       icon: '🛡️',  color: 'red',    route: '/risk' },
      { label: 'Complaints',       value: s.open_complaints,  icon: '📣', color: 'yellow', route: '/complaints' },
      { label: 'Docs Pending',     value: s.pending_docs,     icon: '📄', color: 'teal',   route: '/documents' },
      { label: 'Upcoming Audits',  value: s.upcoming_audits,  icon: '🔍', color: 'green',  route: '/audits' },
      { label: 'SLA Breaches',     value: s.sla_breaches,     icon: '🚨', color: 'red',    route: '/sla' },
    ];
  });

  /**
   * Health status rows for each QMS module.
   * 'warning' and 'critical' states add a highlight class to the row.
   */
  readonly healthModules = computed<HealthModule[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Document Control', status: s.pending_docs > 10 ? 'critical' : s.pending_docs > 3 ? 'warning' : 'ok', metric: `${s.pending_docs} pending approval`, route: '/documents' },
      { label: 'NC Management',    status: s.open_nc > 10 ? 'critical' : s.open_nc > 3 ? 'warning' : 'ok',           metric: `${s.open_nc} open`,                route: '/nc-capa' },
      { label: 'CAPA',             status: s.open_capa > 5 ? 'critical' : s.open_capa > 2 ? 'warning' : 'ok',        metric: `${s.open_capa} in progress`,       route: '/nc-capa/capas' },
      { label: 'Risk Register',    status: s.open_risks > 5 ? 'critical' : s.open_risks > 2 ? 'warning' : 'ok',      metric: `${s.open_risks} active risks`,     route: '/risk' },
      { label: 'SLA Compliance',   status: s.sla_breaches > 0 ? 'critical' : 'ok',                                    metric: `${s.sla_breaches} breaches`,       route: '/sla' },
      { label: 'Audit Programme',  status: s.upcoming_audits === 0 ? 'warning' : 'ok',                                metric: `${s.upcoming_audits} upcoming`,    route: '/audits' },
    ];
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadDashboard();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  /**
   * Fetches all dashboard data in parallel from the API.
   * Uses the environment apiUrl resolved through HttpClient base URL.
   */
  loadDashboard(): void {
    this.loading.set(true);

    this.http.get<{ data: DashboardSummary }>('/api/dashboard/summary').subscribe({
      next: res => this.summary.set(res.data),
      error: () => this.summary.set(this.mockSummary()),
    });

    this.http.get<{ data: ReviewItem[] }>('/api/dashboard/upcoming-reviews').subscribe({
      next: res => this.reviewItems.set(res.data),
      error: () => this.reviewItems.set([]),
    });

    this.http.get<{ data: TaskItem[] }>('/api/dashboard/my-tasks').subscribe({
      next: res => this.myTasks.set(res.data),
      error: () => this.myTasks.set([]),
    });

    this.http.get<{ data: ActivityItem[] }>('/api/dashboard/activity').subscribe({
      next: res => { this.activity.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.http.get<{ data: OverdueItem[] }>('/api/dashboard/overdue').subscribe({
      next: res => this.overdueList.set(res.data),
      error: () => this.overdueList.set([]),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Returns the CSS class for a health status badge.
   * @param status Module health status
   */
  healthClass(status: 'ok' | 'warning' | 'critical'): string {
    return { ok: 'badge-green', warning: 'badge-yellow', critical: 'badge-red' }[status];
  }

  /**
   * Returns user's display name from the AuthService signal.
   */
  get userName(): string {
    return this.auth.currentUser()?.name ?? 'User';
  }

  /**
   * Returns user's role name from the AuthService signal.
   */
  get userRole(): string {
    return this.auth.currentUser()?.role?.name ?? '';
  }

  // ── Dev mock (remove after API is live) ───────────────────────────────────

  private mockSummary(): DashboardSummary {
    return {
      open_requests: 14,
      open_nc: 3,
      open_capa: 5,
      open_risks: 8,
      open_complaints: 2,
      pending_docs: 6,
      upcoming_audits: 2,
      sla_breaches: 1,
    };
  }
}
