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
  readonly auth = inject(AuthService) as AuthService;
  private readonly router = inject(Router);

  // ── State ───────────────────────────────────────────────────────────────
  /** Whether the sidebar is expanded */
  readonly sidebarOpen = signal<boolean>(true);

  /** Whether the user dropdown is visible */
  readonly userMenuOpen = signal<boolean>(false);

  // ── Nav structure ───────────────────────────────────────────────────────

  /** Core QMS modules — always visible */
  // All possible nav links — each carries the permission required to see it
  private readonly _allCoreLinks: NavLink[] = [
    { label: 'Dashboard',  icon: '⊞',  route: '/dashboard'  },
    { label: 'Requests',   icon: '📋', route: '/requests',   permission: 'request.view'   },
    { label: 'NC / CAPA',  icon: '⚠️',  route: '/nc-capa',   permission: 'nc.view'        },
    { label: 'Risk',       icon: '🛡️',  route: '/risk',       permission: 'risk.view'      },
    { label: 'Documents',  icon: '📄', route: '/documents',  permission: 'document.view'  },
    { label: 'Audits',     icon: '🔍', route: '/audits',     permission: 'audit.view'     },
    { label: 'Complaints', icon: '📣', route: '/complaints', permission: 'complaint.view' },
    { label: 'Visits',     icon: '🤝', route: '/visits',     permission: 'visit.view'     },
  ];

  private readonly _allOperationalLinks: NavLink[] = [
    { label: 'SLA',        icon: '📊', route: '/sla',      permission: 'sla.view'     },
    { label: 'OKR / KPI',  icon: '🎯', route: '/okr',      permission: 'okr.view'     },
    { label: 'Vendors',    icon: '🏢', route: '/vendors',   permission: 'vendor.view'  },
    { label: 'Surveys',    icon: '⭐', route: '/surveys',   permission: 'survey.view'  },
    { label: 'Reports',    icon: '📈', route: '/reports',   permission: 'report.view'  },
    { label: 'Settings',   icon: '⚙️',  route: '/settings', permission: 'admin.access' },
  ];

  /** Filtered nav links — only what this user's role permits */
  get coreLinks(): NavLink[] {
    return this._allCoreLinks.filter(l => !l.permission || this._hasPerm(l.permission));
  }
  get operationalLinks(): NavLink[] {
    return this._allOperationalLinks.filter(l => !l.permission || this._hasPerm(l.permission));
  }

  /** Permission check using the user's role permissions array */
  private _hasPerm(perm: string): boolean {
    const user = this.auth.currentUser() as any;
    const perms: string[] = user?.role?.permissions ?? [];
    const mod = perm.split('.')[0];
    return perms.includes('*') || perms.includes(perm) || perms.includes(mod + '.*');
  }

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
    const u = this.auth.currentUser() as { name?: string } | null;
    return u?.name ?? 'User';
  }

  /**
   * Current user's role label from the auth signal.
   */
  get userRole(): string {
    const u = this.auth.currentUser() as { role?: { name?: string } } | null;
    return u?.role?.name ?? '';
  }

  /**
   * Avatar initials derived from the user's name.
   */
  get initials(): string {
    const u = this.auth.currentUser() as { name?: string } | null;
    return (u?.name ?? 'U')
      .split(' ')
      .map((w: string) => w[0])
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
