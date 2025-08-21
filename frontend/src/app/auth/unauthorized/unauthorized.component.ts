import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnauthorizedComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  goHome() {
    this.router.navigate(['/home']);
  }

  retry() {
    const from = this.route.snapshot.queryParamMap.get('from') || '/';
    this.router.navigateByUrl(from);
  }
}
