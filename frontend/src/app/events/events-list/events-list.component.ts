import { Component, signal, inject, OnInit, effect } from '@angular/core';
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
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';

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
  // Filter state as signals
  public search = signal('');
  public selectedShowId = signal<string | null>(null);
  public selectedVenueId = signal<string | null>(null);
  public dateFrom = signal<string>(this.today);
  public dateTo = signal<string>('');

  // Pagination state
  public page = signal(1); // 1-based
  public pageSize = signal(10); // Set default page size to match backend
  public totalItems = signal(0);

  // Debounce subject for search
  private readonly searchSubject = new Subject<string>();
  // Debounce subjects for date filters
  private readonly dateFromSubject = new Subject<string>();
  private readonly dateToSubject = new Subject<string>();

  // Effect for all filters and pagination (must be a field, not in ngOnInit)
  private readonly filterEffect = effect(() => {
    // Only trigger loadEvents when any filter or pagination changes
    const _search = this.search();
    const _show = this.selectedShowId();
    const _venue = this.selectedVenueId();
    const _from = this.dateFrom();
    const _to = this.dateTo();
    const _page = this.page();
    const _size = this.pageSize();
    queueMicrotask(() => this.loadEvents(_page, _size));
  });

  ngOnInit() {
    this.loadShows();
    this.loadVenues();
    this.filteredShows.set([]);
    this.filteredVenues.set([]);
    // Debounce search
    this.searchSubject.pipe(debounceTime(400)).subscribe((value) => {
      this.search.set(value);
      this.page.set(1);
    });
    // Debounce dateFrom
    this.dateFromSubject.pipe(debounceTime(400)).subscribe((value) => {
      this.dateFrom.set(value);
      this.page.set(1);
    });
    // Debounce dateTo
    this.dateToSubject.pipe(debounceTime(400)).subscribe((value) => {
      this.dateTo.set(value);
      this.page.set(1);
    });
  }

  private loadEvents(page: number = this.page(), size: number = this.pageSize()): void {
    this.isLoading.set(true);
    // Use filter values for API call
    const showId = this.selectedShowId();
    const venueId = this.selectedVenueId();
    // Format dateFrom and dateTo as ISO 8601 with time and Z
    const dateFromRaw = this.dateFrom();
    const dateToRaw = this.dateTo();
    const dateFrom = dateFromRaw ? new Date(dateFromRaw + 'T00:00:00.000Z').toISOString() : undefined;
    const dateTo = dateToRaw ? new Date(dateToRaw + 'T23:59:59.999Z').toISOString() : undefined;
    const search = this.search();
    this.apiService.listEvents(
      showId ?? undefined,
      dateFrom ?? undefined,
      dateTo ?? undefined,
      venueId ?? undefined,
      page,
      size,
      search ?? undefined
    ).subscribe({
      next: (response: any) => {
        const events = response?.items ?? response?.content ?? [];
        const total = response?.totalItems ?? response?.total ?? response?.totalElements ?? events.length;
        this.events.set(events);
        this.filteredEvents.set(events);
        this.totalItems.set(total);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading events from API:', error);
        this.isLoading.set(false);
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

  // --- FILTER HANDLERS ---
  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
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
    const value = event.option?.value ?? '';
    this.selectedShowId.set(value ?? null);
    this.showInputValue = value ? this.shows().find(s => s.showId === value)?.name ?? '' : '';
    this.page.set(1);
    // Removed direct this.loadEvents() call; effect will handle API request
  }

  filterByVenue(event: any): void {
    const value = event.option?.value ?? '';
    this.selectedVenueId.set(value ?? null);
    this.venueInputValue = value ? this.venues().find(v => v.venueId === value)?.name ?? '' : '';
    this.page.set(1);
    // Removed direct this.loadEvents() call; effect will handle API request
  }

  filterByDateFrom(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dateFromSubject.next(value);
  }

  filterByDateTo(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dateToSubject.next(value);
  }

  resetFilters(): void {
    this.search.set('');
    this.selectedShowId.set(null);
    this.selectedVenueId.set(null);
    this.dateFrom.set(this.today);
    this.dateTo.set('');
    this.page.set(1);
    this.loadEvents();
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

  getSeatStatusText(event: ApiEvent): string {
    const totalSeats = event.venueNumberOfSeats ?? this.getReservedSeats(event.eventId ?? '').total;
    const reserved = event.numberOfTickets ?? 0;
    let percentage = totalSeats > 0 ? Math.floor((reserved / totalSeats) * 100) : 0;
    // Only show 100% if reserved exactly equals total and total > 0
    if (totalSeats > 0 && reserved === totalSeats) {
      percentage = 100;
    } else if (percentage === 100) {
      percentage = 99;
    }
    return `${reserved}/${totalSeats} (${percentage}%)`;
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

  /**
   * Returns a color string for the seat status text based on reserved percentage.
   * 0% = red, 50% = yellow, 100% = green (smooth gradient)
   */
  public getSeatStatusColor(event: ApiEvent): string {
    // Use real seat data if available, else fallback to mock
    let reserved = event.numberOfTickets ?? 0;
    let total = event.venueNumberOfSeats ?? this.getReservedSeats(event.eventId ?? '').total;
    let percentage = total > 0 ? reserved / total : 0;
    // Clamp between 0 and 1
    percentage = Math.max(0, Math.min(1, percentage));
    // Interpolate hue: 0 (red) -> 60 (yellow) -> 120 (green)
    // 0%: h=0, 50%: h=60, 100%: h=120
    let hue: number;
    if (percentage <= 0.5) {
      // Red to yellow
      hue = 0 + (percentage / 0.5) * 60;
    } else {
      // Yellow to green
      hue = 60 + ((percentage - 0.5) / 0.5) * 60;
    }
    return `hsl(${hue}, 90%, 40%)`;
  }

  // Call this when user changes page
  onPageChange(newPage: number): void {
    this.page.set(newPage);
    // Removed direct this.loadEvents() call; effect will handle API request
  }

  // Call this when user changes page size
  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.page.set(1); // Reset to first page
    // Removed direct this.loadEvents() call; effect will handle API request
  }

  // Handler for Angular Material paginator
  onMatPage(event: any): void {
    if (event.pageSize !== this.pageSize()) {
      this.onPageSizeChange(event.pageSize);
    } else if ((event.pageIndex + 1) !== this.page()) {
      this.onPageChange(event.pageIndex + 1);
    }
  }

  addEvent(): void {
    this.router.navigate(['/events/add']);
  }
}
