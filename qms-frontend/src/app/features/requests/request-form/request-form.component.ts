// ============================================================
// request-form.component.ts — QDM v2 + Attachments
// ============================================================
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { RequestService } from '../request.service';
import {
  QdmRequestType, QDM_TYPE_REGISTRY, QdmFieldSchema,
  REQUEST_CATEGORIES, REQUEST_RISK_LEVELS,
  RequestCategory, Department,
} from '../request.model';

interface SubTypeGroup { label: string; types: QdmRequestType[]; }

interface AttachedFile {
  name: string;
  size: number;
  path: string;     // server storage path returned after upload
  url:  string;     // public URL for preview/download
  uploading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>{{ editId() ? 'Edit Request' : 'New QDM Request' }}</h1>
        <a routerLink="/requests" class="btn btn-secondary">← Back</a>
      </div>

      @if (successMsg()) {
        <div class="alert alert-success">{{ successMsg() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error">
          <strong>{{ error() }}</strong>
          @if (fieldErrors().length > 0) {
            <ul class="err-list">
              @for (e of fieldErrors(); track e) { <li>{{ e }}</li> }
            </ul>
          }
        </div>
      }

      <form [formGroup]="form" class="form-card" novalidate>

        <!-- Title -->
        <div class="form-group">
          <label>Title <span class="req">*</span></label>
          <input formControlName="title" class="form-control" placeholder="Brief title">
          @if (isInvalid('title')) { <span class="ferr">Required</span> }
        </div>

        <!-- Description -->
        <div class="form-group">
          <label>Description <span class="req">*</span></label>
          <textarea formControlName="description" class="form-control" rows="3"></textarea>
          @if (isInvalid('description')) { <span class="ferr">Required</span> }
        </div>

        <!-- Type / Priority / Risk -->
        <div class="form-row">
          <div class="form-group">
            <label>Type <span class="req">*</span></label>
            <select formControlName="type" class="form-control">
              <option value="internal">Internal</option>
              <option value="external">External</option>
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
              <option value="regulatory">Regulatory</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priority <span class="req">*</span></label>
            <select formControlName="priority" class="form-control">
              @for (r of riskLevels; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Risk Level <span class="req">*</span></label>
            <select formControlName="risk_level" class="form-control">
              @for (r of riskLevels; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Sub-type -->
        <div class="form-group">
          <label>Request Sub-Type <span class="req">*</span></label>
          <select formControlName="request_sub_type" class="form-control">
            <option value="">— Select sub-type —</option>
            @for (group of subTypeGroups; track group.label) {
              <optgroup [label]="group.label">
                @for (t of group.types; track t) {
                  <option [value]="t">{{ subTypeLabels[t] }}</option>
                }
              </optgroup>
            }
          </select>
          @if (isInvalid('request_sub_type')) { <span class="ferr">Required</span> }
          @if (slaHint()) { <small class="hint">{{ slaHint() }}</small> }
        </div>

        <!-- Category / Department -->
        <div class="form-row">
          <div class="form-group">
            <label>Category <small>(auto-set)</small></label>
            <select formControlName="category_id" class="form-control">
              <option [value]="null">— None —</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }} ({{ cat.sla_hours }}h)</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Department</label>
            <select formControlName="department_id" class="form-control">
              <option [value]="null">— None —</option>
              @for (d of departments(); track d.id) {
                <option [value]="d.id">{{ d.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Dynamic fields -->
        @if (dynamicFields().length > 0) {
          <div class="dyn-section">
            <h3 class="section-title">{{ subTypeLabels[selectedSubType()!] }} — Details</h3>
            @for (field of dynamicFields(); track field.key) {
              <div class="form-group">
                <label>{{ field.label }} @if (field.required) { <span class="req">*</span> }</label>
                @if (field.type === 'textarea') {
                  <textarea [formControlName]="field.key" class="form-control" rows="3"></textarea>
                } @else if (field.type === 'number') {
                  <input type="number" [formControlName]="field.key" class="form-control">
                } @else {
                  <input type="text" [formControlName]="field.key" class="form-control"
                         [placeholder]="field.placeholder ?? ''">
                }
                @if (isInvalid(field.key)) {
                  <span class="ferr">{{ field.label }} is required</span>
                }
              </div>
            }
          </div>
        }

        <!-- ── ATTACHMENTS ────────────────────────────────────────────── -->
        <div class="attach-section">
          <h3 class="section-title">Attachments</h3>

          <!-- Drop zone -->
          <div class="drop-zone"
               [class.dragover]="isDragging()"
               (dragover)="onDragOver($event)"
               (dragleave)="isDragging.set(false)"
               (drop)="onDrop($event)"
               (click)="fileInput.click()">
            <span class="drop-icon">📎</span>
            <p>Click to browse or drag &amp; drop files here</p>
            <small>PDF, Word, Excel, PowerPoint, Images · Max 20 MB each</small>
            <input #fileInput type="file" multiple
                   accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                   style="display:none"
                   (change)="onFilesSelected($event)">
          </div>

          <!-- File list -->
          @if (attachments().length > 0) {
            <ul class="file-list">
              @for (f of attachments(); track f.path; let i = $index) {
                <li class="file-item">
                  <span class="file-icon">{{ fileIcon(f.name) }}</span>
                  <div class="file-info">
                    <span class="file-name">{{ f.name }}</span>
                    <span class="file-meta">{{ formatSize(f.size) }}</span>
                  </div>

                  @if (f.uploading) {
                    <span class="file-status uploading">Uploading…</span>
                  } @else if (f.error) {
                    <span class="file-status error">{{ f.error }}</span>
                  } @else {
                    <a [href]="f.url" target="_blank" class="file-link" title="Open">↗</a>
                  }

                  <button type="button" class="file-remove"
                          (click)="removeFile(i)" title="Remove">✕</button>
                </li>
              }
            </ul>
          }
        </div>
        <!-- ── END ATTACHMENTS ───────────────────────────────────────── -->

        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary"
                  (click)="router.navigate(['/requests'])">Cancel</button>
          <button type="button" class="btn btn-outline"
                  [disabled]="loading() || anyUploading()"
                  (click)="onSubmit(false)">
            {{ loading() ? 'Saving…' : 'Save as Draft' }}
          </button>
          <button type="button" class="btn btn-primary"
                  [disabled]="loading() || anyUploading()"
                  (click)="onSubmit(true)">
            {{ loading() ? 'Submitting…' : 'Submit to QDM' }}
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .page-container{max-width:860px;margin:0 auto;padding:1.5rem}
    .page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
    .form-card{background:var(--surface,#1e2030);border-radius:8px;padding:2rem}
    .form-group{display:flex;flex-direction:column;gap:.35rem;margin-bottom:1rem}
    .form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
    .form-control{background:var(--surface2,#252840);border:1px solid var(--border,#3a3f5c);border-radius:6px;padding:.45rem .75rem;color:inherit;width:100%}
    .form-control:focus{outline:none;border-color:var(--primary,#4f8ef7)}
    .req{color:#f87171}.ferr{color:#f87171;font-size:.78rem}.hint{color:#94a3b8;font-size:.78rem}
    .dyn-section,.attach-section{margin-top:.5rem}
    .section-title{font-size:.9rem;font-weight:600;margin:1.5rem 0 .75rem;padding-bottom:.4rem;border-bottom:1px solid var(--border,#3a3f5c)}

    /* Drop zone */
    .drop-zone{border:2px dashed var(--border,#3a3f5c);border-radius:8px;padding:2rem 1rem;
      text-align:center;cursor:pointer;transition:border-color .2s,background .2s;
      display:flex;flex-direction:column;align-items:center;gap:.35rem}
    .drop-zone:hover,.drop-zone.dragover{border-color:var(--primary,#4f8ef7);background:rgba(79,142,247,.06)}
    .drop-icon{font-size:2rem}
    .drop-zone p{margin:0;font-size:.9rem;color:var(--text,#e2e8f0)}
    .drop-zone small{color:#94a3b8;font-size:.78rem}

    /* File list */
    .file-list{list-style:none;margin:.75rem 0 0;padding:0;display:flex;flex-direction:column;gap:.4rem}
    .file-item{display:flex;align-items:center;gap:.6rem;background:var(--surface2,#252840);
      border:1px solid var(--border,#3a3f5c);border-radius:6px;padding:.5rem .75rem}
    .file-icon{font-size:1.2rem;flex-shrink:0}
    .file-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
    .file-name{font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .file-meta{font-size:.72rem;color:#94a3b8}
    .file-status{font-size:.78rem}
    .file-status.uploading{color:#60a5fa}
    .file-status.error{color:#f87171}
    .file-link{color:var(--primary,#4f8ef7);text-decoration:none;font-size:.85rem;padding:.1rem .3rem}
    .file-remove{background:none;border:none;cursor:pointer;color:#6b7280;font-size:.9rem;padding:.1rem .3rem;border-radius:3px}
    .file-remove:hover{color:#f87171;background:rgba(248,113,113,.12)}

    /* Alerts */
    .alert-success{background:#052e16;border:1px solid #16a34a;color:#4ade80;padding:.75rem 1rem;border-radius:6px;margin-bottom:1rem}
    .alert-error{background:#2d0a0a;border:1px solid #dc2626;color:#f87171;padding:.75rem 1rem;border-radius:6px;margin-bottom:1rem}
    .err-list{margin:.4rem 0 0 1.2rem;padding:0;font-size:.82rem}

    /* Actions */
    .form-actions{display:flex;gap:.75rem;justify-content:flex-end;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border,#3a3f5c)}
    .btn{padding:.45rem 1.1rem;border-radius:6px;border:none;cursor:pointer;font-size:.875rem;font-weight:500}
    .btn-primary{background:var(--primary,#4f8ef7);color:#fff}
    .btn-secondary{background:transparent;border:1px solid var(--border,#3a3f5c);color:inherit;text-decoration:none;display:inline-flex;align-items:center}
    .btn-outline{background:transparent;border:1px solid var(--primary,#4f8ef7);color:var(--primary,#4f8ef7)}
    .btn:disabled{opacity:.5;cursor:not-allowed}
  `],
})
export class RequestFormComponent implements OnInit {

  // ── Signals ───────────────────────────────────────────────────────────────
  readonly loading     = signal(false);
  readonly error       = signal<string | null>(null);
  readonly fieldErrors = signal<string[]>([]);
  readonly successMsg  = signal<string | null>(null);
  readonly categories  = signal<RequestCategory[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly editId      = signal<number | null>(null);
  readonly attachments = signal<AttachedFile[]>([]);
  readonly isDragging  = signal(false);

  readonly anyUploading = computed(() => this.attachments().some(f => f.uploading));

  // ── Plain (built in ngOnInit) ─────────────────────────────────────────────
  subTypeGroups: SubTypeGroup[] = [];
  subTypeLabels: Record<string, string> = {};
  readonly riskLevels = REQUEST_RISK_LEVELS;

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly selectedSubType = computed((): QdmRequestType | null =>
    (this.form?.get('request_sub_type')?.value as QdmRequestType) || null
  );

  readonly dynamicFields = computed((): Array<{ key: string } & QdmFieldSchema> => {
    const def = QDM_TYPE_REGISTRY.find(t => t.type === this.selectedSubType());
    if (!def?.schema) return [];
    return Object.entries(def.schema).map(([key, f]) => ({ key, ...(f as QdmFieldSchema) }));
  });

  readonly slaHint = computed((): string => {
    const def   = QDM_TYPE_REGISTRY.find(t => t.type === this.selectedSubType());
    const cName = (def as any)?.categoryName ?? def?.category ?? '';
    const cat   = this.categories().find(c => c.name === cName);
    return cat ? `→ Category: ${cat.name} · SLA: ${cat.sla_hours}h` : '';
  });

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public  router: Router,
    private route: ActivatedRoute,
    private svc: RequestService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.subTypeGroups = this.buildGroups();
    this.subTypeLabels = Object.fromEntries(QDM_TYPE_REGISTRY.map(t => [t.type, t.label]));
    this.buildForm();
    this.loadData();

    this.form.get('request_sub_type')!.valueChanges.subscribe((v: string) => {
      this.autoFillCategory(v as QdmRequestType);
      this.updateDynamicValidators(v as QdmRequestType);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.editId.set(+id); this.loadExisting(+id); }
  }

  // ── File upload ───────────────────────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    files.forEach(f => this.uploadFile(f));
  }

  onFilesSelected(e: Event): void {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    files.forEach(f => this.uploadFile(f));
    (e.target as HTMLInputElement).value = '';   // reset so same file can be re-selected
  }

  private uploadFile(file: File): void {
    // Client-side size check (20 MB)
    if (file.size > 20 * 1024 * 1024) {
      alert(`"${file.name}" exceeds the 20 MB limit.`);
      return;
    }

    const entry: AttachedFile = {
      name: file.name, size: file.size,
      path: '', url: '', uploading: true, error: null,
    };

    this.attachments.update(list => [...list, entry]);
    const idx = this.attachments().length - 1;

    const fd = new FormData();
    fd.append('file', file);

    this.http.post<{ data: { path: string; url: string } }>(
      `${environment.apiUrl}/requests/upload-attachment`, fd
    ).subscribe({
      next: res => {
        this.attachments.update(list => list.map((f, i) =>
          i === idx
            ? { ...f, path: res.data.path, url: res.data.url, uploading: false }
            : f
        ));
      },
      error: (e: HttpErrorResponse) => {
        const msg = e.error?.message ?? 'Upload failed';
        this.attachments.update(list => list.map((f, i) =>
          i === idx ? { ...f, uploading: false, error: msg } : f
        ));
      },
    });
  }

  removeFile(index: number): void {
    const file = this.attachments()[index];
    // Attempt server-side cleanup (non-blocking)
    if (file.path) {
      this.http.delete(`${environment.apiUrl}/requests/delete-attachment`, {
        body: { path: file.path },
      }).subscribe();
    }
    this.attachments.update(list => list.filter((_, i) => i !== index));
  }

  fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
      ppt: '📰', pptx: '📰', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
      gif: '🖼️', txt: '📃', csv: '📊',
    };
    return map[ext] ?? '📎';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  private buildGroups(): SubTypeGroup[] {
    const map = new Map<string, QdmRequestType[]>();
    for (const t of QDM_TYPE_REGISTRY) {
      const key = (t as any).categoryName ?? t.category ?? 'General';
      const list = map.get(key) ?? [];
      list.push(t.type);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([label, types]) => ({ label, types }));
  }

  private buildForm(): void {
    const controls: Record<string, unknown> = {
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.required],
      type: ['internal', Validators.required],
      request_sub_type: ['', Validators.required],
      priority: ['medium', Validators.required],
      risk_level: ['medium', Validators.required],
      category_id: [null],
      department_id: [null],
    };
    for (const t of QDM_TYPE_REGISTRY) {
      for (const key of Object.keys(t.schema)) {
        if (!controls[key]) controls[key] = [''];
      }
    }
    this.form = this.fb.group(controls);
  }

  private updateDynamicValidators(subType: QdmRequestType): void {
    for (const t of QDM_TYPE_REGISTRY) {
      for (const key of Object.keys(t.schema)) {
        const c = this.form.get(key);
        if (c) { c.clearValidators(); c.updateValueAndValidity({ emitEvent: false }); }
      }
    }
    const def = QDM_TYPE_REGISTRY.find(t => t.type === subType);
    if (!def) return;
    for (const [key, f] of Object.entries(def.schema)) {
      const c = this.form.get(key);
      if (c && (f as QdmFieldSchema).required) {
        c.setValidators([Validators.required]);
        c.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  private autoFillCategory(subType: QdmRequestType): void {
    if (!this.categories().length) return;
    const def   = QDM_TYPE_REGISTRY.find(t => t.type === subType);
    const cName = (def as any)?.categoryName ?? def?.category ?? '';
    const cat   = this.categories().find(c => c.name === cName);
    this.form.patchValue({ category_id: cat?.id ?? null }, { emitEvent: false });
  }

  private loadData(): void {
    this.svc.getCategories().subscribe({ next: r => this.categories.set(r.data), error: () => {} });
    this.http.get<{ data: Department[] }>(`${environment.apiUrl}/departments`)
      .subscribe({ next: r => this.departments.set(r.data), error: () => {} });
  }

  private loadExisting(id: number): void {
    this.svc.getById(id).subscribe({
      next: res => {
        const r = res.data;
        this.form.patchValue({
          title: r.title, description: r.description, type: r.type,
          request_sub_type: r.request_sub_type ?? '',
          priority: r.priority, risk_level: r.risk_level ?? 'medium',
          category_id: r.category_id ?? null,
          department_id: r.department_id ?? null,
          ...(r.dynamic_fields as object ?? {}),
        });
        // Restore attachment list from saved paths
        if (Array.isArray(r.attachments)) {
          this.attachments.set((r.attachments as string[]).map(path => ({
            name: path.split('/').pop() ?? path,
            size: 0,
            path,
            url: `${location.origin}/storage/${path}`,
            uploading: false,
            error: null,
          })));
        }
      },
      error: () => this.error.set('Failed to load request.'),
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(andSubmit: boolean): void {
    if (andSubmit) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.error.set('Please fill in all required fields before submitting.');
        this.fieldErrors.set([]);
        return;
      }
    }
    if (this.anyUploading()) {
      this.error.set('Please wait for all files to finish uploading.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.fieldErrors.set([]);
    this.successMsg.set(null);

    const save$ = this.editId()
      ? this.svc.update(this.editId()!, this.buildPayload(andSubmit))
      : this.svc.create(this.buildPayload(andSubmit));

    save$.subscribe({
      next: res => {
        const id = (res.data as { id: number }).id;
        if (andSubmit) {
          this.svc.submit(id).subscribe({
            next: () => { this.loading.set(false); this.router.navigate(['/requests', id]); },
            error: e => { this.loading.set(false); this.handleError(e, 'Saved but submit failed.'); },
          });
        } else {
          this.loading.set(false);
          this.successMsg.set('Draft saved.');
          setTimeout(() => this.router.navigate(['/requests', id]), 900);
        }
      },
      error: e => { this.loading.set(false); this.handleError(e); },
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c.touched);
  }

  private buildPayload(andSubmit: boolean): Record<string, unknown> {
    const v   = this.form.value as Record<string, unknown>;
    const sub = v['request_sub_type'] as QdmRequestType;
    const def = QDM_TYPE_REGISTRY.find(t => t.type === sub);
    const dyn: Record<string, unknown> = {};
    if (andSubmit && def?.schema) {
      for (const key of Object.keys(def.schema)) {
        if (v[key] !== null && v[key] !== '' && v[key] !== undefined) dyn[key] = v[key];
      }
    }
    // Only include successfully uploaded files (have a path, no error)
    const attachmentPaths = this.attachments()
      .filter(f => f.path && !f.error && !f.uploading)
      .map(f => f.path);

    return {
      title:            v['title'],
      description:      v['description'],
      type:             v['type'],
      priority:         v['priority'],
      risk_level:       v['risk_level'],
      request_sub_type: sub || null,
      category_id:      v['category_id'] ?? null,
      department_id:    v['department_id'] ?? null,
      dynamic_fields:   dyn,
      attachments:      attachmentPaths,
    };
  }

  private handleError(err: HttpErrorResponse, fallback = 'Save failed.'): void {
    if (err.status === 422) {
      const body = err.error as { message?: string; errors?: Record<string, string[]> };
      const msgs = Object.entries(body.errors ?? {})
        .map(([f, m]) => `${f.replace('dynamic_fields.', '')}: ${m.join(', ')}`);
      this.error.set(body.message ?? 'Validation failed.');
      this.fieldErrors.set(msgs);
    } else {
      this.error.set(fallback);
      this.fieldErrors.set([`HTTP ${err.status}`]);
    }
  }
}
