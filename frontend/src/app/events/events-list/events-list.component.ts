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
import { ErrorDisplayComponent } from '../../shared/components/error-display';
import { EventService } from '../event.service';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule, OrderByNamePipe, ErrorDisplayComponent],
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss'
})
export class EventsListComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  
  events = signal<ApiEvent[]>([]);
  filteredEvents = signal<ApiEvent[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  shows = signal<ShowOption[]>([]);
  venues = signal<VenueOption[]>([]);
  showInputValue = '';
  venueInputValue = '';
  filteredShows = signal<ShowOption[]>([]);
  filteredVenues = signal<VenueOption[]>([]);

  public today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
  // Filter state as signals
  public search = signal('');
  public selectedShowId = signal<number | null>(null);
  public selectedVenueId = signal<number | null>(null);
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
    this.error.set(null);
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
        this.error.set('Failed to load events. Please try again later.');
      }
    });
  }

  retry(): void {
    this.error.set(null);
    this.loadEvents();
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

  getSeatStatusText(event: ApiEvent): string {
    const totalSeats = event.venueNumberOfSeats ?? 0;
    const reserved = event.numberOfTickets ?? 0;
    return this.eventService.getSeatStatusText(reserved, totalSeats);
  }

  getReservationClass(event: ApiEvent): string {
    const totalSeats = event.venueNumberOfSeats ?? 0;
    const reserved = event.numberOfTickets ?? 0;
    return this.eventService.getReservationClass(reserved, totalSeats);
  }

  /**
   * Returns a color string for the seat status text based on reserved percentage.
   * 0% = red, 50% = yellow, 100% = green (smooth gradient)
   */
  public getSeatStatusColor(event: ApiEvent): string {
    // Use real seat data if available, else fallback to mock
    const reserved = event.numberOfTickets ?? 0;
    const total = event.venueNumberOfSeats ?? 0;
    return this.eventService.getSeatStatusColor(reserved, total);
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
