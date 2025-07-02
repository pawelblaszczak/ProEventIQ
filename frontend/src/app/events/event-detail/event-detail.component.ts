import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Event as ApiEvent } from '../../api/model/event';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { ConfirmationDialogService } from '../../shared';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    RouterModule
  ],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventApi = inject(ProEventIQService);
  private confirmationDialog = inject(ConfirmationDialogService);

  private eventId = signal<string | null>(null);
  public event = signal<ApiEvent | null>(null);
  public loading = signal(true);
  public error = signal<string | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.eventId.set(id);
      if (id) {
        this.loadEvent(id);
      }
    });
  }

  private loadEvent(eventId: string) {
    this.loading.set(true);
    this.error.set(null);

    // Try to load from API first, fallback to mock data if it fails
    this.eventApi.getEventById(eventId).subscribe({
      next: (event: ApiEvent) => {
        this.event.set(event);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading event from API:', error);
        console.log('Falling back to mock data');
        this.loading.set(false);
        this.loadMockEvent(eventId);
      }
    });
  }

  private loadMockEvent(eventId: string) {
    // Mock data fallback
    const mockEvents: ApiEvent[] = [
      {
        eventId: '1',
        showId: '1',
        venueId: '1',
        showName: 'Hamlet - The Classic Drama',
        venueName: 'Metropolitan Opera House',
        dateTime: '2025-07-15T19:30:00.000Z'
      },
      {
        eventId: '2',
        showId: '2',
        venueId: '2',
        showName: 'Swan Lake Ballet',
        venueName: 'Royal Albert Hall',
        dateTime: '2025-07-22T20:00:00.000Z'
      },
      {
        eventId: '3',
        showId: '3',
        venueId: '3',
        showName: 'La Bohème Opera',
        venueName: 'Sydney Opera House',
        dateTime: '2025-08-05T19:00:00.000Z'
      },
      {
        eventId: '4',
        showId: '1',
        venueId: '2',
        showName: 'Hamlet - The Classic Drama',
        venueName: 'Royal Albert Hall',
        dateTime: '2025-08-12T19:30:00.000Z'
      },
      {
        eventId: '5',
        showId: '4',
        venueId: '1',
        showName: 'The Nutcracker',
        venueName: 'Metropolitan Opera House',
        dateTime: '2025-12-15T15:00:00.000Z'
      }
    ];

    const foundEvent = mockEvents.find(e => e.eventId === eventId);
    if (foundEvent) {
      this.event.set(foundEvent);
    } else {
      this.error.set('Event not found');
    }
  }

  formatDateTime(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEventStatus(): string {
    const event = this.event();
    if (!event?.dateTime) return 'Unknown';
    
    const eventDate = new Date(event.dateTime);
    const now = new Date();
    
    if (eventDate > now) {
      return 'Upcoming';
    } else if (eventDate.toDateString() === now.toDateString()) {
      return 'Today';
    } else {
      return 'Past';
    }
  }

  getStatusColor(): string {
    const status = this.getEventStatus();
    switch (status) {
      case 'Today': return 'accent';
      case 'Upcoming': return 'primary';
      case 'Past': return 'warn';
      default: return '';
    }
  }

  onDelete(): void {
    const event = this.event();
    if (!event) return;

    this.confirmationDialog.confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.showName}" at ${event.venueName}? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'warn',
      icon: 'delete_forever'
    }).subscribe(confirmed => {
      if (confirmed && event.eventId) {
        this.deleteEvent(event.eventId);
      }
    });
  }

  private deleteEvent(eventId: string): void {
    this.loading.set(true);
    
    this.eventApi.deleteEvent(eventId).subscribe({
      next: () => {
        this.router.navigate(['/events']);
      },
      error: (error: any) => {
        console.error('Error deleting event:', error);
        this.error.set('Failed to delete event. Please try again.');
        this.loading.set(false);
      }
    });
  }

  navigateToShow(): void {
    const showId = this.event()?.showId;
    if (showId) {
      this.router.navigate(['/shows', showId]);
    }
  }

  navigateToVenue(): void {
    const venueId = this.event()?.venueId;
    if (venueId) {
      this.router.navigate(['/venues', venueId]);
    }
  }
}
