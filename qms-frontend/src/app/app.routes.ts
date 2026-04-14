import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '', component: LayoutComponent, canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Dashboard — all authenticated users ──────────────────────────
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // ── Requests — request.view or request.create ────────────────────
      {
        path: 'requests', canActivate: [permissionGuard],
        data: { permission: ['request.view', 'request.create', 'request.view_own'] },
        loadComponent: () => import('./features/requests/requests-list/requests-list.component').then(m => m.RequestsListComponent)
      },

      // ── Non-Conformances — nc.view ───────────────────────────────────
      {
        path: 'nc', canActivate: [permissionGuard],
        data: { permission: 'nc.view' },
        loadComponent: () => import('./features/nc-capa/nc-list/nc-list.component').then(m => m.NcListComponent)
      },

      // ── CAPA — capa.view ─────────────────────────────────────────────
      {
        path: 'capa', canActivate: [permissionGuard],
        data: { permission: 'capa.view' },
        loadComponent: () => import('./features/nc-capa/capa-list/capa-list.component').then(m => m.CapaListComponent)
      },

      // ── Risk — risk.view ─────────────────────────────────────────────
      {
        path: 'risk', canActivate: [permissionGuard],
        data: { permission: 'risk.view' },
        loadComponent: () => import('./features/risk/risk-register/risk-register.component').then(m => m.RiskRegisterComponent)
      },
      {
        path: 'risk/matrix', canActivate: [permissionGuard],
        data: { permission: 'risk.view' },
        loadComponent: () => import('./features/risk/risk-matrix/risk-matrix.component').then(m => m.RiskMatrixComponent)
      },
      {
        path: 'risk/:id', canActivate: [permissionGuard],
        data: { permission: 'risk.view' },
        loadComponent: () => import('./features/risk/risk-detail/risk-detail.component').then(m => m.RiskDetailComponent)
      },

      // ── Audits — audit.view ──────────────────────────────────────────
      {
        path: 'audits', canActivate: [permissionGuard],
        data: { permission: 'audit.view' },
        loadComponent: () => import('./features/audits/audit-list/audit-list.component').then(m => m.AuditListComponent)
      },

      // ── Documents — document.view ────────────────────────────────────
      {
        path: 'documents', canActivate: [permissionGuard],
        data: { permission: 'document.view' },
        loadComponent: () => import('./features/documents/document-list/document-list.component').then(m => m.DocumentListComponent)
      },

      // ── Visits — visit.view ──────────────────────────────────────────
      {
        path: 'visits', canActivate: [permissionGuard],
        data: { permission: 'visit.view' },
        loadComponent: () => import('./features/visits/visit-list/visit-list.component').then(m => m.VisitListComponent)
      },
      {
        path: 'clients', canActivate: [permissionGuard],
        data: { permission: 'visit.view' },
        loadComponent: () => import('./features/visits/client-list/client-list.component').then(m => m.ClientListComponent)
      },

      // ── SLA — sla.view ───────────────────────────────────────────────
      {
        path: 'sla', canActivate: [permissionGuard],
        data: { permission: 'sla.view' },
        loadComponent: () => import('./features/sla-okr/sla-dashboard/sla-dashboard.component').then(m => m.SlaDashboardComponent)
      },

      // ── OKR / KPI — okr.view ─────────────────────────────────────────
      {
        path: 'okr', canActivate: [permissionGuard],
        data: { permission: 'okr.view' },
        loadComponent: () => import('./features/sla-okr/okr-tracker/okr-tracker.component').then(m => m.OkrTrackerComponent)
      },
      {
        path: 'kpi', canActivate: [permissionGuard],
        data: { permission: 'okr.view' },
        loadComponent: () => import('./features/sla-okr/okr-tracker/okr-tracker.component').then(m => m.OkrTrackerComponent)
      },

      // ── Reports — report.view ─────────────────────────────────────────
      {
        path: 'reports', canActivate: [permissionGuard],
        data: { permission: 'report.view' },
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },

      // ── Vendors / Contracts — vendor.view ────────────────────────────
      {
        path: 'vendors', canActivate: [permissionGuard],
        data: { permission: 'vendor.view' },
        loadComponent: () => import('./features/vendors/vendor-list/vendor-list.component').then(m => m.VendorListComponent)
      },
      {
        path: 'contracts', canActivate: [permissionGuard],
        data: { permission: 'vendor.view' },
        loadComponent: () => import('./features/vendors/partnership-list/partnership-list.component').then(m => m.PartnershipListComponent)
      },

      // ── Complaints — complaint.view or complaint.create ───────────────
      {
        path: 'complaints', canActivate: [permissionGuard],
        data: { permission: ['complaint.view', 'complaint.create'] },
        loadComponent: () => import('./features/complaints/complaint-list/complaint-list.component').then(m => m.ComplaintListComponent)
      },

      // ── Surveys — survey.view ─────────────────────────────────────────
      {
        path: 'surveys', canActivate: [permissionGuard],
        data: { permission: 'survey.view' },
        loadComponent: () => import('./features/surveys/survey-list/survey-list.component').then(m => m.SurveyListComponent)
      },

      // ── Admin — super_admin only ─────────────────────────────────────
      {
        path: 'admin', canActivate: [permissionGuard],
        data: { permission: 'admin.access' },
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
