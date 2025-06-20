import { Routes } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { VenuesListComponent } from './venues/venues-list.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'venues', component: VenuesListComponent },
      { path: 'venues/:id', loadComponent: () => import('./venues/venue-detail.component').then(m => m.VenueDetailComponent) },
      // Other routes will be added here as needed
    ]
  }
];
