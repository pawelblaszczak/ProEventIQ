# ProEventIQ Database Setup

This directory contains the SQL scripts needed to initialize the ProEventIQ database structure and populate it with sample data.

## Database Structure

The database consists of four main tables:

1. **Venue**: Stores information about venues where events can take place.
2. **Sector**: Represents sections within a venue (e.g., Orchestra, Balcony).
3. **Row**: Represents rows of seats within a sector.
4. **Seat**: Individual seats within a row.

## Scripts

- `init-schema.sql`: Creates the database tables and relationships
- `sample-data.sql`: Inserts sample data to demonstrate the database structure

## How to Use

### Option 1: Using MySQL CLI

1. Make sure you have MySQL installed and running
2. Connect to your MySQL server:
   ```
   mysql -u username -p
   ```
3. Create the database:
   ```sql
   CREATE DATABASE proeventiq;
   USE proeventiq;
   ```
4. Run the initialization script:
   ```
   source path/to/init-schema.sql
   ```
5. Optionally, load the sample data:
   ```
   source path/to/sample-data.sql
   ```

### Option 2: Using Spring Boot Properties

1. Configure your `application.properties` file with the following settings:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/proeventiq?createDatabaseIfNotExist=true
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   spring.jpa.hibernate.ddl-auto=none
   spring.sql.init.mode=always
   spring.sql.init.schema-locations=classpath:db/init-schema.sql
   spring.sql.init.data-locations=classpath:db/sample-data.sql
   ```

2. Start your Spring Boot application, which will automatically initialize the database using these scripts.

## Entity Relationships

- A Venue has many Sectors
- A Sector has many Rows
- A Row has many Seats

## Notes

- The "Row" table uses the name directly even though "Row" is normally a reserved word in MySQL. Some MySQL configurations may require you to quote this table name.
- Position coordinates (position_x, position_y) are stored as FLOAT values to represent the spatial layout of sectors and seats.
- All tables include 'created_at' and 'updated_at' timestamps for auditing purposes.
