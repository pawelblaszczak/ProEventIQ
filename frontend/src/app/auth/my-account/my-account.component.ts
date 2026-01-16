import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { KeycloakAuthService } from '../keycloak/keycloak.service';
import { UserService } from '../../shared/services/user.service';

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
    MatTooltipModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyAccountComponent implements OnInit {
  private readonly authService = inject(KeycloakAuthService);
  private readonly userService = inject(UserService);

  public loading = signal(false);
  public error = signal<string | null>(null);

  // Computed signals for user information
  public profile = computed(() => this.authService.profile());
  public isAuthenticated = computed(() => this.authService.isAuthenticated());

  // User details from API
  public userDetails = computed(() => this.userService.userDetails());
  public userDetailsLoading = computed(() => this.userService.loading());
  public userDetailsError = computed(() => this.userService.error());

  ngOnInit(): void {
    // Load user details when component initializes
    if (this.isAuthenticated()) {
      this.loadUserDetails();
    }
  }

  public loadUserDetails(): void {
    this.userService.loadCurrentUserDetails().subscribe({
      next: () => {
        // User details loaded successfully
        console.log('User details loaded:', this.userService.userDetails());
      },
      error: (error) => {
        console.error('Failed to load user details:', error);
        // Error is handled by the UserService
      }
    });
  }

  public userEmail = computed(() => {
    // Prefer user details from API, fallback to Keycloak profile
    const userDetails = this.userDetails();
    if (userDetails?.email) {
      return userDetails.email;
    }
    
    const profile = this.profile();
    return profile?.['email'] as string || 'No email available';
  });

  public userName = computed(() => {
    // Prefer user details from API, fallback to Keycloak profile
    const userDetails = this.userDetails();
    if (userDetails?.name) {
      return userDetails.name;
    }
    
    const profile = this.profile();
    if (!profile) return 'Unknown User';
    
    const fullName = [profile['given_name'], profile['family_name']].filter(Boolean).join(' ');
    return (profile['name'] as string) || fullName || (profile['preferred_username'] as string) || 'User';
  });

  public userAddress = computed(() => {
    const userDetails = this.userDetails();
    return userDetails?.address || 'No address provided';
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
