import { Routes } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { VenuesListComponent } from './venues/venues-list/venues-list.component';
import { ShowsListComponent } from './shows/shows-list/shows-list.component';
import { EventsListComponent } from './events/events-list/events-list.component';
import { HomeComponent } from './home/home.component';
import { canDeactivateVenueMapEdit } from './venues/venue-map-edit/can-deactivate-venue-map-edit.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'venues', component: VenuesListComponent },
      { path: 'venues/add', loadComponent: () => import('./venues/venue-edit/venue-edit.component').then(m => m.VenueEditComponent) },
      { path: 'venues/:id', loadComponent: () => import('./venues/venue-detail/venue-detail.component').then(m => m.VenueDetailComponent) },
      { path: 'venues/:id/edit', loadComponent: () => import('./venues/venue-edit/venue-edit.component').then(m => m.VenueEditComponent) },
  { path: 'venues/:venueId/map-edit', loadComponent: () => import('./venues/venue-map-edit').then(m => m.VenueMapEditComponent), canDeactivate: [canDeactivateVenueMapEdit] },
  { path: 'venues/:venueId/reservations', loadComponent: () => import('./events/venue-reservation/venue-reservation.component').then(m => m.VenueReservationComponent) },
      { path: 'venues/:venueId/sectors/:sectorId/seat-edit', loadComponent: () => import('./venues/sector-seat-edit/sector-seat-edit.component').then(m => m.SectorSeatEditComponent) },
      { path: 'shows', component: ShowsListComponent },
      { path: 'shows/add', loadComponent: () => import('./shows/show-edit/show-edit.component').then(m => m.ShowEditComponent) },
      { path: 'shows/:id', loadComponent: () => import('./shows/show-detail').then(m => m.ShowDetailComponent) },
      { path: 'shows/:id/edit', loadComponent: () => import('./shows/show-edit/show-edit.component').then(m => m.ShowEditComponent) },
      { path: 'events', component: EventsListComponent },
      { path: 'events/add', loadComponent: () => import('./events/event-edit/event-edit.component').then(m => m.EventEditComponent) },
      { path: 'events/:id', loadComponent: () => import('./events/event-detail').then(m => m.EventDetailComponent) },
      { path: 'events/:id/edit', loadComponent: () => import('./events/event-edit/event-edit.component').then(m => m.EventEditComponent) },
      // Other routes will be added here as needed
    ]
  }
];
