import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const required: string | string[] | undefined = route.data['permission'];

  // Not logged in — authGuard handles this, but double-check
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // No permission required for this route
  if (!required) return true;

  const permissions = Array.isArray(required) ? required : [required];

  // User has at least one of the required permissions
  if (permissions.some(p => auth.hasPermission(p))) return true;

  // Redirect to dashboard with access denied flag
  router.navigate(['/dashboard'], { queryParams: { denied: 1 } });
  return false;
};
