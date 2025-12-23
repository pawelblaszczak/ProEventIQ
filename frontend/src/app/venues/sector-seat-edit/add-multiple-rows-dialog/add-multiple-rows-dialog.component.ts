import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface AddMultipleRowsDialogResult {
  rowCount: number;
  seatCount: number;
  rowSpacing: number;
}

@Component({
  selector: 'app-add-multiple-rows-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './add-multiple-rows-dialog.component.html',
  styleUrls: ['./add-multiple-rows-dialog.component.scss']
})
export class AddMultipleRowsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddMultipleRowsDialogComponent>);
  private readonly fb = inject(FormBuilder);

  addRowsForm: FormGroup = this.fb.group({
    rowCount: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
    seatCount: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
    rowSpacing: [20, [Validators.required, Validators.min(0)]]
  });

  onConfirm(): void {
    if (this.addRowsForm.valid) {
      const result: AddMultipleRowsDialogResult = {
        rowCount: this.addRowsForm.value.rowCount,
        seatCount: this.addRowsForm.value.seatCount,
        rowSpacing: this.addRowsForm.value.rowSpacing
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
