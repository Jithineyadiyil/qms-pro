import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DocumentService } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="form-page">
  <div class="form-header">
    <a routerLink="/documents" class="back-link"><i class="fas fa-arrow-left"></i> Back to Documents</a>
    <h1 class="form-title">{{ editId ? 'Edit Document' : 'Upload New Document' }}</h1>
  </div>
  <div class="form-card">
    <form (ngSubmit)="submit()">

      <div class="field-group">
        <label class="field-label">Title <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.title" name="title" required placeholder="Document title" maxlength="255">
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Document Type <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.type" name="type" required>
            <option value="policy">Policy</option>
            <option value="procedure">Procedure</option>
            <option value="work_instruction">Work Instruction</option>
            <option value="form">Form</option>
            <option value="template">Template</option>
            <option value="manual">Manual</option>
            <option value="specification">Specification</option>
            <option value="report">Report</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Category</label>
          <select class="field-input" [(ngModel)]="form.category_id" name="category_id">
            <option value="">— Select Category —</option>
            @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
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
          <label class="field-label">Reviewer</label>
          <select class="field-input" [(ngModel)]="form.reviewer_id" name="reviewer_id">
            <option value="">— Select Reviewer —</option>
            @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Approver</label>
          <select class="field-input" [(ngModel)]="form.approver_id" name="approver_id">
            <option value="">— Select Approver —</option>
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
          <label class="field-label">Effective Date</label>
          <input class="field-input" type="date" [(ngModel)]="form.effective_date" name="effective_date">
        </div>
        <div class="field-group">
          <label class="field-label">Review Date</label>
          <input class="field-input" type="date" [(ngModel)]="form.review_date" name="review_date">
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">Description</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.description" name="description" placeholder="Brief description of this document…"></textarea>
      </div>

      @if (!editId) {
        <div class="field-group">
          <label class="field-label">File <span class="req">*</span></label>
          <div class="file-drop" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
            <i class="fas fa-cloud-upload-alt file-icon"></i>
            @if (selectedFile()) {
              <p class="file-name">{{ selectedFile()!.name }}</p>
              <p class="file-size">{{ (selectedFile()!.size / 1024).toFixed(1) }} KB</p>
            } @else {
              <p class="drop-text">Drag & drop or <span class="link">browse</span></p>
              <p class="drop-hint">PDF, DOCX, XLSX, JPG, PNG — max 20MB</p>
            }
          </div>
          <input #fileInput type="file" hidden (change)="onFileChange($event)"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
        </div>
      }

      <div class="field-group">
        <label class="check-label">
          <input type="checkbox" [(ngModel)]="form.is_controlled" name="is_controlled">
          <span>Controlled Document (requires distribution acknowledgment)</span>
        </label>
      </div>

      <div class="form-footer">
        <a routerLink="/documents" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-primary"
          [disabled]="saving() || !form.title || !form.owner_id || (!editId && !selectedFile())">
          @if (saving()) { <i class="fas fa-spinner fa-spin"></i> Saving… }
          @else { <i class="fas fa-save"></i> {{ editId ? 'Save Changes' : 'Upload Document' }} }
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
    .file-drop{border:2px dashed var(--border);border-radius:10px;padding:32px;text-align:center;cursor:pointer;transition:border .2s;}
    .file-drop:hover{border-color:var(--accent);}
    .file-icon{font-size:32px;color:var(--text-muted);margin-bottom:8px;}
    .drop-text{font-size:14px;color:var(--text-muted);margin:8px 0 4px;}
    .link{color:var(--accent);font-weight:500;}
    .drop-hint{font-size:12px;color:var(--text-muted);margin:0;}
    .file-name{font-size:14px;color:var(--text);font-weight:600;margin:0;}
    .file-size{font-size:12px;color:var(--text-muted);margin:4px 0 0;}
    .check-label{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text);cursor:pointer;}
    .form-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:20px;border-top:1px solid var(--border);}
    .btn-primary{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;}
    .btn-primary:disabled{opacity:.6;cursor:not-allowed;}
    .btn-cancel{color:var(--text-muted);text-decoration:none;padding:10px 16px;font-size:13px;display:flex;align-items:center;}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class DocumentFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  categories  = signal<any[]>([]);
  users       = signal<any[]>([]);
  departments = signal<any[]>([]);
  selectedFile = signal<File | null>(null);
  saving      = signal(false);
  toast       = signal<{ msg: string; type: string } | null>(null);
  editId: number | null = null;

  form = {
    title: '', type: 'procedure', category_id: '', owner_id: '',
    reviewer_id: '', approver_id: '', department_id: '',
    effective_date: '', review_date: '', description: '', is_controlled: false
  };

  constructor(private route: ActivatedRoute, private router: Router, private svc: DocumentService) {}

  ngOnInit(): void {
    this.svc.categories().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.categories.set(r.data ?? r) });
    this.svc.users().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.users.set(r.data ?? r) });
    this.svc.departments().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.departments.set(r.data ?? r) });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.svc.get(this.editId).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => {
          const d = r.data ?? r;
          this.form = {
            title: d.title, type: d.type, category_id: d.category?.id ?? '',
            owner_id: d.owner?.id ?? '', reviewer_id: d.reviewer?.id ?? '',
            approver_id: d.approver?.id ?? '', department_id: d.department?.id ?? '',
            effective_date: d.effective_date ?? '', review_date: d.review_date ?? '',
            description: d.description ?? '', is_controlled: d.is_controlled
          };
        }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile.set(input.files[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile.set(file);
  }

  submit(): void {
    if (!this.form.title || !this.form.owner_id) return;
    this.saving.set(true);

    if (this.editId) {
      this.svc.update(this.editId, this.form).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.showToast('Document updated', 'success'); setTimeout(() => this.router.navigate(['/documents', this.editId]), 800); },
        error: e => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed', 'error'); }
      });
    } else {
      const fd = new FormData();
      Object.entries(this.form).forEach(([k, v]) => fd.append(k, String(v)));
      if (this.selectedFile()) fd.append('file', this.selectedFile()!);
      this.svc.create(fd).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => { const id = r.data?.id ?? r.id; this.showToast('Document uploaded', 'success'); setTimeout(() => this.router.navigate(['/documents', id ?? '']), 800); },
        error: e => { this.saving.set(false); this.showToast(e.error?.message ?? 'Upload failed', 'error'); }
      });
    }
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
