import { Component, signal, effect, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Venue } from '../../api/model/venue';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ErrorDisplayComponent } from '../../shared/components/error-display';

@Component({
  selector: 'app-venues-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule, ErrorDisplayComponent, TranslateModule],
  templateUrl: './venues-list.component.html',
  styleUrl: './venues-list.component.scss'
})
export class VenuesListComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);

  venues = signal<Venue[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  page = signal(1); // 1-based
  pageSize = signal(10); // Default page size
  totalItems = signal(0);

  // Filter signals
  search = signal('');
  country = signal('');
  city = signal('');
  minSeats = signal<number | null>(null);

  // Debounce subjects for filters
  private readonly searchSubject = new Subject<string>();
  private readonly countrySubject = new Subject<string>();
  private readonly citySubject = new Subject<string>();
  private readonly minSeatsSubject = new Subject<number | null>();

  // Effect to watch for filter or pagination changes
  private readonly filterEffect = effect(() => {
    const _search = this.search();
    const _country = this.country();
    const _city = this.city();
    const _minSeats = this.minSeats();
    const _page = this.page();
    const _size = this.pageSize();
    queueMicrotask(() => this.loadVenues(_page, _size));
  });

  constructor() {
    // Effect is automatically tracked by Angular when declared as readonly
  }

  ngOnInit() {
    // Debounce search
    this.searchSubject.pipe(debounceTime(400)).subscribe((value) => {
      this.search.set(value);
      this.page.set(1);
    });
    // Debounce country
    this.countrySubject.pipe(debounceTime(400)).subscribe((value) => {
      this.country.set(value);
      this.page.set(1);
    });
    // Debounce city
    this.citySubject.pipe(debounceTime(400)).subscribe((value) => {
      this.city.set(value);
      this.page.set(1);
    });
    // Debounce minSeats
    this.minSeatsSubject.pipe(debounceTime(400)).subscribe((value) => {
      this.minSeats.set(value);
      this.page.set(1);
    });
  }

  ngOnDestroy() {
    this.searchSubject.complete();
    this.countrySubject.complete();
    this.citySubject.complete();
    this.minSeatsSubject.complete();
  }

  private loadVenues(page: number = this.page(), size: number = this.pageSize()): void {
    this.isLoading.set(true);
    this.error.set(null);
    const search = this.search();
    const country = this.country();
    const city = this.city();
    const minSeats = this.minSeats();
    this.apiService.listVenues(
      search,
      country,
      city,
      page,
      size,
      minSeats != null ? String(minSeats) : undefined
    ).subscribe({
      next: (response: any) => {
        const venues = response?.items ?? response?.content ?? response ?? [];
        const total = response?.totalItems ?? response?.total ?? response?.totalElements ?? venues.length;
        this.venues.set(venues);
        this.totalItems.set(total);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading venues from API:', error);
        this.isLoading.set(false);
        this.error.set('Failed to load venues. Please try again later.');
      }
    });
  }

  // Filter input handlers
  applyFilter(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  filterByCountry(event: Event): void {
    this.countrySubject.next((event.target as HTMLInputElement).value);
  }

  filterByCity(event: Event): void {
    this.citySubject.next((event.target as HTMLInputElement).value);
  }

  filterByMinSeats(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.minSeatsSubject.next(val ? parseInt(val, 10) : null);
  }

  resetFilters(): void {
    this.search.set('');
    this.country.set('');
    this.city.set('');
    this.minSeats.set(null);
    this.page.set(1);
  }

  retry(): void {
    this.error.set(null);
    this.loadVenues();
  }

  onMatPage(event: any): void {
    if (event.pageSize !== this.pageSize()) {
      this.pageSize.set(event.pageSize);
      this.page.set(1);
    } else if ((event.pageIndex + 1) !== this.page()) {
      this.page.set(event.pageIndex + 1);
    }
  }

  addVenue(): void {
    this.router.navigate(['/venues/add']);
  }
}