import { ChangeDetectionStrategy, Component, effect, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, untracked } from '@angular/core';
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
import { ConfirmationDialogService } from '../../shared';
import { firstValueFrom } from 'rxjs';
import { ChangeSectorNameDialogComponent } from './change-sector-name-dialog/change-sector-name-dialog.component';
import { canDeactivateVenueMapEdit } from './can-deactivate-venue-map-edit.guard';

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
    ChangeSectorNameDialogComponent
  ],
  templateUrl: './venue-map-edit.component.html',
  styleUrls: ['./venue-map-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class VenueMapEditComponent implements AfterViewInit, OnDestroy {  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;
  
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
  private initialDragPositions = new Map<string, { x: number; y: number }>();
  private konvaInitialized = false;
  
  // Canvas and zoom settings
  zoom = signal(1);
  canvasWidth = 1200;
  canvasHeight = 800;
  private resizeObserver: ResizeObserver | null = null;
  private readonly resizeHandler = () => {
    this.resizeCanvas();
  };
  
  // Edit state
  editableSectors = signal<EditableSector[]>([]);
  selectedSectors = signal<EditableSector[]>([]);
  selectedSector = signal<EditableSector | null>(null); // Keep for backward compatibility
  editMode = signal<'select' | 'add' | 'move' | 'rotate'>('select');
  hasChanges = signal(false);  // Grid settings
  showGrid = signal(true);
  gridSize = 20;
  
  // Panning state for canvas scrolling
  private isPanning = false;
  private lastPanPoint = { x: 0, y: 0 };
  private panStartPoint = { x: 0, y: 0 };
  constructor() {
    this.route.paramMap.subscribe(params => {
      const venueId = params.get('venueId');
      this.venueId.set(venueId);
      if (venueId) {
        this.fetchVenue(venueId);
      }
    });
    
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
        if (!hasDraggingSectors) {
          this.renderSectors();
        }
        // Otherwise, don't re-render during drag operations to prevent flicker
      }
    });

    effect(() => {
      // Ensure we track the zoom signal
      const scale = this.zoom();
      untracked(() => {
        if (this.stage) {
          // Apply Konva scaling for zoom
          this.stage.scale({ x: scale, y: scale });
          this.stage.batchDraw();
          // Optionally, adjust container size if you want to keep the visible area the same
          if (this.canvasContainer) {
            const canvasElement = this.canvasContainer.nativeElement.querySelector('canvas');
            if (canvasElement) {
              canvasElement.style.transform = '';
              canvasElement.style.transformOrigin = '';
              canvasElement.style.width = `${this.canvasWidth}px`;
              canvasElement.style.height = `${this.canvasHeight}px`;
            }
          }
        }
      });
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
    // Get actual container dimensions if available
    if (this.canvasContainer?.nativeElement) {
      const containerElement = this.canvasContainer.nativeElement;
      
      // Use clientWidth/clientHeight which gives the interior dimensions
      // (excluding borders, scrollbars, but including padding)
      this.canvasWidth = Math.max(containerElement.clientWidth || 800, 800);
      this.canvasHeight = Math.max(containerElement.clientHeight || 600, 600);
      
      console.log('Container clientWidth:', containerElement.clientWidth, 'clientHeight:', containerElement.clientHeight);
      console.log('Container getBoundingClientRect:', containerElement.getBoundingClientRect());
    } else {
      // Fallback to window-based calculation
      const newWidth = Math.max(window.innerWidth - 400, 800); // Account for sidebar
      const newHeight = Math.max(window.innerHeight * 0.7, 600);
      
      this.canvasWidth = newWidth;
      this.canvasHeight = newHeight;
    }
    
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
    
    console.log('Canvas resized to:', this.canvasWidth, 'x', this.canvasHeight);
  }

  private readonly handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.hasChanges()) {
      event.preventDefault();
      event.returnValue = '';
      // Native dialogs only: browsers ignore custom dialogs in beforeunload
      // This will show the default browser dialog
      return '';
    }
    return undefined;
  };

  private fetchVenue(id: string) {
    this.loading.set(true);
    this.venueApi.getVenue(id).subscribe({
      next: (venue: Venue) => {
        this.venue.set(venue);
        this.initializeEditableSectors(venue);
        this.loading.set(false);
      },
      error: (err: any) => {
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
  }

  private renderGrid() {
    if (!this.layer) return;
    this.clearGrid();
    if (!this.showGrid()) return;

    // Create vertical lines
    for (let i = 0; i <= Math.ceil(this.canvasWidth / this.gridSize); i++) {
      const line = new Konva.Line({
        points: [i * this.gridSize, 0, i * this.gridSize, this.canvasHeight],
        stroke: '#ddd',
        strokeWidth: 1,
        opacity: 0.7,
        listening: false,
        name: 'grid-line'
      });
      this.layer.add(line);
    }

    // Create horizontal lines
    for (let i = 0; i <= Math.ceil(this.canvasHeight / this.gridSize); i++) {
      const line = new Konva.Line({
        points: [0, i * this.gridSize, this.canvasWidth, i * this.gridSize],
        stroke: '#ddd',
        strokeWidth: 1,
        opacity: 0.7,
        listening: false,
        name: 'grid-line'
      });
      this.layer.add(line);
    }

    this.layer.batchDraw();
    console.log('Grid rendered with', this.layer.find('.grid-line').length, 'lines');
    this.fixLayerZOrder();
  }

  private clearGrid() {
    if (!this.layer) return;
    
    const gridLines = this.layer.find('.grid-line');
    console.log('Clearing', gridLines.length, 'grid lines');
    gridLines.forEach(line => line.destroy());
    this.layer.batchDraw();
  }
  private renderSectors() {
    if (!this.layer) {
      console.log('No layer available for rendering sectors');
      return;
    }

    console.log('Rendering sectors:', this.editableSectors().length);

    // Clear existing sectors
    this.sectorGroups.forEach(group => group.destroy());
    this.sectorGroups.clear();

    // Render each sector
    this.editableSectors().forEach(sector => {
      console.log('Creating sector group for:', sector.name, 'at position:', sector.position);
      const group = this.createSectorGroup(sector);
      if (group) {
        this.sectorGroups.set(sector.sectorId!, group);
      }
    });

    // Ensure proper z-index ordering: background -> grid -> sectors
    this.fixLayerZOrder();
    
    this.layer.batchDraw();
    console.log('Finished rendering sectors');
  }  private createSectorGroup(sector: EditableSector): Konva.Group | null {
    if (!this.layer) {
      console.log('No layer available for creating sector group');
      return null;
    }

    console.log('Creating sector group for:', sector.name, 'with position:', sector.position);

    const group = new Konva.Group({
      x: sector.position?.x ?? 100,
      y: sector.position?.y ?? 100,
      rotation: sector.rotation || 0,
      draggable: this.editMode() === 'move' || this.editMode() === 'select'
    });

    // --- Dynamic sector shape based on seats layout ---
    const seatRadius = 8;
    const seatSpacing = 6;
    let seatPositions: {x: number, y: number}[] = [];
    let maxRowLength = 0;
    let totalRows = 0;
    if (sector.rows && Array.isArray(sector.rows)) {
      totalRows = sector.rows.length;
      sector.rows.forEach((row, rowIdx) => {
        if (row.seats && Array.isArray(row.seats)) {
          maxRowLength = Math.max(maxRowLength, row.seats.length);
          row.seats.forEach((seat, seatIdx) => {
            // Use explicit seat position if available, otherwise fallback to calculated
            if (seat.position && typeof seat.position.x === 'number' && typeof seat.position.y === 'number') {
              seatPositions.push({ x: seat.position.x, y: seat.position.y });
            } else if (row.seats) {
              // Fallback: calculate position as before
              const rowY = rowIdx * (seatRadius * 2 + seatSpacing);
              const rowOffset = (maxRowLength - row.seats.length) * (seatRadius + seatSpacing/2);
              const x = seatIdx * (seatRadius * 2 + seatSpacing) + rowOffset;
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
        outline = new Konva.Line({
          points,
          closed: true,
          stroke: this.getSectorStrokeColor(sector),
          strokeWidth: sector.isSelected ? 3 : 2,
          fill: this.getSectorColor(sector) + '33', // semi-transparent fill
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
          if (this.editMode() === 'move' || this.editMode() === 'select') {
            this.stage!.container().style.cursor = 'grab';
          }
        });
        outline.on('mouseleave', () => {
          this.stage!.container().style.cursor = 'default';
        });
        group.add(outline);
        outline.moveToBottom();
      }
    }

    // Only show seat circles if zoom > 2.0
    if (this.zoom() > 2.0) {
      seatPositions.forEach(pos => {
        const seatCircle = new Konva.Circle({
          x: pos.x,
          y: pos.y,
          radius: seatRadius,
          fill: '#fff',
          stroke: this.getSectorColor(sector),
          strokeWidth: 2,
          opacity: 0.9,
          listening: false
        });
        group.add(seatCircle);
      });
    }

    // Add selection indicators if selected
    if (sector.isSelected) {
      this.addSelectionIndicators(group);
    }

    // Calculate bounding box width for label centering
    let labelWidth = 120; // fallback
    let minX = 0, maxX = 0, minY = 0;
    if (seatPositions.length > 0) {
      minX = Math.min(...seatPositions.map(p => p.x));
      maxX = Math.max(...seatPositions.map(p => p.x));
      minY = Math.min(...seatPositions.map(p => p.y));
      labelWidth = Math.max(80, maxX - minX + seatRadius * 2);
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

    // Add sector name and seat count labels inside the sector
    const nameText = new Konva.Text({
      text: sector.name ?? 'Unnamed Sector',
      x: centroidX - 60, // Center label horizontally (width 120)
      y: centroidY - 18, // Slightly above center
      width: 120,
      align: 'center',
      fontSize: 14,
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
      if (this.editMode() === 'move' || this.editMode() === 'select') {
        this.stage!.container().style.cursor = 'grab';
      }
    });
    nameText.on('mouseleave', () => {
      this.stage!.container().style.cursor = 'default';
    });

    group.add(nameText);

    const seatsText = new Konva.Text({
      text: `Seats: ${sector.numberOfSeats ?? 0}`,
      x: centroidX - 60,
      y: centroidY + 2, // Slightly below center
      width: 120,
      align: 'center',
      fontSize: 12,
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
      if (this.editMode() === 'move' || this.editMode() === 'select') {
        this.stage!.container().style.cursor = 'grab';
      }
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
      if (this.editMode() === 'move' || this.editMode() === 'select') {
        this.stage!.container().style.cursor = 'grab';
      }
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
      this.onSectorDragEnd(sector, group);
    });

    // Add to layer
    this.layer.add(group);
    console.log('Added sector group to layer');
    return group;
  }

  // --- Convex hull algorithm for sector outline ---
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

  // Zoom controls
  zoomIn() {
    const newZoom = Math.min(this.zoom() * 1.2, 3);
    this.zoom.set(newZoom);
    this.applyZoomBounds();
  }

  zoomOut() {
    const newZoom = Math.max(this.zoom() / 1.2, 0.5);
    this.zoom.set(newZoom);
    this.applyZoomBounds();
  }

  resetZoom() {
    this.zoom.set(1);
    if (this.stage) {
      const boundedPos = this.applyPanBounds({ x: 0, y: 0 });
      this.stage.position(boundedPos);
      requestAnimationFrame(() => {
        this.stage?.batchDraw();
      });
    }
  }

  private applyZoomBounds() {
    if (this.stage) {
      const currentPos = this.stage.position();
      const boundedPos = this.applyPanBounds(currentPos);
      this.stage.position(boundedPos);
      this.stage.batchDraw();
    }
  }

  // Restrict canvas panning so the grid always covers the visible area
  private applyPanBounds(position: { x: number; y: number }): { x: number; y: number } {
    if (!this.stage) return position;
    const zoom = this.zoom();
    const stageWidth = this.canvasWidth;
    const stageHeight = this.canvasHeight;
    const scaledWidth = stageWidth * zoom;
    const scaledHeight = stageHeight * zoom;
    // The minimum x/y so the right/bottom edge of the grid is never left of/below the viewport
    const minX = Math.min(0, stageWidth - scaledWidth);
    const minY = Math.min(0, stageHeight - scaledHeight);
    // The maximum x/y so the left/top edge of the grid is never right of/above the viewport
    const maxX = 0;
    const maxY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, position.x)),
      y: Math.max(minY, Math.min(maxY, position.y))
    };
  }

  // Canvas panning and scrolling methods
  onCanvasWheel(event: WheelEvent) {
    event.preventDefault();
    if (!this.stage) return;
    if (event.ctrlKey) {
      const scaleBy = 1.1;
      const stage = this.stage;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      let newScale = event.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      newScale = Math.max(0.5, Math.min(3, newScale));
      this.zoom.set(newScale);
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      const boundedPos = this.applyPanBounds(newPos);
      stage.position(boundedPos);
      stage.batchDraw();
    } else {
      const deltaX = event.deltaX;
      const deltaY = event.deltaY;
      const newPos = {
        x: this.stage.x() - deltaX,
        y: this.stage.y() - deltaY
      };
      const boundedPos = this.applyPanBounds(newPos);
      this.stage.position(boundedPos);
      this.stage.batchDraw();
    }
  }
  
  onCanvasMouseDown(event: MouseEvent) {
    if (!this.stage) return;
    
    // Only start panning if zoomed in and not clicking on a sector
    if (this.zoom() > 1 && event.button === 0) {
      const konvaEvent = this.stage.getPointerPosition();
      if (konvaEvent) {
        this.isPanning = true;
        this.panStartPoint = { x: event.clientX, y: event.clientY };
        this.lastPanPoint = { x: this.stage.x(), y: this.stage.y() };
        
        // Change cursor to grabbing
        if (this.canvasContainer) {
          this.canvasContainer.nativeElement.style.cursor = 'grabbing';
        }
      }
    }
  }
  
  onCanvasMouseMove(event: MouseEvent) {
    if (!this.stage || !this.isPanning) return;
    
    const deltaX = event.clientX - this.panStartPoint.x;
    const deltaY = event.clientY - this.panStartPoint.y;
    
    const newPos = {
      x: this.lastPanPoint.x + deltaX,
      y: this.lastPanPoint.y + deltaY
    };
    const boundedPos = this.applyPanBounds(newPos);
    this.stage.position(boundedPos);
    this.stage.batchDraw();
  }
  
  onCanvasMouseUp(event: MouseEvent) {
    this.isPanning = false;
    
    // Reset cursor
    if (this.canvasContainer) {
      this.canvasContainer.nativeElement.style.cursor = this.zoom() > 1 ? 'grab' : 'default';
    }
  }
  onSectorRectClick(sector: EditableSector, event: any) {
    console.log('Sector rect clicked:', sector.name, 'Edit mode:', this.editMode());
    event.cancelBubble = true;
    event.evt?.stopPropagation();
    
    if (this.editMode() === 'select' || this.editMode() === 'move') {
      const ctrlPressed = event.evt?.ctrlKey ?? event.evt?.metaKey ?? false;
      this.selectSector(sector, ctrlPressed);
    }
  }

  onSectorHover(sector: EditableSector, event: any) {
    const stage = event.target.getStage();
    if (stage) {
      if (this.editMode() === 'move' || this.editMode() === 'select') {
        stage.container().style.cursor = 'grab';
      } else {
        stage.container().style.cursor = 'default';
      }
    }
  }

  onSectorMouseLeave(event: any) {
    const stage = event.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }
  // Edit mode controls
  setEditMode(mode: 'select' | 'add' | 'move' | 'rotate') {
    console.log('Setting edit mode to:', mode);
    this.editMode.set(mode);
    this.selectedSector.set(null);
  }  // Sector selection
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
    
    console.log('Selected sectors count:', this.selectedSectors().length);
  }  deselectAll() {
    console.log('Deselecting all sectors');
    const sectors = this.editableSectors();
    const updatedSectors = sectors.map(s => ({
      ...s,
      isSelected: false
    }));
    this.editableSectors.set(updatedSectors);
    this.selectedSectors.set([]);
    this.selectedSector.set(null);
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
    // Get the current pointer position and adjust for zoom
    const scale = this.zoom();
    const pointerPos = this.stage?.getPointerPosition();
    if (!pointerPos) return;
    // Calculate the logical (unscaled) position
    const logicalPointer = { x: pointerPos.x / scale, y: pointerPos.y / scale };
    // Calculate the offset from the group's drag start position
    const initialPos = this.initialDragPositions.get(draggedSector.sectorId!);
    if (!initialPos) return;
    const deltaX = logicalPointer.x - initialPos.x;
    const deltaY = logicalPointer.y - initialPos.y;
    this.selectedSectors().forEach(selectedSector => {
      if (selectedSector.sectorId === draggedSector.sectorId) return;
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
    // Move the dragged group
    draggedGroup.position({
      x: initialPos.x + deltaX,
      y: initialPos.y + deltaY
    });
    draggedGroup.moveToTop();
    const rect = draggedGroup.findOne('.sector-rect') as Konva.Rect;
    if (rect) {
      rect.strokeWidth(4);
      rect.opacity(1);
      rect.shadowColor('rgba(33, 150, 243, 0.6)');
      rect.shadowBlur(20);
      rect.shadowOffsetX(8);
      rect.shadowOffsetY(8);
      const texts = draggedGroup.find('Text');
      texts.forEach(node => {
        (node as Konva.Text).opacity(1);
      });
    }
    this.stage?.draw();
  }

  onSectorDragEnd(draggedSector: EditableSector, draggedGroup: Konva.Group) {
    const scale = this.zoom();
    const pointerPos = this.stage?.getPointerPosition();
    if (!pointerPos) return;
    const logicalPointer = { x: pointerPos.x / scale, y: pointerPos.y / scale };
    const initialPos = this.initialDragPositions.get(draggedSector.sectorId!);
    if (!initialPos) return;
    const deltaX = logicalPointer.x - initialPos.x;
    const deltaY = logicalPointer.y - initialPos.y;
    const sectors = this.editableSectors();
    const updatedSectors = sectors.map(s => {
      const isSelected = this.selectedSectors().some(selected => selected.sectorId === s.sectorId);
      if (isSelected) {
        const sectorInitialPos = this.initialDragPositions.get(s.sectorId!);
        if (sectorInitialPos) {
          const newPosition = {
            x: Math.round(sectorInitialPos.x + deltaX),
            y: Math.round(sectorInitialPos.y + deltaY)
          };
          return {
            ...s,
            isDragging: false,
            position: newPosition
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
    if (selectedSectors.length === 0) return;

    this.confirmationDialog.confirmDelete(selectedSectors.length === 1 ? selectedSectors[0].name ?? 'this sector' : `${selectedSectors.length} sectors`, 'sector')
      .subscribe(confirmed => {
        if (confirmed) {
          const sectors = this.editableSectors();
          const selectedIds = selectedSectors.map(s => s.sectorId);
          const updatedSectors = sectors.filter(s => !selectedIds.includes(s.sectorId));
          this.editableSectors.set(updatedSectors);
          this.selectedSectors.set([]);
          this.selectedSector.set(null);
          this.hasChanges.set(true);
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

  private addSelectionIndicators(group: Konva.Group) {
    // Find all seat circles in the group
    const seatNodes = group.getChildren(node => node.className === 'Circle') as Konva.Circle[];
    if (!seatNodes || seatNodes.length === 0) return;

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
}
