import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent, ConfirmationDialogData } from './confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  private readonly dialog = inject(MatDialog);

  /**
   * Opens a confirmation dialog with the provided data
   * @param data Configuration for the dialog
   * @returns Observable<boolean> - true if confirmed, false if cancelled
   */
  confirm(data: ConfirmationDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: data,
      disableClose: true
    });

    return dialogRef.afterClosed();
  }

  /**
   * Quick method for delete confirmations
   * @param itemName Name of the item being deleted
   * @param itemType Type of item (e.g., 'venue', 'user', 'event')
   * @returns Observable<boolean>
   */
  confirmDelete(itemName: string, itemType: string = 'item'): Observable<boolean> {
    const data: ConfirmationDialogData = {
      title: `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmButtonText: `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'warn',
      icon: 'delete_forever'
    };

    return this.confirm(data);
  }

  /**
   * Quick method for general confirmations
   * @param title Dialog title
   * @param message Dialog message
   * @param confirmText Confirm button text
   * @returns Observable<boolean>
   */
  confirmAction(title: string, message: string, confirmText: string = 'Confirm'): Observable<boolean> {
    const data: ConfirmationDialogData = {
      title,
      message,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'primary',
      icon: 'help_outline'
    };

    return this.confirm(data);
  }
}
