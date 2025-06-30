import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationDialogService } from '../../shared';
import { VenueMapEditComponent } from './venue-map-edit.component';

export const canDeactivateVenueMapEdit: CanDeactivateFn<VenueMapEditComponent> = async (component) => {
  if (component.hasChanges && typeof component.hasChanges === 'function' ? component.hasChanges() : component.hasChanges) {
    const confirmationDialog = inject(ConfirmationDialogService);
    const confirmed = await firstValueFrom(
      confirmationDialog.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave this page? All unsaved changes will be lost.',
        confirmButtonText: 'Leave Page',
        cancelButtonText: 'Stay on Page'
      })
    );
    return !!confirmed;
  }
  return true;
};
