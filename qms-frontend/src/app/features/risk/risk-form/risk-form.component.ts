import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RiskService } from '../../../core/services/risk.service';

@Component({
  selector: 'app-risk-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="form-page">
  <div class="form-header">
    <a routerLink="/risk" class="back-link"><i class="fas fa-arrow-left"></i> Back to Risk Register</a>
    <h1 class="form-title">{{ editId ? 'Edit Risk' : 'Register New Risk' }}</h1>
  </div>
  <div class="form-card">
    <form (ngSubmit)="submit()">

      <div class="field-group">
        <label class="field-label">Risk Title <span class="req">*</span></label>
        <input class="field-input" [(ngModel)]="form.title" name="title" required placeholder="Brief title describing the risk" maxlength="255">
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
          <label class="field-label">Type</label>
          <select class="field-input" [(ngModel)]="form.type" name="type">
            <option value="operational">Operational</option>
            <option value="strategic">Strategic</option>
            <option value="financial">Financial</option>
            <option value="compliance">Compliance</option>
            <option value="reputational">Reputational</option>
            <option value="technology">Technology</option>
            <option value="environmental">Environmental</option>
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Risk Owner <span class="req">*</span></label>
          <select class="field-input" [(ngModel)]="form.owner_id" name="owner_id" required>
            <option value="">— Select Owner —</option>
            @for (u of owners(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
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

      <div class="field-group">
        <label class="field-label">Description <span class="req">*</span></label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.description" name="description" required placeholder="Describe the risk scenario and potential impact…"></textarea>
      </div>

      <!-- Risk Scoring -->
      <div class="scoring-section">
        <h3 class="scoring-title"><i class="fas fa-calculator"></i> Risk Assessment</h3>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Likelihood (1–5) <span class="req">*</span></label>
            <div class="score-selector">
              @for (n of [1,2,3,4,5]; track n) {
                <button type="button" class="score-btn" [class.active]="form.likelihood === n"
                  [class]="'score-btn score-' + getLikelihoodColor(n)" (click)="form.likelihood = n">
                  {{ n }}
                </button>
              }
            </div>
            <div class="score-labels">
              <span>Rare</span><span>Unlikely</span><span>Possible</span><span>Likely</span><span>Almost Certain</span>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Impact (1–5) <span class="req">*</span></label>
            <div class="score-selector">
              @for (n of [1,2,3,4,5]; track n) {
                <button type="button" class="score-btn" [class.active]="form.impact === n"
                  [class]="'score-btn score-' + getImpactColor(n)" (click)="form.impact = n">
                  {{ n }}
                </button>
              }
            </div>
            <div class="score-labels">
              <span>Negligible</span><span>Minor</span><span>Moderate</span><span>Major</span><span>Catastrophic</span>
            </div>
          </div>
        </div>

        <!-- Risk Score Display -->
        <div class="risk-score-display" [class]="'risk-' + riskLevel()">
          <div class="rsd-score">{{ riskScore() }}</div>
          <div class="rsd-info">
            <div class="rsd-level">{{ riskLevel() | titlecase }} Risk</div>
            <div class="rsd-formula">{{ form.likelihood }} × {{ form.impact }}</div>
          </div>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">Treatment Strategy</label>
        <select class="field-input" [(ngModel)]="form.treatment_strategy" name="treatment_strategy">
          <option value="">— Select Strategy —</option>
          <option value="avoid">Avoid — eliminate the risk</option>
          <option value="mitigate">Mitigate — reduce likelihood/impact</option>
          <option value="transfer">Transfer — share or insure</option>
          <option value="accept">Accept — acknowledge and monitor</option>
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Treatment Plan</label>
        <textarea class="field-input" rows="3" [(ngModel)]="form.treatment_plan" name="treatment_plan" placeholder="How will this risk be treated?"></textarea>
      </div>

      <div class="field-group">
        <label class="field-label">Next Review Date</label>
        <input class="field-input" type="date" [(ngModel)]="form.next_review_date" name="next_review_date">
      </div>

      <div class="form-footer">
        <a routerLink="/risk" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-primary"
          [disabled]="saving() || !form.title || !form.description || !form.owner_id || !form.likelihood || !form.impact">
          @if (saving()) { <i class="fas fa-spinner fa-spin"></i> Saving… }
          @else { <i class="fas fa-save"></i> {{ editId ? 'Save Changes' : 'Register Risk' }} }
        </button>
      </div>

      <!-- ── Attachments ── -->
      <div class="form-section" style="margin-top:20px">
        <label class="section-label">📎 Attachments</label>
        <div [class.dz-over]="riskDragging()"
             (dragover)="riskDragOver($event)" (dragleave)="riskDragging.set(false)"
             (drop)="riskDrop($event)" (click)="riskFileInput.click()"
             style="border:2px dashed var(--border2,#2a3450);border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s">
          <span style="font-size:1.5rem">📎</span>
          <p style="margin:4px 0 2px;font-size:.85rem;color:var(--text2,#94a3b8)">Click or drag files here</p>
          <small style="color:#4b6390;font-size:.75rem">PDF, Word, Excel, Images · Max 20 MB</small>
          <input #riskFileInput type="file" multiple
                 accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                 style="display:none" (change)="riskFilePick($event)">
        </div>
        @if (riskAttachments().length > 0) {
          <ul style="list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:4px">
            @for (f of riskAttachments(); track f.path; let i = $index) {
              <li style="display:flex;align-items:center;gap:8px;background:var(--surface2,#0f1628);border:1px solid var(--border2,#1e2845);border-radius:6px;padding:6px 10px">
                <span>{{ riskFileIcon(f.name) }}</span>
                <span style="flex:1;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ f.name }}</span>
                <span style="font-size:.72rem;color:#4b6390">{{ riskFmtSize(f.size) }}</span>
                @if (f.uploading) { <span style="font-size:.72rem;color:#60a5fa">Uploading…</span> }
                @else if (f.error) { <span style="font-size:.72rem;color:#f87171">{{ f.error }}</span> }
                @else { <a [href]="f.url" target="_blank" style="font-size:.75rem;color:var(--accent,#4f8ef7);text-decoration:none">↗</a> }
                <button type="button" (click)="riskRemoveFile(i)"
                        style="background:none;border:none;cursor:pointer;color:#4b6390;font-size:.85rem;padding:2px 4px">✕</button>
              </li>
            }
          </ul>
        }
      </div>

        </form>
  </div>
</div>

@if (toast()) {
  <div class="toast" [class]="'toast-' + toast()!.type">{{ toast()!.msg }}</div>
}
  `,
  styles: [`
    .form-page{padding:24px;max-width:780px;margin:0 auto;}
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
    .scoring-section{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:20px;}
    .scoring-title{font-size:14px;font-weight:600;color:var(--text);margin:0 0 16px;display:flex;align-items:center;gap:8px;}
    .score-selector{display:flex;gap:8px;}
    .score-btn{width:40px;height:40px;border:2px solid var(--border);border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;background:var(--surface);color:var(--text);transition:all .15s;}
    .score-btn.active{border-color:var(--accent);background:var(--accent);color:#fff;}
    .score-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:4px;}
    .risk-score-display{display:flex;align-items:center;gap:16px;padding:16px;border-radius:10px;margin-top:16px;}
    .risk-low{background:#dcfce7;} .risk-medium{background:#fef9c3;} .risk-high{background:#fee2e2;} .risk-critical{background:#7f1d1d22;}
    .rsd-score{font-size:36px;font-weight:800;color:var(--text);}
    .rsd-level{font-size:16px;font-weight:700;color:var(--text);}
    .rsd-formula{font-size:12px;color:var(--text-muted);}
    .form-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:20px;border-top:1px solid var(--border);}
    .btn-primary{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;}
    .btn-primary:disabled{opacity:.6;cursor:not-allowed;}
    .btn-cancel{color:var(--text-muted);text-decoration:none;padding:10px 16px;font-size:13px;display:flex;align-items:center;}
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;}
    .toast-success{background:#22c55e;color:#fff;} .toast-error{background:#ef4444;color:#fff;}
  `]
})
export class RiskFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  categories  = signal<any[]>([]);
  owners      = signal<any[]>([]);
  departments = signal<any[]>([]);
  saving      = signal(false);
  attachmentPaths: string[] = [];
  riskAttachments  = signal<{name:string;size:number;path:string;url:string;uploading:boolean;error:string|null}[]>([]);
  riskDragging     = signal(false);
  riskAnyUploading = computed(() => this.riskAttachments().some(f => f.uploading));
  toast       = signal<{ msg: string; type: string } | null>(null);
  editId: number | null = null;

  form = {
    title: '', description: '', category_id: '', type: 'operational',
    owner_id: '', department_id: '', likelihood: 1, impact: 1,
    treatment_strategy: '', treatment_plan: '', next_review_date: ''
  };

  riskScore = computed(() => this.form.likelihood * this.form.impact);
  riskLevel = computed(() => {
    const s = this.riskScore();
    if (s >= 17) return 'critical';
    if (s >= 10) return 'high';
    if (s >= 5)  return 'medium';
    return 'low';
  });

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, private svc: RiskService) {}

  ngOnInit(): void {
    this.svc.categories().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.categories.set(r.data ?? r) });
    this.svc.owners().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.owners.set(r.data ?? r) });
    this.svc.departments().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.departments.set(r.data ?? r) });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = Number(id);
      this.svc.get(this.editId).pipe(takeUntil(this.destroy$)).subscribe({
        next: r => {
          const d = r.data ?? r;
          this.form = {
            title: d.title, description: d.description, category_id: d.category?.id ?? '',
            type: d.type, owner_id: d.owner?.id ?? '', department_id: d.department?.id ?? '',
            likelihood: d.likelihood, impact: d.impact,
            treatment_strategy: d.treatment_strategy ?? '', treatment_plan: d.treatment_plan ?? '',
            next_review_date: d.next_review_date ?? ''
          };
        }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  getLikelihoodColor(n: number): string {
    return ['green','yellow','orange','red','darkred'][n - 1];
  }

  getImpactColor(n: number): string {
    return ['green','yellow','orange','red','darkred'][n - 1];
  }

  // ── Risk attachment helpers ──────────────────────────────────────────────
  riskDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.riskDragging.set(true); }
  riskDrop(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.riskDragging.set(false); Array.from(e.dataTransfer?.files??[]).forEach(f=>this.riskUploadFile(f)); }
  riskFilePick(e: Event) { Array.from((e.target as HTMLInputElement).files??[]).forEach(f=>this.riskUploadFile(f)); (e.target as HTMLInputElement).value=''; }
  riskRemoveFile(i: number) {
    const f = this.riskAttachments()[i];
    if (f.path) this.http.delete(`${environment.apiUrl}/attachments/delete`,{body:{path:f.path}}).subscribe();
    this.riskAttachments.update(l=>l.filter((_,j)=>j!==i));
  }
  private riskUploadFile(file: File) {
    if (file.size > 20*1024*1024) { alert(`"${file.name}" exceeds 20 MB`); return; }
    const entry = {name:file.name,size:file.size,path:'',url:'',uploading:true,error:null as string|null};
    this.riskAttachments.update(l=>[...l,entry]);
    const idx = this.riskAttachments().length-1;
    const fd = new FormData(); fd.append('file',file); fd.append('module','risks');
    this.http.post<{data:{path:string;url:string}}>(`${environment.apiUrl}/attachments/upload`,fd).subscribe({
      next: r => this.riskAttachments.update(l=>l.map((f,i)=>i===idx?{...f,path:r.data.path,url:r.data.url,uploading:false}:f)),
      error:(e:HttpErrorResponse)=>this.riskAttachments.update(l=>l.map((f,i)=>i===idx?{...f,uploading:false,error:e.error?.message||'Upload failed'}:f))
    });
  }
  riskFileIcon(n:string){const m:Record<string,string>={pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📰',pptx:'📰',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',txt:'📃',csv:'📊'};return m[n.split('.').pop()?.toLowerCase()??'']??'📎';}
  riskFmtSize(b:number){if(!b)return'';if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}

  submit(): void {
    if (!this.form.title || !this.form.description || !this.form.owner_id) return;
    this.saving.set(true);
    const obs = this.editId
      ? this.svc.update(this.editId, {...this.form, attachments: this.riskAttachments().filter(f=>f.path&&!f.error&&!f.uploading).map(f=>f.path)})
      : this.svc.create({...this.form, attachments: this.riskAttachments().filter(f=>f.path&&!f.error&&!f.uploading).map(f=>f.path)});
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showToast(this.editId ? 'Risk updated' : 'Risk registered', 'success'); setTimeout(() => this.router.navigate(['/risk']), 800); },
      error: e => { this.saving.set(false); this.showToast(e.error?.message ?? 'Failed to save', 'error'); }
    });
  }

  private showToast(msg: string, type: string): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
