import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../models';
import { environment } from '@env/environment';

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser    = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  token          = signal<string | null>(null);

  /** Emits after a successful login — subscribe to trigger post-login side effects */
  loginSuccess$ = new Subject<void>();

  //private base = '/api';
  private base = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('qms_token');
    const user   = localStorage.getItem('qms_user');
    if (stored && user) {
      this.token.set(stored);
      this.currentUser.set(JSON.parse(user));
      this.isAuthenticated.set(true);
      this.http.get<any>( `${this.base}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` }
      }).subscribe({
        error: () => {
          this.clearSession();
          this.router.navigate(['/login']);
        }
      });
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { email, password })
      .pipe(tap(res => {
        this.token.set(res.token);
        this.currentUser.set(res.user);
        this.isAuthenticated.set(true);
        localStorage.setItem('qms_token', res.token);
        localStorage.setItem('qms_user', JSON.stringify(res.user));
        this.loginSuccess$.next();
      }));
  }

  logout(): void {
    this.http.post(`${this.base}/auth/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('qms_token');
    localStorage.removeItem('qms_user');
  }

  hasPermission(permission: string): boolean {
    const perms = this.currentUser()?.role?.permissions || [];
    return perms.includes('*') || perms.includes(permission) || perms.some(p => {
      const [mod] = permission.split('.');
      return p === `${mod}.*`;
    });
  }
}
