// src/app/shared/components/main-layout/main-layout.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../../core/services/auth.service';

const authStub = {
  currentUser: signal({ id: 1, name: 'Shaden Alotaibi', role: { name: 'Quality Manager', permissions: ['*'] }, email: 'shaden@diamond.com', is_active: true, created_at: '' }),
  isAuthenticated: signal(true),
  token: signal('tok'),
  hasPermission: () => true,
  logout: jasmine.createSpy('logout'),
};

describe('MainLayoutComponent', () => {
  let fixture: ComponentFixture<MainLayoutComponent>;
  let component: MainLayoutComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creation ───────────────────────────────────────────────────────────

  it('should create', () => expect(component).toBeTruthy());

  it('should initialise with sidebar open on wide screen', () => {
    // jsdom width defaults to 1024
    expect(component.sidebarOpen()).toBe(true);
  });

  // ── User helpers ───────────────────────────────────────────────────────

  it('should return the correct userName from auth signal', () => {
    expect(component.userName).toBe('Shaden Alotaibi');
  });

  it('should derive initials correctly', () => {
    expect(component.initials).toBe('SA');
  });

  it('should return userRole from auth signal', () => {
    expect(component.userRole).toBe('Quality Manager');
  });

  // ── Sidebar toggle ─────────────────────────────────────────────────────

  it('should toggle sidebar on toggleSidebar()', () => {
    component.toggleSidebar();
    expect(component.sidebarOpen()).toBe(false);
    component.toggleSidebar();
    expect(component.sidebarOpen()).toBe(true);
  });

  // ── User menu ──────────────────────────────────────────────────────────

  it('should toggle user menu on toggleUserMenu()', () => {
    expect(component.userMenuOpen()).toBe(false);
    component.toggleUserMenu();
    expect(component.userMenuOpen()).toBe(true);
  });

  it('should close user menu on document click outside', () => {
    component.userMenuOpen.set(true);
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: document.body });
    component.onDocumentClick(event);
    expect(component.userMenuOpen()).toBe(false);
  });

  // ── Logout ─────────────────────────────────────────────────────────────

  it('should call auth.logout() and close menu when logout() is called', () => {
    component.userMenuOpen.set(true);
    component.logout();
    expect(authStub.logout).toHaveBeenCalled();
    expect(component.userMenuOpen()).toBe(false);
  });

  // ── Nav links ──────────────────────────────────────────────────────────

  it('should expose 8 core nav links', () => {
    expect(component.coreLinks.length).toBe(8);
  });

  it('should expose 6 operational nav links', () => {
    expect(component.operationalLinks.length).toBe(6);
  });

  it('should render a router-outlet element', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });
});
