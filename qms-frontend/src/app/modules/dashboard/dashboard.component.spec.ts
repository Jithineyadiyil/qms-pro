// src/app/modules/dashboard/dashboard.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';

/** Minimal AuthService stub */
const authStub = {
  currentUser: signal({ id: 1, name: 'Jithin Varkey', role: { name: 'IT Supervisor', permissions: ['*'] }, email: 'jithin@diamond.com', is_active: true, created_at: '' }),
  isAuthenticated: signal(true),
  token: signal('test-token'),
  hasPermission: () => true,
  logout: jasmine.createSpy('logout'),
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── Happy path ─────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the current user name in userName getter', () => {
    expect(component.userName).toBe('Jithin Varkey');
  });

  it('should derive correct initials', () => {
    expect(component.initials).toBe('JV');
  });

  it('should set loading to false after all requests resolve', () => {
    fixture.detectChanges(); // triggers ngOnInit → loadDashboard()

    const summaryReq = httpMock.expectOne('/api/dashboard/summary');
    summaryReq.flush({ data: { open_requests: 5, open_nc: 1, open_capa: 2, open_risks: 3, open_complaints: 0, pending_docs: 4, upcoming_audits: 1, sla_breaches: 0 } });

    httpMock.expectOne('/api/dashboard/upcoming-reviews').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/my-tasks').flush({ data: [] });
    const actReq = httpMock.expectOne('/api/dashboard/activity');
    actReq.flush({ data: [] });
    httpMock.expectOne('/api/dashboard/overdue').flush({ data: [] });

    expect(component.loading()).toBe(false);
  });

  it('should populate coreCards from summary signal', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/dashboard/summary').flush({
      data: { open_requests: 7, open_nc: 2, open_capa: 3, open_risks: 4, open_complaints: 1, pending_docs: 5, upcoming_audits: 2, sla_breaches: 0 },
    });
    httpMock.expectOne('/api/dashboard/upcoming-reviews').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/my-tasks').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/activity').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/overdue').flush({ data: [] });

    const cards = component.coreCards();
    expect(cards.length).toBe(8);
    expect(cards[0].value).toBe(7);   // open_requests
    expect(cards[0].route).toBe('/requests');
  });

  // ── Error path ─────────────────────────────────────────────────────────

  it('should fall back to mock summary when API errors', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/dashboard/summary').error(new ErrorEvent('Network error'));
    httpMock.expectOne('/api/dashboard/upcoming-reviews').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/my-tasks').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/activity').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/overdue').flush({ data: [] });

    // Mock summary returns 14 open requests
    expect(component.coreCards()[0].value).toBe(14);
  });

  // ── Health module computed ─────────────────────────────────────────────

  it('should flag SLA module as critical when sla_breaches > 0', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/dashboard/summary').flush({
      data: { open_requests: 0, open_nc: 0, open_capa: 0, open_risks: 0, open_complaints: 0, pending_docs: 0, upcoming_audits: 1, sla_breaches: 2 },
    });
    httpMock.expectOne('/api/dashboard/upcoming-reviews').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/my-tasks').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/activity').flush({ data: [] });
    httpMock.expectOne('/api/dashboard/overdue').flush({ data: [] });

    const slaModule = component.healthModules().find(m => m.label === 'SLA Compliance');
    expect(slaModule?.status).toBe('critical');
  });

  // ── healthClass helper ─────────────────────────────────────────────────

  it('should return correct badge class for each status', () => {
    expect(component.healthClass('ok')).toBe('badge-green');
    expect(component.healthClass('warning')).toBe('badge-yellow');
    expect(component.healthClass('critical')).toBe('badge-red');
  });
});
