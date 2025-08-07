import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ColorService } from '../../../shared';

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
  templateUrl: './color-picker-dialog.component.html',
  styleUrls: ['./color-picker-dialog.component.scss']
})
export class ColorPickerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ColorPickerDialogComponent>);
  public readonly data = inject<ColorPickerDialogData>(MAT_DIALOG_DATA);
  private readonly colorService = inject(ColorService);

  public selectedColor = signal<string>(this.data.currentColor || '');
  public customHexColor = this.data.currentColor || '';

  public getAvailableColors(): string[] {
    return this.colorService.getAvailableColors();
  }

  public selectColor(color: string): void {
    this.selectedColor.set(color);
    this.customHexColor = color;
  }

  public onHexInput(event: any): void {
    const value = event.target.value;
    if (this.colorService.isValidHexColor(value)) {
      this.selectedColor.set(value);
    }
  }

  public onColorPickerChange(event: any): void {
    const color = event.target.value;
    this.selectedColor.set(color);
    this.customHexColor = color;
  }

  public getContrastColor(hexColor: string | undefined): string {
    return this.colorService.getContrastColor(hexColor);
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
