-- Add event_show table to ProEventIQ Database Schema
-- Created: June 30, 2025

-- Create event_show table
CREATE TABLE IF NOT EXISTS event_show (
    show_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    thumbnail MEDIUMBLOB,
    thumbnail_content_type VARCHAR(100),
    description TEXT,
    age_from INT,
    age_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_show_name ON event_show(name);
CREATE INDEX idx_show_age_range ON event_show(age_from, age_to);
