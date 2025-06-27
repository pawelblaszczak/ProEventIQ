import { ChangeDetectionStrategy, Component, effect, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
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
    RouterModule
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
      
      // Use untracked to avoid re-running the effect during the update
      untracked(() => {
        if (this.stage) {
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
            this.stage?.batchDraw();
          });
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
      return 'You have unsaved changes. Are you sure you want to leave?';
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
  private renderGrid() {
    if (!this.layer) return;

    // Remove existing grid
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
    const background = this.layer.findOne('.canvas-background');
    if (background) {
      background.moveToBottom();
    }
    
    // Move grid lines above background
    const gridLines = this.layer.find('.grid-line');
    gridLines.forEach(line => {
      if (background) {
        line.moveUp();
      }
    });
    
    // Move all sector groups to top (above grid)
    this.sectorGroups.forEach(group => {
      group.moveToTop();
    });

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
    });    // Create sector rectangle
    const rect = new Konva.Rect({
      name: 'sector-rect', // Add name for easier finding
      width: 120,
      height: 80,
      fill: this.getSectorColor(sector),
      stroke: this.getSectorStrokeColor(sector),
      strokeWidth: sector.isSelected ? 3 : 2,
      cornerRadius: 8,
      shadowColor: sector.isSelected ? 'rgba(33, 150, 243, 0.5)' : 'rgba(0, 0, 0, 0.3)',
      shadowBlur: sector.isSelected ? 20 : 10,
      shadowOffsetX: 5,
      shadowOffsetY: 5
    });

    console.log('Created rectangle with color:', this.getSectorColor(sector));

    // Create sector name text
    const nameText = new Konva.Text({
      text: sector.name ?? 'Unnamed Sector',
      x: 10,
      y: 20,
      fontSize: 14,
      fill: '#fff',
      fontStyle: 'bold',
      listening: false
    });

    // Create sector details text
    const seatsText = new Konva.Text({
      text: `Seats: ${sector.numberOfSeats ?? 0}`,
      x: 10,
      y: 40,
      fontSize: 11,
      fill: '#fff',
      listening: false
    });

    const categoryText = new Konva.Text({
      text: sector.priceCategory ?? 'Standard',
      x: 10,
      y: 55,
      fontSize: 10,
      fill: '#fff',
      opacity: 0.8,
      listening: false
    });

    // Add components to group
    group.add(rect, nameText, seatsText, categoryText);

    // Add selection indicators if selected
    if (sector.isSelected) {
      this.addSelectionIndicators(group);
    }

    // Add event handlers
    rect.on('click', (e) => {
      e.cancelBubble = true;
      this.onSectorRectClick(sector, e);
    });

    rect.on('mouseenter', () => {
      if (this.editMode() === 'move' || this.editMode() === 'select') {
        this.stage!.container().style.cursor = 'grab';
      }
    });

    rect.on('mouseleave', () => {
      this.stage!.container().style.cursor = 'default';
    });    group.on('dragstart', () => {
      this.onSectorDragStart(sector);
    });    group.on('dragmove', () => {
      this.onSectorDragMove(sector, group);
    });

    group.on('dragend', () => {
      this.onSectorDragEnd(sector, group);
    });    // Add to layer
    this.layer.add(group);
    
    console.log('Added sector group to layer');
    return group;
  }

  private addSelectionIndicators(group: Konva.Group) {
    const corners = [
      { x: -5, y: -5 },
      { x: 125, y: -5 },
      { x: -5, y: 85 },
      { x: 125, y: 85 }
    ];

    corners.forEach(corner => {
      const circle = new Konva.Circle({
        x: corner.x,
        y: corner.y,
        radius: 4,
        fill: '#2196f3',
        stroke: '#fff',
        strokeWidth: 2,
        listening: false
      });
      group.add(circle);
    });
  }

  // Zoom controls
  zoomIn() {
    const newZoom = Math.min(this.zoom() * 1.2, 3);
    this.zoom.set(newZoom);
  }

  zoomOut() {
    const newZoom = Math.max(this.zoom() / 1.2, 0.5);
    this.zoom.set(newZoom);
  }

  resetZoom() {
    this.zoom.set(1);
    // Reset position to center when resetting zoom
    if (this.stage) {
      this.stage.x(0);
      this.stage.y(0);
      requestAnimationFrame(() => {
        this.stage?.batchDraw();
      });
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
    
    // If this sector is not in the current selection, select it (single selection)
    if (!this.selectedSectors().some(s => s.sectorId === sector.sectorId)) {
      this.selectSector(sector, false);
    }
    
    // Mark all selected sectors as dragging
    const sectors = this.editableSectors();
    const selectedIds = this.selectedSectors().map(s => s.sectorId);
    const updatedSectors = sectors.map(s => ({
      ...s,
      isDragging: selectedIds.includes(s.sectorId)
    }));
    this.editableSectors.set(updatedSectors);
    
    // Store initial positions for relative movement
    this.initialDragPositions = new Map();
    this.selectedSectors().forEach(selectedSector => {
      const group = this.sectorGroups.get(selectedSector.sectorId!);
      if (group) {
        this.initialDragPositions.set(selectedSector.sectorId!, { x: group.x(), y: group.y() });
        group.moveToTop();
        
        // Apply drag styling
        const rect = group.findOne('.sector-rect') as Konva.Rect;
        if (rect) {
          rect.strokeWidth(4);
          rect.opacity(1);
          rect.shadowColor('rgba(33, 150, 243, 0.6)');
          rect.shadowBlur(20);
          rect.shadowOffsetX(8);
          rect.shadowOffsetY(8);
          const texts = group.find('Text');
          texts.forEach(node => {
            const text = node as Konva.Text;
            text.fill('#000');
            text.fontStyle('bold');
            text.opacity(1);
          });
        }
      }
    });
    
    this.stage?.draw();
  }

  onSectorDragMove(draggedSector: EditableSector, draggedGroup: Konva.Group) {
    // Get the current position of the dragged sector
    const currentPos = { x: draggedGroup.x(), y: draggedGroup.y() };
    const initialPos = this.initialDragPositions.get(draggedSector.sectorId!);
    
    if (!initialPos) return;
    
    // Calculate the offset from the initial position
    const deltaX = currentPos.x - initialPos.x;
    const deltaY = currentPos.y - initialPos.y;
    
    // Move all other selected sectors by the same offset
    this.selectedSectors().forEach(selectedSector => {
      if (selectedSector.sectorId === draggedSector.sectorId) return; // Skip the dragged sector
      
      const sectorGroup = this.sectorGroups.get(selectedSector.sectorId!);
      const sectorInitialPos = this.initialDragPositions.get(selectedSector.sectorId!);
      
      if (sectorGroup && sectorInitialPos) {
        sectorGroup.position({
          x: sectorInitialPos.x + deltaX,
          y: sectorInitialPos.y + deltaY
        });
        sectorGroup.moveToTop();
        
        // Apply drag styling
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
    
    // Apply styling to the dragged sector as well
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
    console.log('Drag end for sector:', draggedSector.name);
    const sectors = this.editableSectors();
    
    // Calculate the final positions for all selected sectors
    const draggedFinalPos = {
      x: Math.round(draggedGroup.x()),
      y: Math.round(draggedGroup.y())
    };
    
    const draggedInitialPos = this.initialDragPositions.get(draggedSector.sectorId!);
    if (!draggedInitialPos) return;
    
    const deltaX = draggedFinalPos.x - draggedInitialPos.x;
    const deltaY = draggedFinalPos.y - draggedInitialPos.y;
    
    console.log('Drag delta:', { deltaX, deltaY });
    
    // Update positions for all selected sectors
    const updatedSectors = sectors.map(s => {
      const isSelected = this.selectedSectors().some(selected => selected.sectorId === s.sectorId);
      
      if (isSelected) {
        const initialPos = this.initialDragPositions.get(s.sectorId!);
        if (initialPos) {
          const newPosition = {
            x: Math.round(initialPos.x + deltaX),
            y: Math.round(initialPos.y + deltaY)
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
    
    // Update the selected sectors with new positions
    const newSelectedSectors = this.selectedSectors().map(selected => {
      const updated = updatedSectors.find(s => s.sectorId === selected.sectorId);
      return updated || selected;
    });
    this.selectedSectors.set(newSelectedSectors);
    
    // Update the primary selected sector if it was the one dragged
    if (this.selectedSector()?.sectorId === draggedSector.sectorId) {
      const updatedPrimary = updatedSectors.find(s => s.sectorId === draggedSector.sectorId);
      this.selectedSector.set(updatedPrimary || null);
    }
    
    // Restore visual appearance for all selected sectors
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
    
    // Clear initial drag positions
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
}
