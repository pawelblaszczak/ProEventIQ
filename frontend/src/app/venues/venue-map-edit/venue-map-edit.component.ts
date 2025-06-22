import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-venue-map-edit',
  standalone: true,
  templateUrl: './venue-map-edit.component.html',
  styleUrls: ['./venue-map-edit.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule, 
    MatIconModule,
    MatCardModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule
  ],
})
export class VenueMapEditComponent {
  // Tool selection
  selectedTool: string = 'select';
  
  // Mock venue data
  isLoading = false;
  hasUnsavedChanges = false;
  
  // Mock form values
  sectorPositionX = 150;
  sectorPositionY = 120;
  
  constructor(private router: Router, private snackBar: MatSnackBar) {}

  zoomIn() {
    this.snackBar.open('Zoomed in', 'Close', { duration: 1000 });
  }

  zoomOut() {
    this.snackBar.open('Zoomed out', 'Close', { duration: 1000 });
  }
  
  saveChanges() {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.hasUnsavedChanges = false;
      this.isLoading = false;
      this.snackBar.open('Venue map updated successfully', 'Close', {
        duration: 3000
      });
    }, 1000);
  }
  
  discardChanges() {
    this.hasUnsavedChanges = false;
    this.snackBar.open('Changes discarded', 'Close', { duration: 2000 });
  }
  
  updateSectorPosition() {
    // In a real implementation, this would update the position of the selected sector
    this.hasUnsavedChanges = true;
    this.snackBar.open('Position updated', 'Close', { duration: 1000 });
  }
  
  editRows() {
    this.snackBar.open('Opening row editor...', 'Close', { duration: 1000 });
  }
  
  hasChanges(): boolean {
    return this.hasUnsavedChanges;
  }
    goBack() {
    if (this.hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/venues']);
      }
    } else {
      this.router.navigate(['/venues']);
    }
  }
}
