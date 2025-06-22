// REMOVE THIS FILE: This component has been moved to the 'venue-map-edit' folder with separate .ts, .html, and .scss files.

import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-venue-map-edit',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="venue-map-edit-container">
      <h2>Edit Venue Map</h2>
      <p>Venue map editing functionality coming soon.</p>
      <button mat-stroked-button color="primary" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Back
      </button>
    </div>
  `,
  styles: [`
    .venue-map-edit-container {
      padding: 2rem;
      text-align: center;
    }
    h2 {
      margin-bottom: 1rem;
    }
    button {
      margin-top: 2rem;
    }
  `]
})
export class VenueMapEditComponent {
  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/venues']);
  }
}
