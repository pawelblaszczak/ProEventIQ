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
import { Reservation } from '../../api/model/reservation';
import { ReservationInput } from '../../api/model/reservation-input';
import { Participant } from '../../api/model/participant';

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
  
  // Reservation management
  reservations = signal<Reservation[]>([]);
  participants = signal<Participant[]>([]);
  reservationLoading = signal(false);
  reservationError = signal<string | null>(null);
  
  // Batch reservation updates
  pendingReservationUpdates = signal<ReservationInput[]>([]);

  ngOnInit(): void {
    // Support two URL shapes:
    // - /venues/:venueId/reservations?eventId=123  (legacy/current)
    // - /events/:eventId/reservations               (preferred)
    this.route.paramMap.subscribe(pm => {
      const eventParam = pm.get('eventId');
      if (eventParam) {
        const eventId = Number(eventParam);
        if (!isNaN(eventId)) {
          // When eventId is in the route we fetch the event and derive venue
          this.fetchEvent(eventId);
          return;
        }
      }

      // If no eventId route param, fallback to venueId route param
      const idParam = pm.get('venueId');
      const id = idParam ? Number(idParam) : null;
      if (id && !isNaN(id)) {
        this.fetchVenue(id);
      } else {
        // Defer error until we also check query params below
        // this.error.set('Invalid venue id');
        // this.loading.set(false);
      }
    });

    // Read eventId from query params for header context (legacy support)
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
        // Load participants first, then reservations
        this.loadParticipants(eventId).then(() => {
          this.loadReservations(eventId);
        });
        // If we don't yet have the venue loaded, try to fetch it from event.venueId
        if (!this.venue() && ev?.venueId) {
          this.fetchVenue(ev.venueId);
        }
      },
      error: err => {
        console.error('Failed to load event', err);
        this.eventError.set('Failed to load event');
        this.eventLoading.set(false);
      }
    });
  }

  private loadReservations(eventId: number) {
    this.reservationLoading.set(true);
    this.reservationError.set(null);
    
    this.api.getReservation(eventId).subscribe({
      next: reservations => {
        this.reservations.set(reservations || []);
        this.reservationLoading.set(false);
        console.log('Loaded reservations:', reservations?.length || 0, reservations);
      },
      error: err => {
        console.error('Failed to load reservations', err);
        this.reservationError.set('Failed to load reservations');
        this.reservationLoading.set(false);
      }
    });
  }

  private loadParticipants(eventId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.eventsEventIdParticipantsGet(eventId).subscribe({
        next: participants => {
          this.participants.set(participants || []);
          console.log('Loaded participants:', participants?.length || 0);
          resolve();
        },
        error: err => {
          console.error('Failed to load participants', err);
          // Don't set error here as it's not critical for reservation functionality
          resolve(); // Still resolve to continue with reservations
        }
      });
    });
  }

  updateReservation(eventId: number, participantId: number, seatId: number, oldParticipantId?: number, id?: number) {
    const reservationInput: ReservationInput = {
      id,
      // participantId may be undefined for unassignment
      participantId: (typeof participantId === 'number' ? participantId : undefined),
      seatId,
      eventId,
      oldParticipantId
    };

    // Add to pending updates instead of making immediate API call
    const currentUpdates = this.pendingReservationUpdates();
    
    // Remove any existing update for the same seat to avoid duplicates
  const filteredUpdates = currentUpdates.filter(update => update.seatId !== seatId);
    
    // Add the new update
    this.pendingReservationUpdates.set([...filteredUpdates, reservationInput]);
    
    console.log('Added reservation update to batch:', reservationInput);
    console.log('Total pending updates:', this.pendingReservationUpdates().length);
  }

  saveAllReservationUpdates(eventId: number) {
    const updates = this.pendingReservationUpdates();
    
    if (updates.length === 0) {
      console.log('No pending reservation updates to save');
      return;
    }

    this.reservationLoading.set(true);
    this.reservationError.set(null);

    console.log('Saving batch of reservation updates:', updates);

    this.api.updateReservation(eventId, updates).subscribe({
      next: reservation => {
        console.log('Batch reservation updates saved successfully', reservation);
        // Clear pending updates
        this.pendingReservationUpdates.set([]);
        // The API returns the updated reservations already from the PUT call.
        // Use the returned data instead of making a redundant GET request.
        try {
          if (Array.isArray(reservation)) {
            this.reservations.set(reservation || []);
          } else if (reservation && (reservation as any).reservations && Array.isArray((reservation as any).reservations)) {
            this.reservations.set((reservation as any).reservations);
          } else {
            // Fallback: wrap single item or clear
            this.reservations.set(reservation ? [reservation as any] : []);
          }
        } finally {
          this.reservationLoading.set(false);
        }
      },
      error: err => {
        console.error('Failed to save batch reservation updates', err);
        this.reservationError.set('Failed to save reservation updates');
        this.reservationLoading.set(false);
      }
    });
  }

  clearPendingUpdates() {
    this.pendingReservationUpdates.set([]);
    console.log('Cleared all pending reservation updates');
  }

  onReservationChange(event: {
    id?: number;
    eventId: number;
    participantId?: number;
    seatId: number;
    oldParticipantId?: number;
  }) {
    console.log('Reservation change event:', event);
    
    // Handle unassignment (seatId = 0)
    // If participantId is absent, treat as unassignment for the given seat
    if (event.participantId === undefined) {
      // Optimistically update local reservations to reflect the unassignment
      const current = this.reservations();
      const idx = current.findIndex(r => r.seatId === event.seatId);
      if (idx !== -1) {
        const updated = [...current];
        // Remove the reservation locally (visual unassign)
        updated.splice(idx, 1);
        this.reservations.set(updated);
        console.log('Optimistically removed reservation for seat', event.seatId);
      }

      // Still add to pending updates to be saved later
      this.updateReservation(
        event.eventId,
        // pass undefined to signal unassignment
        undefined as unknown as number,
        event.seatId,
        event.oldParticipantId,
        event.id
      );
      return;
    }

    // Handle assignment/reassignment - add to batch
    // Optimistically update local reservations to reflect the assignment/reassignment
    const curr = this.reservations();
    const existingIndex = curr.findIndex(r => r.seatId === event.seatId);
    const newReservation: Reservation = {
      id: event.id,
      eventId: event.eventId,
      participantId: event.participantId,
      seatId: event.seatId
    };

    if (existingIndex !== -1) {
      const updatedArr = [...curr];
      // Update existing reservation entry
      updatedArr[existingIndex] = { ...updatedArr[existingIndex], ...newReservation };
      this.reservations.set(updatedArr);
      console.log('Optimistically updated reservation for seat', event.seatId, '-> participant', event.participantId);
    } else {
      // Add new reservation locally
      this.reservations.set([...(curr || []), newReservation]);
      console.log('Optimistically added reservation for seat', event.seatId, '-> participant', event.participantId);
    }

    // Still add to pending updates to be saved later
    this.updateReservation(
      event.eventId,
      event.participantId as number,
      event.seatId,
      event.oldParticipantId,
      event.id
    );
  }

  // Handler for cancellation emitted by child component
  onReservationCancel() {
    console.log('Reservation cancel requested by child component');
    // Clear pending updates and reload reservations from server for the current event
    this.clearPendingUpdates();
    const ev = this.event();
    if (ev && ev.eventId) {
      this.loadReservations(ev.eventId);
    }
  }

  // Handler for save emitted by child component
  onReservationSave() {
    console.log('Reservation save requested by child component');
    const ev = this.event();
    if (ev && ev.eventId) {
      this.saveAllReservationUpdates(ev.eventId);
    }
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
