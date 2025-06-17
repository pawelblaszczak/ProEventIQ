# ProEventIQ Database Structure - ER Diagram Description

```
+------------+          +--------------+           +----------+          +----------+
|   Venue    |          |    Sector    |           |   Row    |          |   Seat   |
+------------+          +--------------+           +----------+          +----------+
| venue_id   |<---------| sector_id    |           | row_id   |<---------| seat_id  |
| name       |          | venue_id     |---------->| sector_id|          | row_id   |
| country    |          | name         |           | name     |          | order_num|
| city       |          | position_x   |           | order_num|          | pos_x    |
| address    |          | position_y   |           | created_at          | pos_y    |
| thumbnail  |          | price_category           | updated_at          | price_cat|
| description|          | status       |                       |          | status   |
| created_at |          | created_at   |                       |          | created_at
| updated_at |          | updated_at   |                       |          | updated_at
+------------+          +--------------+           +----------+          +----------+
```

## Relationships

- **One-to-Many**: A Venue has multiple Sectors
- **One-to-Many**: A Sector has multiple Rows
- **One-to-Many**: A Row has multiple Seats

## Table Details

### Venue
- **Primary Key**: venue_id (AUTO_INCREMENT)
- Holds information about the venues where events can take place
- Contains basic information like name, location, and description

### Sector
- **Primary Key**: sector_id (AUTO_INCREMENT)
- **Foreign Key**: venue_id references Venue(venue_id)
- Represents sections within a venue (e.g., Orchestra, Balcony)
- Has position coordinates to represent its location within the venue
- Contains status information to indicate if the sector is accessible

### Row
- **Primary Key**: row_id (AUTO_INCREMENT)
- **Foreign Key**: sector_id references Sector(sector_id)
- Represents rows of seats within a sector
- Contains an order number to establish the sequence of rows

### Seat
- **Primary Key**: seat_id (AUTO_INCREMENT)
- **Foreign Key**: row_id references Row(row_id)
- Represents individual seats within a row
- Has position coordinates to represent its exact location
- Contains status information to indicate if the seat is available

## Calculated Fields (to be implemented in the application layer)

- **Number of seats in a venue**: Sum of all seats in all sectors of the venue
- **Number of seats in a sector**: Sum of all seats in all rows of the sector
