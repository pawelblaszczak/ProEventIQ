import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Show } from '../../api/model/show';
import { ShowInput } from '../../api/model/show-input';

@Component({
  selector: 'app-show-edit',
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
  templateUrl: './show-edit.component.html',
  styleUrls: ['./show-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly showApi = inject(ProEventIQService);
  
  form: FormGroup;
  showId: number | null = null;
  isAddMode = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  thumbnailPreview = signal<string | null>(null);
  private thumbnailBase64: string | null = null;
  private thumbnailContentType: string | null = null;
  dragOver = signal(false);
  private dragLeaveTimeout: number | null = null;

  constructor() {
    const fb = inject(FormBuilder);
    
    this.form = fb.group({
      name: ['', Validators.required],
      description: [''],
      ageFrom: [0, [Validators.required, Validators.min(0), Validators.max(120)]],
      ageTo: [99, [Validators.required, Validators.min(0), Validators.max(120)]]
    });

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.showId = idParam ? Number(idParam) : null;
      this.isAddMode.set(!this.showId);
      
      if (this.showId) {
        this.loadShow(this.showId);
      } else {
        // Add mode - no loading needed
        this.loading.set(false);
      }
    });
  }

  loadShow(id: number) {
    this.loading.set(true);
    this.showApi.getShowById(id).subscribe({
      next: (show: Show) => {
        this.form.patchValue({
          name: show.name,
          description: show.description,
          ageFrom: show.ageFrom,
          ageTo: show.ageTo
        });
        
        if (show.thumbnail && show.thumbnailContentType) {
          this.thumbnailPreview.set(`data:${show.thumbnailContentType};base64,${show.thumbnail}`);
        }
        
        this.loading.set(false);
      },
      error: (err: any) => {
        this.handleError(err, 'Failed to load show.');
      }
    });
  }

  onThumbnailChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.error.set('Please select a valid image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('Image file size must be less than 5MB.');
        return;
      }
      
      this.error.set(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.thumbnailPreview.set(result);
        
        // Extract base64 data and content type
        const [header, data] = result.split(',');
        this.thumbnailBase64 = data;
        this.thumbnailContentType = file.type;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    
    this.loading.set(true);
    const formValue = this.form.value;
    
    // Backend is expecting a ShowInput structure with explicit fields
    const body: ShowInput = {
      name: formValue.name || '',
      description: formValue.description || '',
      ageFrom: formValue.ageFrom ?? 0,
      ageTo: formValue.ageTo ?? 99
    };

    // Only include image data if we have it
    if (this.thumbnailBase64 && this.thumbnailContentType) {
      body.thumbnail = this.thumbnailBase64;
      body.thumbnailContentType = this.thumbnailContentType;
    }

    if (this.isAddMode()) {
      this.showApi.addShow(body).subscribe({
        next: (show: Show) => {
          this.router.navigate(['/shows', show.showId]);
        },
        error: (err: any) => {
          this.handleError(err, 'Failed to create show.');
        }
      });
    } else if (this.showId) {
      this.showApi.updateShow(this.showId, body).subscribe({
        next: (show: Show) => {
          this.router.navigate(['/shows', show.showId]);
        },
        error: (err: any) => {
          this.handleError(err, 'Failed to update show.');
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
  }

  onCancel() {
    if (this.isAddMode()) {
      this.router.navigate(['/shows']);
    } else if (this.showId) {
      this.router.navigate(['/shows', this.showId]);
    } else {
      this.router.navigate(['/shows']);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // Clear any pending leave timeout
    if (this.dragLeaveTimeout) {
      window.clearTimeout(this.dragLeaveTimeout);
      this.dragLeaveTimeout = null;
    }
    
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // Use a short timeout to prevent flickering when moving between child elements
    this.dragLeaveTimeout = window.setTimeout(() => {
      this.dragOver.set(false);
    }, 50);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // Clear any pending leave timeout
    if (this.dragLeaveTimeout) {
      window.clearTimeout(this.dragLeaveTimeout);
      this.dragLeaveTimeout = null;
    }
    
    this.dragOver.set(false);
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      // Create a fake event to reuse onThumbnailChange logic
      const fakeEvent = { target: { files: [file] } } as unknown as Event;
      this.onThumbnailChange(fakeEvent);
    }
  }
}
