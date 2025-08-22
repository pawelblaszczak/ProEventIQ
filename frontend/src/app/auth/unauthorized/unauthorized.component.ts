import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { KeycloakAuthService } from '../keycloak/keycloak.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnauthorizedComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(KeycloakAuthService);

  ngOnInit() {
    // Check if user is already authenticated (e.g., after login redirect)
    if (this.auth.isAuthenticated()) {
      const from = this.route.snapshot.queryParamMap.get('from') || '/';
      this.router.navigateByUrl(from);
    }
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  async retry() {
    // Refresh authentication state before retrying
    await this.auth.refreshAuthenticationState();
    
    if (this.auth.isAuthenticated()) {
      const from = this.route.snapshot.queryParamMap.get('from') || '/';
      this.router.navigateByUrl(from);
    } else {
      // User is still not authenticated, redirect to login
      const from = this.route.snapshot.queryParamMap.get('from') || '/';
      await this.auth.login(`${window.location.origin}${from}`);
    }
  }
}
