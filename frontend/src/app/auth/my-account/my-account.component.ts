import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KeycloakAuthService } from '../keycloak/keycloak.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyAccountComponent {
  private readonly authService = inject(KeycloakAuthService);

  public loading = signal(false);
  public error = signal<string | null>(null);

  // Computed signals for user information
  public profile = computed(() => this.authService.profile());
  public isAuthenticated = computed(() => this.authService.isAuthenticated());

  public userEmail = computed(() => {
    const profile = this.profile();
    return profile?.['email'] as string || 'No email available';
  });

  public userName = computed(() => {
    const profile = this.profile();
    if (!profile) return 'Unknown User';
    
    const fullName = [profile['given_name'], profile['family_name']].filter(Boolean).join(' ');
    return (profile['name'] as string) || fullName || (profile['preferred_username'] as string) || 'User';
  });

  public userInitials = computed(() => {
    const profile = this.profile();
    if (!profile) return 'U';
    
    const givenName = profile['given_name'] as string || '';
    const familyName = profile['family_name'] as string || '';
    
    if (givenName && familyName) {
      return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
    }
    
    const name = (profile['name'] as string) || (profile['preferred_username'] as string) || 'User';
    return name.charAt(0).toUpperCase();
  });

  public preferredUsername = computed(() => {
    const profile = this.profile();
    return profile?.['preferred_username'] as string || 'N/A';
  });

  public userRoles = computed(() => {
    const profile = this.profile();
    const realmAccess = profile?.['realm_access'] as any;
    return realmAccess?.roles || [];
  });

  public accountCreated = computed(() => {
    const profile = this.profile();
    const iat = profile?.iat;
    if (iat) {
      return new Date(iat * 1000).toLocaleDateString();
    }
    return 'Unknown';
  });

  logout(): void {
    this.authService.logout();
  }

  refreshProfile(): void {
    this.loading.set(true);
    this.authService.refreshAuthenticationState()
      .then(() => {
        this.loading.set(false);
      })
      .catch((error) => {
        this.error.set('Failed to refresh profile');
        this.loading.set(false);
      });
  }
}
