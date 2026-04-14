import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column">
          <div style="margin-bottom:48px">
            <img src="assets/diamond-logo.png" alt="Diamond Insurance Broker" style="height:48px;width:auto;filter:brightness(1.1);mix-blend-mode:screen;">
          </div>
          <div style="margin-bottom:auto">
            <div class="hero-title">
              {{ lang.isArabic() ? 'نظام إدارة الجودة' : 'Quality Management System' }}
            </div>
            <div class="hero-sub">
              {{ lang.isArabic()
                ? 'منصة متوافقة مع معيار ISO 9001:2015 لإدارة حالات عدم المطابقة والمخاطر والمراجعات والتحسين المستمر.'
                : 'ISO 9001:2015 compliant platform for managing non-conformances, risks, audits, and continuous improvement.' }}
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
              <div class="feat"><div class="feat-icon"><i class="fas fa-shield-halved"></i></div>
                {{ lang.isArabic() ? 'إدارة دورة حياة عدم المطابقة والإجراءات التصحيحية' : 'NC & CAPA lifecycle management' }}
              </div>
              <div class="feat"><div class="feat-icon"><i class="fas fa-fire"></i></div>
                {{ lang.isArabic() ? 'سجل المخاطر مع تحليل خريطة الحرارة' : 'Risk register with heatmap analysis' }}
              </div>
              <div class="feat"><div class="feat-icon"><i class="fas fa-bullseye-arrow"></i></div>
                {{ lang.isArabic() ? 'تتبع أداء OKR ومؤشرات KPI' : 'OKR & KPI performance tracking' }}
              </div>
              <div class="feat"><div class="feat-icon"><i class="fas fa-file-contract"></i></div>
                {{ lang.isArabic() ? 'إدارة اتفاقيات الخدمة والعقود' : 'SLA & contract management' }}
              </div>
            </div>
          </div>
          <div class="copy">&#169; 2026 Diamond Insurance Broker &middot; ISO 9001:2015 Certified</div>
        </div>
        <div class="blob1"></div>
        <div class="blob2"></div>
      </div>

      <div class="login-right">
        <div class="form-wrap">

          <!-- Language toggle at top of form -->
          <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
            <button class="lang-pill" (click)="lang.toggle()">
              <span>{{ lang.isArabic() ? '🌐' : '🇸🇦' }}</span>
              <span>{{ lang.isArabic() ? 'English' : 'العربية' }}</span>
            </button>
          </div>

          <div style="margin-bottom:32px">
            <div class="form-title">
              {{ lang.isArabic() ? 'مرحباً بعودتك' : 'Welcome back' }}
            </div>
            <div class="form-sub">
              {{ lang.isArabic() ? 'سجّل الدخول للوصول إلى لوحة تحكم نظام إدارة الجودة' : 'Sign in to access your QMS dashboard' }}
            </div>
          </div>

          @if (errorMsg()) {
            <div class="err-box">
              <i class="fas fa-circle-exclamation"></i>
              {{ errorMsg() }}
            </div>
          }

          <div class="fg">
            <label class="fl">{{ lang.isArabic() ? 'البريد الإلكتروني' : 'EMAIL ADDRESS' }}</label>
            <input type="email" [(ngModel)]="email" placeholder="admin@qms.com"
              autocomplete="email" class="fi" (keyup.enter)="login()">
          </div>

          <div class="fg" style="position:relative">
            <label class="fl">{{ lang.isArabic() ? 'كلمة المرور' : 'PASSWORD' }}</label>
            <input [type]="showPw ? 'text' : 'password'" [(ngModel)]="password"
              placeholder="••••••••"
              autocomplete="current-password" class="fi fi-pw" (keyup.enter)="login()">
            <span class="pw-eye" (click)="showPw=!showPw">
              <i [class]="showPw ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </span>
          </div>

          <button (click)="login()" [disabled]="loading()" class="sign-btn">
            @if (loading()) {
              <i class="fas fa-circle-notch fa-spin"></i>
              {{ lang.isArabic() ? 'جارٍ تسجيل الدخول...' : 'Signing in...' }}
            } @else {
              <i class="fas fa-arrow-right-to-bracket"></i>
              {{ lang.isArabic() ? 'تسجيل الدخول' : 'Sign In' }}
            }
          </button>

          <div class="demo-box">
            <div class="demo-lbl">{{ lang.isArabic() ? 'بيانات اعتماد تجريبية' : 'Demo Credentials' }}</div>
            <button class="cred" (click)="fillCreds('admin@qms.com','password')">
              <i class="fas fa-user-shield" style="color:var(--accent);width:14px"></i>
              <span>admin&#64;qms.com &mdash; {{ lang.isArabic() ? 'مدير النظام' : 'Super Admin' }}</span>
            </button>
            <button class="cred" (click)="fillCreds('fatima.h@qms.com','password')">
              <i class="fas fa-user" style="color:var(--success);width:14px"></i>
              <span>fatima.h&#64;qms.com &mdash; {{ lang.isArabic() ? 'مدير الجودة' : 'Quality Manager' }}</span>
            </button>
            <button class="cred" (click)="fillCreds('yusuf.a@qms.com','password')">
              <i class="fas fa-user" style="color:var(--warning);width:14px"></i>
              <span>yusuf.a&#64;qms.com &mdash; {{ lang.isArabic() ? 'محلل المخاطر' : 'Risk Analyst' }}</span>
            </button>
            <button class="cred" (click)="fillCreds('j.mani@dbroker.com.sa','12345678')">
              <i class="fas fa-user" style="color:var(--warning);width:14px"></i>
              <span>j,mani&#64;dbroker.com.sa &mdash; {{ lang.isArabic() ? 'محلل المخاطر' : 'Employee' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; min-height:100vh; }
    .login-page { display:flex; min-height:100vh; background:var(--bg); }
    .login-left { width:420px; flex-shrink:0; background:linear-gradient(145deg,#1e3a8a,#1d4ed8 50%,#2563eb); padding:48px 52px; display:flex; flex-direction:column; position:relative; overflow:hidden; }
    .login-right { flex:1; display:flex; align-items:center; justify-content:center; padding:40px 24px; }
    .form-wrap { width:100%; max-width:400px; }

    .blob1,.blob2 { position:absolute; border-radius:50%; background:rgba(255,255,255,.04); pointer-events:none; }
    .blob1 { width:300px; height:300px; top:-80px; right:-80px; }
    .blob2 { width:220px; height:220px; bottom:-60px; left:-60px; }

    .logo-box { width:44px; height:44px; background:rgba(255,255,255,.2); border-radius:12px; display:grid; place-items:center; font-size:22px; font-weight:800; color:#fff; font-family:'Syne',sans-serif; }
    .logo-name { font-family:'Syne',sans-serif; font-weight:800; font-size:20px; color:#fff; letter-spacing:-.5px; }
    .logo-sub { font-size:10px; color:rgba(255,255,255,.6); letter-spacing:2px; text-transform:uppercase; }
    .hero-title { font-family:'IBM Plex Arabic','Syne',sans-serif; font-size:32px; font-weight:800; color:#fff; line-height:1.2; margin-bottom:16px; }
    .hero-sub { font-size:14px; color:rgba(255,255,255,.7); line-height:1.6; margin-bottom:32px; }
    .feat { display:flex; align-items:center; gap:10px; font-size:13px; color:rgba(255,255,255,.8); }
    .feat-icon { width:28px; height:28px; background:rgba(255,255,255,.15); border-radius:8px; display:grid; place-items:center; font-size:11px; flex-shrink:0; }
    .copy { margin-top:32px; padding-top:24px; border-top:1px solid rgba(255,255,255,.15); font-size:11px; color:rgba(255,255,255,.4); }

    .form-title { font-family:'IBM Plex Arabic','Syne',sans-serif; font-size:26px; font-weight:800; color:var(--text); margin-bottom:6px; }
    .form-sub { font-size:14px; color:var(--text2); }
    .err-box { background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.3); color:#ef4444; padding:12px 16px; border-radius:10px; font-size:13px; margin-bottom:20px; display:flex; align-items:center; gap:8px; }

    .fg { margin-bottom:20px; }
    .fl { display:block; font-size:12px; font-weight:600; color:var(--text2); margin-bottom:6px; letter-spacing:.5px; }
    .fi { width:100%; background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:12px 14px; color:var(--text); font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color .15s; }
    .fi:focus { border-color:var(--accent); }
    .fi::placeholder { color:var(--text3); }
    .fi-pw { padding-right:42px; }
    .pw-eye { position:absolute; right:14px; top:34px; cursor:pointer; color:var(--text3); font-size:14px; }

    .sign-btn { width:100%; background:var(--accent); color:#fff; border:none; border-radius:10px; padding:13px; font-size:15px; font-weight:700; font-family:'IBM Plex Arabic','Syne',sans-serif; cursor:pointer; transition:background .15s; display:flex; align-items:center; justify-content:center; gap:8px; letter-spacing:.2px; margin-bottom:0; }
    .sign-btn:hover:not(:disabled) { background:#2563eb; }
    .sign-btn:disabled { opacity:.7; cursor:not-allowed; }

    .demo-box { margin-top:28px; padding:16px; background:var(--surface); border:1px solid var(--border); border-radius:10px; display:flex; flex-direction:column; gap:6px; }
    .demo-lbl { font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
    .cred { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:8px 12px; text-align:left; cursor:pointer; color:var(--text2); font-size:12px; font-family:'DM Sans',sans-serif; transition:background .15s; display:flex; align-items:center; gap:8px; }
    .cred:hover { background:var(--border); }

    /* Language pill */
    .lang-pill { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; border:1px solid var(--border2); background:var(--surface2); cursor:pointer; font-size:13px; font-weight:600; color:var(--text2); transition:all .15s; font-family:'DM Sans',sans-serif; }
    .lang-pill:hover { border-color:var(--accent); color:var(--accent); }

    /* RTL adjustments for login */
    :host-context([dir="rtl"]) .login-left { order:1; }
    :host-context([dir="rtl"]) .pw-eye { right:auto; left:14px; }
    :host-context([dir="rtl"]) .fi-pw { padding-right:14px; padding-left:42px; }
    :host-context([dir="rtl"]) .cred { text-align:right; flex-direction:row-reverse; }
    :host-context([dir="rtl"]) .fl { letter-spacing:0; }
    :host-context([dir="rtl"]) .fi { text-align:right; }
  `]
})
export class LoginComponent {
  email    = '';
  password = '';
  showPw   = false;
  loading  = signal(false);
  errorMsg = signal('');

  constructor(private auth: AuthService, private router: Router, public lang: LanguageService) {}

  fillCreds(email: string, pw: string): void {
    this.email = email; this.password = pw; this.errorMsg.set('');
  }

  login(): void {
    if (!this.email || !this.password) {
      this.errorMsg.set(this.lang.isArabic()
        ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
        : 'Please enter your email and password.');
      return;
    }
    this.loading.set(true); this.errorMsg.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard']); },
      error: (err) => {
        this.loading.set(false);
        const ar = this.lang.isArabic();
        let msg = ar ? 'بريد إلكتروني أو كلمة مرور غير صحيحة.' : 'Invalid email or password.';
        if (err?.status === 0)        msg = ar ? 'تعذّر الاتصال بالخادم.' : 'Cannot connect to server. Is the Laravel backend running?';
        else if (err?.status === 403) msg = err?.error?.message || (ar ? 'الحساب معطّل.' : 'Account is disabled.');
        else if (err?.error?.message) msg = err.error.message;
        this.errorMsg.set(msg);
      }
    });
  }
}
