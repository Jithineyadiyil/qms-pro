import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  // ── Public ──────────────────────────────────────────────────────────
  { path: 'login', component: LoginComponent },

  // ── Authenticated shell ──────────────────────────────────────────────
  {
    path: '', component: LayoutComponent, canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Dashboard ────────────────────────────────────────────────────
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },

      // ── Request Management ───────────────────────────────────────────
      {
        path: 'requests',
        canActivate: [permissionGuard],
        data: { permission: ['request.view', 'request.create', 'request.view_own'] },
        loadComponent: () => import('./features/requests/request-list/requests-list.component')
          .then(m => m.RequestsListComponent)
      },
      {
        path: 'requests/new',
        canActivate: [permissionGuard],
        data: { permission: 'request.create' },
        loadComponent: () => import('./features/requests/request-form/request-form.component')
          .then(m => m.RequestFormComponent)
      },
      {
        path: 'requests/:id',
        canActivate: [permissionGuard],
        data: { permission: ['request.view', 'request.view_own'] },
        loadComponent: () => import('./features/requests/request-detail/request-detail.component')
          .then(m => m.RequestDetailComponent)
      },
      {
        path: 'requests/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'request.create' },
        loadComponent: () => import('./features/requests/request-form/request-form.component')
          .then(m => m.RequestFormComponent)
      },

      // ── NC & CAPA — original spec: /nc-capa ─────────────────────────
      // IMPORTANT: specific paths (new, capas, capas/new, capas/:id)
      // MUST come before the wildcard nc-capa/:id or Angular's router
      // will match 'capas' as an NC id and show "NC not found".
      {
        path: 'nc-capa',
        canActivate: [permissionGuard],
        data: { permission: 'nc.view' },
        loadComponent: () => import('./features/nc-capa/nc-list/nc-list.component')
          .then(m => m.NcListComponent)
      },
      {
        path: 'nc-capa/new',
        canActivate: [permissionGuard],
        data: { permission: 'nc.create' },
        loadComponent: () => import('./features/nc-capa/nc-form/nc-form.component')
          .then(m => m.NcFormComponent)
      },
      // CAPA routes — all before nc-capa/:id (wildcard must be last)
      {
        path: 'nc-capa/capas',
        canActivate: [permissionGuard],
        data: { permission: 'capa.view' },
        loadComponent: () => import('./features/nc-capa/capa-list/capa-list.component')
          .then(m => m.CapaListComponent)
      },
      {
        path: 'nc-capa/capas/new',
        canActivate: [permissionGuard],
        data: { permission: 'capa.create' },
        loadComponent: () => import('./features/nc-capa/capa-form/capa-form.component')
          .then(m => m.CapaFormComponent)
      },
      {
        path: 'nc-capa/capas/:id',
        canActivate: [permissionGuard],
        data: { permission: 'capa.view' },
        loadComponent: () => import('./features/nc-capa/capa-detail/capa-detail.component')
          .then(m => m.CapaDetailComponent)
      },
      {
        path: 'nc-capa/capas/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'capa.create' },
        loadComponent: () => import('./features/nc-capa/capa-form/capa-form.component')
          .then(m => m.CapaFormComponent)
      },
      // NC detail wildcard — MUST be last among nc-capa/* routes
      {
        path: 'nc-capa/:id',
        canActivate: [permissionGuard],
        data: { permission: 'nc.view' },
        loadComponent: () => import('./features/nc-capa/nc-detail/nc-detail.component')
          .then(m => m.NcDetailComponent)
      },
      {
        path: 'nc-capa/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'nc.create' },
        loadComponent: () => import('./features/nc-capa/nc-form/nc-form.component')
          .then(m => m.NcFormComponent)
      },

      // ── Risk Management ──────────────────────────────────────────────
      {
        path: 'risk',
        canActivate: [permissionGuard],
        data: { permission: 'risk.view' },
        loadComponent: () => import('./features/risk/risk-register/risk-register.component')
          .then(m => m.RiskRegisterComponent)
      },
      {
        path: 'risk/matrix',
        canActivate: [permissionGuard],
        data: { permission: 'risk.view' },
        loadComponent: () => import('./features/risk/risk-matrix/risk-matrix.component')
          .then(m => m.RiskMatrixComponent)
      },
      {
        path: 'risk/new',
        canActivate: [permissionGuard],
        data: { permission: 'risk.create' },
        loadComponent: () => import('./features/risk/risk-form/risk-form.component')
          .then(m => m.RiskFormComponent)
      },
      {
        path: 'risk/:id',
        canActivate: [permissionGuard],
        data: { permission: 'risk.view' },
        loadComponent: () => import('./features/risk/risk-detail/risk-detail.component')
          .then(m => m.RiskDetailComponent)
      },

      // ── Audit Management ─────────────────────────────────────────────
      {
        path: 'audits',
        canActivate: [permissionGuard],
        data: { permission: 'audit.view' },
        loadComponent: () => import('./features/audits/audit-list/audit-list.component')
          .then(m => m.AuditListComponent)
      },
      {
        path: 'audits/new',
        canActivate: [permissionGuard],
        data: { permission: 'audit.create' },
        loadComponent: () => import('./features/audits/audit-form/audit-form.component')
          .then(m => m.AuditFormComponent)
      },
      {
        path: 'audits/:id',
        canActivate: [permissionGuard],
        data: { permission: 'audit.view' },
        loadComponent: () => import('./features/audits/audit-detail/audit-detail.component')
          .then(m => m.AuditDetailComponent)
      },
      {
        path: 'audits/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'audit.create' },
        loadComponent: () => import('./features/audits/audit-form/audit-form.component')
          .then(m => m.AuditFormComponent)
      },

      // ── Document Control ─────────────────────────────────────────────
      {
        path: 'documents',
        canActivate: [permissionGuard],
        data: { permission: 'document.view' },
        loadComponent: () => import('./features/documents/document-list/document-list.component')
          .then(m => m.DocumentListComponent)
      },
      {
        path: 'documents/new',
        canActivate: [permissionGuard],
        data: { permission: 'document.create' },
        loadComponent: () => import('./features/documents/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      },
      {
        path: 'documents/:id',
        canActivate: [permissionGuard],
        data: { permission: 'document.view' },
        loadComponent: () => import('./features/documents/document-detail/document-detail.component')
          .then(m => m.DocumentDetailComponent)
      },
      {
        path: 'documents/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'document.create' },
        loadComponent: () => import('./features/documents/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      },

      // ── Complaints ───────────────────────────────────────────────────
      {
        path: 'complaints',
        canActivate: [permissionGuard],
        data: { permission: ['complaint.view', 'complaint.create'] },
        loadComponent: () => import('./features/complaints/complaint-list/complaint-list.component')
          .then(m => m.ComplaintListComponent)
      },
      {
        path: 'complaints/new',
        canActivate: [permissionGuard],
        data: { permission: 'complaint.create' },
        loadComponent: () => import('./features/complaints/complaint-form/complaint-form.component')
          .then(m => m.ComplaintFormComponent)
      },
      {
        path: 'complaints/:id',
        canActivate: [permissionGuard],
        data: { permission: ['complaint.view', 'complaint.create'] },
        loadComponent: () => import('./features/complaints/complaint-detail/complaint-detail.component')
          .then(m => m.ComplaintDetailComponent)
      },
      {
        path: 'complaints/:id/edit',
        canActivate: [permissionGuard],
        data: { permission: 'complaint.create' },
        loadComponent: () => import('./features/complaints/complaint-form/complaint-form.component')
          .then(m => m.ComplaintFormComponent)
      },

      // ── Visits / Clients ─────────────────────────────────────────────
      {
        path: 'visits',
        canActivate: [permissionGuard],
        data: { permission: 'visit.view' },
        loadComponent: () => import('./features/visits/visit-list/visit-list.component')
          .then(m => m.VisitListComponent)
      },
      {
        path: 'visits/:id',
        canActivate: [permissionGuard],
        data: { permission: 'visit.view' },
        loadComponent: () => import('./features/visits/visit-detail/visit-detail.component')
          .then(m => m.VisitDetailComponent)
      },
      {
        path: 'clients',
        canActivate: [permissionGuard],
        data: { permission: 'visit.view' },
        loadComponent: () => import('./features/visits/client-list/client-list.component')
          .then(m => m.ClientListComponent)
      },

      // ── SLA ──────────────────────────────────────────────────────────
      {
        path: 'sla',
        canActivate: [permissionGuard],
        data: { permission: 'sla.view' },
        loadComponent: () => import('./features/sla-okr/sla-dashboard/sla-dashboard.component')
          .then(m => m.SlaDashboardComponent)
      },

      // ── OKR / KPI ────────────────────────────────────────────────────
      {
        path: 'okr',
        canActivate: [permissionGuard],
        data: { permission: 'okr.view' },
        loadComponent: () => import('./features/sla-okr/okr-tracker/okr-tracker.component')
          .then(m => m.OkrTrackerComponent)
      },
      {
        path: 'kpi',
        canActivate: [permissionGuard],
        data: { permission: 'okr.view' },
        loadComponent: () => import('./features/sla-okr/okr-tracker/okr-tracker.component')
          .then(m => m.OkrTrackerComponent)
      },

      // ── Reports ──────────────────────────────────────────────────────
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: { permission: 'report.view' },
        loadComponent: () => import('./features/reports/reports.component')
          .then(m => m.ReportsComponent)
      },

      // ── Vendors ──────────────────────────────────────────────────────
      {
        path: 'vendors',
        canActivate: [permissionGuard],
        data: { permission: 'vendor.view' },
        loadComponent: () => import('./features/vendors/vendor-list/vendor-list.component')
          .then(m => m.VendorListComponent)
      },
      {
        path: 'vendors/:id',
        canActivate: [permissionGuard],
        data: { permission: 'vendor.view' },
        loadComponent: () => import('./features/vendors/vendor-detail/vendor-detail.component')
          .then(m => m.VendorDetailComponent)
      },
      // Partnerships — original spec: /partnerships
      {
        path: 'partnerships',
        canActivate: [permissionGuard],
        data: { permission: 'vendor.view' },
        loadComponent: () => import('./features/vendors/partnership-list/partnership-list.component')
          .then(m => m.PartnershipListComponent)
      },

      // ── Surveys / CSAT ────────────────────────────────────────────────
      {
        path: 'surveys',
        canActivate: [permissionGuard],
        data: { permission: 'survey.view' },
        loadComponent: () => import('./features/surveys/survey-list/survey-list.component')
          .then(m => m.SurveyListComponent)
      },

      // ── Settings — original spec: /settings ─────────────────────────
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permission: 'admin.access' },
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent)
      },
      // /admin alias kept for backward compatibility
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { permission: 'admin.access' },
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent)
      },
    ]
  },

  // ── Fallback ─────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
];
