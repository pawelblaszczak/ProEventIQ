import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Show } from '../../api/model/show';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ErrorDisplayComponent } from '../../shared/components/error-display';

@Component({
  selector: 'app-shows-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule, ErrorDisplayComponent],
  templateUrl: './shows-list.component.html',
  styleUrl: './shows-list.component.scss'
})
export class ShowsListComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);
  
  shows = signal<Show[]>([]);
  filteredShows = signal<Show[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Filter state
  public search = signal('');
  public ageFrom = signal<number | null>(null); // was 'age'
  public ageTo = signal<number | null>(null);   // was 'minAge'

  // Pagination state
  public page = signal(1); // 1-based
  public pageSize = signal(10); // Default page size
  public totalItems = signal(0);

  // Debounce subjects
  private readonly searchSubject = new Subject<string>();
  private readonly ageFromSubject = new Subject<string>();
  private readonly ageToSubject = new Subject<string>();

  // Effect for all filters and pagination (must be a field, not in ngOnInit)
  private readonly filterEffect = effect(() => {
    const _search = this.search();
    const _ageFrom = this.ageFrom();
    const _ageTo = this.ageTo();
    const _page = this.page();
    const _pageSize = this.pageSize();
    queueMicrotask(() => this.loadShows());
  });

  ngOnInit() {
    // Debounce search
    this.searchSubject.pipe(debounceTime(400)).subscribe((value) => {
      this.search.set(value);
    });
    // Debounce ageFrom
    this.ageFromSubject.pipe(debounceTime(400)).subscribe((value) => {
      const parsed = parseInt(value);
      this.ageFrom.set(isNaN(parsed) ? null : parsed);
    });
    // Debounce ageTo
    this.ageToSubject.pipe(debounceTime(400)).subscribe((value) => {
      const parsed = parseInt(value);
      this.ageTo.set(isNaN(parsed) ? null : parsed);
    });
    // Removed direct initial loadShows() call; effect will handle initial API call
  }

  private loadShows(): void {
    this.isLoading.set(true);
    this.error.set(null);
    // Prepare filter params
    const search = this.search();
    const ageFrom = this.ageFrom();
    const ageTo = this.ageTo();
    const page = this.page();
    const size = this.pageSize();
    this.apiService.listShows(
      search || undefined,
      ageFrom || undefined,
      ageTo || undefined,
      page,
      size,
      search || undefined
    ).subscribe({
      next: (response: any) => {
        const shows = response?.items ?? [];
        const total = response?.totalItems ?? shows.length;
        this.shows.set(shows);
        this.filteredShows.set(shows);
        this.totalItems.set(total);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading shows from API:', error);
        this.isLoading.set(false);
        this.error.set('Failed to load shows. Please try again later.');
      }
    });
  }


  retry(): void {
    this.error.set(null);
    this.loadShows();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchSubject.next(filterValue);
  }

  filterByAgeRange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.ageFromSubject.next(value);
  }

  filterByMinAge(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.ageToSubject.next(value);
  }

  resetFilters(): void {
    this.search.set('');
    this.ageFrom.set(null);
    this.ageTo.set(null);
    this.loadShows();
  }

  addShow(): void {
    this.router.navigate(['/shows/add']);
  }

  viewShowDetails(showId: string): void {
    this.router.navigate(['/shows', showId]);
  }

  onCardKeydown(event: KeyboardEvent, showId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.viewShowDetails(showId);
    }
  }

  // Pagination handlers
  onMatPage(event: any): void {
    if (event.pageSize !== this.pageSize()) {
      this.pageSize.set(event.pageSize);
      this.page.set(1);
    } else if ((event.pageIndex + 1) !== this.page()) {
      this.page.set(event.pageIndex + 1);
    }
  }
}
