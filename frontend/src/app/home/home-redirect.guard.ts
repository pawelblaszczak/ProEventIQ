import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KeycloakAuthService } from '../auth/keycloak/keycloak.service';

// Landing page is for visitors only; logged-in users go straight to events.
export const landingPageGuard: CanActivateFn = () => {
  const auth = inject(KeycloakAuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/events']) : true;
};
