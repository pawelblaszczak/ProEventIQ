import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Show } from '../../api/model/show';

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

  ngOnInit() {
    this.loadShows();
  }

  private loadShows() {
    this.isLoading.set(true);
    
    // Try to load from API first, fallback to mock data if it fails
    this.apiService.listShows().subscribe({
      next: (shows: Show[]) => {
        this.shows.set(shows ?? []);
        this.filteredShows.set(shows ?? []);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading shows from API:', error);
        console.log('API calls are being made to:', this.apiService.configuration?.basePath ?? 'default base path');
        this.isLoading.set(false);
        // Fallback to mock data for development
        this.loadMockData();
      }
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
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredShows.set(
      this.shows().filter(show => 
        (show.name?.toLowerCase() ?? '').includes(filterValue) ||
        (show.description?.toLowerCase() ?? '').includes(filterValue)
      )
    );
  }

  filterByAgeRange(event: Event): void {
    const ageValue = parseInt((event.target as HTMLInputElement).value);
    if (isNaN(ageValue)) {
      this.filteredShows.set(this.shows());
      return;
    }
    
    this.filteredShows.set(
      this.shows().filter(show => 
        (show.ageFrom ?? 0) <= ageValue && (show.ageTo ?? 99) >= ageValue
      )
    );
  }

  filterByMinAge(event: Event): void {
    const minAge = parseInt((event.target as HTMLInputElement).value);
    if (isNaN(minAge)) {
      this.filteredShows.set(this.shows());
      return;
    }
    
    this.filteredShows.set(
      this.shows().filter(show => (show.ageFrom ?? 0) >= minAge)
    );
  }

  resetFilters(): void {
    this.filteredShows.set(this.shows());
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
}
