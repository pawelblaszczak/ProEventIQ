import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxKonvaModule } from 'ngx-konva';
import { Venue } from '../../api/model/venue';
import { Sector } from '../../api/model/sector';
import { SeatRow } from '../../api/model/seat-row';
import { Seat } from '../../api/model/seat';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { ConfirmationDialogService } from '../../shared';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatListModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    NgxKonvaModule, 
    RouterModule
  ],
  templateUrl: './venue-detail.component.html',
  styleUrls: ['./venue-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private venueApi = inject(ProEventIQService);
  private confirmationDialog = inject(ConfirmationDialogService);

  private venueId = signal<string | null>(null);
  public venue = signal<Venue | null>(null);
  public loading = signal(true);
  public error = signal<string | null>(null);
  zoom = signal(1);
  showSeats = signal(false);
  canvasWidth = window.innerWidth;
  canvasHeight = Math.max(400, window.innerHeight * 0.6);
  sectorBaseWidth = 150; // Base width for sectors when displaying seats  // Helper methods to safely access position values
  getSeatPositionValue(seat: Seat, property: 'x' | 'y'): number {
    if (!seat.position) {
      console.warn('Seat has no position data:', seat);
      return 0;
    }
    return seat.position[property] ?? 0;
  }
  
  getSectorPositionValue(sector: Sector, property: 'x' | 'y'): number {
    if (!sector.position) {
      console.warn('Sector has no position data:', sector);
      return 0;
    }
    return sector.position[property] ?? 0;
  }
  
  // Get row label position using the first seat with position data or default to a fixed value
  getRowLabelPosition(row: SeatRow): number {
    if (!row.seats || row.seats.length === 0) {
      return 30; // Default Y position if no seats
    }
    
    // Find the first seat with position data
    for (const seat of row.seats) {
      if (seat.position) {
        return this.getSeatPositionValue(seat, 'y');
      }
    }
    
    return 30; // Default Y position if no seat has position data
  }
  
  // Check if all data is complete (all sectors and seats have position data)
  hasCompleteData(): boolean {
    const venue = this.venue();
    if (!venue || !venue.sectors) return false;
    
    // Check all sectors have positions
    for (const sector of venue.sectors) {
      if (!sector.position) return false;
      
      // Check all rows have seats with positions
      if (sector.rows) {
        for (const row of sector.rows) {
          if (row.seats) {
            for (const seat of row.seats) {
              if (!seat.position) return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.venueId.set(id);
      if (id) {
        this.fetchVenue(id);
      }
    });
    
    // Resize canvas initially and on window resize
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });    // Initialize showSeats based on initial zoom value
    this.showSeats.set(this.zoom() > 1.5);
    
    // Log initial state
    console.log(`Initial zoom: ${this.zoom()}, showing seats: ${this.showSeats()}`);
    
    // Create an effect to update seat visibility based on zoom
    effect(() => {
      const currentZoom = this.zoom();
      // Only read signals here, do not write to them
      // Instead, update showSeats in zoomIn/zoomOut methods
      // this.showSeats.set(currentZoom > 1.5); // <-- REMOVE THIS LINE
      console.log(`Zoom changed to ${currentZoom}, showing seats: ${currentZoom > 1.5}`);
    });
  }

  private resizeCanvas() {
    // Set canvas to full viewport width and responsive height
    this.canvasWidth = Math.max(window.innerWidth - 32, 800); // Account for margins/padding
    this.canvasHeight = Math.max(window.innerHeight * 0.6, 500);
  }
  private fetchVenue(id: string) {
    this.loading.set(true);
    this.venueApi.getVenue(id).subscribe({
      next: (venue: Venue) => {
        // Check for missing position data in the response
        let hasMissingPositions = false;
        if (venue.sectors) {
          venue.sectors.forEach(sector => {
            if (!sector.position) {
              hasMissingPositions = true;
              console.warn(`Sector "${sector.name || 'unknown'}" is missing position data`);
            }
            
            if (sector.rows) {
              sector.rows.forEach(row => {
                if (row.seats) {
                  row.seats.forEach(seat => {
                    if (!seat.position) {
                      hasMissingPositions = true;
                      console.warn(`Seat in row "${row.name || 'unknown'}" is missing position data`);
                    }
                  });
                }
              });
            }
          });
        }
        
        // Set venue data
        this.venue.set(venue);
        this.loading.set(false);
        
        // Load sector details
        this.loadSectorDetails(venue);
        
        // Show warning if positions are missing
        if (hasMissingPositions) {
          console.warn('Some venue elements have missing position data. The visualization may not be complete.');
        }
      },
      error: (err: any) => {
        this.error.set('Failed to load venue.');
        this.loading.set(false);
        console.error('Error loading venue data:', err);
      }
    });
  }private loadSectorDetails(venue: Venue) {
    if (venue.sectors) {
      // Log warning for any sectors without position data
      venue.sectors.forEach(sector => {
        if (!sector.position) {
          console.warn(`Sector "${sector.name || 'unknown'}" is missing position data`);
        }
        
        // Check if seats have position data
        if (sector.rows) {
          sector.rows.forEach(row => {
            if (row.seats) {
              row.seats.forEach(seat => {
                if (!seat.position) {
                  console.warn(`Seat in row "${row.name || 'unknown'}" is missing position data`);
                }
              });
            }
          });
        }
      });
      
      // Use the venue data directly without any modification
      console.log('Using venue data directly from backend without modifications');
    }
  }
  zoomIn() {
    const newZoom = this.zoom() * 1.2;
    this.zoom.set(newZoom);
    this.showSeats.set(newZoom > 1.5);
  }

  zoomOut() {
    const newZoom = this.zoom() / 1.2;
    this.zoom.set(newZoom);
    this.showSeats.set(newZoom > 1.5);
  }  // No longer needed - using position directly from backend
  // Get color for seat based on status
  getSeatColor(seat: Seat): string {
    return seat.status === Seat.StatusEnum.Active ? '#4caf50' : 
           seat.status === Seat.StatusEnum.Inactive ? '#f44336' : 
           '#ff9800'; // default or other status
  }
    // Handle seat hover - will be used with event binding in future implementation
  onSeatHover(event: any, seat: Seat, rowName: string | undefined): void {
    const tooltip = document.createElement('div');
    tooltip.className = 'seat-tooltip';
    
    // Format status for display
    const statusText = seat.status === Seat.StatusEnum.Active ? 'Active' : 
                      seat.status === Seat.StatusEnum.Inactive ? 'Inactive' : 
                      'Unknown';
    
    tooltip.innerHTML = `
      <div>Seat: ${seat.orderNumber || 'N/A'}</div>
      <div>Row: ${rowName || 'N/A'}</div>
      <div>Status: ${statusText}</div>
      <div>Price: ${seat.priceCategory || 'Standard'}</div>
    `;
    
    const stage = event.target.getStage();
    const position = stage.getPointerPosition();
    
    if (position) {
      tooltip.style.top = `${position.y + 10}px`;
      tooltip.style.left = `${position.x + 10}px`;
      tooltip.style.display = 'block';
      
      document.body.appendChild(tooltip);
      
      // Remove tooltip when mouse leaves
      const removeTooltip = () => {
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
        event.target.off('mouseout.tooltip');
      };
      
      event.target.on('mouseout.tooltip', removeTooltip);
    }
  }  /**
   * Returns the full address string, combining address, city, and country, skipping missing parts.
   */
  getFullAddress(): string {
    const venue = this.venue();
    if (!venue) return 'Not provided';
    const parts = [venue.address, venue.city, venue.country].filter(part => !!part);
    return parts.length ? parts.join(', ') : 'Not provided';
  }  onDelete(): void {
    const venueId = this.venueId();
    const venue = this.venue();
    if (!venueId || !venue) return;

    this.confirmationDialog.confirmDelete(venue.name || 'this venue', 'venue')
      .subscribe(confirmed => {
        if (confirmed) {
          this.loading.set(true);
          this.venueApi.deleteVenue(venueId).subscribe({
            next: () => {
              console.log('Venue deleted successfully!');
              this.router.navigate(['/venues']);
            },
            error: err => {
              console.error('Error deleting venue:', err);
              let errorMessage = 'Failed to delete venue.';
              if (err?.error?.message) {
                errorMessage += ' ' + err.error.message;
              } else if (typeof err?.error === 'string') {
                errorMessage += ' ' + err.error;
              }
              this.error.set(errorMessage);
              this.loading.set(false);
            }
          });
        }
      });
  }
}
