import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProEventIQService } from '../api/api/pro-event-iq.service';
import { Venue } from '../api/model/venue';

@Component({
  selector: 'app-venues-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './venues-list.component.html',
  styleUrl: './venues-list.component.scss'
})
export class VenuesListComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  
  venues = signal<Venue[]>([]);
  filteredVenues = signal<Venue[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadVenues();
  }
  private loadVenues() {
    this.isLoading.set(true);
    
    // Try to load from API first, fallback to mock data if it fails
    this.apiService.listVenues().subscribe({      next: (venues: Venue[]) => {
        this.venues.set(venues ?? []);
        this.filteredVenues.set(venues ?? []);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading venues from API:', error);
        console.log('API calls are being made to:', this.apiService.configuration?.basePath ?? 'default base path');
        this.isLoading.set(false);
        // Fallback to mock data for development
        this.loadMockData();
      }
    });
  }

  private loadMockData() {
    console.log('Loading mock data as fallback - API calls configured with /api prefix');
    const mockVenues: Venue[] = [
      {
        venueId: '1',
        name: 'Metropolitan Opera House',
        country: 'USA',
        city: 'New York',
        address: '30 Lincoln Center Plaza, New York, NY 10023',
        thumbnail: 'https://via.placeholder.com/300x200?text=Metropolitan+Opera',
        description: 'The Metropolitan Opera House is a world-renowned opera house located at Lincoln Center in New York City.',
        numberOfSeats: 3800
      },
      {
        venueId: '2',
        name: 'Royal Albert Hall',
        country: 'UK',
        city: 'London',
        address: 'Kensington Gore, South Kensington, London SW7 2AP',
        thumbnail: 'https://via.placeholder.com/300x200?text=Royal+Albert+Hall',
        description: 'The Royal Albert Hall is a concert hall on the northern edge of South Kensington, London.',
        numberOfSeats: 5272
      },
      {
        venueId: '3',
        name: 'Sydney Opera House',
        country: 'Australia',
        city: 'Sydney',
        address: 'Bennelong Point, Sydney NSW 2000',
        thumbnail: 'https://via.placeholder.com/300x200?text=Sydney+Opera+House',
        description: 'The Sydney Opera House is a multi-venue performing arts centre in Sydney, Australia.',
        numberOfSeats: 5738
      }
    ];
    this.venues.set(mockVenues);
    this.filteredVenues.set(mockVenues);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredVenues.set(
      this.venues().filter(venue => 
        (venue.name?.toLowerCase() || '').includes(filterValue) ||
        (venue.city?.toLowerCase() || '').includes(filterValue) ||
        (venue.country?.toLowerCase() || '').includes(filterValue) ||
        (venue.address?.toLowerCase() || '').includes(filterValue) ||
        (venue.description?.toLowerCase() || '').includes(filterValue)
      )
    );
  }

  filterByCountry(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    if (!filterValue) {
      this.filteredVenues.set(this.venues());
      return;
    }
    
    this.filteredVenues.set(
      this.venues().filter(venue => 
        (venue.country?.toLowerCase() || '').includes(filterValue)
      )
    );
  }

  filterByCity(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    if (!filterValue) {
      this.filteredVenues.set(this.venues());
      return;
    }
    
    this.filteredVenues.set(
      this.venues().filter(venue => 
        (venue.city?.toLowerCase() || '').includes(filterValue)
      )
    );
  }

  filterByMinSeats(event: Event): void {
    const minSeats = parseInt((event.target as HTMLInputElement).value);
    if (isNaN(minSeats)) {
      this.filteredVenues.set(this.venues());
      return;
    }
    
    this.filteredVenues.set(
      this.venues().filter(venue => (venue.numberOfSeats || 0) >= minSeats)
    );
  }

  resetFilters(): void {
    this.filteredVenues.set(this.venues());
  }

  addVenue(): void {
    // Navigate to add venue form
    console.log('Navigate to add venue form');
  }
}