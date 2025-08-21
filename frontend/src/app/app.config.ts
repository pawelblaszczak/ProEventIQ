import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authErrorInterceptor } from './shared/services/auth-error.interceptor';
import { Configuration } from './api/configuration';
import { environment } from '../environments/environment';
import { KeycloakAuthService } from './auth/keycloak/keycloak.service';
import { keycloakTokenInterceptor } from './auth/keycloak/keycloak-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([keycloakTokenInterceptor, authErrorInterceptor])),
    {
      provide: APP_INITIALIZER,
  useFactory: (auth: KeycloakAuthService) => () => auth.init(),
  deps: [KeycloakAuthService],
      multi: true
    },
    {
      provide: Configuration,
      useFactory: () => new Configuration({
        basePath: environment.apiUrl
      })
    }
  ]
};
