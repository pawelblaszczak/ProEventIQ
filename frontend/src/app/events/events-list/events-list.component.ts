import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Event as ApiEvent } from '../../api/model/event';
import { ShowOption } from '../../api/model/show-option';
import { VenueOption } from '../../api/model/venue-option';
import { OrderByNamePipe } from '../../shared/order-by-name.pipe';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule, OrderByNamePipe],
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss'
})
export class EventsListComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);
  
  events = signal<ApiEvent[]>([]);
  filteredEvents = signal<ApiEvent[]>([]);
  isLoading = signal(false);
  shows = signal<ShowOption[]>([]);
  venues = signal<VenueOption[]>([]);
  showInputValue = '';
  venueInputValue = '';
  filteredShows = signal<ShowOption[]>([]);
  filteredVenues = signal<VenueOption[]>([]);

  public today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
  private dateFrom: string = this.today;
  private dateTo: string = '';

  // Pagination state
  public page = signal(1); // 1-based
  public pageSize = signal(10); // Set default page size to match backend
  public totalItems = signal(0);

  ngOnInit() {
    this.loadEvents();
    this.loadShows();
    this.loadVenues();
    this.filteredShows.set([]);
    this.filteredVenues.set([]);
  }

  private loadEvents(page: number = this.page(), size: number = this.pageSize()): void {
    this.isLoading.set(true);
    // Try to load from API first, fallback to mock data if it fails
    this.apiService.listEvents(undefined, undefined, undefined, undefined, page, size).subscribe({
      next: (response: any) => {
        // Expecting paginated response: { items: ApiEvent[], totalItems: number, ... }
        const events = response?.items ?? response?.content ?? [];
        const total = response?.totalItems ?? response?.total ?? response?.totalElements ?? events.length;
        this.events.set(events);
        this.filteredEvents.set(events);
        this.totalItems.set(total);
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

  private loadShows() {
    this.apiService.listShowOptions().subscribe({
      next: (shows) => {
        this.shows.set(shows);
        this.filteredShows.set(shows);
      },
      error: () => {
        this.shows.set([]);
        this.filteredShows.set([]);
      }
    });
  }

  private loadVenues() {
    this.apiService.listVenueOptions().subscribe({
      next: (venues) => {
        this.venues.set(venues);
        this.filteredVenues.set(venues);
      },
      error: () => {
        this.venues.set([]);
        this.filteredVenues.set([]);
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredEvents.set(
      this.events().filter(evt => 
        (evt.showName?.toLowerCase() ?? '').includes(filterValue) ||
        (evt.venueName?.toLowerCase() ?? '').includes(filterValue) ||
        (evt.eventId?.toLowerCase() ?? '').includes(filterValue)
      )
    );
  }

  filterShowInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.showInputValue = value;
    this.filteredShows.set(
      this.shows().filter(show => show.name.toLowerCase().includes(value))
    );
  }

  filterVenueInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.venueInputValue = value;
    this.filteredVenues.set(
      this.venues().filter(venue => venue.name.toLowerCase().includes(value))
    );
  }

  filterByShow(event: any): void {
    const value = event.option?.value || '';
    this.showInputValue = value ? this.shows().find(s => s.showId === value)?.name || '' : '';
    if (!value) {
      this.filteredEvents.set(this.events());
      return;
    }
    this.filteredEvents.set(
      this.events().filter(evt => evt.showId === value)
    );
  }

  filterByVenue(event: any): void {
    const value = event.option?.value || '';
    this.venueInputValue = value ? this.venues().find(v => v.venueId === value)?.name || '' : '';
    if (!value) {
      this.filteredEvents.set(this.events());
      return;
    }
    this.filteredEvents.set(
      this.events().filter(evt => evt.venueId === value)
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

  filterByDateFrom(event: Event): void {
    this.dateFrom = (event.target as HTMLInputElement).value;
    this.applyDateRangeFilter();
  }

  filterByDateTo(event: Event): void {
    this.dateTo = (event.target as HTMLInputElement).value;
    this.applyDateRangeFilter();
  }

  private applyDateRangeFilter(): void {
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;
    this.filteredEvents.set(
      this.events().filter(evt => {
        if (!evt.dateTime) return false;
        const eventDate = new Date(evt.dateTime);
        if (from && eventDate < from) return false;
        if (to && eventDate > to) return false;
        return true;
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

  formatDateOnly(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  formatYear(dateTime: string | undefined): string {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.getFullYear().toString();
  }

  formatTime(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Mock seat reservation data - replace with real API data later
  getReservedSeats(eventId: string): { reserved: number; total: number; percentage: number } {
    // Generate consistent but random-looking data based on eventId
    const seed = eventId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const total = 150 + (seed % 350); // Total seats between 150-500
    const reserved = Math.floor(total * (0.3 + (seed % 40) / 100)); // 30-70% reserved
    const percentage = Math.round((reserved / total) * 100);
    
    return { reserved, total, percentage };
  }

  getSeatStatusText(eventId: string): string {
    const seatInfo = this.getReservedSeats(eventId);
    return `${seatInfo.reserved}/${seatInfo.total} (${seatInfo.percentage}%)`;
  }

  getReservationClass(eventId: string): string {
    const seatInfo = this.getReservedSeats(eventId);
    const percentage = seatInfo.percentage;
    
    if (percentage <= 35) {
      return 'low-reservation';
    } else if (percentage <= 65) {
      return 'medium-reservation';
    } else {
      return 'high-reservation';
    }
  }

  // Call this when user changes page
  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadEvents(newPage, this.pageSize());
  }

  // Call this when user changes page size
  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.page.set(1); // Reset to first page
    this.loadEvents(1, newSize);
  }

  // Handler for Angular Material paginator
  onMatPage(event: any): void {
    if (event.pageSize !== this.pageSize()) {
      this.onPageSizeChange(event.pageSize);
    } else if ((event.pageIndex + 1) !== this.page()) {
      this.onPageChange(event.pageIndex + 1);
    }
  }
}
