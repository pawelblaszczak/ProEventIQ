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
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { AddSeatDialogComponent, AddSeatDialogData, AddSeatDialogResult } from './add-seat-dialog/add-seat-dialog.component';
import { AddRowDialogComponent, AddRowDialogResult } from './add-row-dialog/add-row-dialog.component';
import { AddMultipleRowsDialogComponent, AddMultipleRowsDialogResult } from './add-multiple-rows-dialog/add-multiple-rows-dialog.component';
import { EditRowDialogComponent, EditRowDialogData, EditRowDialogResult } from './edit-row-dialog/edit-row-dialog.component';
import { Venue } from '../../api/model/venue';
import { Sector } from '../../api/model/sector';
import { SectorInput } from '../../api/model/sector-input';
import { SectorSeatsInput } from '../../api/model/sector-seats-input';
import { SeatRow } from '../../api/model/seat-row';
import { Seat } from '../../api/model/seat';
import { Subject, takeUntil, finalize, firstValueFrom } from 'rxjs';
import Konva from 'konva';
import { ConfirmationDialogService } from '../../shared/components/confirmation-dialog/confirmation-dialog.service';

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
  private readonly dialog = inject(MatDialog);
  private readonly confirmationDialogService = inject(ConfirmationDialogService);
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

  // Snap to grid state
  snapToGrid = signal(true);

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
          
          // Remove manual CSS scaling of the canvas element. Let Konva handle zoom.
          // if (this.canvasContainer) {
          //   const canvasElement = this.canvasContainer.nativeElement.querySelector('canvas');
          //   if (canvasElement) {
          //     const newWidth = this.canvasWidth * scale;
          //     const newHeight = this.canvasHeight * scale;
          //     canvasElement.style.width = `${newWidth}px`;
          //     canvasElement.style.height = `${newHeight}px`;
          //     canvasElement.style.transformOrigin = 'top left';
          //   }
          // }
          
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

    // Watch for sector changes and initialize Konva
    effect(() => {
      const sectorData = this.sector();
      
      untracked(() => {
        if (sectorData && !this.konvaInitialized) {
          console.log('Sector data available, attempting Konva initialization...');
          this.waitForContainerAndInitialize();
        }
      });
    });
  }

  ngOnInit() {
    console.log('SectorSeatEditComponent ngOnInit called');
    
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
    console.log('SectorSeatEditComponent ngAfterViewInit called');
    console.log('Canvas container available:', !!this.canvasContainer);
    
    // Wait for the sector data to be loaded and the container to be ready
    this.waitForContainerAndInitialize();
  }

  private waitForContainerAndInitialize() {
    let attempts = 0;
    const maxAttempts = 50; // Max 5 seconds (50 * 100ms)
    
    // Check if we have both the container and sector data
    const checkAndInit = () => {
      attempts++;
      
      console.log(`Attempt ${attempts}: Checking container and sector readiness...`);
      console.log('Container element:', !!this.canvasContainer?.nativeElement);
      console.log('Container connected:', this.canvasContainer?.nativeElement?.isConnected);
      console.log('Sector data:', !!this.sector());
      console.log('Already initialized:', this.konvaInitialized);
      
      if (this.canvasContainer?.nativeElement?.isConnected && this.sector() && !this.konvaInitialized) {
        console.log('Container and sector ready, initializing Konva...');
        this.initializeKonva();
      } else if (!this.konvaInitialized && attempts < maxAttempts) {
        // If not ready, wait a bit more and try again
        setTimeout(checkAndInit, 100);
      } else if (attempts >= maxAttempts) {
        console.error('Failed to initialize Konva after maximum attempts');
        this.snackBar.open('Failed to initialize canvas editor', 'Retry', { 
          duration: 0
        }).onAction().subscribe(() => {
          this.retryKonvaInitialization();
        });
      }
    };

    // Start checking
    setTimeout(checkAndInit, 50);
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
              // Ensure row has an orderNumber - use existing or assign based on index
              orderNumber: row.orderNumber ?? (rowIndex + 1),
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
          
          // Try to initialize Konva if not already done
          if (!this.konvaInitialized) {
            this.waitForContainerAndInitialize();
          } else {
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
    if (!this.canvasContainer?.nativeElement || this.konvaInitialized) {
      console.log('Konva init skipped - container not ready or already initialized');
      return;
    }

    // Double check that the container element is actually in the DOM
    const containerElement = this.canvasContainer.nativeElement;
    if (!containerElement.isConnected) {
      console.log('Container element not connected to DOM, waiting...');
      setTimeout(() => this.initializeKonva(), 100);
      return;
    }

    console.log('Initializing Konva canvas...');

    try {
      this.resizeCanvas();

      this.stage = new Konva.Stage({
        container: containerElement,
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
    if (!this.canvasContainer?.nativeElement) return;

    const container = this.canvasContainer.nativeElement;
    const containerRect = container.getBoundingClientRect();
    
    // Use the full container width and account for any padding/borders
    this.canvasWidth = Math.max(800, containerRect.width || 800);
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

    // If no rows exist, show empty sector message
    if (!sector.rows || sector.rows.length === 0) {
      this.layer.batchDraw();
      return;
    }

    // Render each row using actual seat positions
    sector.rows.forEach((row, rowIndex) => {
      // Calculate row group position based on seat positions or use default
      let rowGroupX = 0; // No horizontal offset - seats will position themselves absolutely
      let rowGroupY = 0; // No vertical offset - seats will position themselves absolutely
      
      // For empty rows, position them with some default spacing
      if (!row.seats || row.seats.length === 0) {
        rowGroupX = 50; // Default left margin for empty rows
        rowGroupY = 100 + rowIndex * 60; // Fallback spacing for empty rows
      }

      const rowGroup = new Konva.Group({
        name: 'row-group',
        x: rowGroupX,
        y: rowGroupY,
        draggable: false,
        listening: true
      });

      // Row label - position relative to seats in the row
      let labelX = -40;
      let labelY = 0;
      let labelText = row.name ?? `Row ${rowIndex + 1}`;
      let labelWidth = 0;
      
      if (row.seats && row.seats.length > 0) {
        // Find the seat with the lowest x (leftmost seat)
        const firstSeat = row.seats.reduce((min, seat) => {
          if (seat.position && min.position && typeof seat.position.x === 'number' && typeof min.position.x === 'number') {
            return seat.position.x < min.position.x ? seat : min;
          }
          return min;
        }, row.seats[0]);
        if (firstSeat.position && typeof firstSeat.position.x === 'number' && typeof firstSeat.position.y === 'number') {
          // Estimate label width using font size and text length (Konva.Text not yet created)
          // Font is bold 14px, so approx 8px per char as a rough estimate
          labelWidth = Math.max(50, labelText.length * 8);
          labelX = firstSeat.position.x - labelWidth - 2; // 2px padding from seat (was 12)
          // Since row group is now at (0,0), use absolute seat position for label
          labelY = firstSeat.position.y + this.seatSize / 2 - 7; // Vertically center label
        }
      } else {
        // For empty rows, use relative positioning
        labelX = -40;
        labelY = 0;
      }
      const rowLabel = new Konva.Text({
        text: labelText,
        x: labelX,
        y: labelY,
        fontSize: 14,
        fill: '#333',
        fontStyle: 'bold',
        listening: true,
        name: 'row-label'
      });
      
      // Add hover effects to make it clear it's clickable
      rowLabel.on('mouseenter', () => {
        rowLabel.fill('#1976d2');
        document.body.style.cursor = 'pointer';
        this.layer?.batchDraw();
      });
      
      rowLabel.on('mouseleave', () => {
        const selectedRowIds = this.selectedRows().map(r => r.seatRowId);
        const isSelected = selectedRowIds.includes(row.seatRowId);
        rowLabel.fill(isSelected ? '#1976d2' : '#333');
        document.body.style.cursor = 'default';
        this.layer?.batchDraw();
      });
      
      // Add click events to the row label specifically
      rowLabel.on('click', (e) => {
        e.cancelBubble = true;
        this.onRowClick(row, e);
      });

      rowLabel.on('contextmenu', (e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        this.onRowRightClick(row, e);
      });

      rowGroup.add(rowLabel);

      // Render seats in this row
      this.renderSeatsInRow(row, rowGroup);
      
      this.layer?.add(rowGroup);
      
      // Only store in map if row has an ID
      if (row.seatRowId) {
        this.rowGroups.set(row.seatRowId, rowGroup);
      }
    });

    // Ensure all existing seat groups are draggable
    this.seatGroups.forEach(group => {
      group.draggable(true);
    });

    this.layer.batchDraw();
  }

  private renderSeatsInRow(row: EditableRow, rowGroup: Konva.Group): void {
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
      return;
    }

    row.seats.forEach((seat, seatIndex) => {
      const seatGroup = this.createSeatGroup(seat, seatIndex);
      rowGroup.add(seatGroup);
      
      // Since row group is now at (0,0), use absolute seat positions directly
      if (seat.position && typeof seat.position.x === 'number' && typeof seat.position.y === 'number') {
        seatGroup.position({ x: seat.position.x, y: seat.position.y });
      }
      
      // Only store in map if seat has an ID
      if (seat.seatId) {
        this.seatGroups.set(seat.seatId, seatGroup);
      }
    });
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
    // Create seat group at (0,0) - positioning will be set in renderSeatsInRow
    const seatGroup = new Konva.Group({
      name: 'seat-group',
      x: 0,
      y: 0,
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
      // Position tooltip above the seat, adjusted for zoom
      const absPos = seatGroup.getAbsolutePosition();
      const zoom = this.zoom();
      this.seatTooltip.position({
        x: absPos.x / zoom + this.seatSize / 2,
        y: absPos.y / zoom - 10
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
      // --- Fix: Adjust pointer position for zoom ---
      const stage = this.stage;
      const zoom = this.zoom();
      let pointerPos = null;
      if (stage) {
        pointerPos = stage.getPointerPosition();
        if (pointerPos && zoom !== 1) {
          pointerPos = {
            x: pointerPos.x / zoom,
            y: pointerPos.y / zoom
          };
        }
      }
      // If you use pointerPos for custom selection, use the adjusted value
      // For now, pass seat as before (Konva already knows which seat was clicked)
      this.handleSeatClick(seat);
    });

    let dragOrigin: { [seatId: string]: { x: number; y: number } } = {};
    let dragStartPos: { x: number; y: number } | null = null;
    seatGroup.on('dragstart', () => {
      const selected = this.selectedSeats();
      dragOrigin = {};
      selected.forEach(sel => {
        // Store the seat's current position in the data model (absolute coordinates)
        dragOrigin[sel.seatId!] = {
          x: sel.position?.x ?? 0,
          y: sel.position?.y ?? 0
        };
      });
      dragStartPos = seatGroup.position(); // This is now absolute position since row group is at (0,0)
    });
    seatGroup.on('dragmove', () => {
      const selected = this.selectedSeats();
      if (selected.length > 1 && seat.selected) {
        // Calculate delta from drag start (absolute coordinates)
        if (!dragStartPos) return;
        const newPos = seatGroup.position();
        const dx = newPos.x - dragStartPos.x;
        const dy = newPos.y - dragStartPos.y;
        
        // Move all selected seats by the same delta
        selected.forEach(sel => {
          const group = this.seatGroups.get(sel.seatId!);
          if (group && dragOrigin[sel.seatId!]) {
            // Calculate new absolute position
            let newAbsX = dragOrigin[sel.seatId!].x + dx;
            let newAbsY = dragOrigin[sel.seatId!].y + dy;
            
            if (this.snapToGrid()) {
              newAbsX = Math.round(newAbsX / this.gridSize) * this.gridSize;
              newAbsY = Math.round(newAbsY / this.gridSize) * this.gridSize;
            }
            
            group.position({ x: newAbsX, y: newAbsY });
          }
        });
        this.layer?.batchDraw();
      }
    });
    seatGroup.on('dragend', () => {
      const selected = this.selectedSeats();
      if (selected.length > 1 && seat.selected) {
        // Calculate delta from drag start
        if (!dragStartPos) return;
        const newPos = seatGroup.position();
        const dx = newPos.x - dragStartPos.x;
        const dy = newPos.y - dragStartPos.y;
        
        // Update all selected seats' positions in the data model
        selected.forEach(sel => {
          if (dragOrigin[sel.seatId!]) {
            const orig = dragOrigin[sel.seatId!];
            // Update both X and Y positions in the data model
            const nx = orig.x + dx;
            const ny = orig.y + dy;
            this.updateSeatPosition(sel, nx, ny);
          }
        });
      } else {
        // Single seat drag - position is now already absolute
        const newPos = seatGroup.position();
        this.updateSeatPosition(seat, newPos.x, newPos.y);
      }
      dragOrigin = {};
      dragStartPos = null;
    });

    return seatGroup;
  }

  private getSeatColor(seat: EditableSeat): string {
    // Use a neutral gray for unselected, and a strong accent for selected
    if (seat.selected) return '#1976d2'; // prominent blue for selected
    return seat.status === 'active' ? '#bdbdbd' : '#e57373'; // neutral gray for active, soft red for inactive
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
    // Snap to grid if enabled
    let gridX = x;
    let gridY = y;
    if (this.snapToGrid()) {
      gridX = Math.round(x / this.gridSize) * this.gridSize;
      gridY = Math.round(y / this.gridSize) * this.gridSize;
    }

    // Update seat position in the data model (absolute coordinates)
    if (!seat.position) {
      seat.position = { x: gridX, y: gridY };
    } else {
      seat.position.x = gridX;
      seat.position.y = gridY;
    }

    // Update Konva position (now absolute since row group is at (0,0))
    const seatGroup = this.seatGroups.get(seat.seatId!);
    if (seatGroup) {
      // Use absolute coordinates directly since row group is at (0,0)
      seatGroup.position({ x: gridX, y: gridY });
      this.layer?.batchDraw();
    }

    this.hasChanges.set(true);
  }

  // Toolbar actions
  async addNewRow() {
    // Calculate the next row order (1-based)
    const currentRows = this.sector()?.rows ?? [];
    const nextOrder = (currentRows.length > 0
      ? Math.max(...currentRows.map(row => row.orderNumber ?? 0))
      : 0) + 1;
    const dialogRef = this.dialog.open(AddRowDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { nextOrder }
    });
    const result = await dialogRef.afterClosed().toPromise() as AddRowDialogResult | null;
    if (result && result.rowName && result.seatCount > 0) {
      // Generate a temporary ID for the new row
      const tempId = `temp-row-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      // Calculate the next order number based on existing rows
      const currentRows = this.sector()?.rows ?? [];
      const maxOrderNumber = currentRows.length > 0 
        ? Math.max(...currentRows.map(row => row.orderNumber ?? 0)) 
        : 0;

      // --- Calculate seat positions based on previous rows ---
      let baseX = 0; // Default X position for subsequent rows
      let baseY = 0;
      let seatSpacing = this.gridSize;
      
      if (currentRows.length > 0) {
        const prevRow = currentRows[currentRows.length - 1];
        if (prevRow.seats && prevRow.seats.length > 0) {
          // Calculate spacing between seats in previous row for consistency
          if (prevRow.seats.length > 1) {
            const dx = prevRow.seats[1].position?.x ?? 0;
            const sx = prevRow.seats[0].position?.x ?? 0;
            const calcSpacing = dx - sx;
            if (calcSpacing > 0) seatSpacing = calcSpacing;
          }
          // For existing rows, keep X position consistent with first row
          baseX = prevRow.seats[0].position?.x ?? 0;
        }
      } else {
        // No previous rows - start at (60, 60) for better visual positioning
        baseX = 60;
      }
      
      // Calculate Y based on spacing between previous rows
      if (currentRows.length >= 2) {
        // Two or more rows exist - calculate spacing from last two rows
        const lastRow = currentRows[currentRows.length - 1];
        const beforeLastRow = currentRows[currentRows.length - 2];
        
        if (lastRow.seats && lastRow.seats.length > 0 && 
            beforeLastRow.seats && beforeLastRow.seats.length > 0) {
          const lastRowY = lastRow.seats[0].position?.y ?? 0;
          const beforeLastRowY = beforeLastRow.seats[0].position?.y ?? 0;
          
          // Calculate the spacing between the last two rows (maintaining direction)
          const rowSpacing = lastRowY - beforeLastRowY;
          
          console.log('Row spacing calculation:', {
            lastRowY,
            beforeLastRowY,
            rowSpacing,
            currentRowsLength: currentRows.length
          });
          
          // Use the calculated spacing to place the new row at the same distance
          // from the last row as the last row is from the before-last row
          let actualSpacing = rowSpacing;
          
          // Ensure minimum spacing
          const minSpacing = this.gridSize * 2;
          if (Math.abs(actualSpacing) < minSpacing) {
            // If spacing is too small, use minimum spacing but preserve direction
            actualSpacing = actualSpacing >= 0 ? minSpacing : -minSpacing;
          }
          
          // Place new row continuing in the same direction and distance
          baseY = lastRowY + actualSpacing;
          
          console.log('Calculated baseY:', baseY, 'using spacing:', actualSpacing, 'direction:', actualSpacing >= 0 ? 'down' : 'up');
        } else {
          // Fallback if seats don't have positions
          baseY = this.gridSize * 2 * currentRows.length;
          console.log('Fallback baseY (no positions):', baseY);
        }
      } else if (currentRows.length === 1) {
        // Only one previous row exists - place new row below with small distance
        const prevRow = currentRows[0];
        if (prevRow.seats && prevRow.seats.length > 0) {
          const smallDistance = this.gridSize * 2; // Small standard distance
          baseY = (prevRow.seats[0].position?.y ?? 0) + smallDistance;
          console.log('Single row baseY:', baseY, 'with small distance:', smallDistance);
        } else {
          baseY = this.gridSize * 2;
          console.log('Single row baseY (no seats):', baseY);
        }
      } else {
        // No previous rows - start at (60, 60) for better visual positioning
        baseY = 60;
        console.log('No previous rows, starting at baseX:', baseX, 'baseY:', baseY);
      }
      const newRow: EditableRow = {
        seatRowId: tempId,
        name: result.rowName,
        orderNumber: maxOrderNumber + 1,
        seats: Array.from({ length: result.seatCount }, (_, i) => ({
          seatId: `temp-seat-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 11)}`,
          orderNumber: i + 1,
          position: { x: baseX + i * seatSpacing, y: baseY },
          status: 'active',
          selected: false
        }))
      };
      
      console.log('Creating new row with seats at baseY:', baseY);
      console.log('First seat position:', newRow.seats[0]?.position);
      
      const sector = this.sector();
      if (sector) {
        sector.rows.push(newRow);
        this.sector.update((prev) => prev ? { ...prev, rows: [...prev.rows] } : prev);
      }
      this.renderSector();
      this.hasChanges.set(true);
    }
  }

  /**
   * Convert a number to Roman numerals
   * @param num The number to convert (1-based)
   * @returns The Roman numeral representation
   */
  private numberToRoman(num: number): string {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    
    let result = '';
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }
    return result;
  }

  async addMultipleRows() {
    const dialogRef = this.dialog.open(AddMultipleRowsDialogComponent, {
      width: '400px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise() as AddMultipleRowsDialogResult | null;
    if (result && result.rowCount > 0 && result.seatCount > 0) {
      const sector = this.sector();
      if (!sector) return;

      // Calculate the starting order number
      const currentRows = sector.rows ?? [];
      const maxOrderNumber = currentRows.length > 0 
        ? Math.max(...currentRows.map(row => row.orderNumber ?? 0)) 
        : 0;

      // Calculate starting positions based on existing rows
      let baseX = 60; // Default X position
      let baseY = 60; // Default Y position
      let seatSpacing = this.gridSize;
      let rowSpacing = this.gridSize * 2;

      if (currentRows.length > 0) {
        const lastRow = currentRows[currentRows.length - 1];
        if (lastRow.seats && lastRow.seats.length > 0) {
          // Use same X position as existing rows
          baseX = lastRow.seats[0].position?.x ?? 60;
          
          // Calculate seat spacing from existing rows
          if (lastRow.seats.length > 1) {
            const dx = lastRow.seats[1].position?.x ?? 0;
            const sx = lastRow.seats[0].position?.x ?? 0;
            const calcSpacing = dx - sx;
            if (calcSpacing > 0) seatSpacing = calcSpacing;
          }

          // Calculate row spacing if there are at least 2 rows
          if (currentRows.length >= 2) {
            const beforeLastRow = currentRows[currentRows.length - 2];
            if (beforeLastRow.seats && beforeLastRow.seats.length > 0) {
              const lastRowY = lastRow.seats[0].position?.y ?? 0;
              const beforeLastRowY = beforeLastRow.seats[0].position?.y ?? 0;
              const calculatedSpacing = lastRowY - beforeLastRowY;
              
              if (Math.abs(calculatedSpacing) >= this.gridSize) {
                rowSpacing = calculatedSpacing;
              }
            }
          }
          
          // Start new rows after the last existing row
          baseY = (lastRow.seats[0].position?.y ?? 0) + rowSpacing;
        }
      }

      // Create multiple rows
      const newRows: EditableRow[] = [];
      for (let i = 0; i < result.rowCount; i++) {
        const tempId = `temp-row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 11)}`;
        const orderNumber = maxOrderNumber + i + 1;
        const romanNumeral = this.numberToRoman(orderNumber);
        
        const newRow: EditableRow = {
          seatRowId: tempId,
          name: romanNumeral,
          orderNumber: orderNumber,
          seats: Array.from({ length: result.seatCount }, (_, seatIndex) => ({
            seatId: `temp-seat-${Date.now()}-${i}-${seatIndex}-${Math.random().toString(36).substring(2, 8)}`,
            orderNumber: seatIndex + 1,
            position: { 
              x: baseX + seatIndex * seatSpacing, 
              y: baseY + i * rowSpacing 
            },
            status: 'active',
            selected: false
          }))
        };
        
        newRows.push(newRow);
      }

      // Add all new rows to the sector
      sector.rows.push(...newRows);
      this.sector.update((prev) => prev ? { ...prev, rows: [...prev.rows] } : prev);
      
      this.renderSector();
      this.hasChanges.set(true);
      
      const message = result.rowCount === 1 
        ? `1 row added with ${result.seatCount} seats` 
        : `${result.rowCount} rows added with ${result.seatCount} seats each`;
      this.snackBar.open(message, 'Close', { duration: 3000 });
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

  addSeatsToRow(rowId: string, seatCount: number) {
    const sector = this.sector();
    if (!sector) {
      return;
    }
    
    // Find the target row by ID
    const targetRow = sector.rows.find(row => row.seatRowId === rowId);
    if (!targetRow) {
      return;
    }
    
    // Add the specified number of seats
    const startingOrderNumber = (targetRow.seats?.length ?? 0) + 1;
    if (!targetRow.seats) {
      targetRow.seats = [];
    }

    // Calculate positioning for new seats
    let lastSeat = targetRow.seats.length > 0 ? targetRow.seats[targetRow.seats.length - 1] : null;
    let penultimateSeat = targetRow.seats.length > 1 ? targetRow.seats[targetRow.seats.length - 2] : null;

    let baseX = lastSeat && lastSeat.position && typeof lastSeat.position.x === 'number' ? lastSeat.position.x : 0;
    let baseY = lastSeat && lastSeat.position && typeof lastSeat.position.y === 'number' ? lastSeat.position.y : 0;

    // Calculate spacing
    let seatSpacing = this.gridSize;
    if (lastSeat && penultimateSeat && lastSeat.position && penultimateSeat.position && 
        typeof lastSeat.position.x === 'number' && typeof penultimateSeat.position.x === 'number') {
      seatSpacing = lastSeat.position.x - penultimateSeat.position.x;
    }

    for (let i = 0; i < seatCount; i++) {
      const tempId = `temp-seat-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 11)}`;
      
      const newSeat: EditableSeat = {
        seatId: tempId,
        orderNumber: startingOrderNumber + i,
        position: { x: baseX + (i + 1) * seatSpacing, y: baseY },
        status: 'active' as const,
        selected: false,
        originalPosition: { x: baseX + (i + 1) * seatSpacing, y: baseY }
      };
      
      targetRow.seats.push(newSeat);
    }
    
    this.renderSector();
    this.hasChanges.set(true);
    
    const rowName = targetRow.name || `Row ${targetRow.orderNumber}`;
    const message = seatCount === 1 
      ? `1 seat added to ${rowName}` 
      : `${seatCount} seats added to ${rowName}`;
    this.snackBar.open(message, 'Close', { duration: 2000 });
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

    // Normalize seat order numbers after deletion to prevent gaps
    this.normalizeSeatOrderNumbers();

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
    const rowsBeforeDelete = sector.rows.length;
    sector.rows = sector.rows.filter(row => row.seats.length > 0);
    const rowsAfterDelete = sector.rows.length;
    
    // Normalize order numbers after deletion to prevent gaps
    if (rowsBeforeDelete !== rowsAfterDelete) {
      this.normalizeRowOrderNumbers();
    }
    
    this.sector.set({ ...sector });
    this.renderSector();
    this.hasChanges.set(true);
    
    if (rowsBeforeDelete !== rowsAfterDelete) {
      this.snackBar.open(`${rowsBeforeDelete - rowsAfterDelete} empty rows deleted`, 'Close', { duration: 2000 });
    } else {
      this.snackBar.open('No empty rows to delete', 'Close', { duration: 2000 });
    }
  }

  /**
   * Delete the selected row (only if one row is selected, with confirmation)
   */
  deleteSelectedRow() {
    const selectedRows = this.selectedRows();
    if (selectedRows.length !== 1) return;
    
    const row = selectedRows[0];
    const rowName = row.name ?? `Row`;
    
    this.confirmationDialogService.confirmDelete(rowName, 'row').subscribe(confirmed => {
      if (confirmed) {
        const sector = this.sector();
        if (!sector) return;
        
        // Remove the row
        sector.rows = sector.rows.filter(r => r.seatRowId !== row.seatRowId);
        
        // Clear selection
        this.selectedRows.set([]);
        
        // Normalize order numbers
        this.normalizeRowOrderNumbers();
        
        this.sector.set({ ...sector });
        this.renderSector();
        this.hasChanges.set(true);
        
        this.snackBar.open(`Row "${rowName}" deleted`, 'Close', { duration: 2000 });
      }
    });
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
    this.selectedRows.set([]);
    this.updateRowVisualSelection();
  }

  // Add seat in toolbar mode - show dialog to select row and quantity
  addSeatInToolbarMode() {
    const sector = this.sector();
    if (!sector) {
      this.snackBar.open('No sector available', 'Close', { duration: 2000 });
      return;
    }
    
    // Check if there are any rows available
    if (!sector.rows || sector.rows.length === 0) {
      this.snackBar.open('Please add rows first before adding seats', 'Close', { duration: 3000 });
      return;
    }
    
    // Prepare dialog data
    const dialogData: AddSeatDialogData = {
      rows: sector.rows.map(row => ({
        seatRowId: row.seatRowId!,
        name: row.name,
        orderNumber: row.orderNumber
      }))
    };
    
    // Open the dialog
    const dialogRef = this.dialog.open(AddSeatDialogComponent, {
      width: '450px',
      data: dialogData,
      disableClose: false,
      autoFocus: true
    });
    
    // Handle dialog result
    dialogRef.afterClosed().subscribe((result: AddSeatDialogResult | null) => {
      if (result && result.selectedRowId && result.seatCount > 0) {
        this.addSeatsToRow(result.selectedRowId, result.seatCount);
      }
    });
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
      this.stage.position({ x: 0, y: 0 });
      this.stage.batchDraw();
    }
  }

  toggleGrid() {
    this.showGrid.set(!this.showGrid());
    this.renderGrid();
  }

  toggleSnapToGrid() {
    this.snapToGrid.set(!this.snapToGrid());
  }

  // Save changes
  async saveChanges() {
    const sector = this.sector();
    if (!sector || this.saving()) return;

    this.saving.set(true);

    try {
      // Update sector properties first
      await this.updateSectorProperties(sector);
      
      // Update seats by rows
      await this.updateSectorSeats(sector);
      
      this.hasChanges.set(false);
      this.snackBar.open('Changes saved successfully', 'Close', { duration: 2000 });
      
      // Reload to get fresh data from server
      this.loadVenueAndSector();
      
    } catch (error) {
      console.error('Error saving changes:', error);
      this.snackBar.open('Error saving changes: ' + (error instanceof Error ? error.message : 'Unknown error'), 'Close', { duration: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  private async updateSectorProperties(sector: EditableSector) {
    if (!sector.sectorId) {
      throw new Error('Sector ID is required');
    }

    const sectorInput: SectorInput = {
      name: sector.name,
      orderNumber: sector.orderNumber,
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

  private async updateSectorSeats(sector: EditableSector) {
    if (!sector.sectorId) {
      throw new Error('Sector ID is required');
    }

    const sectorSeatsInput: SectorSeatsInput = {
      rows: sector.rows.map(row => ({
        seatRowId: row.seatRowId?.startsWith('temp-') ? undefined : row.seatRowId,
        name: row.name,
        orderNumber: row.orderNumber,
        seats: row.seats.map(seat => ({
          seatId: seat.seatId?.startsWith('temp-') ? undefined : seat.seatId,
          orderNumber: seat.orderNumber,
          position: seat.position,
          priceCategory: seat.priceCategory,
          status: seat.status
        }))
      }))
    };

    await firstValueFrom(this.proEventIQService.updateSectorSeats(
      this.venueId(),
      sector.sectorId,
      sectorSeatsInput
    ));
  }

  cancelChanges() {
    this.loadVenueAndSector();
    this.hasChanges.set(false);
  }

  goBack() {
    this.router.navigate(['/venues', this.venueId(), 'map-edit']);
  }

  // Row selection handlers
  onRowClick(row: EditableRow, e: Konva.KonvaEventObject<MouseEvent>) {
    const isCtrlPressed = this.isCtrlPressed();
    
    if (!isCtrlPressed) {
      this.selectedRows.set([]);
    }
    
    // Toggle row selection
    const currentSelectedRows = this.selectedRows();
    const isRowSelected = currentSelectedRows.some(r => r.seatRowId === row.seatRowId);
    
    if (isRowSelected) {
      this.selectedRows.set(currentSelectedRows.filter(r => r.seatRowId !== row.seatRowId));
    } else {
      this.selectedRows.set([...currentSelectedRows, row]);
    }
    
    this.updateRowVisualSelection();
  }

  onRowRightClick(row: EditableRow, e: Konva.KonvaEventObject<MouseEvent>) {
    // Select the row if not already selected
    const currentSelectedRows = this.selectedRows();
    const isRowSelected = currentSelectedRows.some(r => r.seatRowId === row.seatRowId);
    
    if (!isRowSelected) {
      this.selectedRows.set([row]);
      this.updateRowVisualSelection();
    }
    
    // Open edit dialog
    this.editRowName(row);
  }

  private updateRowVisualSelection() {
    const selectedRowIds = this.selectedRows().map(r => r.seatRowId);
    
    // Update visual selection for all rows
    this.rowGroups.forEach((group, rowId) => {
      const rowLabel = group.findOne('.row-label') as Konva.Text;
      if (rowLabel) {
        const isSelected = selectedRowIds.includes(rowId);
        rowLabel.fill(isSelected ? '#1976d2' : '#333');
      }
    });
    
    this.layer?.batchDraw();
  }

  async editRowName(row: EditableRow) {
    const dialogRef = this.dialog.open(EditRowDialogComponent, {
      width: '400px',
      disableClose: true,
      data: {
        rowId: row.seatRowId,
        currentName: row.name,
        orderNumber: row.orderNumber
      } as EditRowDialogData
    });

    const result = await dialogRef.afterClosed().toPromise() as EditRowDialogResult | null;
    if (result && result.rowName && result.rowName !== row.name) {
      row.name = result.rowName;
      this.renderSector();
      this.hasChanges.set(true);
      this.snackBar.open(`Row name updated to "${result.rowName}"`, 'Close', { duration: 2000 });
    }
  }

  editSelectedRowName() {
    const selectedRows = this.selectedRows();
    if (selectedRows.length === 1) {
      this.editRowName(selectedRows[0]);
    }
  }

  getRowNameForSeat(seat: EditableSeat): string {
    const sector = this.sector();
    if (!sector) return 'Unknown';
    
    const row = sector.rows.find(r => 
      r.seats.some(s => s.seatId === seat.seatId)
    );
    return row?.name || 'Unknown';
  }

  private normalizeSeatOrderNumbers() {
    const sector = this.sector();
    if (!sector) return;
    
    sector.rows.forEach(row => {
      row.seats.forEach((seat, index) => {
        seat.orderNumber = index + 1;
      });
    });
  }

  private normalizeRowOrderNumbers() {
    const sector = this.sector();
    if (!sector) return;
    
    sector.rows.forEach((row, index) => {
      row.orderNumber = index + 1;
    });
  }

  getTotalSeats(): number {
    const sector = this.sector();
    if (!sector) return 0;
    
    return sector.rows.reduce((total, row) => total + (row.seats?.length || 0), 0);
  }

  getSelectedSeatInfo(): string {
    const selected = this.selectedSeats();
    if (selected.length === 0) return 'No seats selected';
    if (selected.length === 1) {
      const seat = selected[0];
      return `Seat ${seat.orderNumber} in ${this.getRowNameForSeat(seat)}`;
    }
    return `${selected.length} seats selected`;
  }

  // Add a method to manually retry Konva initialization
  retryKonvaInitialization() {
    console.log('Retrying Konva initialization...');
    this.konvaInitialized = false;
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    this.waitForContainerAndInitialize();
  }
}
