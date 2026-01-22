-- Migration script to add label position and rotation to sector table

ALTER TABLE sector
ADD COLUMN label_position_x FLOAT,
ADD COLUMN label_position_y FLOAT,
ADD COLUMN label_rotation INT DEFAULT 0,
ADD COLUMN label_font_size INT DEFAULT 16;