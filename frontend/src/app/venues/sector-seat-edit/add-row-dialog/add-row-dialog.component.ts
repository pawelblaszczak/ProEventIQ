import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface AddRowDialogResult {
  rowName: string;
  seatCount: number;
  seatDirection: 'LTR' | 'RTL';
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
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './add-row-dialog.component.html',
  styleUrls: ['./add-row-dialog.component.scss']
})
export class AddRowDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddRowDialogComponent>);
  private readonly fb = inject(FormBuilder);
  public readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as { nextOrder?: number };

  addRowForm: FormGroup;

  constructor() {
    // Set default row name as Roman numeral if nextOrder is provided
    const defaultRowName = this.data?.nextOrder ? this.toRoman(this.data.nextOrder) : '';
    this.addRowForm = this.fb.group({
      rowName: [defaultRowName, [Validators.required, Validators.maxLength(32)]],
      seatCount: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      seatDirection: ['LTR', [Validators.required]]
    });
  }

  // Utility: Convert number to Roman numeral
  private toRoman(num: number): string {
    if (!num || num < 1) return '';
    const romanNumerals: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  onConfirm(): void {
    if (this.addRowForm.valid) {
      const result: AddRowDialogResult = {
        rowName: this.addRowForm.value.rowName,
        seatCount: this.addRowForm.value.seatCount,
        seatDirection: this.addRowForm.value.seatDirection
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
