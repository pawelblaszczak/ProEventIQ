-- Migration to split number_of_tickets into children and guardian counts
-- Created: January 5, 2026

-- 1. Add new columns
-- We use a default of 0 for the new count columns.
-- We use STORED for the generated column so it can be indexed if needed and behaves like a physical column.
ALTER TABLE participant
    ADD COLUMN children_ticket_count INT NOT NULL DEFAULT 0 AFTER seat_color,
    ADD COLUMN guardian_ticket_count INT NOT NULL DEFAULT 0 AFTER children_ticket_count,
    ADD COLUMN all_ticket_count INT GENERATED ALWAYS AS (children_ticket_count + guardian_ticket_count) STORED AFTER guardian_ticket_count;

-- 2. Migrate existing data
-- We assume existing 'number_of_tickets' are 'guardian_ticket_count' for now, 
-- or we could split them. Assigning to guardian seems safest to preserve the count.
-- The generated column 'all_ticket_count' will automatically update.
UPDATE participant SET guardian_ticket_count = number_of_tickets;

-- 3. Drop the old column
ALTER TABLE participant DROP COLUMN number_of_tickets;

-- 4. Add check constraint to ensure at least one ticket total
ALTER TABLE participant ADD CONSTRAINT check_ticket_count CHECK (all_ticket_count >= 1);

-- 5. Update dependent functions

DROP FUNCTION IF EXISTS get_event_ticket_count;

DELIMITER $$

CREATE FUNCTION get_event_ticket_count(eventId VARCHAR(255)) RETURNS int
    DETERMINISTIC
BEGIN
  DECLARE total INT;
  SELECT SUM(all_ticket_count) INTO total
  FROM participant
  WHERE event_id = eventId;
  RETURN IFNULL(total, 0);
END$$

DELIMITER ;

DROP FUNCTION IF EXISTS has_allocation_errors;

DELIMITER $$

CREATE FUNCTION has_allocation_errors(p_event_id BIGINT) RETURNS VARCHAR(1)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE v_total_tickets INT DEFAULT 0;
    DECLARE v_venue_id BIGINT;
    DECLARE v_venue_seats INT DEFAULT 0;
    DECLARE v_allocated INT DEFAULT 0;
    DECLARE v_has_error BOOLEAN DEFAULT FALSE;

    -- total tickets requested by all participants for the event
    SELECT IFNULL(SUM(all_ticket_count), 0) INTO v_total_tickets
    FROM participant
    WHERE event_id = p_event_id;

    -- find venue for event
    SELECT venue_id INTO v_venue_id
    FROM event
    WHERE event_id = p_event_id
    LIMIT 1;

    -- if event not found, consider it an error
    IF v_venue_id IS NULL THEN
        RETURN 'Y';
    END IF;

    -- total seats available in the venue
    SET v_venue_seats = get_venue_seat_count(v_venue_id);

    -- number of seats actually allocated (reservations) for the event
    SELECT COUNT(*) INTO v_allocated
    FROM seat_reservation
    WHERE event_id = p_event_id;

    -- Check 1: requested tickets exceed venue capacity
    IF v_total_tickets > v_venue_seats THEN
        SET v_has_error = TRUE;
    END IF;

    -- Check 2: allocated seats don't match requested tickets
    IF v_allocated <> v_total_tickets THEN
        SET v_has_error = TRUE;
    END IF;

    RETURN IF(v_has_error, 'Y', 'N');
END$$

DELIMITER ;
