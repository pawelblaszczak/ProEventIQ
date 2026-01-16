import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TextFieldModule } from '@angular/cdk/text-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { KeycloakAuthService } from '../keycloak/keycloak.service';
import { UserService } from '../../shared/services/user.service';
import { UserDetailsDto } from '../../api/model/user-details-dto';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    TextFieldModule,
    TranslateModule
  ],
  templateUrl: './account-edit.component.html',
  styleUrls: ['./account-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountEditComponent implements OnInit {
  private readonly authService = inject(KeycloakAuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  public loading = signal(false);
  public saving = signal(false);
  public error = signal<string | null>(null);
  public userDetails = signal<UserDetailsDto | null>(null);
  
  // Profile picture related signals
  public profilePreview = signal<string | null>(null);
  public dragOver = signal(false);
  public selectedProfileFile = signal<File | null>(null);
  public profileThumbnailData = signal<string | null>(null);

  public accountForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    name: [''],
    address: ['']
  });

  ngOnInit(): void {
    this.loadUserDetails();
  }

  private loadUserDetails(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.loadCurrentUserDetails().subscribe({
      next: (userDetails: UserDetailsDto) => {
        this.userDetails.set(userDetails);
        this.populateForm(userDetails);
        this.loading.set(false);
      },
      error: (error: any) => {
        // If user doesn't exist in our system yet, populate from Keycloak profile
        this.populateFromKeycloakProfile();
        this.loading.set(false);
      }
    });
  }

  private populateFromKeycloakProfile(): void {
    const profile = this.authService.profile();
    if (profile) {
      const email = profile['email'] as string || '';
      const givenName = profile['given_name'] as string || '';
      const familyName = profile['family_name'] as string || '';
      const fullName = [givenName, familyName].filter(Boolean).join(' ') || profile['name'] as string || '';

      this.accountForm.patchValue({
        email: email,
        name: fullName,
        address: ''
      });
    }
  }

  private populateForm(userDetails: UserDetailsDto): void {
    this.accountForm.patchValue({
      email: userDetails.email || '',
      name: userDetails.name || '',
      address: userDetails.address || ''
    });
    
    // Set existing profile picture if available
    if (userDetails.thumbnail) {
      const imageDataUrl = `data:${userDetails.thumbnail_content_type || 'image/jpeg'};base64,${userDetails.thumbnail}`;
      this.profilePreview.set(imageDataUrl);
      this.profileThumbnailData.set(userDetails.thumbnail);
    }
  }

  public onSubmit(): void {
    if (this.accountForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.accountForm.value;
    const updateData: UserDetailsDto = {
      email: formValue.email,
      name: formValue.name,
      address: formValue.address
    };

    // Include profile picture data if a new image was selected
    const selectedFile = this.selectedProfileFile();
    const thumbnailData = this.profileThumbnailData();
    
    if (selectedFile && thumbnailData) {
      updateData.thumbnail = thumbnailData;
      updateData.thumbnail_content_type = selectedFile.type;
    } else if (thumbnailData && !selectedFile) {
      // Keep existing thumbnail if no new file was selected
      const currentUser = this.userDetails();
      if (currentUser?.thumbnail) {
        updateData.thumbnail = currentUser.thumbnail;
        updateData.thumbnail_content_type = currentUser.thumbnail_content_type;
      }
    }

    this.userService.updateUserDetails(updateData).subscribe({
      next: (updatedUser: UserDetailsDto) => {
        this.userDetails.set(updatedUser);
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('AUTH.EDIT.UPDATE_SUCCESS'), this.translate.instant('BUTTON.CLOSE'), {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/my-account']);
      },
      error: (error: any) => {
        this.error.set(this.translate.instant('AUTH.EDIT.UPDATE_ERROR'));
        this.saving.set(false);
        console.error('Error updating user:', error);
        this.snackBar.open(this.translate.instant('AUTH.EDIT.UPDATE_ERROR'), this.translate.instant('BUTTON.CLOSE'), {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.accountForm.controls).forEach(key => {
      const control = this.accountForm.get(key);
      control?.markAsTouched();
    });
  }

  public onCancel(): void {
    this.router.navigate(['/my-account']);
  }

  public getFieldError(fieldName: string): string | null {
    const field = this.accountForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return this.translate.instant('AUTH.EDIT.FIELD_REQUIRED', { fieldName: fieldName.charAt(0).toUpperCase() + fieldName.slice(1) });
      }
      if (field.errors['email']) {
        return this.translate.instant('AUTH.EDIT.INVALID_EMAIL');
      }
    }
    return null;
  }

  // Profile picture methods
  public onProfilePictureChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.processProfilePicture(file);
    }
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.processProfilePicture(file);
      } else {
        this.snackBar.open(this.translate.instant('AUTH.EDIT.INVALID_FILE'), this.translate.instant('BUTTON.CLOSE'), {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  private processProfilePicture(file: File): void {
    // Validate file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      this.snackBar.open(this.translate.instant('AUTH.EDIT.FILE_TOO_LARGE'), this.translate.instant('BUTTON.CLOSE'), {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open(this.translate.instant('AUTH.EDIT.INVALID_FILE_TYPE'), this.translate.instant('BUTTON.CLOSE'), {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Store the selected file
    this.selectedProfileFile.set(file);

    // Create preview and base64 data
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.profilePreview.set(result);
      
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = result.split(',')[1];
      this.profileThumbnailData.set(base64Data);
    };
    reader.readAsDataURL(file);

    this.snackBar.open(this.translate.instant('AUTH.EDIT.PICTURE_SELECTED'), this.translate.instant('BUTTON.CLOSE'), {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  public clearProfilePicture(): void {
    this.profilePreview.set(null);
    this.selectedProfileFile.set(null);
    this.profileThumbnailData.set(null);
    
    // Clear the file input
    const fileInput = document.getElementById('profile-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    this.snackBar.open(this.translate.instant('AUTH.EDIT.PICTURE_CLEARED'), this.translate.instant('BUTTON.CLOSE'), {
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }
}
