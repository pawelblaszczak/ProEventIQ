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
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { EventInput } from '../../api/model/event-input';
import { Show } from '../../api/model/show';
import { Venue } from '../../api/model/venue';

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
    MatSelectModule
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
  eventId: string | null = null;
  isAddMode = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  shows = signal<Show[]>([]);
  venues = signal<Venue[]>([]);

  constructor() {
    const fb = inject(FormBuilder);
    this.form = fb.group({
      showId: ['', Validators.required],
      venueId: ['', Validators.required],
      dateTime: ['', Validators.required]
    });
    this.route.paramMap.subscribe(params => {
      this.eventId = params.get('id');
      this.isAddMode.set(!this.eventId);
      if (this.eventId) {
        this.loadEvent(this.eventId);
      }
    });
    this.loadShows();
    this.loadVenues();
  }

  loadEvent(id: string) {
    this.loading.set(true);
    this.eventApi.getEventById(id).subscribe({
      next: (event) => {
        this.form.patchValue({
          showId: event.showId,
          venueId: event.venueId,
          dateTime: event.dateTime
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load event.');
        this.loading.set(false);
      }
    });
  }

  loadShows() {
    this.eventApi.listShows().subscribe({
      next: (shows) => this.shows.set(shows),
      error: () => this.shows.set([])
    });
  }

  loadVenues() {
    this.eventApi.listVenues().subscribe({
      next: (venues) => this.venues.set(venues),
      error: () => this.venues.set([])
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const input: EventInput = this.form.value;
    if (this.isAddMode()) {
      this.eventApi.createEvent(input).subscribe({
        next: () => this.router.navigate(['/events']),
        error: () => {
          this.error.set('Failed to create event.');
          this.loading.set(false);
        }
      });
    } else if (this.eventId) {
      this.eventApi.updateEvent(this.eventId, input).subscribe({
        next: () => this.router.navigate(['/events']),
        error: () => {
          this.error.set('Failed to update event.');
          this.loading.set(false);
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/events']);
  }
}
