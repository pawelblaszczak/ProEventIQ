import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './color-picker-dialog.component.html',
  styleUrls: ['./color-picker-dialog.component.scss']
})
export class ColorPickerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ColorPickerDialogComponent>);
  public readonly data = inject<ColorPickerDialogData>(MAT_DIALOG_DATA);
  private readonly colorService = inject(ColorService);
  private readonly translate = inject(TranslateService);

  public labels = {
    title: '',
    noColor: '',
    predefined: '',
    custom: '',
    hexLabel: '',
    pickerTitle: '',
    select: ''
  };

  public selectedColor = signal<string>(this.data.currentColor || '');
  public customHexColor = this.data.currentColor || '';

  public getAvailableColors(): string[] {
    return this.colorService.getAvailableColors();
  }

  private updateLabels(): void {
    // Always use the generic title, ignore any participant-specific title passed in data
    this.labels.title = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.TITLE');
    this.labels.noColor = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.NO_COLOR');
    this.labels.predefined = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.PREDEFINED');
    this.labels.custom = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.CUSTOM');
    this.labels.hexLabel = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.HEX_LABEL');
    this.labels.pickerTitle = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.PICKER_TITLE');
    this.labels.select = this.translate.instant('EVENTS.DETAIL.COLOR_PICKER.SELECT');
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

  constructor() {
    // Initialize labels and refresh when language changes
    this.updateLabels();
    this.translate.onLangChange.subscribe(() => this.updateLabels());
  }
}
