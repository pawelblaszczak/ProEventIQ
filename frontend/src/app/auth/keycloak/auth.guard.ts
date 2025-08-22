import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { KeycloakAuthService } from './keycloak.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(KeycloakAuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (auth.isAuthenticated()) {
    return true;
  }
  
  // Check if this might be a Keycloak callback (has specific query parameters)
  const url = new URL(window.location.href);
  const hasKeycloakParams = url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('session_state');
  
  if (hasKeycloakParams) {
    // This looks like a Keycloak callback, try to refresh authentication state
    try {
      await auth.refreshAuthenticationState();
      if (auth.isAuthenticated()) {
        return true;
      }
    } catch (error) {
      console.error('Failed to process Keycloak callback:', error);
    }
  }
  
  // Store the attempted URL for redirecting after login
  const redirectUrl = state.url;
  router.navigate(['/unauthorized'], { queryParams: { from: redirectUrl } });
  return false;
};
