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

@Component({
  selector: 'app-shows-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './shows-list.component.html',
  styleUrl: './shows-list.component.scss'
})
export class ShowsListComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);
  
  shows = signal<Show[]>([]);
  filteredShows = signal<Show[]>([]);
  isLoading = signal(false);

  // Filter state
  public search = signal('');
  public ageFrom = signal<number | null>(null); // was 'age'
  public ageTo = signal<number | null>(null);   // was 'minAge'

  // Pagination state
  public page = signal(1); // 1-based
  public pageSize = signal(10); // Default page size
  public totalItems = signal(0);

  // Debounce subjects
  private searchSubject = new Subject<string>();
  private ageFromSubject = new Subject<string>();
  private ageToSubject = new Subject<string>();

  // Effect for all filters and pagination (must be a field, not in ngOnInit)
  private filterEffect = effect(() => {
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
    ).subscribe((response: any) => {
      const shows = response?.items ?? [];
      const total = response?.totalItems ?? shows.length;
      this.shows.set(shows);
      this.filteredShows.set(shows);
      this.totalItems.set(total);
      this.isLoading.set(false);
    }, (error: any) => {
      console.error('Error loading shows from API:', error);
      this.isLoading.set(false);
      this.loadMockData();
    });
  }

  private loadMockData() {
    console.log('Loading mock data as fallback - API calls configured with /api prefix');
    const mockShows: Show[] = [
      {
        showId: '1',
        name: 'The Lion King',
        thumbnail: 'https://via.placeholder.com/300x200?text=The+Lion+King',
        description: 'Experience the Circle of Life unfold before your eyes as Simba\'s story comes alive through stunning visuals, heart-stirring music and soul-stirring dance.',
        ageFrom: 6,
        ageTo: 99
      },
      {
        showId: '2',
        name: 'Hamilton',
        thumbnail: 'https://via.placeholder.com/300x200?text=Hamilton',
        description: 'The story of America then, told by America now. Hamilton is the epic saga that follows the rise of Founding Father Alexander Hamilton.',
        ageFrom: 10,
        ageTo: 99
      },
      {
        showId: '3',
        name: 'Phantom of the Opera',
        thumbnail: 'https://via.placeholder.com/300x200?text=Phantom+of+the+Opera',
        description: 'The haunting love story set in the mysterious depths of the Paris Opera House, featuring Andrew Lloyd Webber\'s timeless music.',
        ageFrom: 8,
        ageTo: 99
      },
      {
        showId: '4',
        name: 'Chicago',
        thumbnail: 'https://via.placeholder.com/300x200?text=Chicago',
        description: 'A dazzling and satirical look at fame, justice, and the media machine. Set in 1920s Chicago with sultry jazz music and spectacular dance numbers.',
        ageFrom: 12,
        ageTo: 99
      },
      {
        showId: '5',
        name: 'Mamma Mia!',
        thumbnail: 'https://via.placeholder.com/300x200?text=Mamma+Mia',
        description: 'The ultimate feel-good musical featuring the timeless songs of ABBA. A heartwarming tale of love, laughter and friendship.',
        ageFrom: 3,
        ageTo: 99
      }
    ];
    this.shows.set(mockShows);
    this.filteredShows.set(mockShows);
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
