import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakAuthService } from './keycloak.service';
import { from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const keycloakTokenInterceptor: HttpInterceptorFn = (request, next) => {
  // Only attach to requests targeting our API base URL
  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }
  
  const auth = inject(KeycloakAuthService);
  
  return from(auth.getToken()).pipe(
    catchError(() => {
      // Token retrieval failed, just continue without token
      return of(null);
    }),
    switchMap((token) => {
      if (token) {
        const authReq: HttpRequest<unknown> = request.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(authReq);
      }
      // No token, send request without Authorization header
      return next(request);
    })
  );
};
