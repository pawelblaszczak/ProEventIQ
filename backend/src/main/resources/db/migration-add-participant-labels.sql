-- Migration: add participant label positions for print-map
ALTER TABLE participant ADD COLUMN label_x DOUBLE NULL AFTER seat_color;
ALTER TABLE participant ADD COLUMN label_y DOUBLE NULL AFTER label_x;
ALTER TABLE participant ADD COLUMN label_rotation INT DEFAULT 0 AFTER label_y;
