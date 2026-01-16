import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../shared/services/user.service';
import { UserDetailsDto } from '../../api/model/user-details-dto';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    TranslateModule
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly translate = inject(TranslateService);

  public loading = signal(false);
  public error = signal<string | null>(null);
  public users = signal<UserDetailsDto[]>([]);

  public displayedColumns: string[] = ['email', 'name', 'address', 'actions'];

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.listAllUsers().subscribe({
      next: (users: UserDetailsDto[]) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: any) => {
        this.error.set(this.translate.instant('AUTH.USERS.ERROR_LOAD'));
        this.loading.set(false);
        console.error('Error loading users:', error);
      }
    });
  }

  public onRefresh(): void {
    this.loadUsers();
  }

  public getUserInitials(user: UserDetailsDto): string {
    if (!user.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
    }
    
    return user.name.charAt(0).toUpperCase();
  }

  public clearError(): void {
    this.error.set(null);
  }
}
