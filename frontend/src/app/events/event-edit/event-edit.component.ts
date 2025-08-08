import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { EventInput } from '../../api/model/event-input';
import { ShowOption } from '../../api/model/show-option';
import { VenueOption } from '../../api/model/venue-option';

@Component({
  selector: 'app-event-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatAutocompleteModule
  ],
  templateUrl: './event-edit.component.html',
  styleUrls: ['./event-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventApi = inject(ProEventIQService);

  form: FormGroup;
  eventId: number | null = null;
  isAddMode = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  shows = signal<ShowOption[]>([]);
  venues = signal<VenueOption[]>([]);

  showInputValue = '';
  venueInputValue = '';
  filteredShowsList: ShowOption[] = [];
  filteredVenuesList: VenueOption[] = [];

  constructor() {
    const fb = inject(FormBuilder);
    this.form = fb.group({
      showId: ['', Validators.required],
      venueId: ['', Validators.required],
      dateTime: ['', Validators.required]
    });
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.eventId = idParam ? +idParam : null;
      this.isAddMode.set(!this.eventId);
      if (this.eventId) {
        this.loadEvent(this.eventId);
      }
    });
    this.loadShows();
    this.loadVenues();
  }

  ngOnInit() {
    this.filteredShowsList = this.sortByName(this.shows());
    this.filteredVenuesList = this.sortByName(this.venues());
  }

  // Patch input display logic: only patch input value when an object is selected, not when user types. Prevents showing the ID in the input field after selection or typing.
  ngAfterViewInit() {
    // Patch input display for Show
    this.form.get('showId')?.valueChanges.subscribe((id) => {
      if (typeof id === 'string') {
        // If user types, do not patch
        return;
      }
      const selected = this.shows().find(show => show.showId === id);
      this.showInputValue = selected ? selected.name : '';
    });
    // Patch input display for Venue
    this.form.get('venueId')?.valueChanges.subscribe((id) => {
      if (typeof id === 'string') {
        return;
      }
      const selected = this.venues().find(venue => venue.venueId === id);
      this.venueInputValue = selected ? selected.name : '';
    });
  }

  loadEvent(id: number) {
    this.loading.set(true);
    this.eventApi.getEventById(id).subscribe({
      next: (event) => {
        this.form.patchValue({
          showId: event.showId,
          venueId: event.venueId,
          dateTime: this.formatDateTimeForForm(event.dateTime!)
        });
        // Set display values for autocomplete fields
        const show = this.shows().find(s => s.showId === event.showId);
        this.showInputValue = show ? show.name : '';
        const venue = this.venues().find(v => v.venueId === event.venueId);
        this.venueInputValue = venue ? venue.name : '';
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load event.');
        this.loading.set(false);
      }
    });
  }

  loadShows() {
    this.eventApi.listShowOptions().subscribe({
      next: (shows) => {
        this.shows.set(shows);
        this.filteredShowsList = this.sortByName(shows);
      },
      error: () => {
        this.shows.set([]);
        this.filteredShowsList = [];
      }
    });
  }

  loadVenues() {
    this.eventApi.listVenueOptions().subscribe({
      next: (venues) => {
        this.venues.set(venues);
        this.filteredVenuesList = this.sortByName(venues);
      },
      error: () => {
        this.venues.set([]);
        this.filteredVenuesList = [];
      }
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    
    // Convert datetime-local format to ISO 8601 format
    const formValue = this.form.value;
    const formattedDateTime = this.formatDateTimeForApi(formValue.dateTime);
    
    console.log('Original dateTime:', formValue.dateTime);
    console.log('Formatted dateTime:', formattedDateTime);
    
    const input: EventInput = {
      ...formValue,
      dateTime: formattedDateTime
    };
    
    console.log('Final input payload:', input);
    
    if (this.isAddMode()) {
      this.eventApi.createEvent(input).subscribe({
        next: () => {
          this.router.navigate(['/events']);
        },
        error: (error) => {
          console.error('Create event error:', error);
          this.error.set('Failed to create event.');
          this.loading.set(false);
        }
      });
    } else if (this.eventId) {
      this.eventApi.updateEvent(this.eventId, input).subscribe({
        next: () => {
          this.router.navigate(['/events']);
        },
        error: (error) => {
          console.error('Update event error:', error);
          this.error.set('Failed to update event.');
          this.loading.set(false);
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/events']);
  }

  filterShowInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.showInputValue = value;
    this.filteredShowsList = this.sortByName(this.shows().filter(show => show.name.toLowerCase().includes(value.toLowerCase())));
    // If user types, do not patch form value
  }

  filterVenueInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.venueInputValue = value;
    this.filteredVenuesList = this.sortByName(this.venues().filter(venue => venue.name.toLowerCase().includes(value.toLowerCase())));
  }

  onShowSelected(event: any) {
    const showId = event.option.value;
    const selected = this.shows().find(show => show.showId === showId);
    this.showInputValue = selected ? selected.name : '';
    this.form.get('showId')?.setValue(showId);
  }

  onVenueSelected(event: any) {
    const venueId = event.option.value;
    const selected = this.venues().find(venue => venue.venueId === venueId);
    this.venueInputValue = selected ? selected.name : '';
    this.form.get('venueId')?.setValue(venueId);
  }

  sortByName<T extends { name: string }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  }

  private formatDateTimeForApi(dateTimeValue: string): string {
    if (!dateTimeValue) return dateTimeValue;
    
    // If the value is already in ISO format with timezone, return as is
    if (dateTimeValue.includes('Z') || 
        (dateTimeValue.includes('+') && dateTimeValue.length > 16) || 
        (dateTimeValue.includes('-') && dateTimeValue.lastIndexOf('-') > 10)) {
      return dateTimeValue;
    }
    
    // Convert datetime-local format to ISO 8601 with UTC timezone
    // datetime-local format: "2025-07-02T10:00" -> "2025-07-02T10:00:00Z"
    let isoString = dateTimeValue;
    
    // Add seconds if missing
    const timePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (timePattern.exec(isoString)) {
      isoString += ':00';
    }
    
    // Add UTC timezone
    if (!isoString.endsWith('Z')) {
      isoString += 'Z';
    }
      
    return isoString;
  }

  private formatDateTimeForForm(isoDateTime: string): string {
    if (!isoDateTime) return isoDateTime;
    
    // Convert ISO 8601 format to datetime-local format
    // "2025-07-02T10:00:00Z" -> "2025-07-02T10:00"
    // "2025-07-02T10:00:00.000Z" -> "2025-07-02T10:00"
    // "2025-07-02T10:00:00+02:00" -> "2025-07-02T10:00"
    
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) {
      return isoDateTime; // Return as is if parsing fails
    }
    
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
