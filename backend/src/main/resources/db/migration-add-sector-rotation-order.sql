-- Migration script to add rotation and order columns to sector table
-- Run this script if you have an existing database

ALTER TABLE sector 
ADD COLUMN `order` INT AFTER name,
ADD COLUMN rotation INT DEFAULT 0 AFTER position_y;
