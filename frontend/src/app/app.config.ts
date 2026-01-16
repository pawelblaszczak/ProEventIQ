import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authErrorInterceptor } from './shared/services/auth-error.interceptor';
import { Configuration } from './api/configuration';
import { environment } from '../environments/environment';
import { KeycloakAuthService } from './auth/keycloak/keycloak.service';
import { keycloakTokenInterceptor } from './auth/keycloak/keycloak-token.interceptor';

export function HttpLoaderFactory() {
  return new TranslateHttpLoader();
}

export function initializeLanguage(translate: TranslateService) {
  return async () => {
    translate.addLangs(['en', 'pl']);
    translate.setDefaultLang('en');
    
    const savedLang = localStorage.getItem('app-language');
    const browserLang = translate.getBrowserLang();
    
    let initialLang = 'en';
    if (savedLang && (savedLang === 'en' || savedLang === 'pl')) {
      initialLang = savedLang;
    } else if (browserLang && /^(en|pl)$/.test(browserLang)) {
      initialLang = browserLang;
    }
    
    await firstValueFrom(translate.use(initialLang));
    localStorage.setItem('app-language', initialLang);
  };
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
      useFactory: initializeLanguage,
      deps: [TranslateService],
      multi: true
    },
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
