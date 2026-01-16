import { Component, signal, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from './material.module';
import { Subscription } from 'rxjs';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions } from '@angular/material/tooltip';
import { KeycloakAuthService } from './auth/keycloak/keycloak.service';
import { UserService } from './shared/services/user.service';

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
  imports: [CommonModule, RouterModule, MaterialModule, TranslateModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  providers: [
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myTooltipDefaults }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(KeycloakAuthService);
  private readonly userService = inject(UserService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private langChangeSubscription?: Subscription;
  
  isExpanded = signal<boolean>(true);
  currentLanguage = signal<string>('en');

  constructor() {
    // Effect will automatically sync when translate service changes
    // This handles initial setup and any programmatic language changes
  }
  
  toggleSideNav(): void {
    this.isExpanded.update(value => !value);
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('app-language', lang);
    this.cdr.markForCheck();
  }

  authenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  displayName(): string {
    // Prefer application user details full name when available
    const ud = this.userService.userDetails();
    if (ud?.name) {
      return ud.name;
    }

    // If no full name, prefer email in the toolbar (matches UI expectation)
    const p = this.auth.profile();
    if (!p) return '';

    if (p['email']) {
      return p['email'] as string;
    }

    const fullName = [p['given_name'], p['family_name']].filter(Boolean).join(' ');
    return (p['name'] as string) || fullName || (p['preferred_username'] as string) || 'User';
  }

  login(): void {
    this.auth.login();
  }

  logout(): void {
    this.auth.logout();
  }

  navigateToMyAccount(): void {
    this.router.navigate(['/my-account']);
  }

  ngOnInit(): void {
    // Set initial language signal
    const savedLang = localStorage.getItem('app-language');
    const currentLang = savedLang || 'en';
    this.currentLanguage.set(currentLang);
    
    // Subscribe to language changes to keep signal in sync and trigger change detection
    this.langChangeSubscription = this.translate.onLangChange.subscribe((event) => {
      this.currentLanguage.set(event.lang);
      this.cdr.markForCheck();
    });
    
    // Ensure we have application user details loaded so toolbar can show full name
    if (this.auth.isAuthenticated() && !this.userService.hasUserDetails()) {
      // Subscribe once to trigger loading; errors handled in service
      this.userService.loadCurrentUserDetails().subscribe({ 
        next: () => this.cdr.markForCheck(), 
        error: () => {} 
      });
    }
    
    // Initial change detection
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
  }
}