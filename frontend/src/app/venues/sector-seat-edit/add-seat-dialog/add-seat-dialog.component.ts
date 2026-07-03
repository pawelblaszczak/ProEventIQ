import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

export interface AddSeatDialogData {
  rows: Array<{
    seatRowId: number;
    name?: string;
    orderNumber?: number;
    seatCount?: number;
  }>;
}

export interface AddSeatDialogResult {
  selectedRowId: number;
  seatCount: number;
  firstSeatLabel?: string;
}

@Component({
  selector: 'app-add-seat-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule
  ],
  templateUrl: './add-seat-dialog.component.html',
  styleUrls: ['./add-seat-dialog.component.scss']
})
export class AddSeatDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddSeatDialogComponent>);
  private readonly fb = inject(FormBuilder);
  public readonly data = inject<AddSeatDialogData>(MAT_DIALOG_DATA);

  addSeatForm: FormGroup = this.fb.group({
    selectedRowId: ['', Validators.required],
    seatCount: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
    firstSeatLabel: ['', [Validators.maxLength(20)]]
  });

  constructor() {
    // Pre-select the first row if available and set default firstSeatLabel
    if (this.data.rows && this.data.rows.length > 0) {
      const firstRow = this.data.rows[0];
      this.addSeatForm.patchValue({
        selectedRowId: firstRow.seatRowId,
        firstSeatLabel: firstRow.seatCount === null || firstRow.seatCount === undefined ? '' : String(firstRow.seatCount + 1)
      });
    }
  }

  onSelectedRowChange(rowId: number): void {
    const row = this.data.rows.find(r => r.seatRowId === rowId);
    if (row) {
      this.addSeatForm.patchValue({
        firstSeatLabel: row.seatCount === null || row.seatCount === undefined ? '' : String(row.seatCount + 1)
      });
    }
  }

  onConfirm(): void {
    if (this.addSeatForm.valid) {
      const labelValue: string = this.addSeatForm.value.firstSeatLabel?.trim() ?? '';
      const result: AddSeatDialogResult = {
        selectedRowId: this.addSeatForm.value.selectedRowId,
        seatCount: this.addSeatForm.value.seatCount,
        firstSeatLabel: labelValue.length > 0 ? labelValue : undefined
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
