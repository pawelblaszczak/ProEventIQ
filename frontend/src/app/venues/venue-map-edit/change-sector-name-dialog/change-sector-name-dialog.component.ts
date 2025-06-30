import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-change-sector-name-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogActions,
    MatDialogContent
  ],
  templateUrl: './change-sector-name-dialog.component.html',
  styleUrls: ['./change-sector-name-dialog.component.scss']
})
export class ChangeSectorNameDialogComponent {
  public form: FormGroup;
  private dialogRef = inject(MatDialogRef<ChangeSectorNameDialogComponent>);
  private data = inject(MAT_DIALOG_DATA) as { name: string };

  constructor() {
    const fb = inject(FormBuilder);
    this.form = fb.group({
      name: [this.data.name, [Validators.required, Validators.maxLength(32)]]
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onConfirm() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }
}
