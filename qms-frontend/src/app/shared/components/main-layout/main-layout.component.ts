// src/app/shared/components/main-layout/main-layout.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/** A single navigation link definition */
interface NavLink {
  label: string;
  icon: string;
  route: string;
  permission?: string;
}

/**
 * MainLayoutComponent
 *
 * Shell layout for all authenticated pages.  Renders a collapsible sidebar
 * navigation, a top toolbar with user menu, and a <router-outlet> for the
 * active feature module.
 *
 * Replaces the previous Angular-Material–based layout which required
 * packages not present in this project's package.json.
 *
 * @standalone true
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  // ── DI ─────────────────────────────────────────────────────────────────
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // ── State ───────────────────────────────────────────────────────────────
  /** Whether the sidebar is expanded */
  readonly sidebarOpen = signal<boolean>(true);

  /** Whether the user dropdown is visible */
  readonly userMenuOpen = signal<boolean>(false);

  // ── Nav structure ───────────────────────────────────────────────────────

  /** Core QMS modules — always visible */
  readonly coreLinks: NavLink[] = [
    { label: 'Dashboard',   icon: '⊞',  route: '/dashboard' },
    { label: 'Requests',    icon: '📋', route: '/requests' },
    { label: 'NC / CAPA',   icon: '⚠️',  route: '/nc-capa' },
    { label: 'Risk',        icon: '🛡️',  route: '/risk' },
    { label: 'Documents',   icon: '📄', route: '/documents' },
    { label: 'Audits',      icon: '🔍', route: '/audits' },
    { label: 'Complaints',  icon: '📣', route: '/complaints' },
    { label: 'Visits',      icon: '🤝', route: '/visits' },
  ];

  /** Operational modules */
  readonly operationalLinks: NavLink[] = [
    { label: 'SLA',         icon: '📊', route: '/sla' },
    { label: 'OKR / KPI',   icon: '🎯', route: '/okr' },
    { label: 'Vendors',     icon: '🏢', route: '/vendors' },
    { label: 'Surveys',     icon: '⭐', route: '/surveys' },
    { label: 'Reports',     icon: '📈', route: '/reports' },
    { label: 'Settings',    icon: '⚙️',  route: '/settings' },
  ];

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** @inheritdoc */
  ngOnInit(): void {
    // Collapse sidebar on small screens automatically
    if (window.innerWidth < 900) {
      this.sidebarOpen.set(false);
    }
  }

  // ── Computed helpers ────────────────────────────────────────────────────

  /**
   * Current user's display name from the auth signal.
   */
  get userName(): string {
    return this.auth.currentUser()?.name ?? 'User';
  }

  /**
   * Current user's role label from the auth signal.
   */
  get userRole(): string {
    return this.auth.currentUser()?.role?.name ?? '';
  }

  /**
   * Avatar initials derived from the user's name.
   */
  get initials(): string {
    return (this.auth.currentUser()?.name ?? 'U')
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Toggle sidebar open/closed */
  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  /** Toggle the user dropdown menu */
  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  /** Close the user dropdown when clicking anywhere outside it */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) {
      this.userMenuOpen.set(false);
    }
  }

  /**
   * Navigate to the user's profile page and close menu.
   */
  goToProfile(): void {
    this.userMenuOpen.set(false);
    this.router.navigate(['/settings']);
  }

  /**
   * Log the current user out via AuthService.
   */
  logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout();
  }
}
