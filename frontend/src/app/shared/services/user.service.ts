import { Injectable, inject, signal, computed } from '@angular/core';
import { UserDetailsService } from '../../api/api/user-details.service';
import { UserDetailsDto } from '../../api/model/user-details-dto';
import { KeycloakAuthService } from '../../auth/keycloak/keycloak.service';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly userDetailsService = inject(UserDetailsService);
  private readonly authService = inject(KeycloakAuthService);

  // Signals for state management
  private readonly _userDetails = signal<UserDetailsDto | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Computed signals
  public readonly userDetails = computed(() => this._userDetails());
  public readonly loading = computed(() => this._loading());
  public readonly error = computed(() => this._error());

  // Check if user details exist and are loaded
  public readonly hasUserDetails = computed(() => this._userDetails() !== null);

  /**
   * Load user details for the current authenticated user
   */
  public loadCurrentUserDetails(): Observable<UserDetailsDto> {
    const profile = this.authService.profile();
    const userId = profile?.sub;

    if (!userId) {
      const error = 'User ID not found in authentication profile';
      this._error.set(error);
      return throwError(() => new Error(error));
    }

    return this.loadUserDetails(userId);
  }

  /**
   * Load user details by user ID
   */
  public loadUserDetails(userId: string): Observable<UserDetailsDto> {
    this._loading.set(true);
    this._error.set(null);

    return this.userDetailsService.getUserById(userId).pipe(
      tap(userDetails => {
        this._userDetails.set(userDetails);
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        
        if (error.status === 404) {
          // User doesn't exist in our system yet, create from Keycloak profile
          return this.createUserFromKeycloakProfile();
        } else {
          const errorMessage = 'Failed to load user details';
          this._error.set(errorMessage);
          return throwError(() => error);
        }
      })
    );
  }

  /**
   * Update user details
   */
  public updateUserDetails(userDetails: UserDetailsDto): Observable<UserDetailsDto> {
    const profile = this.authService.profile();
    const userId = profile?.sub;

    if (!userId) {
      const error = 'User ID not found in authentication profile';
      this._error.set(error);
      return throwError(() => new Error(error));
    }

    this._loading.set(true);
    this._error.set(null);

    return this.userDetailsService.updateUser(userId, userDetails).pipe(
      tap(updatedUser => {
        this._userDetails.set(updatedUser);
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        const errorMessage = 'Failed to update user details';
        this._error.set(errorMessage);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create user details from Keycloak profile
   */
  private createUserFromKeycloakProfile(): Observable<UserDetailsDto> {
    const profile = this.authService.profile();
    
    if (!profile) {
      const error = 'No authentication profile found';
      this._error.set(error);
      return throwError(() => new Error(error));
    }

    const email = profile['email'] as string || '';
    const givenName = profile['given_name'] as string || '';
    const familyName = profile['family_name'] as string || '';
    const fullName = [givenName, familyName].filter(Boolean).join(' ') || profile['name'] as string || '';

    const newUserDetails: UserDetailsDto = {
      email: email,
      name: fullName,
      address: ''
    };

    // Note: Since we don't have a create endpoint, we'll use update which should create if not exists
    // This might need to be adjusted based on your backend implementation
    return this.updateUserDetails(newUserDetails);
  }

  /**
   * Get user display name
   */
  public getUserDisplayName(): string {
    const userDetails = this._userDetails();
    if (userDetails?.name) {
      return userDetails.name;
    }

    // Fallback to Keycloak profile
    const profile = this.authService.profile();
    if (profile) {
      const givenName = profile['given_name'] as string || '';
      const familyName = profile['family_name'] as string || '';
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      return fullName || profile['name'] as string || profile['preferred_username'] as string || 'User';
    }

    return 'User';
  }

  /**
   * Get user email
   */
  public getUserEmail(): string {
    const userDetails = this._userDetails();
    if (userDetails?.email) {
      return userDetails.email;
    }

    // Fallback to Keycloak profile
    const profile = this.authService.profile();
    return profile?.['email'] as string || 'No email available';
  }

  /**
   * Clear user details (useful for logout)
   */
  public clearUserDetails(): void {
    this._userDetails.set(null);
    this._loading.set(false);
    this._error.set(null);
  }

  /**
   * List all users (admin functionality)
   */
  public listAllUsers(): Observable<UserDetailsDto[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.userDetailsService.listUsers().pipe(
      tap(() => {
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        const errorMessage = 'Failed to load users list';
        this._error.set(errorMessage);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reset error state
   */
  public clearError(): void {
    this._error.set(null);
  }
}
