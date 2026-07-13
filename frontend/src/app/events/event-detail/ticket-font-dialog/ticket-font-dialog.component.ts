import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface TicketFontDialogData {
  defaultScale?: number;
}

export interface TicketFontDialogResult {
  fontScale: number | null;
}

@Component({
  selector: 'app-ticket-font-dialog',
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
    TranslateModule
  ],
  templateUrl: './ticket-font-dialog.component.html',
  styleUrls: ['./ticket-font-dialog.component.scss']
})
export class TicketFontDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<TicketFontDialogComponent, TicketFontDialogResult | undefined>);
  public readonly data = inject<TicketFontDialogData>(MAT_DIALOG_DATA);

  public readonly minScale = 0.5;
  public readonly maxScale = 3.0;
  public readonly scaleStep = 0.01;
  public mode: 'auto' | 'manual' = 'auto';
  public selectedScale: number;

  constructor() {
    this.selectedScale = this.data.defaultScale ?? 1.0;
  }

  public onConfirm(): void {
    const parsedScale = Number(this.selectedScale);
    const safeScale = Number.isFinite(parsedScale) ? parsedScale : 1;
    const clampedScale = Math.min(this.maxScale, Math.max(this.minScale, safeScale));
    const roundedScale = Math.round(clampedScale * 100) / 100;

    this.dialogRef.close({
      fontScale: this.mode === 'manual' ? roundedScale : null
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
