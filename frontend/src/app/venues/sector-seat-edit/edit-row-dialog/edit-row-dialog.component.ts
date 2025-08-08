import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface EditRowDialogData {
  rowId: number;
  currentName: string;
  orderNumber?: number;
}

export interface EditRowDialogResult {
  rowName: string;
}

@Component({
  selector: 'app-edit-row-dialog',
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
  templateUrl: './edit-row-dialog.component.html',
  styleUrls: ['./edit-row-dialog.component.scss']
})
export class EditRowDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EditRowDialogComponent>);
  private readonly fb = inject(FormBuilder);

  editRowForm: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: EditRowDialogData) {
    this.editRowForm = this.fb.group({
      rowName: [data.currentName, [Validators.required, Validators.maxLength(32)]]
    });
  }

  onConfirm(): void {
    if (this.editRowForm.valid) {
      const result: EditRowDialogResult = {
        rowName: this.editRowForm.value.rowName
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
