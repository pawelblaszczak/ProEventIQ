import { Component, ChangeDetectionStrategy, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VenueMapEditComponent } from '../../venues/venue-map-edit/venue-map-edit.component';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Venue } from '../../api/model/venue';
import { Event } from '../../api/model/event';
import { Reservation } from '../../api/model/reservation';
import { Participant } from '../../api/model/participant';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-print-map',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    VenueMapEditComponent,
    TranslateModule
  ],
  templateUrl: './print-map.component.html',
  styleUrls: ['./print-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintMapComponent implements OnInit {
  @ViewChild(VenueMapEditComponent) mapComponent?: VenueMapEditComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProEventIQService);
  private readonly translate = inject(TranslateService);

  venue = signal<Venue | null>(null);
  event = signal<Event | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  reservations = signal<Reservation[]>([]);
  participants = signal<Participant[]>([]);

  get printDate(): string {
    const now = new Date();
    const d = now.toLocaleDateString(this.translate?.currentLang || 'en', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const t = now.toLocaleTimeString(this.translate?.currentLang || 'en', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    return `${d}, ${t}`;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const eventParam = pm.get('eventId');
      if (eventParam) {
        const eventId = Number(eventParam);
        if (!isNaN(eventId)) {
          this.fetchEvent(eventId);
        } else {
          this.error.set('Invalid event ID');
          this.loading.set(false);
        }
      } else {
        this.error.set('No event ID specified');
        this.loading.set(false);
      }
    });
  }

  private fetchEvent(eventId: number) {
    this.api.getEventById(eventId).subscribe({
      next: ev => {
        this.event.set(ev);
        this.loadParticipants(eventId).then(() => {
          this.loadReservations(eventId);
        });
        if (ev?.venueId) {
          this.fetchVenue(ev.venueId);
        }
      },
      error: err => {
        console.error('Failed to load event', err);
        this.error.set(this.translate.instant('EVENTS.RESERVATION.ERROR_LOAD_EVENT'));
        this.loading.set(false);
      }
    });
  }

  private fetchVenue(id: number) {
    this.api.getVenue(id).subscribe({
      next: v => {
        this.venue.set(v);
        this.loading.set(false);
      },
      error: err => {
        console.error('Failed to load venue', err);
        this.error.set(this.translate.instant('EVENTS.RESERVATION.ERROR_LOAD_VENUE'));
        this.loading.set(false);
      }
    });
  }

  private loadReservations(eventId: number) {
    forkJoin({
      reservations: this.api.getReservation(eventId),
      seatBlocks: this.api.getSeatBlock(eventId)
    }).subscribe({
      next: ({ reservations, seatBlocks }) => {
        const blockedReservations: Reservation[] = (seatBlocks || []).map(sb => ({
          id: sb.id,
          eventId: sb.eventId,
          seatId: sb.seatId,
          participantId: -1
        }));
        this.reservations.set([...(reservations || []), ...blockedReservations]);
      },
      error: err => {
        console.error('Failed to load reservations', err);
        this.error.set(this.translate.instant('EVENTS.RESERVATION.ERROR_LOAD_RESERVATIONS'));
      }
    });
  }

  private loadParticipants(eventId: number): Promise<void> {
    return new Promise((resolve) => {
      this.api.eventsEventIdParticipantsGet(eventId).subscribe({
        next: participants => {
          this.participants.set(participants || []);
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  goBack(): void {
    const ev = this.event();
    if (ev?.eventId) {
      this.router.navigate(['/events', ev.eventId]);
    } else {
      this.router.navigate(['/events']);
    }
  }

  onPrint(): void {
    window.print();
  }

  formatDateTime(dateTime: string | undefined): string {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const locale = this.translate?.currentLang || 'en';
    const dateStr = date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${dateStr}, ${timeStr}`;
  }
}
