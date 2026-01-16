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
  private translate = inject(TranslateService);
  private auth = inject(KeycloakAuthService);

  constructor() {
    this.translate.addLangs(['en', 'pl']);
    this.translate.setDefaultLang('en');

    // Set initial language based on browser or default
    const browserLang = this.translate.getBrowserLang();
    const defaultLang = browserLang && browserLang.match(/en|pl/) ? browserLang : 'en';
    this.translate.use(defaultLang);

    effect(() => {
      const profile = this.auth.profile();
      if (profile) {
        // Keycloak profile might have 'locale' property
        const locale = (profile as any)['locale'];
        if (locale && (locale === 'en' || locale === 'pl')) {
          this.translate.use(locale);
        }
      }
    });
  }
}
