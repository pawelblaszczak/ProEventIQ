ProEventIQ - System for organizing and managing events, e.g. theater performances. Allows viewing, adding, and editing venues where events can take place.

1. Data model:
    1.1 Venue
        1.1.0 VenueID (unique identifier)
        1.1.1 Name
        1.1.2 Country
        1.1.3 City
        1.1.4 Address
        1.1.5 Thumbnail
        1.1.6 Description or notes
        1.1.7 Number of seats (calculated based on seats)
        1.1.8 List of sectors
    
    1.2 Sector
        1.2.0 SectorID (unique identifier)
        1.2.1 Name
        1.2.2 Position within venue (coordinates)
        1.2.3 Number of seats (calculated based on seats)
        1.2.4 List of rows
        1.2.5 PriceCategory (if applicable)
        1.2.6 Status (indicates if sector is accessible to the audience)
    
    1.3 Row
        1.3.0 RowID (unique identifier)
        1.3.1 Name or order number
        1.3.2 List of seats
    
    1.4 Seat
        1.4.0 SeatID (unique identifier)
        1.4.1 Order number
        1.4.2 Position within sector (coordinates)
        1.4.3 PriceCategory (if applicable)
        1.4.4 Status (indicates if seat is accessible to the audience)

2. Menu:
    2.1 Venues

3. Screens
    3.1 Venues (Menu -> Venues)
        3.1.1 List that allows reviewing available venues
        3.1.2 It is possible to filter venues based on their features
        3.1.3 There is also an "Add" button which allows adding a new venue; it navigates to 3.2.4 (editing an empty venue).

    3.2 Venue
        3.2.1 Allows viewing venue details
        3.2.2 Shows all the features of the venue
        3.2.3 Shows a graphical preview of the venue
            3.2.3.1 Shows the sectors of the venue with their names
            3.2.3.2 Allows zooming in and out
            3.2.3.3 When zoomed out, only the shapes of sectors are shown, not individual seats (for performance and legibility)
            3.2.3.4 When zoomed in, individual seats are shown
        3.2.4 "Edit" button starts editing the venue
            3.2.4.1 It is possible to edit venue features
            3.2.4.2 It is possible to move sectors within the venue
			3.2.4.3 it is possible to add new sector; it navigates to 3.3.4 (editing an empty sector).
			3.2.4.4 it is possible to delete a sector
    
    3.3 Sector
        3.3.1 Allows viewing sector details - rows of seats
        3.3.2 Shows the name of the sector
        3.3.3 Shows a graphical preview of the sector
        3.3.4 "Edit" button starts editing the sector
            3.3.4.1 It is possible to change the sector name
            3.3.4.2 It is possible to move a particular seat
            3.3.4.3 It is possible to select a seat with LMB (left mouse button) click
            3.3.4.4 It is possible to select seats from the same row with one CTRL+LMB click for the first seat and a second CTRL+LMB for the last seat
            3.3.4.5 It is possible to select seats from the same column (seats of the same order number from every row) with one SHIFT+LMB click for the first seat and a second SHIFT+LMB for the last seat
            3.3.4.6 It is possible to delete selected seats
            3.3.4.7 It is possible to add seats to a particular row
            3.3.4.8 It is possible to add a new row
            3.3.4.9 The movement of seats is not smooth, but takes place in certain predetermined small steps

