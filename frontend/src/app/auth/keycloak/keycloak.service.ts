import { Injectable, signal } from '@angular/core';
import Keycloak, { KeycloakConfig, KeycloakInitOptions, KeycloakTokenParsed } from 'keycloak-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class KeycloakAuthService {
  private keycloak?: Keycloak;
  public isAuthenticated = signal<boolean>(false);
  public profile = signal<KeycloakTokenParsed | undefined>(undefined);

  init(): Promise<boolean> {
    const baseUrl = environment.keycloak.url && environment.keycloak.url.trim().length > 0
      ? environment.keycloak.url
      : window.location.origin;

    const config: KeycloakConfig = {
      url: baseUrl,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId
    };

  const keycloak = new Keycloak(config);
  this.keycloak = keycloak;

    const initOptions: KeycloakInitOptions = {
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/assets/silent-check-sso.html`,
      checkLoginIframe: false,
      pkceMethod: 'S256'
    };

    return keycloak
      .init(initOptions)
      .then((authenticated) => {
        this.isAuthenticated.set(authenticated);
        this.profile.set(keycloak.tokenParsed);
        if (authenticated) {
          this.scheduleTokenRefresh();
        }
        return authenticated;
      })
      .catch((err) => {
        // Do not block app bootstrap if Keycloak is unavailable
        console.error('Keycloak init failed', err);
        this.isAuthenticated.set(false);
        this.profile.set(undefined);
        return false;
      });
  }

  login(): Promise<void> {
    return this.keycloak!.login();
  }

  logout(): Promise<void> {
    return this.keycloak!.logout({ redirectUri: window.location.origin });
  }

  getToken(): Promise<string | undefined> {
    if (!this.keycloak) return Promise.resolve(undefined);
    return this.keycloak.updateToken(30).then(() => this.keycloak!.token);
  }

  private scheduleTokenRefresh() {
    if (!this.keycloak) return;
    const refresh = () => {
      this.keycloak!.updateToken(30).catch(() => this.login());
    };
    // refresh every 20s as a basic background job
    setInterval(refresh, 20000);
  }
}
