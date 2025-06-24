import { ChangeDetectionStrategy, Component, effect, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
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
import { SectorInput } from '../../api/model/sector-input';
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
  private sectorGroups = new Map<string, Konva.Group>();
  private konvaInitialized = false;
  
  // Canvas and zoom settings
  zoom = signal(1);
  canvasWidth = 1200;
  canvasHeight = 800;
  
  // Edit state
  editableSectors = signal<EditableSector[]>([]);
  selectedSector = signal<EditableSector | null>(null);
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
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

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
      if (this.stage) {
        this.stage.scaleX(this.zoom());
        this.stage.scaleY(this.zoom());
        this.stage.batchDraw();
      }
    });

    effect(() => {
      if (this.layer) {
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
  }  ngAfterViewInit() {
    // Konva initialization will be handled by the effect when venue loads
    this.resizeCanvas();
  }

  private addTestSector() {
    console.log('Adding test sector for debugging');
    const testSector: EditableSector = {
      sectorId: 'test-sector',
      name: 'Test Sector',
      position: { x: 150, y: 150 },
      numberOfSeats: 100,
      priceCategory: 'Standard',
      status: Sector.StatusEnum.Active,
      isSelected: false,
      isDragging: false,
      rotation: 0
    };
    
    this.editableSectors.set([testSector]);
  }  private initializeKonva() {
    if (!this.canvasContainer) {
      console.error('Canvas container not found, retrying...');
      setTimeout(() => this.initializeKonva(), 100);
      return;
    }

    if (this.konvaInitialized) {
      console.log('Konva already initialized');
      return;
    }

    console.log('Initializing Konva stage with dimensions:', this.canvasWidth, 'x', this.canvasHeight);

    this.stage = new Konva.Stage({
      container: this.canvasContainer.nativeElement,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    
    // Add a separate layer for dragging operations to ensure visibility
    this.dragLayer = new Konva.Layer();
    this.stage.add(this.dragLayer);

    // Add keyboard event handling
    this.stage.on('keydown', (e) => {
      if (e.evt.key === 'Escape') {
        this.deselectAll();
      }
    });

    this.konvaInitialized = true;
    console.log('Konva stage initialized successfully');

    // Trigger initial rendering if we already have sectors
    if (this.editableSectors().length > 0) {
      console.log('Rendering existing sectors on init');
      this.renderSectors();
    } else {
      console.log('No sectors to render on init');
      // Add a test sector for debugging
      this.addTestSector();
    }
    
    // Render grid if enabled
    if (this.showGrid()) {
      this.renderGrid();
    }
  }
  private resizeCanvas() {
    // Set canvas to responsive size
    const newWidth = Math.max(window.innerWidth - 400, 800); // Account for sidebar
    const newHeight = Math.max(window.innerHeight * 0.7, 600);
    
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    
    // Update stage size if it exists
    if (this.stage) {
      this.stage.width(this.canvasWidth);
      this.stage.height(this.canvasHeight);
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
        
        console.log(`Initializing sector ${sector.name} at position:`, defaultPosition);
        
        return {
          ...sector,
          isSelected: false,
          isDragging: false,
          rotation: 0,
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
        stroke: '#e0e0e0',
        strokeWidth: 1,
        opacity: 0.5,
        listening: false,
        name: 'grid-line'
      });
      this.layer.add(line);
      line.moveToBottom(); // Ensure grid is always at the bottom
    }

    // Create horizontal lines
    for (let i = 0; i <= Math.ceil(this.canvasHeight / this.gridSize); i++) {
      const line = new Konva.Line({
        points: [0, i * this.gridSize, this.canvasWidth, i * this.gridSize],
        stroke: '#e0e0e0',
        strokeWidth: 1,
        opacity: 0.5,
        listening: false,
        name: 'grid-line'
      });
      this.layer.add(line);
      line.moveToBottom(); // Ensure grid is always at the bottom
    }

    this.layer.batchDraw();
  }

  private clearGrid() {
    if (!this.layer) return;
    
    const gridLines = this.layer.find('.grid-line');
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
    this.sectorGroups.clear();    // Render each sector
    this.editableSectors().forEach(sector => {
      console.log('Creating sector group for:', sector.name, 'at position:', sector.position);
      const group = this.createSectorGroup(sector);
      if (group) {
        this.sectorGroups.set(sector.sectorId!, group);
      }
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
      text: sector.name || 'Unnamed Sector',
      x: 10,
      y: 20,
      fontSize: 14,
      fill: '#fff',
      fontStyle: 'bold',
      listening: false
    });

    // Create sector details text
    const seatsText = new Konva.Text({
      text: `Seats: ${sector.numberOfSeats || 0}`,
      x: 10,
      y: 40,
      fontSize: 11,
      fill: '#fff',
      listening: false
    });

    const categoryText = new Konva.Text({
      text: sector.priceCategory || 'Standard',
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
      // Critical: Move the group to the top of all elements on every move
      group.moveToTop();
      
      // Aggressively maintain the sector's visual state during drag
      const rect = group.findOne('.sector-rect') as Konva.Rect;
      if (rect) {
        rect.fill('#ff9800'); // Force orange color
        rect.stroke('#f57c00'); // Strong orange border
        rect.strokeWidth(4); // Thick border
        rect.opacity(1); // Full opacity
        
        // Add strong glow effect
        rect.shadowColor('rgba(255, 152, 0, 0.9)'); 
        rect.shadowBlur(25);
        rect.shadowOffsetX(8);
        rect.shadowOffsetY(8);
        
        // Make sure text is visible too
        const texts = group.find('Text');
        texts.forEach(node => {
          (node as Konva.Text).opacity(1);
        });
      }
      
      // Critical: Force immediate complete redraw of entire stage
      this.stage?.draw();
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
  }
  onSectorRectClick(sector: EditableSector, event: any) {
    console.log('Sector rect clicked:', sector.name, 'Edit mode:', this.editMode());
    event.cancelBubble = true;
    event.evt?.stopPropagation();
    
    if (this.editMode() === 'select' || this.editMode() === 'move') {
      this.selectSector(sector);
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
  selectSector(sector: EditableSector) {
    console.log('Selecting sector:', sector.name);
    const sectors = this.editableSectors();
    const updatedSectors = sectors.map(s => ({
      ...s,
      isSelected: s.sectorId === sector.sectorId
    }));
    this.editableSectors.set(updatedSectors);
    
    // Set the updated sector as selected
    const selectedSector = updatedSectors.find(s => s.sectorId === sector.sectorId);
    this.selectedSector.set(selectedSector || null);
    
    // Force change detection to ensure UI updates
    console.log('Sector selected, UI should update now');
  }deselectAll() {
    console.log('Deselecting all sectors');
    const sectors = this.editableSectors();
    const updatedSectors = sectors.map(s => ({
      ...s,
      isSelected: false
    }));
    this.editableSectors.set(updatedSectors);
    this.selectedSector.set(null);
  }

  // Sector movement
  onSectorDragStart(sector: EditableSector) {
    console.log('Drag start for sector:', sector.name);
    this.selectSector(sector);
    const sectors = this.editableSectors();
    const updatedSectors = sectors.map(s => ({
      ...s,
      isDragging: s.sectorId === sector.sectorId
    }));
    this.editableSectors.set(updatedSectors);
    const group = this.sectorGroups.get(sector.sectorId!);
    if (group) {
      group.moveToTop();
      const rect = group.findOne('.sector-rect') as Konva.Rect;
      if (rect) {
        rect.fill('#ff9800');
        rect.stroke('#f57c00');
        rect.strokeWidth(4);
        rect.opacity(1);
        rect.shadowColor('rgba(255, 152, 0, 0.9)');
        rect.shadowBlur(25);
        rect.shadowOffsetX(8);
        rect.shadowOffsetY(8);
        const texts = group.find('Text');
        texts.forEach(node => {
          const text = node as Konva.Text;
          text.fill('#000');
          text.fontStyle('bold');
          text.opacity(1);
        });
        this.stage?.draw();
      }
    }
  }

  onSectorDragEnd(sector: EditableSector, group: Konva.Group) {
    console.log('Drag end for sector:', sector.name);
    const sectors = this.editableSectors();
    const newPosition = {
      x: Math.round(group.x()),
      y: Math.round(group.y())
    };
    console.log('New position from drag:', newPosition);
    const updatedSectors = sectors.map(s => {
      if (s.sectorId === sector.sectorId) {
        return {
          ...s,
          isDragging: false,
          position: newPosition
        };
      }
      return { ...s, isDragging: false };
    });
    this.editableSectors.set(updatedSectors);
    this.hasChanges.set(true);
    const updatedSelected = updatedSectors.find(s => s.sectorId === sector.sectorId);
    if (updatedSelected && this.selectedSector()?.sectorId === sector.sectorId) {
      this.selectedSector.set(updatedSelected);
    }
    // Restore visual appearance after drag
    const rect = group.findOne('.sector-rect') as Konva.Rect;
    if (rect && updatedSelected) {
      rect.fill(this.getSectorColor(updatedSelected));
      rect.stroke(this.getSectorStrokeColor(updatedSelected));
      rect.strokeWidth(updatedSelected.isSelected ? 3 : 2);
      rect.opacity(1);
      rect.shadowColor('rgba(33, 150, 243, 0.6)');
      rect.shadowBlur(10);
      rect.shadowOffsetX(4);
      rect.shadowOffsetY(4);
      const texts = group.find('Text');
      texts.forEach(node => {
        const text = node as Konva.Text;
        text.fill('#fff');
        text.fontStyle('bold');
        text.opacity(1);
      });
      this.stage?.draw();
    }
    console.log('Visual state fully restored after drag');
  }
  // Sector rotation
  rotateSector(clockwise: boolean = true) {
    const selected = this.selectedSector();
    if (!selected) return;

    const sectors = this.editableSectors();
    const rotationStep = clockwise ? 15 : -15;
    
    const updatedSectors = sectors.map(s => {
      if (s.sectorId === selected.sectorId) {
        const newRotation = ((s.rotation ?? 0) + rotationStep) % 360;
        return { ...s, rotation: newRotation };
      }
      return s;
    });
    
    this.editableSectors.set(updatedSectors);
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
    const selected = this.selectedSector();
    if (!selected) return;

    this.confirmationDialog.confirmDelete(selected.name ?? 'this sector', 'sector')
      .subscribe(confirmed => {
        if (confirmed) {
          const sectors = this.editableSectors();
          const updatedSectors = sectors.filter(s => s.sectorId !== selected.sectorId);
          this.editableSectors.set(updatedSectors);
          this.selectedSector.set(null);
          this.hasChanges.set(true);
        }
      });
  }
  // Duplicate sector
  duplicateSector() {
    const selected = this.selectedSector();
    if (!selected) return;

    const sectors = this.editableSectors();
    const duplicatedSector: EditableSector = {
      ...selected,
      sectorId: `temp-${Date.now()}`,
      name: `${selected.name} Copy`,
      position: {
        x: (selected.position?.x ?? 0) + 50,
        y: (selected.position?.y ?? 0) + 50
      },
      isSelected: true,
      isDragging: false,
      rotation: 0
    };

    // Deselect all others and add duplicated sector
    const updatedSectors = sectors.map(s => ({ ...s, isSelected: false }));
    updatedSectors.push(duplicatedSector);
    
    this.editableSectors.set(updatedSectors);
    this.selectedSector.set(duplicatedSector);
    this.hasChanges.set(true);
  }  // Save and Cancel operations
  async saveChanges() {
    if (!this.hasChanges() || this.saving()) return;
    
    const venueId = this.venueId();
    if (!venueId) return;

    try {
      this.saving.set(true);
      console.log('Saving venue changes...');
      
      // Convert editable sectors back to SectorInput format
      const sectorsToSave = this.editableSectors().map(sector => {
            return {
          name: sector.name ?? '',
          position: sector.position,
          priceCategory: sector.priceCategory,
          status: sector.status
        };
      });

      // Save all sectors
      for (let i = 0; i < this.editableSectors().length; i++) {
        const sector = this.editableSectors()[i];
        const sectorInput = sectorsToSave[i];
          if (sector.sectorId?.startsWith('temp-')) {
          // Create new sector
          await firstValueFrom(this.venueApi.addSector(venueId, sectorInput));
        } else {
          // Update existing sector - now requires venueId parameter
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
    
    // Clean up Konva objects
    if (this.stage) {
      this.stage.destroy();
    }
  }

  // Get sector color based on selection and status
  getSectorColor(sector: EditableSector): string {
    if (sector.isSelected) return '#2196f3';
    if (sector.isDragging) return '#ff9800';
    return sector.status === Sector.StatusEnum.Active ? '#4caf50' : '#f44336';
  }

  getSectorStrokeColor(sector: EditableSector): string {
    if (sector.isSelected) return '#1976d2';
    if (sector.isDragging) return '#f57c00';
    return '#333';
  }
}
