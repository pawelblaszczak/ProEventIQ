import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface ColorPickerDialogData {
  currentColor?: string;
  title?: string;
}

@Component({
  selector: 'app-color-picker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="color-picker-dialog">
      <h2 mat-dialog-title>{{ data.title || 'Choose Seat Color' }}</h2>
      
      <mat-dialog-content class="dialog-content">
        <div class="current-color-preview">
          <div class="color-preview-box" 
               [style.background-color]="selectedColor() || '#e0e0e0'"
               [style.color]="getContrastColor(selectedColor())">
            {{ selectedColor() || 'No color selected' }}
          </div>
        </div>

        <div class="color-section">
          <h3 class="section-title">
            <mat-icon>palette</mat-icon>
            Predefined Colors
          </h3>
          <div class="predefined-colors-grid">
            <div *ngFor="let color of getAvailableColors()" 
                 class="color-option"
                 [style.background-color]="color"
                 [class.selected]="selectedColor() === color"
                 (click)="selectColor(color)"
                 [title]="color">
              <mat-icon *ngIf="selectedColor() === color" class="check-icon">check</mat-icon>
            </div>
          </div>
        </div>

        <div class="color-section">
          <h3 class="section-title">
            <mat-icon>colorize</mat-icon>
            Custom Color
          </h3>
          <div class="custom-color-section">
            <mat-form-field appearance="outline" class="hex-input">
              <mat-label>Hex Color Code</mat-label>
              <input matInput 
                     [(ngModel)]="customHexColor"
                     placeholder="#FF5733"
                     pattern="^#[0-9A-Fa-f]{6}$"
                     (input)="onHexInput($event)">
              <mat-icon matSuffix>tag</mat-icon>
            </mat-form-field>
            <input type="color" 
                   [(ngModel)]="selectedColor"
                   class="color-picker-input"
                   (change)="onColorPickerChange($event)"
                   title="Color picker">
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="!selectedColor()">
          <mat-icon>check</mat-icon>
          Select Color
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ['./color-picker-dialog.component.scss']
})
export class ColorPickerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ColorPickerDialogComponent>);
  public readonly data = inject<ColorPickerDialogData>(MAT_DIALOG_DATA);

  public selectedColor = signal<string>(this.data.currentColor || '');
  public customHexColor = this.data.currentColor || '';

  public getAvailableColors(): string[] {
    return [
      '#FF4444', // Red
      '#FF8800', // Orange
      '#FFDD00', // Yellow
      '#44AA44', // Green
      '#00CCCC', // Cyan
      '#4488FF', // Blue
      '#8844FF', // Purple
      '#FF44AA', // Pink
      '#666666', // Gray
      '#AA4400', // Brown
      '#FF6666', // Light Red
      '#66BB66', // Light Green
      '#6666FF', // Light Blue
      '#BB66BB', // Light Purple
      '#FFAA44', // Light Orange
    ];
  }

  public selectColor(color: string): void {
    this.selectedColor.set(color);
    this.customHexColor = color;
  }

  public onHexInput(event: any): void {
    const value = event.target.value;
    if (this.isValidHexColor(value)) {
      this.selectedColor.set(value);
    }
  }

  public onColorPickerChange(event: any): void {
    const color = event.target.value;
    this.selectedColor.set(color);
    this.customHexColor = color;
  }

  public getContrastColor(hexColor: string | undefined): string {
    if (!hexColor) return '#000000';
    
    // Remove # if present
    const color = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  private isValidHexColor(hex: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  }

  public onConfirm(): void {
    if (this.selectedColor()) {
      this.dialogRef.close(this.selectedColor());
    }
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
