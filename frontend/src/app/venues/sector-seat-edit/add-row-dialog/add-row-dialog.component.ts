import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface AddRowDialogResult {
  rowName: string;
  seatCount: number;
}

@Component({
  selector: 'app-add-row-dialog',
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
  templateUrl: './add-row-dialog.component.html',
  styleUrls: ['./add-row-dialog.component.scss']
})
export class AddRowDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddRowDialogComponent>);
  private readonly fb = inject(FormBuilder);

  addRowForm: FormGroup = this.fb.group({
    rowName: ['', [Validators.required, Validators.maxLength(32)]],
    seatCount: [1, [Validators.required, Validators.min(1), Validators.max(50)]]
  });

  onConfirm(): void {
    if (this.addRowForm.valid) {
      const result: AddRowDialogResult = {
        rowName: this.addRowForm.value.rowName,
        seatCount: this.addRowForm.value.seatCount
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
