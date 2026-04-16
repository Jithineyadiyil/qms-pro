import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ComplaintService } from '../../../core/services/complaint.service';

@Component({
  selector: 'app-complaint-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="form-page">
  <div class="form-header">
    <a routerLink="/complaints" class="back-link"><i class="fas fa-arrow-left"></i> Back to Complaints</a>
    <h1 class="form-title">{{ editId ? 'Edit Complaint' : 'Log New Complaint' }}</h1>
  </div>
  <div class="form-card">
    <form (ngSubmit)="submit()">

      <div class="field-group">
        <label class="field-label">Title <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.title" name="title" required placeholder="Brief title of the complaint" maxlength="255">
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Category</label>
          <select class="field-input" [(ngModel)]="form.category_id" name="category_id">
            <option value="">— Select Category —</option>
            @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Severity <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.severity" name="severity" required>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Complainant Type <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.complainant_type" name="complainant_type" required>
            <option value="client">Client</option>
            <option value="vendor">Vendor</option>
            <option value="employee">Employee</option>
            <option value="public">Public</option>
            <option value="regulator">Regulator</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Source <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.source" name="source" required>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="web_form">Web Form</option>
            <option value="in_person">In Person</option>
            <option value="regulator">Regulator</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Complainant Name</label>
          <input class="field-input" [(ngModel)]="form.complainant_name" name="complainant_name" placeholder="Full name">
        </div>
        <div class="field-group">
          <label class="field-label">Complainant Email</label>
          <input class="field-input" type="email" [(ngModel)]="form.complainant_email" name="complainant_email" placeholder="email@example.com">
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Complainant Phone</label>
          <input class="field-input" [(ngModel)]="form.complainant_phone" name="complainant_phone" placeholder="+966 5x xxx xxxx">
        </div>
        <div class="field-group">
          <label class="field-label">Received Date <span class="req">*</span></label>
          <input class="field-input" type="date" [(ngModel)]="form.received_date" name="received_date" required>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">Client (if applicable)</label>
        <select class="field-input" [(ngModel)]="form.client_id" name="client_id">
          <option value="">— None —</option>
          @for (c of clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Description <span class="req">*</span></label>
        <textarea class="field-input" rows="5" [(ngModel)]="form.description" name="description" required
          placeholder="Provide full details of the complaint…"></textarea>
      </div>

      <div class="field-group">
        <label class="check-label">
          <input type="checkbox" [(ngModel)]="form.is_regulatory" name="is_regulatory">
          <span>This is a regulatory complaint</span>
        </label>
      </div>

      <div class="form-footer">
        <a routerLink="/complaints" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-primary"
          [disabled]="saving() || !form.title || !form.description">
          @if (saving()) { <i class="fas fa-spinner fa-spin"></i> Saving… }
          @else { <i class="fas fa-save"></i> {{ editId ? 'Save Changes' : 'Log Complaint' }} }
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
    .check-label{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text);cursor:pointer;}
    .form-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:20px;border-top:1px solid var(--border);}
    .btn-primary{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;}
    .btn-primary:disabled{opacity:.6;cursor:not-allowed;}
    .btn-cancel{color:var(--text-muted);text-decoration:none;padding:10px 16px;font-size:13px;display:flex;align-items:center;}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class ComplaintFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  categories = signal<any[]>([]);
  clients    = signal<any[]>([]);
  saving     = signal(false);
  toast      = signal<{ msg: string; type: string } | null>(null);
  editId: number | null = null;

  form = {
    title: '', description: '', category_id: '', severity: 'medium',
    complainant_type: 'client', complainant_name: '', complainant_email: '',
    complainant_phone: '', source: 'email', received_date: new Date().toISOString().split('T')[0],
    client_id: '', is_regulatory: false
  };

  constructor(private route: ActivatedRoute, private router: Router, private svc: ComplaintService) {}

  ngOnInit(): void {
    this.svc.categories().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.categories.set(r.data ?? r) });
    this.svc.clients().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.clients.set(r.data ?? r) });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.svc.getById(this.editId).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => {
          const d = r.data ?? r;
          this.form = {
            title: d.title, description: d.description, category_id: d.category?.id ?? '',
            severity: d.severity, complainant_type: d.complainant_type,
            complainant_name: d.complainant_name ?? '', complainant_email: d.complainant_email ?? '',
            complainant_phone: d.complainant_phone ?? '', source: d.source,
            received_date: d.received_date, client_id: d.client?.id ?? '',
            is_regulatory: d.is_regulatory
          };
        }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  submit(): void {
    if (!this.form.title || !this.form.description) return;
    this.saving.set(true);
    const obs = this.editId
      ? this.svc.update(this.editId, this.form)
      : this.svc.create(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        const id = r.data?.id ?? r.id;
        this.showToast(this.editId ? 'Complaint updated' : 'Complaint logged', 'success');
        setTimeout(() => this.router.navigate(['/complaints', id ?? '']), 800);
      },
      error: e => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to save', 'error'); }
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
