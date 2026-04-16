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
<div class="login-root">

  <!-- ══ LEFT: Visual Panel ══ -->
  <div class="visual-panel">

    <!-- Logo top-left -->
    <div class="vp-logo">
      <img src="assets/diamond-logo.png" alt="Diamond Insurance Broker" class="logo-img">
    </div>

    <!-- Central illustration -->
    <div class="vp-center">
      <svg class="hero-svg" viewBox="0 0 560 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="glow-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#3b82f6" stop-opacity=".35"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="gem-shine" cx="35%" cy="25%" r="65%">
            <stop offset="0%"   stop-color="#bfdbfe" stop-opacity=".6"/>
            <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0"/>
          </radialGradient>
          <filter id="gem-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="card-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        <!-- Ambient glow behind gem -->
        <ellipse cx="280" cy="310" rx="180" ry="160" fill="url(#glow-core)"/>

        <!-- Concentric rings with crosshairs -->
        <circle cx="280" cy="310" r="220" stroke="rgba(59,130,246,.06)" stroke-width="1"/>
        <circle cx="280" cy="310" r="170" stroke="rgba(59,130,246,.09)" stroke-width="1"/>
        <circle cx="280" cy="310" r="118" stroke="rgba(59,130,246,.14)" stroke-width="1.5"/>
        <circle cx="280" cy="310" r="68"  stroke="rgba(59,130,246,.22)" stroke-width="1.5"/>

        <!-- Crosshair lines -->
        <line x1="280" y1="80"  x2="280" y2="126" stroke="rgba(96,165,250,.3)" stroke-width="1" stroke-linecap="round"/>
        <line x1="280" y1="494" x2="280" y2="540" stroke="rgba(96,165,250,.3)" stroke-width="1" stroke-linecap="round"/>
        <line x1="50"  y1="310" x2="96"  y2="310" stroke="rgba(96,165,250,.3)" stroke-width="1" stroke-linecap="round"/>
        <line x1="464" y1="310" x2="510" y2="310" stroke="rgba(96,165,250,.3)" stroke-width="1" stroke-linecap="round"/>

        <!-- Tick marks on outer ring -->
        <line x1="280" y1="89"  x2="280" y2="96"  stroke="rgba(96,165,250,.2)" stroke-width="1"/>
        <line x1="280" y1="524" x2="280" y2="531" stroke="rgba(96,165,250,.2)" stroke-width="1"/>
        <line x1="59"  y1="310" x2="66"  y2="310" stroke="rgba(96,165,250,.2)" stroke-width="1"/>
        <line x1="494" y1="310" x2="501" y2="310" stroke="rgba(96,165,250,.2)" stroke-width="1"/>

        <!-- ══ DIAMOND GEM — large, centered ══ -->
        <g transform="translate(280,310)" filter="url(#gem-shadow)">
          <!-- shadow/depth base -->
          <ellipse cx="0" cy="120" rx="90" ry="18" fill="rgba(10,20,80,.5)"/>

          <!-- upper crown — top facets -->
          <polygon points="0,-120  -56,-38   0,-14" fill="#93c5fd"/>
          <polygon points="0,-120   56,-38   0,-14" fill="#60a5fa"/>
          <polygon points="0,-120  -56,-38 -100,10" fill="#3b82f6"/>
          <polygon points="0,-120   56,-38  100,10" fill="#2563eb"/>

          <!-- girdle — middle band -->
          <polygon points="-100,10  -56,-38   0,-14  -60,22" fill="#1d4ed8"/>
          <polygon points=" 100,10   56,-38   0,-14   60,22" fill="#1e40af"/>
          <polygon points="-60,22    0,-14    60,22   0,30"  fill="#2563eb"/>

          <!-- pavilion — lower facets -->
          <polygon points="-100,10  -60,22    0,110"  fill="#1e3a8a"/>
          <polygon points=" 100,10   60,22    0,110"  fill="#1d4ed8"/>
          <polygon points="-60,22    0,30    0,110"   fill="#1e40af"/>
          <polygon points="  60,22   0,30    0,110"   fill="#2563eb"/>
          <polygon points="   0,30  -60,22   60,22"   fill="#3b82f6"/>

          <!-- highlight shine overlay -->
          <polygon points="0,-120 -56,-38 0,-14 56,-38" fill="url(#gem-shine)" opacity=".7"/>

          <!-- edge outlines for depth -->
          <polyline points="0,-120 -56,-38 -100,10 0,110 100,10 56,-38 0,-120"
            stroke="rgba(147,197,253,.15)" stroke-width="1" fill="none"/>
          <polyline points="-56,-38 0,-14 56,-38"
            stroke="rgba(147,197,253,.2)" stroke-width="1" fill="none"/>
          <polyline points="-100,10 -60,22 0,30 60,22 100,10"
            stroke="rgba(147,197,253,.12)" stroke-width="1" fill="none"/>

          <!-- sparkle dots -->
          <circle cx="-28" cy="-70" r="2.5" fill="rgba(219,234,254,.8)"/>
          <circle cx="20"  cy="-90" r="1.8" fill="rgba(219,234,254,.6)"/>
          <circle cx="50"  cy="-50" r="1.5" fill="rgba(191,219,254,.5)"/>
        </g>

        <!-- ══ METRIC CARDS — repositioned around gem ══ -->

        <!-- NC & CAPA — top left -->
        <g transform="translate(32,136)" filter="url(#card-glow)">
          <rect width="124" height="62" rx="12" fill="rgba(13,22,60,.85)" stroke="rgba(59,130,246,.3)" stroke-width="1"/>
          <rect width="124" height="3" rx="1.5" y="0" fill="rgba(59,130,246,.6)" rx="12"/>
          <rect x="14" y="14" width="28" height="28" rx="7" fill="rgba(59,130,246,.15)"/>
          <text x="28" y="34" text-anchor="middle" font-family="Inter,sans-serif" font-size="14" fill="#60a5fa">⚠</text>
          <text x="50" y="27" font-family="Inter,sans-serif" font-size="11" font-weight="700" fill="rgba(210,230,255,.85)" letter-spacing=".3">NC &amp; CAPA</text>
          <text x="50" y="41" font-family="Inter,sans-serif" font-size="10" fill="rgba(148,163,184,.55)">7 open items</text>
          <rect x="14" y="50" width="96" height="3" rx="1.5" fill="rgba(255,255,255,.05)"/>
          <rect x="14" y="50" width="42" height="3" rx="1.5" fill="#3b82f6"/>
        </g>

        <!-- Risk Score — top right -->
        <g transform="translate(404,100)" filter="url(#card-glow)">
          <rect width="122" height="68" rx="12" fill="rgba(30,15,10,.85)" stroke="rgba(245,158,11,.3)" stroke-width="1"/>
          <rect width="122" height="3" rx="1.5" y="0" fill="rgba(245,158,11,.6)" rx="12"/>
          <text x="14" y="22" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="rgba(210,230,255,.6)" letter-spacing=".5">RISK SCORE</text>
          <text x="14" y="50" font-family="Inter,sans-serif" font-size="28" font-weight="800" fill="#fbbf24">4.2</text>
          <text x="70" y="50" font-family="Inter,sans-serif" font-size="13" font-weight="500" fill="rgba(148,163,184,.45)">/ 10</text>
          <text x="14" y="63" font-family="Inter,sans-serif" font-size="9" fill="rgba(251,191,36,.55)">▲ Low risk level</text>
        </g>

        <!-- Audits — bottom left -->
        <g transform="translate(26,448)" filter="url(#card-glow)">
          <rect width="130" height="72" rx="12" fill="rgba(5,25,25,.85)" stroke="rgba(20,184,166,.3)" stroke-width="1"/>
          <rect width="130" height="3" rx="1.5" y="0" fill="rgba(20,184,166,.6)" rx="12"/>
          <text x="14" y="22" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="rgba(210,230,255,.6)" letter-spacing=".5">AUDITS</text>
          <text x="14" y="41" font-family="Inter,sans-serif" font-size="22" font-weight="800" fill="#2dd4bf">72<tspan font-size="13" fill="rgba(45,212,191,.6)">%</tspan></text>
          <rect x="14" y="50" width="102" height="6" rx="3" fill="rgba(255,255,255,.07)"/>
          <rect x="14" y="50" width="73"  height="6" rx="3" fill="#2dd4bf"/>
          <text x="14" y="66" font-family="Inter,sans-serif" font-size="9" fill="rgba(148,163,184,.5)">Annual programme complete</text>
        </g>

        <!-- SLA — bottom right -->
        <g transform="translate(404,448)" filter="url(#card-glow)">
          <rect width="122" height="72" rx="12" fill="rgba(20,10,40,.85)" stroke="rgba(139,92,246,.3)" stroke-width="1"/>
          <rect width="122" height="3" rx="1.5" y="0" fill="rgba(139,92,246,.6)" rx="12"/>
          <text x="14" y="22" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="rgba(210,230,255,.6)" letter-spacing=".5">SLA COMPLIANCE</text>
          <text x="14" y="52" font-family="Inter,sans-serif" font-size="30" font-weight="800" fill="#a78bfa">98<tspan font-size="16" fill="rgba(167,139,250,.65)">%</tspan></text>
          <text x="14" y="66" font-family="Inter,sans-serif" font-size="10" fill="#4ade80">↑ On track this quarter</text>
        </g>

        <!-- connector lines from cards to gem -->
        <line x1="156" y1="178" x2="200" y2="240" stroke="rgba(59,130,246,.15)" stroke-width="1" stroke-dasharray="4 4"/>
        <line x1="404" y1="152" x2="358" y2="235" stroke="rgba(245,158,11,.12)" stroke-width="1" stroke-dasharray="4 4"/>
        <line x1="156" y1="472" x2="204" y2="400" stroke="rgba(20,184,166,.12)" stroke-width="1" stroke-dasharray="4 4"/>
        <line x1="404" y1="472" x2="358" y2="400" stroke="rgba(139,92,246,.12)" stroke-width="1" stroke-dasharray="4 4"/>

        <!-- ISO badge -->
        <g transform="translate(280,566)" text-anchor="middle">
          <rect x="-70" y="-12" width="140" height="22" rx="11" fill="rgba(59,130,246,.08)" stroke="rgba(59,130,246,.18)" stroke-width="1"/>
          <text font-family="Inter,sans-serif" font-size="10" font-weight="600" fill="rgba(148,163,184,.5)" letter-spacing="1.5">ISO 9001:2015</text>
        </g>
      </svg>
    </div>

    <!-- Bottom tagline -->
    <div class="vp-tagline">
      {{ lang.isArabic() ? 'إدارة الجودة بكفاءة واحترافية' : 'Quality. Compliance. Excellence.' }}
    </div>

    <!-- background glow -->
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>
  </div>

  <!-- ══ RIGHT: Login Form ══ -->
  <div class="form-panel">
    <div class="form-card">

      <!-- Lang toggle -->
      <div class="lang-row">
        <button class="lang-btn" (click)="lang.toggle()">
          <i class="fas fa-globe"></i>
          {{ lang.isArabic() ? 'English' : 'العربية' }}
        </button>
      </div>

      <!-- Heading -->
      <div class="form-head">
        <h2 class="form-h2">{{ lang.isArabic() ? 'مرحباً بعودتك' : 'Welcome back' }}</h2>
        <p class="form-desc">{{ lang.isArabic() ? 'سجّل دخولك للمتابعة' : 'Sign in to your dashboard' }}</p>
      </div>

      <!-- Error -->
      @if (errorMsg()) {
        <div class="err-alert">
          <i class="fas fa-triangle-exclamation"></i>
          {{ errorMsg() }}
        </div>
      }

      <!-- Email -->
      <div class="field">
        <label class="field-lbl">{{ lang.isArabic() ? 'البريد الإلكتروني' : 'Email' }}</label>
        <div class="input-wrap">
          <i class="fas fa-envelope input-icon"></i>
          <input type="email" class="field-input" [(ngModel)]="email"
            placeholder="you@diamond.com"
            autocomplete="email" (keyup.enter)="login()">
        </div>
      </div>

      <!-- Password -->
      <div class="field">
        <label class="field-lbl">{{ lang.isArabic() ? 'كلمة المرور' : 'Password' }}</label>
        <div class="input-wrap">
          <i class="fas fa-lock input-icon"></i>
          <input [type]="showPw ? 'text' : 'password'" class="field-input field-input--pw"
            [(ngModel)]="password" placeholder="••••••••"
            autocomplete="current-password" (keyup.enter)="login()">
          <button class="pw-toggle" type="button" (click)="showPw = !showPw" tabindex="-1">
            <i [class]="showPw ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <button class="submit-btn" (click)="login()" [disabled]="loading()">
        @if (loading()) {
          <i class="fas fa-circle-notch fa-spin"></i>
          {{ lang.isArabic() ? 'جارٍ…' : 'Signing in…' }}
        } @else {
          {{ lang.isArabic() ? 'تسجيل الدخول' : 'Sign In' }}
          <i class="fas fa-arrow-right"></i>
        }
      </button>

      <!-- Demo credentials -->
      <div class="demo-section">
        <div class="demo-divider"><span>{{ lang.isArabic() ? 'حسابات تجريبية' : 'Quick access' }}</span></div>
        <div class="demo-grid">
          <button class="demo-card" (click)="fillCreds('admin@qms.com','password')">
            <div class="demo-avatar da-blue"><i class="fas fa-user-shield"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'مدير النظام' : 'Super Admin' }}</div>
              <div class="demo-email">admin&#64;qms.com</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('fatima.h@qms.com','password')">
            <div class="demo-avatar da-teal"><i class="fas fa-user-tie"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'مدير الجودة' : 'QA Manager' }}</div>
              <div class="demo-email">fatima.h&#64;qms.com</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('shaden.a@qms.com','password')">
            <div class="demo-avatar da-teal"><i class="fas fa-user-check"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'مشرف الجودة' : 'QA Supervisor' }}</div>
              <div class="demo-email">shaden.a&#64;qms.com</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('yusuf.a@qms.com','password')">
            <div class="demo-avatar da-blue"><i class="fas fa-user-gear"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'موظف جودة' : 'Quality Officer' }}</div>
              <div class="demo-email">yusuf.a&#64;qms.com</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('turki.a@qms.com','password')">
            <div class="demo-avatar da-purple"><i class="fas fa-scale-balanced"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'مدير الامتثال' : 'Compliance Mgr' }}</div>
              <div class="demo-email">turki.a&#64;qms.com</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('j.mani@dbroker.com.sa','12345678')">
            <div class="demo-avatar da-purple"><i class="fas fa-user-lock"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'موظف امتثال' : 'Compliance Ofc' }}</div>
              <div class="demo-email">j.mani&#64;dbroker.com.sa</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('omar.f@qms.com','password')">
            <div class="demo-avatar da-amber"><i class="fas fa-building"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'مدير القسم' : 'Dept Manager' }}</div>
              <div class="demo-email">omar.f&#64;qms.com</div>
            </div>
          </button>
          <button class="demo-card" (click)="fillCreds('mohammed.g@qms.com','password')">
            <div class="demo-avatar da-amber"><i class="fas fa-user"></i></div>
            <div>
              <div class="demo-role">{{ lang.isArabic() ? 'موظف' : 'Employee' }}</div>
              <div class="demo-email">mohammed.g&#64;qms.com</div>
            </div>
          </button>
        </div>
      </div>

    </div>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }

    .login-root {
      display: flex;
      min-height: 100vh;
      font-family: 'Inter', 'Cairo', sans-serif;
      background: #07090f;
    }

    /* ─── LEFT visual panel ─────────────────────────────── */
    .visual-panel {
      width: 52%;
      flex-shrink: 0;
      background: linear-gradient(160deg, #060d2e 0%, #0a1845 35%, #0d2060 65%, #0a1640 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 40px 48px 36px;
      position: relative;
      overflow: hidden;
    }

    .bg-glow {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(80px);
    }
    .bg-glow-1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(37,99,235,.22) 0%, transparent 70%);
      top: -80px; right: -80px;
    }
    .bg-glow-2 {
      width: 360px; height: 360px;
      background: radial-gradient(circle, rgba(99,102,241,.16) 0%, transparent 70%);
      bottom: -60px; left: -60px;
    }

    .vp-logo {
      align-self: flex-start;
      position: relative;
      z-index: 2;
    }
    .logo-img {
      height: 40px;
      width: auto;
      mix-blend-mode: screen;
      filter: brightness(1.2);
    }

    .vp-center {
      position: relative;
      z-index: 2;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    .hero-svg {
      width: 100%;
      max-width: 560px;
      height: auto;
      filter: drop-shadow(0 0 80px rgba(59,130,246,.3));
    }

    .vp-tagline {
      position: relative;
      z-index: 2;
      font-size: 13px;
      font-weight: 500;
      color: rgba(148,163,184,.45);
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    /* ─── RIGHT form panel ──────────────────────────────── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 32px;
      background: #07090f;
    }

    .form-card {
      width: 100%;
      max-width: 400px;
    }

    /* Lang */
    .lang-row { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .lang-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px;
      background: #0d1226; border: 1px solid #1e2845; border-radius: 20px;
      color: #4b6390; font-size: 12px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
    }
    .lang-btn:hover { border-color: #3b82f6; color: #3b82f6; }

    /* Heading */
    .form-head { margin-bottom: 28px; }
    .form-h2 {
      font-size: 26px; font-weight: 700;
      color: #e2e8f0; letter-spacing: -.6px; margin-bottom: 4px;
    }
    .form-desc { font-size: 14px; color: #3d5070; }

    /* Error */
    .err-alert {
      display: flex; align-items: center; gap: 10px;
      background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
      border-radius: 10px; padding: 11px 14px;
      font-size: 13px; font-weight: 500; color: #f87171;
      margin-bottom: 18px;
    }

    /* Fields */
    .field { margin-bottom: 16px; }
    .field-lbl {
      display: block; font-size: 12px; font-weight: 500;
      color: #3d5070; margin-bottom: 7px;
    }
    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-icon {
      position: absolute; left: 13px; color: #1e3460; font-size: 13px;
      pointer-events: none; z-index: 1;
    }
    .field-input {
      width: 100%; background: #0b0f1e; border: 1px solid #161f38;
      border-radius: 10px; padding: 12px 14px 12px 38px;
      color: #e2e8f0; font-size: 14px; font-family: 'Inter', sans-serif;
      outline: none; transition: border-color .2s, box-shadow .2s;
    }
    .field-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
    .field-input::placeholder { color: #1e3460; }
    .field-input--pw { padding-right: 42px; }
    .pw-toggle {
      position: absolute; right: 12px; background: none; border: none;
      cursor: pointer; color: #1e3460; font-size: 13px; padding: 4px;
      transition: color .15s;
    }
    .pw-toggle:hover { color: #6b7fa8; }

    /* Submit */
    .submit-btn {
      width: 100%; border: none; border-radius: 10px; padding: 13px;
      background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
      color: #fff; font-size: 15px; font-weight: 600;
      font-family: 'Inter', sans-serif; letter-spacing: .1px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 9px; margin-top: 22px;
      box-shadow: 0 4px 20px rgba(59,130,246,.3);
      transition: opacity .15s, transform .1s, box-shadow .2s;
    }
    .submit-btn:hover:not(:disabled) {
      opacity: .92; transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(59,130,246,.4);
    }
    .submit-btn:disabled { opacity: .55; cursor: not-allowed; }

    /* Demo section */
    .demo-section { margin-top: 28px; }
    .demo-divider {
      display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
    }
    .demo-divider::before, .demo-divider::after {
      content: ''; flex: 1; height: 1px; background: #0f1a30;
    }
    .demo-divider span {
      font-size: 10px; font-weight: 500; color: #1e3460;
      text-transform: uppercase; letter-spacing: 1px; white-space: nowrap;
    }
    .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; max-height: 300px; overflow-y: auto; }
    .demo-card {
      display: flex; align-items: center; gap: 9px;
      padding: 9px 11px; background: #090c18; border: 1px solid #111928;
      border-radius: 9px; cursor: pointer; text-align: left;
      transition: border-color .15s, background .15s;
    }
    .demo-card:hover { border-color: #1e3a8a; background: #0b1020; }

    .demo-avatar {
      width: 30px; height: 30px; border-radius: 7px;
      display: grid; place-items: center; font-size: 12px; flex-shrink: 0;
    }
    .da-blue   { background: rgba(59,130,246,.14); color: #60a5fa; }
    .da-teal   { background: rgba(20,184,166,.14); color: #2dd4bf; }
    .da-amber  { background: rgba(245,158,11,.14); color: #fbbf24; }
    .da-purple { background: rgba(139,92,246,.14); color: #a78bfa; }

    .demo-role  { font-size: 11px; font-weight: 600; color: #6b8aad; line-height: 1.3; }
    .demo-email { font-size: 10px; color: #1e3460; line-height: 1.4; word-break: break-all; }

    /* RTL */
    :host-context([dir="rtl"]) .visual-panel { order: 1; }
    :host-context([dir="rtl"]) .input-icon   { left: auto; right: 13px; }
    :host-context([dir="rtl"]) .field-input  { padding-left: 14px; padding-right: 38px; }
    :host-context([dir="rtl"]) .field-input--pw { padding-left: 42px; }
    :host-context([dir="rtl"]) .pw-toggle    { right: auto; left: 12px; }
    :host-context([dir="rtl"]) .demo-card    { text-align: right; flex-direction: row-reverse; }
    :host-context([dir="rtl"]) .lang-row     { justify-content: flex-start; }

    /* Responsive */
    @media (max-width: 860px) {
      .visual-panel { display: none; }
      .form-panel   { padding: 32px 20px; }
    }
  `]
})
export class LoginComponent {
  email    = '';
  password = '';
  showPw   = false;
  loading  = signal(false);
  errorMsg = signal('');

  constructor(
    private auth: AuthService,
    private router: Router,
    public lang: LanguageService
  ) {}

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
        if (err?.status === 0)        msg = ar ? 'تعذّر الاتصال بالخادم.' : 'Cannot connect to server.';
        else if (err?.status === 403) msg = err?.error?.message || (ar ? 'الحساب معطّل.' : 'Account is disabled.');
        else if (err?.error?.message) msg = err.error.message;
        this.errorMsg.set(msg);
      }
    });
  }
}
