import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { KeycloakAuthService } from './auth/keycloak/keycloak.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ProEventIQ';
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(KeycloakAuthService);

  constructor() {
    // Listen for Keycloak profile changes to update language if user has locale preference
    effect(() => {
      const profile = this.auth.profile();
      if (profile) {
        const locale = (profile as any)['locale'];
        if (locale && (locale === 'en' || locale === 'pl')) {
          this.translate.use(locale);
          localStorage.setItem('app-language', locale);
        }
      }
    });
  }
}
