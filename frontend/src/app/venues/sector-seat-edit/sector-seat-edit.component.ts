import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Venue } from '../../api/model/venue';
import { Sector } from '../../api/model/sector';
import { SectorInput } from '../../api/model/sector-input';
import { SectorSeatsInput } from '../../api/model/sector-seats-input';
import { SeatRow } from '../../api/model/seat-row';
import { Seat } from '../../api/model/seat';
import { Subject, takeUntil, finalize, firstValueFrom } from 'rxjs';
import Konva from 'konva';

interface EditableSeat extends Seat {
  selected?: boolean;
  originalPosition?: { x: number; y: number };
}

interface EditableRow extends SeatRow {
  seats: EditableSeat[];
}

interface EditableSector extends Sector {
  rows: EditableRow[];
}

@Component({
  selector: 'app-sector-seat-edit',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './sector-seat-edit.component.html',
  styleUrls: ['./sector-seat-edit.component.scss']
})
export class SectorSeatEditComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proEventIQService = inject(ProEventIQService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // State signals
  venue = signal<Venue | null>(null);
  sector = signal<EditableSector | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  hasChanges = signal(false);

  // Selection state
  selectedSeats = signal<EditableSeat[]>([]);
  selectedRows = signal<EditableRow[]>([]);
  isCtrlPressed = signal(false);
  isShiftPressed = signal(false);

  // Zoom and canvas settings
  zoom = signal(1);
  showGrid = signal(true);
  canvasWidth = 1200;
  canvasHeight = 800;
  private readonly gridSize = 20;
  private readonly seatSize = 12;
  private readonly seatSpacing = 4;

  // Konva objects
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private readonly seatGroups = new Map<string, Konva.Group>();
  private readonly rowGroups = new Map<string, Konva.Group>();
  private konvaInitialized = false;

  // Form
  seatForm: FormGroup = this.fb.group({
    orderNumber: [null, [Validators.min(1)]],
    priceCategory: [''],
    status: ['active', Validators.required]
  });

  rowForm: FormGroup = this.fb.group({
    name: ['', Validators.required]
  });

  // Route parameters
  venueId = signal<string>('');
  sectorId = signal<string>('');

  private seatTooltip: Konva.Label | null = null;

  constructor() {
    // Handle keyboard events for multi-select
    effect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Control') this.isCtrlPressed.set(true);
        if (e.key === 'Shift') this.isShiftPressed.set(true);
        if (e.key === 'Escape') this.deselectAll();
        if (e.key === 'Delete' && this.selectedSeats().length > 0) {
          this.deleteSelectedSeats();
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Control') this.isCtrlPressed.set(false);
        if (e.key === 'Shift') this.isShiftPressed.set(false);
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    });

    // Watch for zoom changes
    effect(() => {
      // Ensure we track the zoom signal
      const scale = this.zoom();
      
      // Use untracked to avoid re-running the effect during the update
      untracked(() => {
        if (this.stage && this.konvaInitialized && this.layer) {
          // Clear any existing transforms
          this.stage.scaleX(1);
          this.stage.scaleY(1);
          
          // Apply the scale
          this.stage.scaleX(scale);
          this.stage.scaleY(scale);
          
          // Update the canvas element size to match the scaled dimensions
          if (this.canvasContainer) {
            const canvasElement = this.canvasContainer.nativeElement.querySelector('canvas');
            if (canvasElement) {
              const newWidth = this.canvasWidth * scale;
              const newHeight = this.canvasHeight * scale;
              
              canvasElement.style.width = `${newWidth}px`;
              canvasElement.style.height = `${newHeight}px`;
              canvasElement.style.transformOrigin = 'top left';
            }
          }
          
          // Force redraw with a slight delay to ensure everything is updated
          requestAnimationFrame(() => {
            this.layer?.batchDraw();
          });
        }
      });
    });

    // Handle window resize
    effect(() => {
      const handleResize = () => {
        if (this.konvaInitialized) {
          setTimeout(() => {
            this.resizeCanvas();
            this.renderGrid();
          }, 100);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    });
  }

  ngOnInit() {
    // Get route parameters
    const venueId = this.route.snapshot.paramMap.get('venueId');
    const sectorId = this.route.snapshot.paramMap.get('sectorId');

    if (!venueId || !sectorId) {
      this.error.set('Missing venue or sector ID');
      return;
    }

    this.venueId.set(venueId);
    this.sectorId.set(sectorId);

    this.loadVenueAndSector();
  }

  ngAfterViewInit() {
    // Delay initialization to ensure the container is ready
    setTimeout(() => {
      this.initializeKonva();
    }, 200);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.stage) {
      this.stage.destroy();
    }
  }

  private loadVenueAndSector() {
    this.loading.set(true);
    this.error.set(null);

    this.proEventIQService.getVenue(this.venueId())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (venue) => {
          this.venue.set(venue);
          
          const sector = venue.sectors?.find(s => s.sectorId === this.sectorId());
          
          if (!sector) {
            this.error.set('Sector not found in venue');
            return;
          }

          // Transform sector data for editing
          const editableSector: EditableSector = {
            ...sector,
            rows: (sector.rows || []).map((row, rowIndex) => ({
              ...row,
              // Ensure row has an ID
              seatRowId: row.seatRowId || `temp-row-${Date.now()}-${rowIndex}`,
              seats: (row.seats || []).map((seat, seatIndex) => ({
                ...seat,
                // Ensure seat has an ID
                seatId: seat.seatId || `temp-seat-${Date.now()}-${rowIndex}-${seatIndex}`,
                selected: false,
                originalPosition: seat.position ? { x: seat.position.x ?? 0, y: seat.position.y ?? 0 } : { x: 0, y: 0 }
              }))
            }))
          };

          this.sector.set(editableSector);
          
          if (this.konvaInitialized) {
            this.renderSector();
          }
        },
        error: (err) => {
          console.error('Error loading venue:', err);
          this.error.set('Failed to load venue data: ' + (err.message || err));
        }
      });
  }

  private initializeKonva() {
    if (!this.canvasContainer || this.konvaInitialized) {
      console.log('Konva init skipped - container not ready or already initialized');
      return;
    }

    console.log('Initializing Konva canvas...');

    try {
      this.resizeCanvas();

      this.stage = new Konva.Stage({
        container: this.canvasContainer.nativeElement,
        width: this.canvasWidth,
        height: this.canvasHeight,
      });

      this.layer = new Konva.Layer();
      this.stage.add(this.layer);

      // Add background
      const background = new Konva.Rect({
        name: 'canvas-background',
        x: 0,
        y: 0,
        width: this.canvasWidth,
        height: this.canvasHeight,
        fill: '#f5f5f5',
        listening: true
      });

      this.layer.add(background);

      // Handle canvas clicks for deselection
      this.stage.on('click', (e) => {
        if (e.target === this.stage || e.target === background) {
          if (!this.isCtrlPressed()) {
            this.deselectAll();
          }
        }
      });

      // Add simple mouse wheel zoom support
      this.stage.on('wheel', (e) => {
        e.evt.preventDefault();
        
        const oldZoom = this.zoom();
        const scaleBy = 1.1;
        let newZoom;
        
        if (e.evt.deltaY < 0) {
          // Zoom in
          newZoom = Math.min(oldZoom * scaleBy, 3);
        } else {
          // Zoom out
          newZoom = Math.max(oldZoom / scaleBy, 0.3);
        }
        
        if (newZoom !== oldZoom) {
          this.zoom.set(newZoom);
        }
      });

      this.konvaInitialized = true;
      console.log('Konva initialized successfully');
      
      this.renderGrid();
      
      if (this.sector()) {
        console.log('Rendering sector after Konva init...');
        this.renderSector();
      } else {
        console.log('No sector data available yet');
      }
    } catch (error) {
      console.error('Error initializing Konva:', error);
      this.snackBar.open('Error initializing canvas', 'Close', { duration: 5000 });
    }
  }

  private resizeCanvas() {
    if (!this.canvasContainer) return;

    const container = this.canvasContainer.nativeElement;
    const containerRect = container.getBoundingClientRect();
    
    // Use the full container width and account for any padding/borders
    this.canvasWidth = Math.max(800, containerRect.width);
    this.canvasHeight = Math.max(600, Math.min(800, window.innerHeight * 0.6));

    if (this.stage) {
      this.stage.width(this.canvasWidth);
      this.stage.height(this.canvasHeight);

      const background = this.layer?.findOne('.canvas-background') as Konva.Rect;
      if (background) {
        background.width(this.canvasWidth);
        background.height(this.canvasHeight);
      }

      this.stage.batchDraw();
    }
  }

  private renderGrid() {
    if (!this.layer) return;

    // Remove existing grid lines first
    this.layer.find('.grid-line').forEach(line => line.destroy());

    // Only add new grid lines if grid should be shown
    if (this.showGrid()) {
      // Vertical lines
      for (let i = 0; i <= Math.ceil(this.canvasWidth / this.gridSize); i++) {
        const line = new Konva.Line({
          points: [i * this.gridSize, 0, i * this.gridSize, this.canvasHeight],
          stroke: '#ddd',
          strokeWidth: 1,
          opacity: 0.5,
          listening: false,
          name: 'grid-line'
        });
        this.layer.add(line);
      }

      // Horizontal lines
      for (let i = 0; i <= Math.ceil(this.canvasHeight / this.gridSize); i++) {
        const line = new Konva.Line({
          points: [0, i * this.gridSize, this.canvasWidth, i * this.gridSize],
          stroke: '#ddd',
          strokeWidth: 1,
          opacity: 0.5,
          listening: false,
          name: 'grid-line'
        });
        this.layer.add(line);
      }
    }

    this.layer.batchDraw();
  }

  private renderSector() {
    if (!this.layer || !this.sector()) return;

    // Clear existing seat and row groups
    this.seatGroups.clear();
    this.rowGroups.clear();
    this.layer.find('.seat-group, .row-group').forEach(group => group.destroy());

    const sector = this.sector()!;
    const startY = 100;
    let currentY = startY;

    // If no rows exist, show empty sector message
    if (!sector.rows || sector.rows.length === 0) {
      const emptyText = new Konva.Text({
        text: 'No rows in this sector. Click "Add New Row" to get started.',
        x: 50,
        y: currentY,
        fontSize: 16,
        fill: '#666',
        fontStyle: 'bold',
        listening: false
      });
      this.layer.add(emptyText);
      this.layer.batchDraw();
      return;
    }

    // Render each row
    sector.rows.forEach((row, rowIndex) => {
      const rowGroup = new Konva.Group({
        name: 'row-group',
        x: 50,
        y: currentY,
        draggable: false
      });

      // Row label
      const rowLabel = new Konva.Text({
        text: row.name ?? `Row ${rowIndex + 1}`,
        x: -40,
        y: 0,
        fontSize: 14,
        fill: '#333',
        fontStyle: 'bold',
        listening: false
      });
      rowGroup.add(rowLabel);

      // Render seats in this row
      const rowHeight = this.renderSeatsInRow(row, rowGroup);
      
      this.layer?.add(rowGroup);
      
      // Only store in map if row has an ID
      if (row.seatRowId) {
        this.rowGroups.set(row.seatRowId, rowGroup);
      }

      currentY += rowHeight + 30; // Add spacing between rows
    });

    // Ensure all existing seat groups are draggable
    this.seatGroups.forEach(group => {
      group.draggable(true);
    });

    this.layer.batchDraw();
  }

  private renderSeatsInRow(row: EditableRow, rowGroup: Konva.Group): number {
    if (!row.seats || row.seats.length === 0) {
      // Show placeholder text for empty row
      const emptyText = new Konva.Text({
        text: 'No seats - click to add',
        x: 0,
        y: 5,
        fontSize: 12,
        fill: '#999',
        listening: true,
        cursor: 'pointer'
      });
      
      emptyText.on('click', () => {
        this.addSeatToRow(row);
      });
      
      rowGroup.add(emptyText);
      return 20;
    }

    let maxY = 0;
    row.seats.forEach((seat, seatIndex) => {
      const seatGroup = this.createSeatGroup(seat, seatIndex);
      rowGroup.add(seatGroup);
      
      // Only store in map if seat has an ID
      if (seat.seatId) {
        this.seatGroups.set(seat.seatId, seatGroup);
      }

      if (seat.position) {
        maxY = Math.max(maxY, (seat.position.y ?? 0) + this.seatSize);
      }
    });

    return Math.max(maxY, this.seatSize + 10);
  }

  private ensureSeatTooltip() {
    if (!this.layer) return;
    if (!this.seatTooltip) {
      this.seatTooltip = new Konva.Label({
        listening: false
      });
      this.seatTooltip.add(new Konva.Tag({
        fill: '#333',
        pointerDirection: 'down',
        pointerWidth: 8,
        pointerHeight: 6,
        lineJoin: 'round',
        cornerRadius: 4,
        shadowColor: '#000',
        shadowBlur: 4,
        shadowOffset: { x: 2, y: 2 },
        shadowOpacity: 0.2
      }));
      this.seatTooltip.add(new Konva.Text({
        text: '',
        fontSize: 12,
        padding: 6,
        fill: '#fff',
        fontFamily: 'Roboto, Arial, sans-serif'
      }));
      this.layer.add(this.seatTooltip);
      this.seatTooltip.visible(false);
    }
  }

  private createSeatGroup(seat: EditableSeat, seatIndex: number): Konva.Group {
    const seatGroup = new Konva.Group({
      name: 'seat-group',
      x: seat.position?.x ?? (seatIndex * (this.seatSize + this.seatSpacing)),
      y: seat.position?.y ?? 0,
      draggable: true // Always enable dragging
    });

    // Seat rectangle
    const rect = new Konva.Rect({
      width: this.seatSize,
      height: this.seatSize,
      fill: this.getSeatColor(seat),
      stroke: seat.selected ? '#2196f3' : '#333',
      strokeWidth: seat.selected ? 3 : 1,
      cornerRadius: 2
    });

    // Seat number text
    const text = new Konva.Text({
      text: seat.orderNumber?.toString() ?? '',
      x: 1,
      y: 2,
      width: this.seatSize - 2,
      height: this.seatSize - 4,
      fontSize: 8,
      fill: '#000',
      align: 'center',
      verticalAlign: 'middle',
      listening: false
    });

    seatGroup.add(rect, text);

    // Tooltip logic
    seatGroup.on('mouseover', (e) => {
      this.ensureSeatTooltip();
      if (!this.seatTooltip) return;
      // Set tooltip text
      const rowName = this.getRowNameForSeat(seat);
      const tooltipText = `Row: ${rowName}, Seat: ${seat.orderNumber ?? ''}`;
      const labelText = this.seatTooltip.findOne('Text') as Konva.Text;
      labelText.text(tooltipText);
      // Position tooltip above the seat
      const absPos = seatGroup.getAbsolutePosition();
      this.seatTooltip.position({
        x: absPos.x + this.seatSize / 2,
        y: absPos.y - 10
      });
      this.seatTooltip.visible(true);
      this.layer?.batchDraw();
    });
    seatGroup.on('mouseout', (e) => {
      if (this.seatTooltip) {
        this.seatTooltip.visible(false);
        this.layer?.batchDraw();
      }
    });

    // Handle seat clicks
    seatGroup.on('click', (e) => {
      e.cancelBubble = true;
      this.handleSeatClick(seat);
    });

    // Handle seat dragging
    seatGroup.on('dragend', () => {
      const newPos = seatGroup.position();
      this.updateSeatPosition(seat, newPos.x, newPos.y);
    });

    return seatGroup;
  }

  private getSeatColor(seat: EditableSeat): string {
    if (seat.selected) return '#bbdefb';
    return seat.status === 'active' ? '#4caf50' : '#f44336';
  }

  private handleSeatClick(seat: EditableSeat) {
    const currentSelected = this.selectedSeats();
    
    if (this.isCtrlPressed()) {
      // Multi-select mode
      if (seat.selected) {
        this.deselectSeat(seat);
      } else {
        this.selectSeat(seat);
      }
    } else if (this.isShiftPressed() && currentSelected.length > 0) {
      // Range select within same row or column
      this.selectSeatRange(currentSelected[0], seat);
    } else {
      // Single select
      this.deselectAll();
      this.selectSeat(seat);
    }
  }

  private selectSeat(seat: EditableSeat) {
    seat.selected = true;
    const current = this.selectedSeats();
    if (!current.includes(seat)) {
      this.selectedSeats.set([...current, seat]);
    }
    this.updateSeatDisplay(seat);
  }

  private deselectSeat(seat: EditableSeat) {
    seat.selected = false;
    this.selectedSeats.set(this.selectedSeats().filter(s => s !== seat));
    this.updateSeatDisplay(seat);
  }

  private selectSeatRange(fromSeat: EditableSeat, toSeat: EditableSeat) {
    const sector = this.sector();
    if (!sector) return;

    // Find seats in same row or column
    const fromRow = this.findSeatRow(fromSeat);
    const toRow = this.findSeatRow(toSeat);

    if (fromRow && toRow && fromRow === toRow) {
      // Same row - select range
      this.selectSeatsInRowRange(fromRow, fromSeat, toSeat);
    } else {
      // Different rows - select column range
      this.selectSeatsInColumnRange(fromSeat, toSeat);
    }
  }

  private findSeatRow(seat: EditableSeat): EditableRow | null {
    const sector = this.sector();
    if (!sector) return null;

    return sector.rows.find(row => 
      row.seats.some(s => s.seatId === seat.seatId)
    ) || null;
  }

  private selectSeatsInRowRange(row: EditableRow, fromSeat: EditableSeat, toSeat: EditableSeat) {
    const fromIndex = row.seats.findIndex(s => s.seatId === fromSeat.seatId);
    const toIndex = row.seats.findIndex(s => s.seatId === toSeat.seatId);
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);

    for (let i = startIndex; i <= endIndex; i++) {
      this.selectSeat(row.seats[i]);
    }
  }

  private selectSeatsInColumnRange(fromSeat: EditableSeat, toSeat: EditableSeat) {
    const sector = this.sector();
    if (!sector) return;

    const fromOrder = fromSeat.orderNumber ?? 0;
    const toOrder = toSeat.orderNumber ?? 0;

    if (fromOrder === toOrder) {
      // Same column - select seats with same order number
      sector.rows.forEach(row => {
        const seat = row.seats.find(s => s.orderNumber === fromOrder);
        if (seat) this.selectSeat(seat);
      });
    }
  }

  private updateSeatDisplay(seat: EditableSeat) {
    const seatGroup = this.seatGroups.get(seat.seatId!);
    if (!seatGroup) return;

    const rect = seatGroup.findOne('Rect') as Konva.Rect;
    if (rect) {
      rect.fill(this.getSeatColor(seat));
      rect.stroke(seat.selected ? '#2196f3' : '#333');
      rect.strokeWidth(seat.selected ? 3 : 1);
    }

    this.layer?.batchDraw();
  }

  private updateSeatPosition(seat: EditableSeat, x: number, y: number) {
    // Snap to grid
    const gridX = Math.round(x / this.gridSize) * this.gridSize;
    const gridY = Math.round(y / this.gridSize) * this.gridSize;

    if (!seat.position) {
      seat.position = { x: gridX, y: gridY };
    } else {
      seat.position.x = gridX;
      seat.position.y = gridY;
    }

    // Update Konva position
    const seatGroup = this.seatGroups.get(seat.seatId!);
    if (seatGroup) {
      seatGroup.position({ x: gridX, y: gridY });
      this.layer?.batchDraw();
    }

    this.hasChanges.set(true);
  }

  // Toolbar actions
  addNewRow() {
    // Generate a temporary ID for the new row
    const tempId = `temp-row-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const newRow: EditableRow = {
      seatRowId: tempId,
      name: `Row ${(this.sector()?.rows.length ?? 0) + 1}`,
      seats: []
    };

    const sector = this.sector();
    if (sector) {
      sector.rows.push(newRow);
      this.sector.set({ ...sector });
      this.renderSector();
      this.hasChanges.set(true);
      
      this.snackBar.open(`Row "${newRow.name}" added`, 'Close', { duration: 2000 });
    } else {
      this.snackBar.open('Error: No sector loaded', 'Close', { duration: 3000 });
    }
  }

  addSeatToRow(row: EditableRow) {
    // Generate a temporary ID for the new seat
    const tempId = `temp-seat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const newSeat: EditableSeat = {
      seatId: tempId,
      orderNumber: (row.seats?.length ?? 0) + 1,
      position: { x: (row.seats?.length ?? 0) * (this.seatSize + this.seatSpacing), y: 0 },
      status: 'active' as const,
      selected: false,
      originalPosition: { x: 0, y: 0 }
    };

    if (!row.seats) {
      row.seats = [];
    }
    
    row.seats.push(newSeat);
    this.renderSector();
    this.hasChanges.set(true);
    
    this.snackBar.open(`Seat ${newSeat.orderNumber} added to ${row.name}`, 'Close', { duration: 2000 });
  }

  deleteSelectedSeats() {
    const selectedSeats = this.selectedSeats();
    if (selectedSeats.length === 0) return;

    const sector = this.sector();
    if (!sector) return;

    // Remove seats from their rows
    sector.rows.forEach(row => {
      row.seats = row.seats.filter(seat => !selectedSeats.includes(seat));
    });

    this.selectedSeats.set([]);
    this.sector.set({ ...sector });
    this.renderSector();
    this.hasChanges.set(true);
  }

  deleteSelectedRows() {
    // Implementation for deleting rows
    const sector = this.sector();
    if (!sector) return;

    // For now, delete rows that have no seats
    sector.rows = sector.rows.filter(row => row.seats.length > 0);
    this.sector.set({ ...sector });
    this.renderSector();
    this.hasChanges.set(true);
  }

  deselectAll() {
    const sector = this.sector();
    if (!sector) return;

    sector.rows.forEach(row => {
      row.seats.forEach(seat => {
        seat.selected = false;
        this.updateSeatDisplay(seat);
      });
    });

    this.selectedSeats.set([]);
  }

  // Add seat in toolbar mode - add to first available row or create new row
  addSeatInToolbarMode() {
    const sector = this.sector();
    if (!sector) {
      this.snackBar.open('No sector loaded', 'Close', { duration: 3000 });
      return;
    }
    
    // Find the first row or create one if none exist
    let targetRow = sector.rows.length > 0 ? sector.rows[0] : null;
    
    if (!targetRow) {
      // Create a new row first
      this.addNewRow();
      targetRow = sector.rows[0];
    }
    
    if (targetRow) {
      this.addSeatToRow(targetRow);
    }
  }

  // Zoom controls
  zoomIn() {
    const newZoom = Math.min(this.zoom() * 1.2, 3);
    this.zoom.set(newZoom);
  }

  zoomOut() {
    const newZoom = Math.max(this.zoom() / 1.2, 0.3);
    this.zoom.set(newZoom);
  }

  resetZoom() {
    this.zoom.set(1);
    // Reset position to center when resetting zoom
    if (this.stage) {
      this.stage.x(0);
      this.stage.y(0);
      requestAnimationFrame(() => {
        this.layer?.batchDraw();
      });
    }
  }

  toggleGrid() {
    this.showGrid.set(!this.showGrid());
    this.renderGrid();
  }

  // Save changes
  async saveChanges() {
    const sector = this.sector();
    if (!sector || this.saving()) return;

    this.saving.set(true);

    try {
      // First update sector properties if needed
      if (sector.sectorId && !sector.sectorId.startsWith('temp-')) {
        await this.updateSectorProperties(sector);
      }
      
      // Convert EditableSector to SectorSeatsInput format
      const sectorSeatsInput: SectorSeatsInput = {
        rows: sector.rows.map(row => ({
          seatRowId: row.seatRowId?.startsWith('temp-') ? undefined : row.seatRowId,
          name: row.name,
          seats: row.seats.map(seat => ({
            seatId: seat.seatId?.startsWith('temp-') ? undefined : seat.seatId,
            orderNumber: seat.orderNumber,
            position: seat.position,
            status: seat.status,
            priceCategory: seat.priceCategory
          }))
        }))
      };

      // Save the seat layout using updateSectorSeats
      if (sector.sectorId && !sector.sectorId.startsWith('temp-')) {
        await firstValueFrom(this.proEventIQService.updateSectorSeats(
          this.venueId(), 
          sector.sectorId, 
          sectorSeatsInput
        ));
      }
      
      this.snackBar.open('Sector and seat layout saved successfully!', 'Close', { duration: 3000 });
      this.hasChanges.set(false);
      
      // Reload to get the updated data with proper IDs
      this.loadVenueAndSector();
    } catch (error) {
      console.error('Error saving changes:', error);
      this.snackBar.open('Error saving sector changes', 'Close', { duration: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  private async updateSectorProperties(sector: EditableSector) {
    if (!sector.sectorId) {
      throw new Error('Cannot update sector without ID');
    }

    const sectorInput: SectorInput = {
      name: sector.name,
      order: sector.order,
      position: sector.position,
      rotation: sector.rotation,
      priceCategory: sector.priceCategory,
      status: sector.status
    };

    await firstValueFrom(this.proEventIQService.updateSector(
      this.venueId(), 
      sector.sectorId, 
      sectorInput
    ));
  }

  cancelChanges() {
    this.loadVenueAndSector();
    this.hasChanges.set(false);
  }

  goBack() {
    this.router.navigate(['/venues', this.venueId(), 'map-edit']);
  }

  // Helper methods
  getRowNameForSeat(seat: EditableSeat): string {
    const sector = this.sector();
    if (!sector) return 'Unknown Row';
    
    for (const row of sector.rows) {
      if (row.seats && row.seats.some(s => s.seatId === seat.seatId)) {
        return row.name || 'Unnamed Row';
      }
    }
    return 'Unknown Row';
  }

  getSelectedSeatInfo(): string {
    const selected = this.selectedSeats();
    if (selected.length === 0) return '';
    if (selected.length === 1) {
      const rowName = this.getRowNameForSeat(selected[0]);
      return `Seat ${selected[0].orderNumber ?? 'Unknown'} in ${rowName}`;
    }
    return `${selected.length} seats selected`;
  }

  getTotalSeats(): number {
    const sector = this.sector();
    if (!sector) return 0;
    return sector.rows.reduce((total, row) => total + (row.seats?.length ?? 0), 0);
  }
}
