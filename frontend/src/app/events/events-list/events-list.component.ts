import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Event as ApiEvent } from '../../api/model/event';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss'
})
export class EventsListComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);
  
  events = signal<ApiEvent[]>([]);
  filteredEvents = signal<ApiEvent[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadEvents();
  }

  private loadEvents() {
    this.isLoading.set(true);
    
    // Try to load from API first, fallback to mock data if it fails
    this.apiService.listEvents().subscribe({
      next: (events: ApiEvent[]) => {
        this.events.set(events ?? []);
        this.filteredEvents.set(events ?? []);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading events from API:', error);
        console.log('API calls are being made to:', this.apiService.configuration?.basePath ?? 'default base path');
        this.isLoading.set(false);
        // Fallback to mock data for development
        this.loadMockData();
      }
    });
  }

  private loadMockData() {
    console.log('Loading mock data as fallback - API calls configured with /api prefix');
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
    this.events.set(mockEvents);
    this.filteredEvents.set(mockEvents);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredEvents.set(
      this.events().filter(evt => 
        (evt.showName?.toLowerCase() || '').includes(filterValue) ||
        (evt.venueName?.toLowerCase() || '').includes(filterValue) ||
        (evt.eventId?.toLowerCase() || '').includes(filterValue)
      )
    );
  }

  filterByShow(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    if (!filterValue) {
      this.filteredEvents.set(this.events());
      return;
    }
    
    this.filteredEvents.set(
      this.events().filter(evt => 
        (evt.showName?.toLowerCase() || '').includes(filterValue)
      )
    );
  }

  filterByVenue(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    if (!filterValue) {
      this.filteredEvents.set(this.events());
      return;
    }
    
    this.filteredEvents.set(
      this.events().filter(evt => 
        (evt.venueName?.toLowerCase() || '').includes(filterValue)
      )
    );
  }

  filterByDate(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    if (!filterValue) {
      this.filteredEvents.set(this.events());
      return;
    }
    
    const filterDate = new Date(filterValue);
    this.filteredEvents.set(
      this.events().filter(evt => {
        if (!evt.dateTime) return false;
        const eventDate = new Date(evt.dateTime);
        return eventDate.toDateString() === filterDate.toDateString();
      })
    );
  }

  resetFilters(): void {
    this.filteredEvents.set(this.events());
  }

  addEvent(): void {
    this.router.navigate(['/events/add']);
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
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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
}
