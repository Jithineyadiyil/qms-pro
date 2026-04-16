import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuditService } from '../../../core/services/audit.service';

@Component({
  selector: 'app-audit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="form-page">
  <div class="form-header">
    <a routerLink="/audits" class="back-link"><i class="fas fa-arrow-left"></i> Back to Audits</a>
    <h1 class="form-title">{{ editId ? 'Edit Audit' : 'Plan New Audit' }}</h1>
  </div>

  <div class="form-card">
    <form (ngSubmit)="submit()">

      <div class="field-group">
        <label class="field-label">Audit Title <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.title" name="title" required
          placeholder="e.g. Q2 Internal Quality Audit" maxlength="255">
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Audit Type <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.type" name="type" required>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="surveillance">Surveillance</option>
            <option value="certification">Certification</option>
            <option value="supplier">Supplier</option>
            <option value="process">Process</option>
            <option value="system">System</option>
            <option value="compliance">Compliance</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Audit Program</label>
          <select class="field-input" [(ngModel)]="form.audit_program_id" name="audit_program_id">
            <option value="">— No Program —</option>
            @for (p of programs(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Lead Auditor <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.lead_auditor_id" name="lead_auditor_id" required>
            <option value="">— Select Lead Auditor —</option>
            @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Department</label>
          <select class="field-input" [(ngModel)]="form.department_id" name="department_id">
            <option value="">— Select Department —</option>
            @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Planned Start Date <span class="req">*</span></label>
          <input class="field-input" type="date" [(ngModel)]="form.planned_start_date" name="planned_start_date" required>
        </div>
        <div class="field-group">
          <label class="field-label">Planned End Date <span class="req">*</span></label>
          <input class="field-input" type="date" [(ngModel)]="form.planned_end_date" name="planned_end_date" required>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">Scope</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.scope" name="scope"
          placeholder="Define the boundaries and subject matter of this audit…"></textarea>
      </div>

      <div class="field-group">
        <label class="field-label">Criteria</label>
        <textarea class="field-input" rows="2" [(ngModel)]="form.criteria" name="criteria"
          placeholder="Standards, procedures, or requirements against which the audit will be conducted…"></textarea>
      </div>

      <div class="field-group">
        <label class="field-label">Description</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.description" name="description"
          placeholder="Additional audit context or objectives…"></textarea>
      </div>

      <div class="form-footer">
        <a routerLink="/audits" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-primary"
          [disabled]="saving() || !form.title || !form.lead_auditor_id || !form.planned_start_date || !form.planned_end_date">
          @if (saving()) { <i class="fas fa-spinner fa-spin"></i> Saving… }
          @else { <i class="fas fa-save"></i> {{ editId ? 'Save Changes' : 'Plan Audit' }} }
        </button>
      </div>

    </form>
  </div>
</div>

@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    .form-page{padding:24px;max-width:760px;margin:0 auto;}
    .form-header{margin-bottom:20px;}
    .back-link{font-size:13px;color:var(--accent);text-decoration:none;display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;}
    .form-title{font-size:22px;font-weight:700;color:var(--text);margin:0;}
    .form-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;}
    .field-group{display:flex;flex-direction:column;gap:6px;margin-bottom:18px;}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    @media(max-width:600px){.field-row{grid-template-columns:1fr;}}
    .field-label{font-size:13px;font-weight:500;color:var(--text);} .req{color:#ef4444;}
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;font-size:13px;width:100%;box-sizing:border-box;transition:border .15s;}
    .field-input:focus{outline:none;border-color:var(--accent);}
    textarea.field-input{resize:vertical;}
    .form-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:20px;border-top:1px solid var(--border);}
    .btn-primary{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;}
    .btn-primary:disabled{opacity:.6;cursor:not-allowed;}
    .btn-cancel{color:var(--text-muted);text-decoration:none;padding:10px 16px;font-size:13px;display:flex;align-items:center;}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class AuditFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  programs    = signal<any[]>([]);
  users       = signal<any[]>([]);
  departments = signal<any[]>([]);
  saving      = signal(false);
  toast       = signal<{ msg: string; type: string } | null>(null);
  editId: number | null = null;

  form = {
    title: '', type: 'internal', audit_program_id: '', lead_auditor_id: '',
    department_id: '', planned_start_date: '', planned_end_date: '',
    scope: '', criteria: '', description: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AuditService
  ) {}

  ngOnInit(): void {
    this.svc.programs().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.programs.set(r.data ?? r) });
    this.svc.users().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
    this.svc.departments().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.departments.set(r.data ?? r) });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.svc.get(this.editId).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => {
          const d = r.data ?? r;
          this.form = {
            title: d.title, type: d.type,
            audit_program_id: d.program?.id ?? '',
            lead_auditor_id: d.lead_auditor?.id ?? '',
            department_id: d.department?.id ?? '',
            planned_start_date: d.planned_start_date,
            planned_end_date: d.planned_end_date,
            scope: d.scope ?? '', criteria: d.criteria ?? '', description: d.description ?? ''
          };
        }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  submit(): void {
    if (!this.form.title || !this.form.lead_auditor_id) return;
    this.saving.set(true);
    const obs = this.editId
      ? this.svc.update(this.editId, this.form)
      : this.svc.create(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        const id = r.data?.id ?? r.id;
        this.showToast(this.editId ? 'Audit updated' : 'Audit planned', 'success');
        setTimeout(() => this.router.navigate(['/audits', id ?? '']), 800);
      },
      error: e => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to save', 'error'); }
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
