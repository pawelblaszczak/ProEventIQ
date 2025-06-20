import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { NgxKonvaModule } from 'ngx-konva';
import { Venue } from '../api/model/venue';
import { Sector } from '../api/model/sector';
import { SeatRow } from '../api/model/seat-row';
import { Seat } from '../api/model/seat';
import { ProEventIQService } from '../api/api/pro-event-iq.service';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatListModule, MatIconModule, NgxKonvaModule],
  templateUrl: './venue-detail.component.html',
  styleUrls: ['./venue-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueDetailComponent {
  private route = inject(ActivatedRoute);
  private venueApi = inject(ProEventIQService);

  private venueId = signal<string | null>(null);
  public venue = signal<Venue | null>(null);
  public loading = signal(true);
  public error = signal<string | null>(null);  zoom = signal(1);
  showSeats = signal(false);
  canvasWidth = window.innerWidth;
  canvasHeight = Math.max(400, window.innerHeight * 0.6);
  sectorBaseWidth = 150; // Base width for sectors when displaying seats

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
      this.showSeats.set(currentZoom > 1.5);
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
        this.venue.set(venue);
        this.loading.set(false);
        this.loadSectorDetails(venue);
      },
      error: (err: any) => {
        this.error.set('Failed to load venue.');
        this.loading.set(false);
      }
    });
  }
  private loadSectorDetails(venue: Venue) {
    if (venue.sectors) {
      // Track loaded sectors to know when all are loaded
      const totalSectors = venue.sectors.length;
      let loadedSectors = 0;
      
      // Load detailed seat information for each sector
      venue.sectors.forEach((sector, index) => {
        if (sector.sectorId) {
          this.venueApi.getSector(sector.sectorId).subscribe({
            next: (detailedSector: Sector) => {
              // Update the sector in the venue with more detailed information
              if (venue.sectors && venue.sectors[index]) {
                // Preserve the original sector properties and add the detailed ones
                venue.sectors[index] = { 
                  ...venue.sectors[index], 
                  ...detailedSector,
                  // Ensure rows and seats are included
                  rows: detailedSector.rows || [] 
                };
                
                // Log for debugging
                console.log(`Loaded sector ${sector.name} with ${detailedSector.rows?.length || 0} rows`);
                if (detailedSector.rows) {
                  detailedSector.rows.forEach(row => {
                    console.log(`  Row ${row.name} has ${row.seats?.length || 0} seats`);
                  });
                }
                
                // Update venue reference when a sector is loaded
                loadedSectors++;
                if (loadedSectors === totalSectors) {
                  console.log('All sectors loaded with details');
                }
                
                // Update the venue reactive state with the fresh data
                this.venue.set({ ...venue });
              }
            },
            error: (err) => {
              console.error(`Failed to load details for sector ${sector.name}:`, err);
              loadedSectors++;
              // Even on error, check if all sectors have been processed
              if (loadedSectors === totalSectors) {
                console.log('All sectors processed (some with errors)');
              }
            }
          });
        }
      });
    }
  }
  zoomIn() {
    const newZoom = this.zoom() * 1.2;
    this.zoom.set(newZoom);
    
    // Check if we crossed the threshold for showing seats
    const newShowSeats = newZoom > 1.5;
    if (newShowSeats !== this.showSeats()) {
      console.log(`Zoom threshold crossed: ${newShowSeats ? 'Showing seats' : 'Hiding seats'}`);
      this.showSeats.set(newShowSeats);
    }
  }

  zoomOut() {
    const newZoom = this.zoom() / 1.2;
    this.zoom.set(newZoom);
    
    // Check if we crossed the threshold for showing seats
    const newShowSeats = newZoom > 1.5;
    if (newShowSeats !== this.showSeats()) {
      console.log(`Zoom threshold crossed: ${newShowSeats ? 'Showing seats' : 'Hiding seats'}`);
      this.showSeats.set(newShowSeats);
    }
  }
  // Calculate seat position within a sector
  getSeatPosition(seat: Seat, rowIndex: number) {
    const seatSize = 8;
    const seatSpacing = 12; // Slightly increased spacing for better visibility
    const rowHeight = 15;
    
    // Use the actual orderNumber to position seats (1-based to 0-based)
    const seatIndex = seat.orderNumber ? seat.orderNumber - 1 : 0;
    
    return {
      x: seatIndex * seatSpacing,
      y: rowIndex * rowHeight,
      width: seatSize,
      height: seatSize
    };
  }
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
    tooltip.innerHTML = `
      <div>Seat: ${seat.orderNumber || 'N/A'}</div>
      <div>Row: ${rowName || 'N/A'}</div>
      <div>Status: ${seat.status || 'N/A'}</div>
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
  }
}
