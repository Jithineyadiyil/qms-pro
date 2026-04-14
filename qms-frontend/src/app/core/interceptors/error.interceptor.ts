import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth   = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && auth.isAuthenticated()) {
        // Only force-logout if user WAS already authenticated
        // This prevents background API calls (before login) from triggering a logout loop
        auth.clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
