import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VenueMapEditComponent } from '../../venues/venue-map-edit/venue-map-edit.component';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Venue } from '../../api/model/venue';
import { Event } from '../../api/model/event';

@Component({
  selector: 'app-venue-reservation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    VenueMapEditComponent
  ],
  templateUrl: './venue-reservation.component.html',
  styleUrls: ['./venue-reservation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VenueReservationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProEventIQService);

  venue = signal<Venue | null>(null);
  event = signal<Event | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  eventLoading = signal(false);
  eventError = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const idParam = pm.get('venueId');
      const id = idParam ? Number(idParam) : null;
      if (id && !isNaN(id)) {
        this.fetchVenue(id);
      } else {
        this.error.set('Invalid venue id');
        this.loading.set(false);
      }
    });

    // Read eventId from query params for header context
    this.route.queryParamMap.subscribe(qp => {
      const eventIdParam = qp.get('eventId');
      if (eventIdParam) {
        const eventId = Number(eventIdParam);
        if (!isNaN(eventId)) {
          this.fetchEvent(eventId);
        }
      }
    });
  }

  private fetchVenue(id: number) {
    this.loading.set(true);
    this.api.getVenue(id).subscribe({
      next: v => {
        this.venue.set(v);
        this.loading.set(false);
      },
      error: err => {
        console.error('Failed to load venue', err);
        this.error.set('Failed to load venue');
        this.loading.set(false);
      }
    });
  }

  private fetchEvent(eventId: number) {
    this.eventLoading.set(true);
    this.api.getEventById(eventId).subscribe({
      next: ev => {
        this.event.set(ev);
        this.eventLoading.set(false);
      },
      error: err => {
        console.error('Failed to load event', err);
        this.eventError.set('Failed to load event');
        this.eventLoading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
