import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NcCapaService } from '../../../core/services/nc-capa.service';

@Component({
  selector: 'app-capa-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="form-page">
  <div class="form-header">
    <a routerLink="/nc-capa/capas" class="back-link"><i class="fas fa-arrow-left"></i> Back to CAPAs</a>
    <h1 class="form-title">{{ editId ? 'Edit CAPA' : 'New CAPA' }}</h1>
  </div>
  <div class="form-card">
    <form (ngSubmit)="submit()">
      <div class="field-group">
        <label class="field-label">Title <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.title" name="title" required placeholder="CAPA title" maxlength="255">
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Type <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.type" name="type" required>
            <option value="corrective">Corrective Action</option>
            <option value="preventive">Preventive Action</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Priority <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.priority" name="priority" required>
            <option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Owner <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.owner_id" name="owner_id" required>
            <option value="">— Select Owner —</option>
            @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Target Date <span class="req">*</span></label>
          <input class="field-input" type="date" [(ngModel)]="form.target_date" name="target_date" required>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Linked NC</label>
        <select class="field-input" [(ngModel)]="form.nc_id" name="nc_id">
          <option value="">— None —</option>
          @for (nc of openNcs(); track nc.id) { <option [value]="nc.id">{{ nc.reference_no }} – {{ nc.title }}</option> }
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Description <span class="req">*</span></label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.description" name="description" required placeholder="What needs to be done?"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Root Cause Analysis</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.root_cause_analysis" name="root_cause_analysis" placeholder="Why did this happen?"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Action Plan</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.action_plan" name="action_plan" placeholder="Detailed steps to address the root cause…"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Effectiveness Criteria</label>
        <textarea class="field-input" rows="2" [(ngModel)]="form.effectiveness_criteria" name="effectiveness_criteria" placeholder="How will you measure success?"></textarea>
      </div>
      <div class="form-footer">
        <a routerLink="/nc-capa/capas" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-primary" [disabled]="saving() || !form.title || !form.description || !form.owner_id">
          @if (saving()) { <i class="fas fa-spinner fa-spin"></i> Saving… }
          @else { <i class="fas fa-save"></i> {{ editId ? 'Save Changes' : 'Create CAPA' }} }
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
export class CapaFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  users   = signal<any[]>([]);
  openNcs = signal<any[]>([]);
  saving  = signal(false);
  toast   = signal<{ msg: string; type: string } | null>(null);
  editId: number | null = null;

  form = {
    title:'', description:'', root_cause_analysis:'', action_plan:'', effectiveness_criteria:'',
    type:'corrective', priority:'medium', owner_id:'', nc_id:'', target_date:''
  };

  constructor(private route: ActivatedRoute, private router: Router, private svc: NcCapaService) {}

  ngOnInit(): void {
    this.svc.capaUsers().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
    this.svc.openNcs().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.openNcs.set(r.data ?? r) });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.svc.getCapa(this.editId).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => {
          const d = r.data ?? r;
          this.form = { title:d.title, description:d.description, root_cause_analysis:d.root_cause_analysis??'', action_plan:d.action_plan??'', effectiveness_criteria:d.effectiveness_criteria??'', type:d.type, priority:d.priority, owner_id:d.owner?.id??'', nc_id:d.nc_id??'', target_date:d.target_date };
        }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  submit(): void {
    if (!this.form.title || !this.form.description || !this.form.owner_id) return;
    this.saving.set(true);
    const obs = this.editId ? this.svc.updateCapa(this.editId, this.form) : this.svc.createCapa(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast(this.editId?'CAPA updated':'CAPA created','success'); setTimeout(()=>this.router.navigate(['/nc-capa/capas']),800); },
      error: e => { this.saving.set(false); this.showToast(e.error?.message??'Failed','error'); }
    });
  }

  private showToast(msg: string, type: string): void { this.toast.set({msg,type}); setTimeout(()=>this.toast.set(null),3000); }
}
