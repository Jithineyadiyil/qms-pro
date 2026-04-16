import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NcCapaService } from '../../../core/services/nc-capa.service';

@Component({
  selector: 'app-nc-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="form-page">
  <div class="form-header">
    <a routerLink="/nc-capa" class="back-link"><i class="fas fa-arrow-left"></i> Back to NC & CAPA</a>
    <h1 class="form-title">{{ editId ? 'Edit Non-Conformance' : 'Record Non-Conformance' }}</h1>
  </div>
  <div class="form-card">
    <form (ngSubmit)="submit()">
      <div class="field-group">
        <label class="field-label">Title <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.title" name="title" required placeholder="Brief title of the non-conformance" maxlength="255">
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
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Source <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.source" name="source" required>
            <option value="internal_audit">Internal Audit</option>
            <option value="external_audit">External Audit</option>
            <option value="client_complaint">Client Complaint</option>
            <option value="process_review">Process Review</option>
            <option value="supplier_issue">Supplier Issue</option>
            <option value="regulatory">Regulatory</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Detection Date <span class="req">*</span></label>
          <input class="field-input" type="date" [(ngModel)]="form.detection_date" name="detection_date" required>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Target Closure Date</label>
        <input class="field-input" type="date" [(ngModel)]="form.target_closure_date" name="target_closure_date">
      </div>
      <div class="field-group">
        <label class="field-label">Description <span class="req">*</span></label>
        <textarea class="field-input" rows="4" [(ngModel)]="form.description" name="description" required placeholder="Describe the non-conformance in detail…"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Immediate Action Taken</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.immediate_action" name="immediate_action" placeholder="What immediate corrective steps were taken?"></textarea>
      </div>
      <div class="form-footer">
        <a routerLink="/nc-capa" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-primary" [disabled]="saving() || !form.title || !form.description">
          @if (saving()) { <i class="fas fa-spinner fa-spin"></i> Saving… }
          @else { <i class="fas fa-save"></i> {{ editId ? 'Save Changes' : 'Record NC' }} }
        </button>
      </div>
    </form>
  </div>
</div>
@if (toast()) { <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div> }
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
    .field-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 12px;font-size:13px;width:100%;box-sizing:border-box;}
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
export class NcFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  categories = signal<any[]>([]);
  saving     = signal(false);
  toast      = signal<{ msg: string; type: string } | null>(null);
  editId: number | null = null;

  form = {
    title: '', description: '', category_id: '', severity: 'minor',
    source: 'internal_audit', detection_date: new Date().toISOString().split('T')[0],
    target_closure_date: '', immediate_action: ''
  };

  constructor(private route: ActivatedRoute, private router: Router, private svc: NcCapaService) {}

  ngOnInit(): void {
    this.svc.ncCategories().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.categories.set(r.data ?? r) });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.svc.getNc(this.editId).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => { const d = r.data ?? r; this.form = { title:d.title, description:d.description, category_id:d.category?.id??'', severity:d.severity, source:d.source, detection_date:d.detection_date, target_closure_date:d.target_closure_date??'', immediate_action:d.immediate_action??'' }; }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  submit(): void {
    if (!this.form.title || !this.form.description) return;
    this.saving.set(true);
    const obs = this.editId ? this.svc.updateNc(this.editId, this.form) : this.svc.createNc(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { const id = r.data?.id??r.id; this.showToast(this.editId?'NC updated':'NC recorded','success'); setTimeout(()=>this.router.navigate(['/nc-capa']),800); },
      error: e => { this.saving.set(false); this.showToast(e.error?.message??'Failed to save','error'); }
    });
  }

  private showToast(msg: string, type: string): void { this.toast.set({msg,type}); setTimeout(()=>this.toast.set(null),3000); }
}
