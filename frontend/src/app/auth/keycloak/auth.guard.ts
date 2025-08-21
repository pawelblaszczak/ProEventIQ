import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { KeycloakAuthService } from './keycloak.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(KeycloakAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  auth.login();
  router.navigate(['/unauthorized']);
  return false;
};
