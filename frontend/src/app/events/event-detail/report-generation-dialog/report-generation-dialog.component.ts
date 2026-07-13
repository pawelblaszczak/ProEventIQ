import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';

export interface ReportGenerationDialogData {
  defaultScale?: number;
}

export interface ReportGenerationDialogResult {
  fontScale: number | null;
  seatColumns: number;
  maxRowsPerColumn: number | null;
}

@Component({
  selector: 'app-report-generation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    TranslateModule
  ],
  templateUrl: './report-generation-dialog.component.html',
  styleUrls: ['./report-generation-dialog.component.scss']
})
export class ReportGenerationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ReportGenerationDialogComponent, ReportGenerationDialogResult | undefined>);
  public readonly data = inject<ReportGenerationDialogData>(MAT_DIALOG_DATA);

  public readonly minScale = 0.5;
  public readonly maxScale = 3.0;
  public readonly scaleStep = 0.01;
  // Allow selecting 1-6 columns (default 4)
  public readonly seatColumnOptions: number[] = Array.from({ length: 6 }, (_, i) => i + 1);
  public readonly maxRowsOptions: number[] = Array.from({ length: 30 }, (_, i) => i + 1);

  public mode: 'auto' | 'manual' = 'auto';
  public selectedScale: number;
  public selectedSeatColumns = 4;
  // Use -1 as a sentinel to represent "No limit" so mat-select shows it reliably
  public selectedMaxRows: number = -1;

  constructor() {
    this.selectedScale = this.data.defaultScale ?? 1.0;
  }

  public onConfirm(): void {
    const parsedScale = Number(this.selectedScale);
    const safeScale = Number.isFinite(parsedScale) ? parsedScale : 1;
    const clampedScale = Math.min(this.maxScale, Math.max(this.minScale, safeScale));
    const roundedScale = Math.round(clampedScale * 100) / 100;

    this.dialogRef.close({
      fontScale: this.mode === 'manual' ? roundedScale : null,
      seatColumns: this.selectedSeatColumns,
      maxRowsPerColumn: this.selectedMaxRows === -1 ? null : this.selectedMaxRows
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
