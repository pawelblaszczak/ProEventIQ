# Venue Map Edit Component

## Overview

The VenueMapEditComponent provides an interactive editing interface for venue sector layouts. It allows users to manipulate venue sectors with a visual drag-and-drop interface similar to the venue detail view.

## Features

### Sector Management
- **Add New Sectors**: Create new sectors with default positioning
- **Move Sectors**: Drag sectors to reposition them on the canvas
- **Rotate Sectors**: Rotate sectors in 15-degree increments
- **Duplicate Sectors**: Copy existing sectors with offset positioning
- **Delete Sectors**: Remove sectors with confirmation dialog
- **Select Sectors**: Click to select sectors for editing

### Edit Modes
- **Select Mode**: Default mode for selecting sectors
- **Move Mode**: Dedicated mode for moving sectors
- **Rotate Mode**: Mode for rotation operations

### Visual Features
- **Grid System**: Optional grid overlay for precise positioning
- **Zoom Controls**: Zoom in/out with reset functionality
- **Visual Feedback**: Selected sectors show with blue highlighting and corner handles
- **Responsive Canvas**: Automatically adjusts to viewport size

### Data Management
- **Auto-save Tracking**: Monitors changes and warns about unsaved work
- **Save/Cancel**: Explicit save and cancel operations
- **Validation**: Ensures data integrity before saving

## Technical Implementation

### Component Structure
```
venue-map-edit/
├── venue-map-edit.component.ts     # Main component logic
├── venue-map-edit.component.html   # Template with Konva canvas
├── venue-map-edit.component.scss   # Styling and responsive design
└── index.ts                        # Export declaration
```

### Key Technologies
- **Angular Signals**: For reactive state management
- **Angular Material**: For UI components and theming
- **Konva.js (via ngx-konva)**: For 2D canvas rendering and interactions
- **RxJS**: For async operations and confirmations

### State Management
The component uses Angular signals for managing:
- `editableSectors`: Array of sectors with edit-specific properties
- `selectedSector`: Currently selected sector
- `editMode`: Current editing mode
- `hasChanges`: Tracks unsaved changes
- `zoom`: Canvas zoom level

### API Integration
- Uses `ProEventIQService` for venue data operations
- Updates venue data via REST API
- Handles error states and loading indicators

## Usage

### Navigation
Access via route: `/venues/:venueId/map-edit`

### User Workflow
1. **Load**: Component loads venue data and initializes editable sectors
2. **Edit**: User selects tools and manipulates sectors
3. **Save**: Changes are validated and saved to backend
4. **Navigate**: Return to venue detail view

### Keyboard Shortcuts
- **Escape**: Deselect all sectors
- **Enter**: Select sector (when focused)

## Styling

The component follows Material Design principles with:
- Consistent color scheme matching the application theme
- Responsive layout for different screen sizes
- Smooth animations and transitions
- Accessibility features (ARIA labels, keyboard navigation)

## Future Enhancements

Potential areas for extension:
- Seat-level editing within sectors
- Multi-select for bulk operations
- Undo/redo functionality
- Import/export of venue layouts
- Advanced grid snapping options
- Custom sector shapes and sizes
