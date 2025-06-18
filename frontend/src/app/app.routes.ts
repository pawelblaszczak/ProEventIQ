import { Routes } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { VenuesListComponent } from './venues/venues-list.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'venues', pathMatch: 'full' },
      { path: 'venues', component: VenuesListComponent },
      // Other routes will be added here as needed
    ]
  }
];
