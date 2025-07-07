import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { Venue } from '../../api/model/venue';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { ConfirmationDialogService } from '../../shared';
import { VenueMapEditComponent } from '../venue-map-edit/venue-map-edit.component';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatListModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    RouterModule,
    VenueMapEditComponent
  ],
  templateUrl: './venue-detail.component.html',
  styleUrls: ['./venue-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly venueApi = inject(ProEventIQService);
  private readonly confirmationDialog = inject(ConfirmationDialogService);

  private readonly venueId = signal<string | null>(null);
  public venue = signal<Venue | null>(null);
  public loading = signal(true);
  public error = signal<string | null>(null);

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.venueId.set(id);
      if (id) {
        this.fetchVenue(id);
      }
    });
  }

  private fetchVenue(id: string) {
    this.loading.set(true);
    this.venueApi.getVenue(id).subscribe({
      next: (venue: Venue) => {
        this.venue.set(venue);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load venue.');
        this.loading.set(false);
        console.error('Error loading venue data:', err);
      }
    });
  }

  /**
   * Returns the full address string, combining address, city, and country, skipping missing parts.
   */
  getFullAddress(): string {
    const venue = this.venue();
    if (!venue) return 'Not provided';
    const parts = [venue.address, venue.city, venue.country].filter(part => !!part);
    return parts.length ? parts.join(', ') : 'Not provided';
  }

  onDelete(): void {
    const venueId = this.venueId();
    const venue = this.venue();
    if (!venueId || !venue) return;

    this.confirmationDialog.confirmDelete(venue.name ?? 'this venue', 'venue')
      .subscribe(confirmed => {
        if (confirmed) {
          this.loading.set(true);
          this.venueApi.deleteVenue(venueId).subscribe({
            next: () => {
              console.log('Venue deleted successfully!');
              this.router.navigate(['/venues']);
            },
            error: err => {
              console.error('Error deleting venue:', err);
              let errorMessage = 'Failed to delete venue.';
              if (err?.error?.message) {
                errorMessage += ' ' + err.error.message;
              } else if (typeof err?.error === 'string') {
                errorMessage += ' ' + err.error;
              }
              this.error.set(errorMessage);
              this.loading.set(false);
            }
          });
        }
      });
  }
}
