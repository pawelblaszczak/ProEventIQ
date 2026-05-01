-- Migration: add price column to event table
ALTER TABLE event
    ADD COLUMN price DECIMAL(10, 2) NULL COMMENT 'Ticket price for the event';
