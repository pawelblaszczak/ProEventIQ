import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';

export interface ChangeSeatLabelDialogData {
  currentLabel?: string;
  currentOrderNumber: number;
  remainingSeatsInRow: number;
}

export interface ChangeSeatLabelDialogResult {
  newLabel: string;
  applyToFollowingSeats: boolean;
}

@Component({
  selector: 'app-change-seat-label-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    TranslateModule
  ],
  templateUrl: './change-seat-label-dialog.component.html',
  styleUrls: ['./change-seat-label-dialog.component.scss']
})
export class ChangeSeatLabelDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ChangeSeatLabelDialogComponent>);
  private readonly fb = inject(FormBuilder);
  public readonly data = inject<ChangeSeatLabelDialogData>(MAT_DIALOG_DATA);

  changeLabelForm: FormGroup = this.fb.group({
    seatLabel: ['', [Validators.maxLength(20)]],
    applyToFollowingSeats: [false]
  });

  constructor() {
    // Pre-fill with current label, falling back to orderNumber as string
    const initialLabel = this.data.currentLabel ?? String(this.data.currentOrderNumber);
    this.changeLabelForm.patchValue({ seatLabel: initialLabel });
  }

  onConfirm(): void {
    if (this.changeLabelForm.valid) {
      const result: ChangeSeatLabelDialogResult = {
        newLabel: this.changeLabelForm.value.seatLabel?.trim() || '',
        applyToFollowingSeats: this.changeLabelForm.value.applyToFollowingSeats ?? false
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
