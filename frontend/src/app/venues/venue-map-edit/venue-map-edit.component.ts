import { ChangeDetectionStrategy, Component, effect, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit, untracked, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Konva from 'konva';
import { Venue } from '../../api/model/venue';
import { Sector } from '../../api/model/sector';
import { SectorSeatsInput } from '../../api/model/sector-seats-input';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { ConfirmationDialogService, ErrorDisplayComponent } from '../../shared';
import { firstValueFrom } from 'rxjs';
import { ChangeSectorNameDialogComponent } from './change-sector-name-dialog/change-sector-name-dialog.component';
import { canDeactivateVenueMapEdit } from './can-deactivate-venue-map-edit.guard';

/**
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * 
 * 1. Change Detection Strategy: OnPush - reduces Angular change detection cycles
 * 2. Object Caching: Cache Konva objects (seats, outlines, labels) to avoid recreation
 * 3. Efficient Rendering: Only render new/changed sectors instead of full re-render
 * 4. Reduced Draw Calls: Minimize batchDraw() calls, use single draw at end like KonvaTest
 * 5. Optimized Seat Rendering: Simple circle creation with basic event handlers
 * 6. Smart Re-render Control: needsFullRender flag to control when full re-render is required
 * 7. Drag Performance: Removed excessive draw calls during drag operations
 * 
 * These optimizations are inspired by the fast KonvaTest implementation that renders
 * 10,000 objects efficiently by creating objects once and minimizing redraws.
 */



interface EditableSector extends Sector {
  isSelected: boolean;
  isDragging: boolean;
  rotation: number;
}

@Component({
  selector: 'app-venue-map-edit',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
    RouterModule,
    ChangeSectorNameDialogComponent,
    ErrorDisplayComponent
  ],
  templateUrl: './venue-map-edit.component.html',
  styleUrls: ['./venue-map-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueMapEditComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;
  @Input() mode: 'preview' | 'edit' = 'edit'; // Use simple string for mode
  @Input() venueData: Venue | null = null; // Allow venue data to be passed in
  
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly venueApi = inject(ProEventIQService);
  private readonly confirmationDialog = inject(ConfirmationDialogService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  private readonly venueId = signal<string | null>(null);
  public venue = signal<Venue | null>(null);
  public loading = signal(true);
  public error = signal<string | null>(null);
  public saving = signal(false);
  
  // Konva objects
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private dragLayer: Konva.Layer | null = null; // Special layer for dragging operations
  private readonly sectorGroups = new Map<string, Konva.Group>();
  private readonly sectorSeats = new Map<string, Konva.Circle[]>(); // Cache seat objects
  private readonly sectorOutlines = new Map<string, Konva.Line>(); // Cache outline objects
  private readonly sectorLabels = new Map<string, { name: Konva.Text; seats: Konva.Text }>(); // Cache label objects
  private initialDragPositions = new Map<string, { x: number; y: number }>();
  private konvaInitialized = false;
  private needsFullRender = false; // Flag to control when full re-render is needed
  private seatTooltip: Konva.Label | null = null; // Tooltip for seat information
  
  // Canvas and zoom settings
  canvasWidth = 3000;
  canvasHeight = 1500;
  private readonly baseCanvasWidth = 3000;
  private readonly baseCanvasHeight = 1500;
  private readonly zoomLevel = signal(1);
  private readonly maxZoom = 5;
  private readonly minZoom = 0.5;
  private readonly zoomIncrement = 0.2;
  private resizeObserver: ResizeObserver | null = null;
  private readonly resizeHandler = () => {
    this.resizeCanvas();
  };
  
  // Edit state
  editableSectors = signal<EditableSector[]>([]);
  selectedSectors = signal<EditableSector[]>([]);
  selectedSector = signal<EditableSector | null>(null); // Keep for backward compatibility
  hasChanges = signal(false);  // Grid settings
  showGrid = signal(true);
  gridSize = 20;
  
  // HTML container panning state (used for both preview and edit mode Alt+drag)
  private isHtmlPanning = false;
  private htmlPanStart = { x: 0, y: 0 };
  private htmlScrollStart = { left: 0, top: 0 };
  constructor() {
    // Resize canvas initially and on window resize
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeHandler);

    // Track changes for unsaved work warning
    effect(() => {
      if (this.hasChanges()) {
        window.addEventListener('beforeunload', this.handleBeforeUnload);
      } else {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
      }
    });    // Set up effects to watch for changes (must be in constructor for injection context)
    effect(() => {
      if (this.editableSectors().length > 0 && this.layer) {
        // Only do a full re-render if no sectors are currently being dragged
        const hasDraggingSectors = this.editableSectors().some(s => s.isDragging);
        
        if (!hasDraggingSectors && this.needsFullRender) {
          this.renderSectors();
          this.needsFullRender = false;
        }
        // Otherwise, don't re-render during drag operations to prevent flicker
      }
    });

    effect(() => {
      if (this.layer) {
        console.log('Grid visibility changed:', this.showGrid());
        if (this.showGrid()) {
          this.renderGrid();
        } else {
          this.clearGrid();
        }
      }
    });

    // Watch for venue changes to initialize Konva when venue loads
    effect(() => {
      if (this.venue() && !this.konvaInitialized) {
        // Use setTimeout to ensure the DOM is updated
        setTimeout(() => {
          this.initializeKonva();
        }, 0);
      }
    });
    
    // Add keyboard event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }  ngAfterViewInit() {
    // Konva initialization will be handled by the effect when venue loads
    // Use multiple timeouts to ensure proper layout
    setTimeout(() => {
      this.resizeCanvas();
      
      // Set up ResizeObserver for the canvas container
      if (this.canvasContainer?.nativeElement) {
        this.resizeObserver = new ResizeObserver(() => {
          this.resizeCanvas();
        });
        this.resizeObserver.observe(this.canvasContainer.nativeElement);
      }
    }, 100);
    
    // Additional resize after a longer delay to catch any layout changes
    setTimeout(() => {
      this.resizeCanvas();
    }, 500);
  }

  ngOnInit() {
    // Initialize venue data based on mode
    if (this.mode === 'preview' && this.venueData) {
      // Preview mode: use passed venue data
      this.venue.set(this.venueData);
      this.loading.set(false);
      this.initializeEditableSectors(this.venueData);
    } else {
      // Edit mode: fetch venue from route parameter
      this.route.paramMap.subscribe(params => {
        const id = params.get('venueId'); // Changed from 'id' to 'venueId' to match route
        this.venueId.set(id);
        console.log('Edit mode - venue ID from route:', id);
        if (id) {
          this.fetchVenue(id);
        } else {
          console.error('No venue ID found in route parameters');
          this.error.set('No venue ID specified');
          this.loading.set(false);
        }
      });
    }
  }

  private initializeKonva() {
    if (!this.canvasContainer) {
      console.error('Canvas container not found, retrying...');
      setTimeout(() => this.initializeKonva(), 100);
      return;
    }

    if (this.konvaInitialized) {
      console.log('Konva already initialized');
      return;
    }

    // Ensure we have the latest container dimensions
    this.resizeCanvas();

    console.log('Initializing Konva stage with dimensions:', this.canvasWidth, 'x', this.canvasHeight);

    this.stage = new Konva.Stage({
      container: this.canvasContainer.nativeElement,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    
    // Add invisible background rectangle to capture clicks on empty canvas
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight,
      fill: 'transparent',
      listening: true,
      name: 'canvas-background'
    });
    
    background.on('click', (e) => {
      e.cancelBubble = true;
      this.deselectAll();
    });
    
    this.layer.add(background);
    background.moveToBottom(); // Ensure it's always at the bottom
    
    // Add a separate layer for dragging operations to ensure visibility
    this.dragLayer = new Konva.Layer();
    this.stage.add(this.dragLayer);

    // Add keyboard event handling
    this.stage.on('keydown', (e) => {
      if (e.evt.key === 'Escape') {
        this.deselectAll();
      }
    });

    // Add canvas click handling for deselection
    this.stage.on('click', (e) => {
      // Only deselect if clicking on the stage itself (not on any shapes)
      if (e.target === this.stage) {
        this.deselectAll();
      }
    });

    this.konvaInitialized = true;
    console.log('Konva stage initialized successfully');
    
    // Force another resize after initialization to ensure perfect fit
    setTimeout(() => {
      this.resizeCanvas();
    }, 100);

    // Trigger initial rendering if we already have sectors
    if (this.editableSectors().length > 0) {
      console.log('Rendering existing sectors on init');
      this.renderSectors();
    } else {
      console.log('No sectors to render on init');
      // No test sector in production
    }
    
    // Render grid if enabled
    if (this.showGrid()) {
      this.renderGrid();
    }
  }
  private resizeCanvas() {

    // Update stage size if it exists
    if (this.stage) {
      this.stage.width(this.canvasWidth);
      this.stage.height(this.canvasHeight);

      // Update background rectangle size if it exists
      if (this.layer) {
        const background = this.layer.findOne('.canvas-background') as Konva.Rect;
        if (background) {
          background.width(this.canvasWidth);
          background.height(this.canvasHeight);
        }
      }

      this.stage.batchDraw();
    }


  }

  private readonly handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.hasChanges()) {
      event.preventDefault();
      // Modern browsers will show their own dialog message
      return '';
    }
    return undefined;
  };

  private fetchVenue(id: string) {
    console.log('Fetching venue with ID:', id);
    this.loading.set(true);
    this.venueApi.getVenue(id).subscribe({
      next: (venue: Venue) => {
        console.log('Venue fetched successfully:', venue);
        this.venue.set(venue);
        this.initializeEditableSectors(venue);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching venue:', err);
        this.error.set('Failed to load venue.');
        this.loading.set(false);
        console.error('Error loading venue data:', err);
      }
    });
  }  private initializeEditableSectors(venue: Venue) {
    if (venue.sectors) {
      const editableSectors: EditableSector[] = venue.sectors.map(sector => {
        // Use existing position or calculate a default based on index
        const defaultPosition = sector.position ?? { 
          x: 100 + (Math.random() * 200), 
          y: 100 + (Math.random() * 200) 
        };
        
        console.log(`Initializing sector ${sector.name} at position:`, defaultPosition, 'rotation:', sector.rotation);
        
        return {
          ...sector,
          isSelected: false,
          isDragging: false,
          rotation: sector.rotation ?? 0,
          position: defaultPosition
        };
      });
      this.editableSectors.set(editableSectors);
      this.markNeedsFullRender(); // Mark that full render is needed
    }
  }

  // Ensure proper z-index ordering: background -> grid -> sectors
  private fixLayerZOrder() {
    if (!this.layer) return;
    const background = this.layer.findOne('.canvas-background');
    if (background) background.moveToBottom();
    const gridLines = this.layer.find('.grid-line');
    gridLines.forEach(line => { if (background) line.moveUp(); });
    this.sectorGroups.forEach(group => { group.moveToTop(); });
    
    // Ensure tooltip is always at the top if it exists
    if (this.seatTooltip) {
      this.seatTooltip.moveToTop();
    }
  }

  private renderGrid() {
    if (!this.layer) return;
    this.clearGrid();
    if (!this.showGrid()) return;

    // Use the current zoom level to calculate grid coverage
    const currentZoom = this.zoomLevel();
    const effectiveGridSize = this.gridSize / currentZoom;
    const gridWidth = this.baseCanvasWidth;
    const gridHeight = this.baseCanvasHeight;

    // Create vertical lines - use base canvas dimensions but adjust grid spacing for zoom
    for (let i = 0; i <= Math.ceil(gridWidth / effectiveGridSize); i++) {
      const line = new Konva.Line({
        points: [i * effectiveGridSize, 0, i * effectiveGridSize, gridHeight],
        stroke: '#ddd',
        strokeWidth: 1 / currentZoom, // Adjust stroke width for zoom
        opacity: 0.7,
        listening: false,
        name: 'grid-line'
      });
      this.layer.add(line);
    }

    // Create horizontal lines - use base canvas dimensions but adjust grid spacing for zoom
    for (let i = 0; i <= Math.ceil(gridHeight / effectiveGridSize); i++) {
      const line = new Konva.Line({
        points: [0, i * effectiveGridSize, gridWidth, i * effectiveGridSize],
        stroke: '#ddd',
        strokeWidth: 1 / currentZoom, // Adjust stroke width for zoom
        opacity: 0.7,
        listening: false,
        name: 'grid-line'
      });
      this.layer.add(line);
    }

    this.layer.batchDraw();

    this.fixLayerZOrder();
  }

  // Add new method to update seat visibility based on zoom level
  private updateSeatsVisibility(zoomLevel: number): void {
    // Show seats only when zoom level is >= 1.8 (180%)
    // Using a slightly lower threshold (1.79) to account for potential floating point precision issues
    const threshold = 1.79; // Using 1.79 instead of 1.8 to handle any floating-point precision issues
    const seatsVisible = zoomLevel >= threshold;
    
    // Iterate through all cached seats and update visibility
    this.sectorSeats.forEach((seats) => {
        seats.forEach(seat => {
            seat.visible(seatsVisible);
        });
    });
    

  }
  
  // Create or ensure the seat tooltip exists
  private ensureSeatTooltip() {
    if (!this.layer) return;
    if (!this.seatTooltip) {
      this.seatTooltip = new Konva.Label({
        listening: false
      });
      this.seatTooltip.add(new Konva.Tag({
        fill: 'rgba(0, 0, 0, 0.75)',
        pointerDirection: 'down',
        pointerWidth: 8,
        pointerHeight: 6,
        lineJoin: 'round',
        cornerRadius: 4,
        shadowColor: '#000',
        shadowBlur: 4,
        shadowOffset: { x: 2, y: 2 },
        shadowOpacity: 0.3
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
      
      // Ensure tooltip is always on top of all other elements
      this.seatTooltip.moveToTop();
    }
  }

  private clearGrid() {
    if (!this.layer) return;
    
    const gridLines = this.layer.find('.grid-line');
    gridLines.forEach(line => line.destroy());
    this.layer.batchDraw();
  }
  private renderSectors() {
    if (!this.layer) {
      return;
    }

    const currentSectors = this.editableSectors();
    const existingSectorIds = new Set(Array.from(this.sectorGroups.keys()));
    const newSectorIds = new Set(currentSectors.map(s => s.sectorId!));

    // Remove sectors that no longer exist
    for (const sectorId of existingSectorIds) {
      if (!newSectorIds.has(sectorId)) {
        this.removeSector(sectorId);
      }
    }

    // Add or update sectors
    currentSectors.forEach(sector => {
      const sectorId = sector.sectorId!;
      
      // IMPORTANT FIX: Always recreate the group when selection state changes
      const existingGroup = this.sectorGroups.get(sectorId);
      if (existingGroup) {
        // Check if we need to recreate due to selection change
        const existingSector = existingGroup.getAttr('sector');
        const selectionChanged = existingSector?.isSelected !== sector.isSelected;
        
        if (selectionChanged) {
          existingGroup.destroy();
          this.sectorGroups.delete(sectorId);
          const group = this.createSectorGroup(sector);
          if (group) {
            this.sectorGroups.set(sectorId, group);
          }
        }
      } else if (!this.sectorGroups.has(sectorId)) {
        // Create new sector
        const group = this.createSectorGroup(sector);
        if (group) {
          this.sectorGroups.set(sectorId, group);
        }
      }
      // Note: We don't need to update existing sectors here as they're handled by cached objects
    });

    // Ensure proper z-index ordering: background -> grid -> sectors
    this.fixLayerZOrder();
    
    // Update seat tooltip handlers for all seats
    this.updateSeatTooltipHandlers();
    
    // Single draw call at the end - like KonvaTest
    this.layer.batchDraw();
  }

  private removeSector(sectorId: string) {
    const group = this.sectorGroups.get(sectorId);
    if (group) {
      group.destroy();
      this.sectorGroups.delete(sectorId);
    }
    
    // Clean up cached objects
    this.sectorSeats.delete(sectorId);
    this.sectorOutlines.delete(sectorId);
    this.sectorLabels.delete(sectorId);
  }

  private createSectorGroup(sector: EditableSector): Konva.Group | null {
    if (!this.layer) return null;

    const group = new Konva.Group({
      x: sector.position?.x ?? 100,
      y: sector.position?.y ?? 100,
      rotation: sector.rotation || 0,
      draggable: false, // Only enable dragging when LMB is held
      dragBoundFunc: (pos) => pos,
      // Store the sector data including selection state for comparison later
      sector: {
        sectorId: sector.sectorId,
        isSelected: sector.isSelected
      }
    });

    // Enable dragging only while LMB is pressed (mousedown), disable on mouseup/dragend
    group.on('mousedown', (e) => {
      if (this.mode === 'edit' && e.evt.button === 0) {
        group.draggable(true);
      }
    });
    group.on('mouseup', () => {
      group.draggable(false);
    });
    group.on('dragend', () => {
      group.draggable(false);
    });
    group.on('dragstart', () => {
      this.onSectorDragStart(sector);
    });

    // Extracted sector shape drawing logic
    this.drawSectorShape(group, sector);

    // Add to layer
    this.layer.add(group);
    return group;
  }

  // Extracted: Draw the sector shape, outline, seats, labels, and selection indicators
  private drawSectorShape(group: Konva.Group, sector: EditableSector) {
    // --- Dynamic sector shape based on seats layout ---
    // Use smaller scale for venue overview - seats should appear smaller
    const seatRadius = 3; // Reduced from 8 to 3 for overview
    const seatSpacing = 2; // Reduced from 6 to 2 for overview
    let seatPositions: {x: number, y: number}[] = [];
    let maxRowLength = 0;
    let totalRows = 0;
    if (sector.rows && Array.isArray(sector.rows)) {
      totalRows = sector.rows.length;
      sector.rows.forEach((row, rowIdx) => {
        if (row.seats && Array.isArray(row.seats)) {
          maxRowLength = Math.max(maxRowLength, row.seats.length);
          row.seats.forEach((seat, seatIdx) => {
            // Scale factor for venue overview - make sectors smaller to see more
            const scaleFactor = 0.4;
            
            // Use explicit seat position if available, otherwise fallback to calculated
            if (seat.position && typeof seat.position.x === 'number' && typeof seat.position.y === 'number') {
              seatPositions.push({ 
                x: seat.position.x * scaleFactor, 
                y: seat.position.y * scaleFactor 
              });
            } else if (row.seats) {
              // Fallback: calculate position as before but scaled down
              const rowY = rowIdx * (seatRadius * 2 + seatSpacing) * scaleFactor;
              const rowOffset = (maxRowLength - row.seats.length) * (seatRadius + seatSpacing/2) * scaleFactor;
              const x = (seatIdx * (seatRadius * 2 + seatSpacing) + rowOffset) * scaleFactor;
              const y = rowY;
              seatPositions.push({x, y});
            }
          });
        }
      });
      // Normalize and flip Y only if the majority of Y values are negative (i.e., sector defined upwards)
      if (seatPositions.length > 0) {
        const negativeYCount = seatPositions.filter(p => p.y < 0).length;
        const positiveYCount = seatPositions.filter(p => p.y > 0).length;
        if (negativeYCount > positiveYCount) {
          // Flip Y so that the largest Y (top row) is at 0 and rows increase downward
          const minY = Math.min(...seatPositions.map(p => p.y));
          const maxY = Math.max(...seatPositions.map(p => p.y));
          seatPositions = seatPositions.map(p => ({ x: p.x, y: maxY - p.y }));
        }
        // else: do not flip, keep as is
      }
    }

    // Draw sector outline (convex hull of seat positions) - must be listening for clicks
    let outline: Konva.Line | null = null;
    if (seatPositions.length > 2) {
      const hull = this.getConvexHull(seatPositions);
      if (hull.length > 2) {
        const points = hull.flatMap(p => [p.x, p.y]);
        const strokeColor = this.getSectorStrokeColor(sector);
        const fillColor = this.getSectorColor(sector) + '33'; // semi-transparent fill
        
        outline = new Konva.Line({
          points,
          closed: true,
          stroke: strokeColor,
          strokeWidth: sector.isSelected ? 3 : 2,
          fill: fillColor, // semi-transparent fill
          shadowColor: sector.isSelected ? 'rgba(33, 150, 243, 0.5)' : 'rgba(0, 0, 0, 0.3)',
          shadowBlur: sector.isSelected ? 20 : 10,
          shadowOffsetX: 5,
          shadowOffsetY: 5,
          name: 'sector-outline',
          listening: true // allow pointer events
        });
        // Attach click handler to outline
        outline.on('click', (e) => {
          e.cancelBubble = true;
          this.onSectorRectClick(sector, e);
        });
        outline.on('mouseenter', () => {
          this.stage!.container().style.cursor = 'grab';
        });
        outline.on('mouseleave', () => {
          this.stage!.container().style.cursor = 'default';
        });
        group.add(outline);
        outline.moveToBottom();
      }
    }

    // Use optimized seat rendering
    this.renderSeatsOptimized(group, sector, seatPositions);

    // Add selection indicators if selected
    if (sector.isSelected) {
      this.addSelectionIndicators(group);
    }

    // Calculate bounding box width for label centering - ensure labels are visible even at smaller scale
    let labelWidth = 140; // Increased from 120 for better visibility
    let minX = 0, maxX = 0, minY = 0;
    if (seatPositions.length > 0) {
      minX = Math.min(...seatPositions.map(p => p.x));
      maxX = Math.max(...seatPositions.map(p => p.x));
      minY = Math.min(...seatPositions.map(p => p.y));
      labelWidth = Math.max(100, maxX - minX + seatRadius * 4); // Ensure minimum readable width
    }

    // Calculate centroid for label placement inside the sector
    let centroidX = 0, centroidY = 0;
    if (seatPositions.length > 0) {
      // Use convex hull if available for more accurate center
      let hull = seatPositions;
      if (seatPositions.length > 2) {
        hull = this.getConvexHull(seatPositions);
      }
      const n = hull.length;
      let area = 0, cx = 0, cy = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const cross = hull[i].x * hull[j].y - hull[j].x * hull[i].y;
        area += cross;
        cx += (hull[i].x + hull[j].x) * cross;
        cy += (hull[i].y + hull[j].y) * cross;
      }
      area = area / 2;
      if (Math.abs(area) > 1e-7) {
        centroidX = cx / (6 * area);
        centroidY = cy / (6 * area);
      } else {
        // Fallback to average
        centroidX = hull.reduce((sum, p) => sum + p.x, 0) / n;
        centroidY = hull.reduce((sum, p) => sum + p.y, 0) / n;
      }
    }

    // Add sector name and seat count labels inside the sector - maintain readable size
    const nameText = new Konva.Text({
      text: sector.name ?? 'Unnamed Sector',
      x: centroidX - (labelWidth / 2), // Center label horizontally
      y: centroidY - 20, // Slightly above center
      width: labelWidth,
      align: 'center',
      fontSize: 16, // Increased from 14 for better visibility at smaller scale
      fill: '#000', // Pure black font color
      fontStyle: 'bold',
      listening: true // Enable clicking on labels
    });

    // Add click handler to name label
    nameText.on('click', (e) => {
      e.cancelBubble = true;
      this.onSectorRectClick(sector, e);
    });
    nameText.on('mouseenter', () => {
      this.stage!.container().style.cursor = 'grab';
    });
    nameText.on('mouseleave', () => {
      this.stage!.container().style.cursor = 'default';
    });

    group.add(nameText);

    const seatsText = new Konva.Text({
      text: `Seats: ${sector.numberOfSeats ?? 0}`,
      x: centroidX - (labelWidth / 2),
      y: centroidY + 4, // Slightly below center
      width: labelWidth,
      align: 'center',
      fontSize: 14, // Increased from 12 for better visibility
      fill: '#000', // Pure black font color
      opacity: 0.85,
      listening: true // Enable clicking on labels
    });

    // Add click handler to seats label
    seatsText.on('click', (e) => {
      e.cancelBubble = true;
      this.onSectorRectClick(sector, e);
    });
    seatsText.on('mouseenter', () => {
        this.stage!.container().style.cursor = 'grab';
    });
    seatsText.on('mouseleave', () => {
      this.stage!.container().style.cursor = 'default';
    });

    group.add(seatsText);

    // Add event handlers to group (for fallback if outline is missing)
    group.on('click', (e) => {
      e.cancelBubble = true;
      this.onSectorRectClick(sector, e);
    });
    group.on('mouseenter', () => {
        this.stage!.container().style.cursor = 'grab';
    });
    group.on('mouseleave', () => {
      this.stage!.container().style.cursor = 'default';
    });
    group.on('dragstart', () => {
      this.onSectorDragStart(sector);
    });
    group.on('dragmove', () => {
      this.onSectorDragMove(sector, group);
    });
    group.on('dragend', () => {
      // Reset offset after drag to avoid future jumps
      group.offsetX(0);
      group.offsetY(0);
      this.onSectorDragEnd(sector, group);
    });

    return group;
  }

  // Mark that a full render is needed
  private markNeedsFullRender() {
    this.needsFullRender = true;
  }

  // Optimized seat rendering - inspired by KonvaTest approach
  private renderSeatsOptimized(group: Konva.Group, sector: EditableSector, seatPositions: {x: number, y: number}[]) {
    const sectorId = sector.sectorId!;
    const seatRadius = 3;
    
    // Check if we already have seats for this sector
    let existingSeats = this.sectorSeats.get(sectorId);
    
    // Determine if seats should be visible based on current zoom level
    const threshold = 1.79; // Using 1.79 instead of 1.8 to handle any floating-point precision issues
    const currentZoom = this.zoomLevel();
    const seatsVisible = currentZoom >= threshold;
    
    if (!existingSeats) {
      // Create seats for the first time - like KonvaTest
      existingSeats = [];
      
      seatPositions.forEach((pos, index) => {
        const seat = new Konva.Circle({
          x: pos.x,
          y: pos.y,
          radius: seatRadius,
          fill: '#90A4AE', // Material design color
          stroke: '#37474F',
          strokeWidth: 0.5,
          name: `seat-${index}`,
          visible: seatsVisible, // Set initial visibility based on zoom
          listening: true
        });

        // Add simple event handlers like KonvaTest
        seat.on('mouseover', () => {
          this.stage!.container().style.cursor = 'pointer';
          seat.fill('#66BB6A'); // Hover color
          
          // Show tooltip with seat information when zoom level is sufficient (≥ 180%)
          if (this.zoomLevel() >= 1.79) {
            this.ensureSeatTooltip();
            if (!this.seatTooltip) return;
            
            // Get seat info (row name and seat number)
            const { rowName, seatNumber } = this.getSeatInfoFromIndex(sector, index);
            
            // Set tooltip text with sector name, row name, and seat number
            const tooltipText = `Sector: ${sector.name || 'Unknown'}\nRow: ${rowName}\nSeat: ${seatNumber}`;
            const labelText = this.seatTooltip.findOne('Text') as Konva.Text;
            labelText.text(tooltipText);
            
            // Position tooltip above the seat, adjusted for zoom
            const absPos = seat.getAbsolutePosition();
            const zoom = this.zoomLevel();
            this.seatTooltip.position({
              x: absPos.x / zoom,
              y: absPos.y / zoom - 10
            });
            
            this.seatTooltip.visible(true);
            // Always move tooltip to the top of the layer to ensure it's visible
            this.seatTooltip.moveToTop();
            this.layer!.batchDraw();
          }
        });

        seat.on('mouseout', () => {
          this.stage!.container().style.cursor = 'default';
          seat.fill('#90A4AE'); // Reset color
          
          // Hide tooltip
          if (this.seatTooltip) {
            this.seatTooltip.visible(false);
            this.layer!.batchDraw();
          }
        });

        seat.on('click', (e) => {
          e.cancelBubble = true;
          // Simple selection toggle like KonvaTest
          const isSelected = seat.fill() === '#4CAF50';
          seat.fill(isSelected ? '#90A4AE' : '#4CAF50');
          this.layer!.batchDraw();
        });

        existingSeats!.push(seat);
        group.add(seat);
      });
      
      // Cache the seats
      this.sectorSeats.set(sectorId, existingSeats);
    } else {
      // Update existing seats positions if needed
      existingSeats.forEach((seat, index) => {
        if (index < seatPositions.length) {
          const pos = seatPositions[index];
          if (seat.x() !== pos.x || seat.y() !== pos.y) {
            seat.position(pos);
          }
          // Always update visibility when rendering
          seat.visible(seatsVisible);
        }
      });
    }
  }

  // Helper function to get seat info (row name, seat number) based on index within a sector
  private getSeatInfoFromIndex(sector: EditableSector, seatIndex: number): { rowName: string, seatNumber: number } {
    let currentIndex = 0;
    let result = { rowName: 'Unknown', seatNumber: 0 };
    
    if (sector.rows) {
      for (const row of sector.rows) {
        if (row.seats) {
          if (seatIndex >= currentIndex && seatIndex < currentIndex + row.seats.length) {
            // Found the row containing this seat
            const seatIndexInRow = seatIndex - currentIndex;
            const seat = row.seats[seatIndexInRow];
            result = {
              rowName: row.name || `Row ${row.orderNumber || '?'}`,
              seatNumber: seat.orderNumber || seatIndexInRow + 1
            };
            break;
          }
          currentIndex += row.seats.length;
        }
      }
    }
    
    return result;
  }

  // Update seat tooltip handlers for all seats
  private updateSeatTooltipHandlers(): void {
    if (!this.layer) return;
    
    // Iterate through all sectors
    this.editableSectors().forEach(sector => {
      const sectorId = sector.sectorId!;
      const existingSeats = this.sectorSeats.get(sectorId);
      
      if (existingSeats) {
        existingSeats.forEach((seat, index) => {
          // Clear existing event handlers and add new ones
          seat.off('mouseover');
          seat.off('mouseout');
          
          // Add tooltip event handlers
          seat.on('mouseover', () => {
            this.stage!.container().style.cursor = 'pointer';
            seat.fill('#66BB6A'); // Hover color
            
            // Show tooltip with seat information when zoom level is sufficient (≥ 180%)
            if (this.zoomLevel() >= 1.79) {
              this.ensureSeatTooltip();
              if (!this.seatTooltip) return;
              
              // Get seat info (row name and seat number)
              const { rowName, seatNumber } = this.getSeatInfoFromIndex(sector, index);
              
              // Set tooltip text with sector name, row name, and seat number
              const tooltipText = `Sector: ${sector.name || 'Unknown'}\nRow: ${rowName}\nSeat: ${seatNumber}`;
              const labelText = this.seatTooltip.findOne('Text') as Konva.Text;
              labelText.text(tooltipText);
              
              // Position tooltip above the seat, adjusted for zoom
              const absPos = seat.getAbsolutePosition();
              const zoom = this.zoomLevel();
              this.seatTooltip.position({
                x: absPos.x / zoom,
                y: absPos.y / zoom - 10
              });
              
              this.seatTooltip.visible(true);
              // Always move tooltip to the top of the layer to ensure it's visible
              this.seatTooltip.moveToTop();
              this.layer!.batchDraw();
            }
          });
          
          seat.on('mouseout', () => {
            this.stage!.container().style.cursor = 'default';
            seat.fill('#90A4AE'); // Reset color
            
            // Hide tooltip
            if (this.seatTooltip) {
              this.seatTooltip.visible(false);
              this.layer!.batchDraw();
            }
          });
        });
      }
    });
  }
  private getConvexHull(points: {x: number, y: number}[]): {x: number, y: number}[] {
    // Andrew's monotone chain algorithm
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const lower: {x: number, y: number}[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && this.cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: {x: number, y: number}[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && this.cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }
  private cross(o: {x: number, y: number}, a: {x: number, y: number}, b: {x: number, y: number}) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  // Restrict canvas panning so the grid always covers the visible area
  private applyPanBounds(position: { x: number; y: number }): { x: number; y: number } {
    if (!this.stage) return position;
    // Get the visible container size
    const container = this.canvasContainer?.nativeElement;
    const containerWidth = container?.clientWidth || 0;
    const containerHeight = container?.clientHeight || 0;
    // Allow panning so any part of the canvas can be visible
    const minX = Math.min(0, containerWidth - this.canvasWidth);
    const minY = Math.min(0, containerHeight - this.canvasHeight);
    const maxX = 0;
    const maxY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, position.x)),
      y: Math.max(minY, Math.min(maxY, position.y))
    };
  }

  // Canvas panning and scrolling methods
  onCanvasWheel(event: WheelEvent) {
    if (!this.stage) return;
    
    if (event.ctrlKey) {
      // Zoom functionality with Ctrl+scroll
      event.preventDefault();
      
      // Determine zoom direction
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
    // For regular scroll without Ctrl, allow natural HTML container scrolling
    // Don't prevent default - let the browser handle it naturally
  }
  
  onCanvasMouseDown(event: MouseEvent) {
    // Allow panning in preview mode (no Alt required) OR in edit mode with Alt+drag
    if ((this.mode === 'preview' && event.button === 0) || (this.mode === 'edit' && event.button === 0 && event.altKey)) {
      if (this.canvasContainer) {
        this.isHtmlPanning = true;
        this.htmlPanStart = { x: event.clientX, y: event.clientY };
        const container = this.canvasContainer.nativeElement.parentElement;
        if (container) {
          this.htmlScrollStart = { left: container.scrollLeft, top: container.scrollTop };
          container.style.cursor = 'grabbing';
        }
        event.preventDefault();
        return;
      }
    }
    // No more Konva-based panning - all panning is now HTML scroll-based
  }
  
  onCanvasMouseMove(event: MouseEvent) {
    if (this.isHtmlPanning && this.canvasContainer) {
      const container = this.canvasContainer.nativeElement.parentElement;
      if (container) {
        const dx = event.clientX - this.htmlPanStart.x;
        const dy = event.clientY - this.htmlPanStart.y;
        container.scrollLeft = this.htmlScrollStart.left - dx;
        container.scrollTop = this.htmlScrollStart.top - dy;
      }
      event.preventDefault();
      return;
    }
    // No more Konva-based panning logic needed
  }
  
  onCanvasMouseUp(event: MouseEvent) {
    if (this.isHtmlPanning && this.canvasContainer) {
      const container = this.canvasContainer.nativeElement.parentElement;
      if (container) {
        container.style.cursor = '';
      }
      this.isHtmlPanning = false;
      event.preventDefault();
      return;
    }
    // No more Konva-based panning state to reset
    
    // Reset cursor
    if (this.canvasContainer) {
      this.canvasContainer.nativeElement.style.cursor = 'default';
    }
  }
  onSectorRectClick(sector: EditableSector, event: any) {
    event.cancelBubble = true;
    event.evt?.stopPropagation();
    
    // Don't allow selection in preview mode
    if (this.mode === 'preview') return;
    
    this.selectSector(sector, event.evt?.ctrlKey || event.evt?.metaKey);
  }

  onSectorHover(sector: EditableSector, event: any) {
    const stage = event.target.getStage();

    if (this.mode === 'preview') return;

    stage.container().style.cursor = 'grab';
  }

  onSectorMouseLeave(event: any) {
    const stage = event.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }
  // Sector selection
  selectSector(sector: EditableSector, addToSelection = false) {
    console.log('Selecting sector:', sector.name, 'Add to selection:', addToSelection);
    const sectors = this.editableSectors();
    
    if (addToSelection) {
      // Multi-selection with Ctrl
      const currentlySelected = this.selectedSectors();
      const isAlreadySelected = currentlySelected.some(s => s.sectorId === sector.sectorId);
      
      if (isAlreadySelected) {
        // Deselect this sector
        const newSelection = currentlySelected.filter(s => s.sectorId !== sector.sectorId);
        this.selectedSectors.set(newSelection);
        this.selectedSector.set(newSelection.length > 0 ? newSelection[0] : null);
      } else {
        // Add to selection
        const newSelection = [...currentlySelected, sector];
        this.selectedSectors.set(newSelection);
        this.selectedSector.set(sector);
      }
    } else {
      // Single selection (clear others)
      this.selectedSectors.set([sector]);
      this.selectedSector.set(sector);
    }
    
    // Update the isSelected property on all sectors
    const selectedIds = this.selectedSectors().map(s => s.sectorId);
    const updatedSectors = sectors.map(s => ({
      ...s,
      isSelected: selectedIds.includes(s.sectorId)
    }));
    this.editableSectors.set(updatedSectors);
    
    // Add this line to trigger a redraw
    this.markNeedsFullRender();
    
    console.log('Selected sectors count:', this.selectedSectors().length);
  }  
  
  deselectAll() {
    console.log('Deselecting all sectors');
    const sectors = this.editableSectors();
    const updatedSectors = sectors.map(s => ({
      ...s,
      isSelected: false
    }));
    this.editableSectors.set(updatedSectors);
    this.selectedSectors.set([]);
    this.selectedSector.set(null);
    
    // Add this line to trigger a redraw
    this.markNeedsFullRender();
  }

  // Sector movement
  onSectorDragStart(sector: EditableSector) {
    console.log('Drag start for sector:', sector.name);
    if (!this.selectedSectors().some(s => s.sectorId === sector.sectorId)) {
      this.selectSector(sector, false);
    }
    const sectors = this.editableSectors();
    const selectedIds = this.selectedSectors().map(s => s.sectorId);
    const updatedSectors = sectors.map(s => ({
      ...s,
      isDragging: selectedIds.includes(s.sectorId)
    }));
    this.editableSectors.set(updatedSectors);
    // Store initial positions for relative movement (Konva handles scaling)
    this.initialDragPositions = new Map();
    this.selectedSectors().forEach(selectedSector => {
      const group = this.sectorGroups.get(selectedSector.sectorId!);
      if (group) {
        this.initialDragPositions.set(selectedSector.sectorId!, { x: group.x(), y: group.y() });
        group.moveToTop();
        const rect = group.findOne('.sector-rect') as Konva.Rect;
        if (rect) {
          rect.strokeWidth(4);
          rect.opacity(1);
          rect.shadowColor('rgba(33, 150, 243, 0.6)');
          rect.shadowBlur(20);
          rect.shadowOffsetX(8);
          rect.shadowOffsetY(8);
        }
      }
    });
    this.stage?.draw();
  }

  onSectorDragMove(draggedSector: EditableSector, draggedGroup: Konva.Group) {
    // Only move other selected groups, not the dragged group itself
    const draggedPos = draggedGroup.position();
    const initialDraggedPos = this.initialDragPositions.get(draggedSector.sectorId!);
    if (!initialDraggedPos) return;
    const deltaX = draggedPos.x - initialDraggedPos.x;
    const deltaY = draggedPos.y - initialDraggedPos.y;
    this.selectedSectors().forEach(selectedSector => {
      if (selectedSector.sectorId === draggedSector.sectorId) return; // skip dragged group
      const sectorGroup = this.sectorGroups.get(selectedSector.sectorId!);
      const sectorInitialPos = this.initialDragPositions.get(selectedSector.sectorId!);
      if (sectorGroup && sectorInitialPos) {
        sectorGroup.position({
          x: sectorInitialPos.x + deltaX,
          y: sectorInitialPos.y + deltaY
        });
        sectorGroup.moveToTop();
        const rect = sectorGroup.findOne('.sector-rect') as Konva.Rect;
        if (rect) {
          rect.strokeWidth(4);
          rect.opacity(1);
          rect.shadowColor('rgba(33, 150, 243, 0.6)');
          rect.shadowBlur(20);
          rect.shadowOffsetX(8);
          rect.shadowOffsetY(8);
          const texts = sectorGroup.find('Text');
          texts.forEach(node => {
            (node as Konva.Text).opacity(1);
          });
        }
      }
    });
    // Don't redraw during drag - let Konva handle the smooth dragging
    // this.stage?.draw(); // Removed for performance - dragging is handled by Konva automatically
  }

  onSectorDragEnd(draggedSector: EditableSector, draggedGroup: Konva.Group) {
    // Use the actual group positions after drag
    const updatedSectors = this.editableSectors().map(s => {
      const isSelected = this.selectedSectors().some(selected => selected.sectorId === s.sectorId);
      if (isSelected) {
        const group = this.sectorGroups.get(s.sectorId!);
        if (group) {
          const pos = group.position();
          return {
            ...s,
            isDragging: false,
            position: { x: Math.round(pos.x), y: Math.round(pos.y) }
          };
        }
      }
      return { ...s, isDragging: false };
    });
    this.editableSectors.set(updatedSectors);
    this.hasChanges.set(true);
    const newSelectedSectors = this.selectedSectors().map(selected => {
      const updated = updatedSectors.find(s => s.sectorId === selected.sectorId);
      return updated || selected;
    });
    this.selectedSectors.set(newSelectedSectors);
    // Update primary selected sector if it exists
    if (this.selectedSector()) {
      const updatedPrimary = updatedSectors.find(s => s.sectorId === this.selectedSector()?.sectorId);
      this.selectedSector.set(updatedPrimary || null);
    }
    this.selectedSectors().forEach(selectedSector => {
      const sectorGroup = this.sectorGroups.get(selectedSector.sectorId!);
      if (sectorGroup) {
        const rect = sectorGroup.findOne('.sector-rect') as Konva.Rect;
        const updatedSector = updatedSectors.find(s => s.sectorId === selectedSector.sectorId);
        if (rect && updatedSector) {
          rect.fill(this.getSectorColor(updatedSector));
          rect.stroke(this.getSectorStrokeColor(updatedSector));
          rect.strokeWidth(updatedSector.isSelected ? 3 : 2);
          rect.opacity(1);
          rect.shadowColor(updatedSector.isSelected ? 'rgba(33, 150, 243, 0.5)' : 'rgba(0, 0, 0, 0.3)');
          rect.shadowBlur(updatedSector.isSelected ? 20 : 10);
          rect.shadowOffsetX(5);
          rect.shadowOffsetY(5);
          const texts = sectorGroup.find('Text');
          texts.forEach(node => {
            const text = node as Konva.Text;
            text.fill('#fff');
            text.fontStyle('bold');
            text.opacity(1);
          });
        }
      }
    });
    this.initialDragPositions.clear();
    this.stage?.draw();
    console.log('Multi-sector drag completed');
  }
  // Sector rotation
  rotateSector(clockwise: boolean = true) {
    const selectedSectors = this.selectedSectors();
    if (selectedSectors.length === 0) return;

    const sectors = this.editableSectors();
    const rotationStep = clockwise ? 15 : -15;
    const selectedIds = selectedSectors.map(s => s.sectorId);
    
    const updatedSectors = sectors.map(s => {
      if (selectedIds.includes(s.sectorId)) {
        const newRotation = ((s.rotation ?? 0) + rotationStep) % 360;
        return { ...s, rotation: newRotation };
      }
      return s;
    });
    
    this.editableSectors.set(updatedSectors);
    
    // Update the selected sectors array with the rotated sectors
    const newSelectedSectors = selectedSectors.map(selected => {
      const updated = updatedSectors.find(s => s.sectorId === selected.sectorId);
      return updated || selected;
    });
    this.selectedSectors.set(newSelectedSectors);
    
    // Update primary selected sector if it exists
    if (this.selectedSector()) {
      const updatedPrimary = updatedSectors.find(s => s.sectorId === this.selectedSector()?.sectorId);
      this.selectedSector.set(updatedPrimary || null);
    }
    
    this.hasChanges.set(true);
  }  // Add new sector
  addNewSector() {
    console.log('Adding new sector...');
    const sectors = this.editableSectors();
    const newSector: EditableSector = {
      sectorId: `temp-${Date.now()}`,
      name: `Sector ${sectors.length + 1}`,
      position: { x: 200, y: 200 },
      numberOfSeats: 0,
      priceCategory: 'Standard',
      status: Sector.StatusEnum.Active,
      isSelected: true,
      isDragging: false,
      rotation: 0
    };

    // Deselect all others and add new sector
    const updatedSectors = sectors.map(s => ({ ...s, isSelected: false }));
    updatedSectors.push(newSector);
    
    this.editableSectors.set(updatedSectors);
    this.selectedSector.set(newSector);
    this.hasChanges.set(true);
    console.log('New sector added:', newSector);
  }
  // Delete sector
  deleteSector() {
    const selectedSectors = this.selectedSectors();
    console.log('deleteSector called, selectedSectors:', selectedSectors);
    if (selectedSectors.length === 0) return;

    this.confirmationDialog.confirmDelete(selectedSectors.length === 1 ? selectedSectors[0].name ?? 'this sector' : `${selectedSectors.length} sectors`, 'sector')
      .subscribe(async confirmed => {
        console.log('Confirmation dialog result:', confirmed);
        if (confirmed) {
          const sectors = this.editableSectors();
          const selectedIds = selectedSectors.map(s => s.sectorId);
          const venueId = this.venueId();
          let errorOccurred = false;
          for (const sector of selectedSectors) {
            // Only call API for persisted sectors (not temp ones)
            if (venueId && sector.sectorId && !sector.sectorId.startsWith('temp-')) {
              try {
                await firstValueFrom(this.venueApi.deleteSector(venueId, sector.sectorId));
                console.log('Deleted sector from API:', sector.sectorId);
              } catch (err) {
                errorOccurred = true;
                console.error('Failed to delete sector from API:', sector.sectorId, err);
              }
            }
          }
          // Remove from local state regardless (optimistic update)
          const updatedSectors = sectors.filter(s => !selectedIds.includes(s.sectorId));
          this.editableSectors.set(updatedSectors);
          this.selectedSectors.set([]);
          this.selectedSector.set(null);
          this.hasChanges.set(true);
          this.renderSectors(); // Force canvas update after deletion
          console.log('Sector(s) deleted:', selectedIds);
          if (errorOccurred) {
            this.snackBar.open('Some sectors could not be deleted from the server.', 'Close', { duration: 4000, horizontalPosition: 'center', verticalPosition: 'top' });
          } else {
            this.snackBar.open('Sector(s) deleted successfully.', 'Close', { duration: 2000, horizontalPosition: 'center', verticalPosition: 'top' });
          }
        }
      });
  }

  // Sector operations
  duplicateSector() {
    const selectedSectors = this.selectedSectors();
    if (selectedSectors.length === 0) return;

    const sectors = this.editableSectors();
    const newSectors: EditableSector[] = [];

    selectedSectors.forEach((selectedSector, index) => {
      const duplicatedSector: EditableSector = {
        ...selectedSector,
        sectorId: `temp-${Date.now()}-${index}`,
        name: `${selectedSector.name} Copy`,
        position: {
          x: (selectedSector.position?.x ?? 0) + 50,
          y: (selectedSector.position?.y ?? 0) + 50
        },
        isSelected: false,
        isDragging: false
      };
      newSectors.push(duplicatedSector);
    });

    this.editableSectors.set([...sectors, ...newSectors]);
    this.hasChanges.set(true);
    
    console.log(`Duplicated ${selectedSectors.length} sectors`);
  }
  // Save and Cancel operations
  async saveChanges() {
    if (!this.hasChanges() || this.saving()) return;
    
    const venueId = this.venueId();
    if (!venueId) return;

    try {
      this.saving.set(true);
      console.log('Saving venue changes...');
      
      // Save all sectors
      for (const sector of this.editableSectors()) {
        if (sector.sectorId?.startsWith('temp-')) {
          // Create new sector
          const sectorInput = {
            name: sector.name ?? '',
            orderNumber: sector.orderNumber,
            position: sector.position,
            rotation: sector.rotation,
            priceCategory: sector.priceCategory,
            status: sector.status
          };
          await firstValueFrom(this.venueApi.addSector(venueId, sectorInput));
        } else {
          // Update existing sector properties
          const sectorInput = {
            name: sector.name ?? '',
            orderNumber: sector.orderNumber,
            position: sector.position,
            rotation: sector.rotation,
            priceCategory: sector.priceCategory,
            status: sector.status
          };
          await firstValueFrom(this.venueApi.updateSector(venueId, sector.sectorId!, sectorInput));
        }
      }

      this.hasChanges.set(false);
      this.snackBar.open('Changes saved successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
        // Refresh venue data
      this.fetchVenue(venueId);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      this.snackBar.open('Failed to save changes. Please try again.', 'Close', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    } finally {
      this.saving.set(false);
    }
  }
  async cancelChanges() {
    if (!this.hasChanges()) return;

    const confirmed = await firstValueFrom(this.confirmationDialog.confirm({
      title: 'Cancel Changes',
      message: 'Are you sure you want to cancel all unsaved changes?',
      confirmButtonText: 'Yes, Cancel',
      cancelButtonText: 'Keep Editing'
    }));

    if (confirmed) {
      console.log('Cancelling changes...');
      this.hasChanges.set(false);
      this.selectedSector.set(null);
      
      // Reload the venue to reset all changes
      const venueId = this.venueId();
      if (venueId) {
        this.fetchVenue(venueId);
      }
    }
  }  // Navigation
  editSectorSeats() {
    const selectedSectors = this.selectedSectors();
    if (selectedSectors.length === 1) {
      const sector = selectedSectors[0];
      const venueId = this.venueId();
      
      if (venueId && sector.sectorId) {
        this.router.navigate(['/venues', venueId, 'sectors', sector.sectorId, 'seat-edit']);
      }
    }
  }

  goBack() {
    this.navigateBack();
  }

  private navigateBack() {
    const venueId = this.venueId();
    if (venueId) {
      this.router.navigate(['/venues', venueId]);
    } else {
      this.router.navigate(['/venues']);
    }  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.resizeHandler);
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clean up Konva objects
    if (this.stage) {
      this.stage.destroy();
    }
  }

  // Get sector color based on selection and status
  getSectorColor(sector: EditableSector): string {
    if (sector.isSelected) return '#2196f3';
    // Removed yellow/orange color for dragging
    return sector.status === Sector.StatusEnum.Active ? '#4caf50' : '#f44336';
  }

  getSectorStrokeColor(sector: EditableSector): string {
    if (sector.isSelected) return '#1976d2';
    // Removed orange stroke for dragging
    return '#333';
  }

  // Helper methods for template
  getSelectedSectorNames(): string {
    return this.selectedSectors().map(s => s.name ?? 'Unnamed').join(', ');
  }

  getTotalSelectedSeats(): number {
    return this.selectedSectors().reduce((sum, s) => sum + (s.numberOfSeats ?? 0), 0);
  }

  // Keyboard state
  private readonly ctrlPressed = signal(false);

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      this.ctrlPressed.set(true);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      this.ctrlPressed.set(false);
    }
  };

  // Expose ctrlPressed signal as a method for template usage
  isCtrlPressed() {
    return this.ctrlPressed();
  }

  // Debug method to test grid functionality
  toggleGridDebug() {
    console.log('Grid toggle debug - current state:', this.showGrid());
    this.showGrid.set(!this.showGrid());
    console.log('Grid toggle debug - new state:', this.showGrid());
    
    // Force refresh
    if (this.layer) {
      if (this.showGrid()) {
        this.renderGrid();
      } else {
        this.clearGrid();
      }
    }
  }

  private addSelectionIndicators(group: Konva.Group) { console.log("addSelectionIndicators");
    // Find all seat circles in the group
    const seatNodes = group.getChildren(node => node.className === 'Circle') as Konva.Circle[];
    if (!seatNodes || seatNodes.length === 0) return;
console.log("addSelectionIndicators2");
    // Calculate bounding box of all seats
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    seatNodes.forEach(seat => {
      const x = seat.x();
      const y = seat.y();
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // Add indicator circles at the four corners
    const corners = [
      { x: minX - 5, y: minY - 5 },
      { x: maxX + 5, y: minY - 5 },
      { x: minX - 5, y: maxY + 5 },
      { x: maxX + 5, y: maxY + 5 }
    ];
    corners.forEach(corner => {
      const indicator = new Konva.Circle({
        x: corner.x,
        y: corner.y,
        radius: 4,
        fill: '#2196f3',
        stroke: '#fff',
        strokeWidth: 2,
        listening: false
      });
      group.add(indicator);
    });
  }

  openChangeSectorNameDialog() {
    const selected = this.selectedSectors();
    if (selected.length !== 1) return;
    const sector = selected[0];
    const dialogRef = this.dialog.open(ChangeSectorNameDialogComponent, {
      data: { name: sector.name },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result && result !== sector.name) {
        // Update the sector name in editableSectors
        this.editableSectors.update(sectors =>
          sectors.map(s =>
            s.sectorId === sector.sectorId ? { ...s, name: result } : s
          )
        );
        this.hasChanges.set(true);
        // Also update selectedSectors signal
        this.selectedSectors.update(sel =>
          sel.map(s =>
            s.sectorId === sector.sectorId ? { ...s, name: result } : s
          )
        );
      }
    });
  }

  zoomIn() {
    if (this.zoomLevel() < this.maxZoom) {
      const oldZoom = this.zoomLevel();
      this.zoomLevel.update(level => level + this.zoomIncrement);
      const newZoom = this.zoomLevel();
      console.log(`Zoom increased: ${oldZoom.toFixed(3)} → ${newZoom.toFixed(3)} (increment: ${this.zoomIncrement})`);
      this.applyZoom();
    }
  }
  
  zoomOut() {
    if (this.zoomLevel() > this.minZoom) {
      const oldZoom = this.zoomLevel();
      this.zoomLevel.update(level => level - this.zoomIncrement);
      const newZoom = this.zoomLevel();
      console.log(`Zoom decreased: ${oldZoom.toFixed(3)} → ${newZoom.toFixed(3)} (decrement: ${this.zoomIncrement})`);
      this.applyZoom();
    }
  }
  
  resetZoom() {
    this.zoomLevel.set(1);
    this.applyZoom();
  }

  private applyZoom(): void {
    if (!this.stage || !this.canvasContainer) return;

    const currentZoom = this.zoomLevel();
    
    // Update both the visual scale (Konva) and physical canvas size
    this.stage.scale({ x: currentZoom, y: currentZoom });
    
    // Calculate new canvas dimensions
    const newWidth = this.baseCanvasWidth * currentZoom;
    const newHeight = this.baseCanvasHeight * currentZoom;
    
    // Update canvas dimensions
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    
    // Update the stage size
    this.stage.width(newWidth);
    this.stage.height(newHeight);
    
    // Update the canvas container size
    const canvasElement = this.canvasContainer.nativeElement;
    canvasElement.style.width = `${newWidth}px`;
    canvasElement.style.height = `${newHeight}px`;
    
    // Update background rectangle size if it exists
    if (this.layer) {
      const background = this.layer.findOne('.canvas-background') as Konva.Rect;
      if (background) {
        background.width(newWidth);
        background.height(newHeight);
      }
    }
    
    // Re-render grid if it's enabled - this will now properly cover the canvas at any zoom level
    if (this.showGrid()) {
      this.renderGrid();
    }
    
    // Update seat visibility based on zoom level
    this.updateSeatsVisibility(currentZoom);
    
    // Update seat tooltip handlers
    this.updateSeatTooltipHandlers();
    
    // Hide tooltip when zooming to avoid incorrect positioning
    if (this.seatTooltip) {
      this.seatTooltip.visible(false);
    }
    
    this.stage.batchDraw();
    
    console.log('Zoom applied:', currentZoom, 'New canvas size:', newWidth, 'x', newHeight);
  }

  // Expose zoom properties for template access
  get minZoomValue() { return this.minZoom; }
  get maxZoomValue() { return this.maxZoom; }
  
  // Expose zoomLevel signal for template access
  getCurrentZoom() { return this.zoomLevel(); }
}
