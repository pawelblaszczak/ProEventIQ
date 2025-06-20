import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ProEventIQService } from '../api/api/pro-event-iq.service';
import { Venue } from '../api/model/venue';

@Component({
  selector: 'app-venue-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatCardModule, MatButtonModule, MatInputModule],
  templateUrl: './venue-edit.component.html',
  styleUrls: ['./venue-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueEditComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private venueApi = inject(ProEventIQService);
  form: FormGroup;
  venueId: string | null = null;
  loading = signal(true);
  error = signal<string | null>(null);
  thumbnailPreview: string | null = null;
  private thumbnailBase64: string | null = null;
  private thumbnailContentType: string | null = null;

  constructor() {
    const fb = inject(FormBuilder);
    this.form = fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      description: [''],
      numberOfSeats: [0, [Validators.required, Validators.min(0)]],
    });
    this.route.paramMap.subscribe(params => {
      this.venueId = params.get('id');
      if (this.venueId) {
        this.loadVenue(this.venueId);
      }
    });
  }

  loadVenue(id: string) {
    this.loading.set(true);
    this.venueApi.getVenue(id).subscribe({
      next: (venue: Venue) => {
        this.form.patchValue({
          name: venue.name,
          address: venue.address,
          city: venue.city,
          country: venue.country,
          description: venue.description,
          numberOfSeats: venue.numberOfSeats,
        });
        if (venue.thumbnail && venue.thumbnailContentType) {
          this.thumbnailPreview = `data:${venue.thumbnailContentType};base64,${venue.thumbnail}`;
          this.thumbnailBase64 = venue.thumbnail;
          this.thumbnailContentType = venue.thumbnailContentType;
        } else {
          this.thumbnailPreview = null;
          this.thumbnailBase64 = null;
          this.thumbnailContentType = null;
        }
        this.loading.set(false);
      },
      error: err => {
        this.error.set('Failed to load venue.');
        this.loading.set(false);
      }
    });
  }

  onThumbnailChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get base64 only
        const base64 = result.split(',')[1];
        this.thumbnailPreview = result;
        this.thumbnailBase64 = base64;
        this.thumbnailContentType = file.type;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.form.invalid || !this.venueId) return;
    this.loading.set(true);
    const formValue = this.form.value;
    const body: any = {
      ...formValue,
      thumbnail: this.thumbnailBase64,
      thumbnailContentType: this.thumbnailContentType
    };
    this.venueApi.updateVenue(this.venueId, body).subscribe({
      next: () => {
        this.router.navigate(['/venues', this.venueId]);
      },
      error: err => {
        this.error.set('Failed to update venue.');
        this.loading.set(false);
      }
    });
  }

  onCancel() {
    if (this.venueId) {
      this.router.navigate(['/venues', this.venueId]);
    } else {
      this.router.navigate(['/venues']);
    }
  }
}
