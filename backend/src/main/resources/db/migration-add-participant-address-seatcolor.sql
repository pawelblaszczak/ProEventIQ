-- Migration script to add address and seat_color columns to participant table
-- Created: August 4, 2025

-- Add address column to participant table
ALTER TABLE participant ADD COLUMN address VARCHAR(255);

-- Add seat_color column to participant table
ALTER TABLE participant ADD COLUMN seat_color VARCHAR(7);
