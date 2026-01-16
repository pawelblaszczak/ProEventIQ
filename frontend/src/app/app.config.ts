import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authErrorInterceptor } from './shared/services/auth-error.interceptor';
import { Configuration } from './api/configuration';
import { environment } from '../environments/environment';
import { KeycloakAuthService } from './auth/keycloak/keycloak.service';
import { keycloakTokenInterceptor } from './auth/keycloak/keycloak-token.interceptor';

export function HttpLoaderFactory() {
  return new TranslateHttpLoader();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([keycloakTokenInterceptor, authErrorInterceptor])),
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: {
        prefix: '/assets/i18n/',
        suffix: '.json'
      }
    },
    importProvidersFrom(TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory
      }
    })),
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
