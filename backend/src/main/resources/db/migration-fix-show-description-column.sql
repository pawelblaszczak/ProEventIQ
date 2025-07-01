-- Fix event_show.description column to handle longer text
-- Created: July 1, 2025
-- Issue: Data truncation error when trying to save descriptions longer than default VARCHAR limit

-- Alter the description column to ensure it's TEXT type and can handle long descriptions
ALTER TABLE event_show 
MODIFY COLUMN description TEXT;
