import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Venue } from '../../api/model/venue';

@Component({
  selector: 'app-venue-edit',
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
    MatProgressSpinnerModule
  ],
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
  isAddMode = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  thumbnailPreview = signal<string | null>(null);
  private thumbnailBase64: string | null = null;
  private thumbnailContentType: string | null = null;

  constructor() {
    const fb = inject(FormBuilder);    this.form = fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      description: [''],
    });this.route.paramMap.subscribe(params => {
      this.venueId = params.get('id');
      this.isAddMode.set(!this.venueId);
      
      if (this.venueId) {
        this.loadVenue(this.venueId);
      } else {
        // Add mode - no loading needed
        this.loading.set(false);
      }
    });
  }

  loadVenue(id: string) {
    this.loading.set(true);
    this.venueApi.getVenue(id).subscribe({
      next: (venue: Venue) => {        this.form.patchValue({
          name: venue.name,
          address: venue.address,
          city: venue.city,
          country: venue.country,
          description: venue.description,
        });
        
        if (venue.thumbnail && venue.thumbnailContentType) {
          this.thumbnailPreview.set(`data:${venue.thumbnailContentType};base64,${venue.thumbnail}`);
          this.thumbnailBase64 = venue.thumbnail;
          this.thumbnailContentType = venue.thumbnailContentType;
        } else {
          this.thumbnailPreview.set(null);
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
  }  onThumbnailChange(event: Event) {
    const input = event.target as HTMLInputElement;
    // Reset first to ensure change detection
    this.thumbnailPreview.set(null);
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Force WebP recognition if filename ends with .webp
      let contentType = file.type;
      if (file.name.toLowerCase().endsWith('.webp')) {
        contentType = 'image/webp';
      }      // Use FileReader to read the file as a data URL
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const dataUrl = reader.result as string;
        
        // For the API, extract just the base64 part
        const base64 = dataUrl.split(',')[1];
        
        setTimeout(() => {
          // Store both the full dataUrl for preview and the base64 part for API
          this.thumbnailPreview.set(dataUrl);
          this.thumbnailBase64 = base64;
          this.thumbnailContentType = contentType;
        }, 0);
      });reader.addEventListener('error', (error) => {
        this.error.set('Failed to read the selected file. Please try again.');
      });
        // Read the file as a data URL
      reader.readAsDataURL(file);
    } else {
      // Clear the preview if no file is selected
      this.thumbnailPreview.set(null);
      this.thumbnailBase64 = null;
      this.thumbnailContentType = null;
    }
  }  onSubmit() {
    if (this.form.invalid) return;
    
    this.loading.set(true);
    const formValue = this.form.value;    // Backend is expecting a VenueInput structure with explicit fields
    const body: any = {
      name: formValue.name || '',
      address: formValue.address || '',
      city: formValue.city || '',
      country: formValue.country || '',
      description: formValue.description || '',
    };

    // Only include image data if we have it
    if (this.thumbnailBase64 && this.thumbnailContentType) {
      body.thumbnailContentType = this.thumbnailContentType;
      body.thumbnail = this.thumbnailBase64;
    }

    if (this.isAddMode()) {
      // Create new venue
      this.venueApi.addVenue(body).subscribe({
        next: (savedVenue) => {
          console.log('Venue created successfully!');
          this.router.navigate(['/venues', savedVenue.venueId]);
        },
        error: err => {
          console.error('Error creating venue:', err);
          this.handleError(err, 'Failed to create venue.');
        }
      });
    } else {
      // Update existing venue
      this.venueApi.updateVenue(this.venueId!, body).subscribe({
        next: (savedVenue) => {
          console.log('Venue updated successfully!');
          this.router.navigate(['/venues', this.venueId]);
        },
        error: err => {
          console.error('Error updating venue:', err);
          this.handleError(err, 'Failed to update venue.');
        }
      });
    }
  }

  private handleError(err: any, defaultMessage: string) {
    const logBody = {...this.form.value};
    if (this.thumbnailBase64) {
      logBody.thumbnail = `[Base64 data of length ${this.thumbnailBase64.length}]`;
    }
    console.log('Request body was:', logBody);
    
    let errorMessage = defaultMessage;
    if (err?.error?.message) {
      errorMessage += ' ' + err.error.message;
    } else if (typeof err?.error === 'string') {
      errorMessage += ' ' + err.error;
    }
    this.error.set(errorMessage);
    this.loading.set(false);
  }  onCancel() {
    if (this.isAddMode()) {
      this.router.navigate(['/venues']);
    } else if (this.venueId) {
      this.router.navigate(['/venues', this.venueId]);
    } else {
      this.router.navigate(['/venues']);
    }
  }
}
