import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from './material.module';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions } from '@angular/material/tooltip';
import { KeycloakAuthService } from './auth/keycloak/keycloak.service';

// Custom tooltip behavior
export const myTooltipDefaults: MatTooltipDefaultOptions = {
  showDelay: 300,
  hideDelay: 100,
  touchendHideDelay: 100,
  touchGestures: 'auto',
  position: 'right'
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  providers: [
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myTooltipDefaults }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  isExpanded = signal<boolean>(true);
  constructor(private readonly auth: KeycloakAuthService) {}
  
  toggleSideNav(): void {
    this.isExpanded.update(value => !value);
  }

  authenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  displayName(): string {
    const p = this.auth.profile();
    if (!p) return '';
  const fullName = [p['given_name'], p['family_name']].filter(Boolean).join(' ');
  return (p['name'] as string) || fullName || (p['preferred_username'] as string) || 'User';
  }

  login(): void {
    this.auth.login();
  }

  logout(): void {
    this.auth.logout();
  }
}