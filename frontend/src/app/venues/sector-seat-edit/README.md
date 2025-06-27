# Sector Seat Edit Component

This component provides an advanced seat editor for venue sectors, implementing the requirements specified in section 3.3.4 of the system description. It allows detailed manipulation of individual seats within a sector using a Konva.js canvas.

## Features

### Seat Selection
- **Single Select**: Click on a seat to select it
- **Multi-Select**: Hold `Ctrl` + click to select multiple seats
- **Row Range Select**: `Ctrl` + click first and last seat in a row to select all seats in between
- **Column Range Select**: `Shift` + click seats with the same order number across rows

### Seat Manipulation
- **Move Seats**: Switch to move mode and drag seats to new positions with grid snapping
- **Add Seats**: Click on empty rows or use the add seat button
- **Delete Seats**: Select seats and press `Delete` key or use the delete button
- **Position Snapping**: Seats automatically snap to grid positions when moved

### Row Management
- **Add Rows**: Create new rows for organizing seats
- **Delete Rows**: Remove empty rows from the sector
- **Row Labels**: Each row displays its name for easy identification

### Visual Features
- **Grid System**: Optional grid overlay for precise positioning
- **Zoom Controls**: Zoom in/out with reset functionality
- **Visual Feedback**: Selected seats highlight in blue with stroke
- **Real-time Updates**: Changes reflect immediately on the canvas
- **Status Colors**: Active seats (green) vs inactive seats (red)

### Edit Modes
- **Select Mode**: Default mode for selecting seats (supports all selection types)
- **Move Mode**: Dedicated mode for dragging and repositioning seats

## Usage

### Navigation
Access via route: `/venues/:venueId/sectors/:sectorId/seat-edit`

From the venue map editor, select a sector and click the "Edit Sector Seats" button.

### User Workflow
1. **Load**: Component loads sector data and displays seats in rows
2. **Edit**: User manipulates seats using selection and movement tools
3. **Save**: Changes are validated and saved to backend via API
4. **Navigate**: Return to venue map editor

### Keyboard Shortcuts
- **Escape**: Deselect all seats
- **Delete**: Delete selected seats
- **Ctrl**: Enable multi-select mode
- **Shift**: Enable range select mode

### Mouse Interactions
- **Click**: Select single seat
- **Ctrl + Click**: Add/remove from selection
- **Shift + Click**: Range select (row or column)
- **Drag**: Move seats (in move mode)

## Technical Implementation

### Component Structure
```
sector-seat-edit/
├── sector-seat-edit.component.ts     # Main component logic
├── sector-seat-edit.component.html   # Template with toolbar and canvas
├── sector-seat-edit.component.scss   # Responsive styling
└── index.ts                          # Export declaration
```

### Key Technologies
- **Angular Signals**: For reactive state management
- **Angular Material**: For UI components and theming
- **Konva.js**: For 2D canvas rendering and interactions
- **RxJS**: For async operations and API calls
- **Grid Snapping**: For precise seat positioning

### State Management
The component uses Angular signals for managing:
- `sector`: Current sector data with editable seats
- `selectedSeats`: Array of currently selected seats
- `editMode`: Current editing mode (select/move)
- `hasChanges`: Tracks unsaved changes
- `zoom`: Canvas zoom level
- `showGrid`: Grid visibility toggle

### API Integration
- **Load Data**: Fetches venue and sector data via `getVenue()`
- **Save Seats**: Updates existing seats via `updateSeat()`
- **Add Seats**: Creates new seats via `addSeat()`
- **Real-time Sync**: Maintains data consistency with backend

## Selection Logic

### Row Range Selection
When using `Ctrl + Click` on seats in the same row:
1. Find the row containing both seats
2. Determine start and end indices
3. Select all seats between the indices

### Column Range Selection
When using `Shift + Click` on seats with the same order number:
1. Find all rows in the sector
2. Select seats with matching order numbers
3. Highlight entire column of seats

### Multi-Select Mode
- Hold `Ctrl` to toggle individual seats in/out of selection
- Visual feedback shows selected state with blue highlighting
- Selection persists until explicitly cleared

## Grid System

### Snapping Behavior
- Seats snap to 20px grid when moved
- Grid is optional and can be toggled on/off
- Visual grid lines help with alignment
- Precise positioning for professional layout

### Canvas Features
- Responsive canvas that adapts to container size
- Zoom controls for detailed editing
- Background with click-to-deselect functionality
- Smooth animations and transitions

## API Requirements

The component expects these API endpoints to be available:
- `GET /venues/{venueId}` - Get venue with sectors and seats
- `PUT /seats/{seatId}` - Update existing seat
- `POST /rows/{rowId}/seats` - Add new seat to row

## Data Models

### EditableSeat
Extends the base `Seat` model with:
- `selected: boolean` - Selection state
- `originalPosition: {x, y}` - Original position for canceling changes

### EditableRow
Extends the base `SeatRow` model with:
- `seats: EditableSeat[]` - Array of editable seats

### EditableSector
Extends the base `Sector` model with:
- `rows: EditableRow[]` - Array of editable rows

## Future Enhancements

Potential areas for extension:
- **Undo/Redo**: History management for seat operations
- **Bulk Operations**: Select and modify multiple seats at once
- **Seat Properties**: Edit seat properties (price category, status) inline
- **Copy/Paste**: Duplicate seat arrangements between rows
- **Import/Export**: Save and load seat configurations
- **Templates**: Pre-defined seat arrangement templates

## Responsive Design

The component is fully responsive with:
- Mobile-friendly touch interactions
- Adaptive toolbar layout for smaller screens
- Responsive grid system
- Optimized canvas size for different viewports

## Accessibility

- ARIA labels for screen readers
- Keyboard navigation support
- High contrast selection indicators
- Focus management for keyboard users
