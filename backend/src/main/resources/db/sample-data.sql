-- ProEventIQ Sample Data
-- Created: June 17, 2025

-- Sample Venues
INSERT INTO Venue (name, country, city, address, thumbnail, description)
VALUES 
('Teatr Wielki - Opera Narodowa', 'Poland', 'Warszawa', 'pl. Teatralny 1', 'teatr_wielki.jpg', 'Główna polska scena operowa, gmach z 1833 roku zaprojektowany przez Antonio Corazziego'),
('ICE Kraków Congress Centre', 'Poland', 'Kraków', 'ul. Marii Konopnickiej 17', 'ice_krakow.jpg', 'Nowoczesne centrum kongresowe z salą koncertową o doskonałej akustyce'),
('Opera Nova', 'Poland', 'Bydgoszcz', 'ul. Focha 5', 'opera_nova.jpg', 'Imponujący gmach opery zlokalizowany na brzegu rzeki Brdy');

-- Sample Sectors for Teatr Wielki - Opera Narodowa
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status)
VALUES
(1, 'Parter', 0.0, 0.0, 'Premium', 'ACTIVE'),
(1, 'Amfiteatr', 0.0, 10.0, 'Standard', 'ACTIVE'),
(1, 'Balkon I', 0.0, 20.0, 'Economy', 'ACTIVE');

-- Sample Sectors for ICE Kraków Congress Centre
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status)
VALUES
(2, 'Sala Audytoryjna S1', 0.0, 0.0, 'VIP', 'ACTIVE'),
(2, 'Sala Teatralna S2', 5.0, 5.0, 'Premium', 'ACTIVE'),
(2, 'Sala Kameralna S3', 0.0, 15.0, 'Standard', 'ACTIVE');

-- Sample Sectors for Opera Nova
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status)
VALUES
(3, 'Parter', 0.0, 0.0, 'Premium', 'ACTIVE'),
(3, 'Loża', 0.0, 15.0, 'Standard', 'ACTIVE');

-- Sample Rows for Teatr Wielki - Parter Sector
INSERT INTO Row (sector_id, name, order_number)
VALUES
(1, 'Rząd 1', 1),
(1, 'Rząd 2', 2),
(1, 'Rząd 3', 3);

-- Sample Rows for Teatr Wielki - Amfiteatr Sector
INSERT INTO Row (sector_id, name, order_number)
VALUES
(2, 'Rząd 1', 1),
(2, 'Rząd 2', 2);

-- Sample Rows for Teatr Wielki - Balkon I Sector
INSERT INTO Row (sector_id, name, order_number)
VALUES
(3, 'Rząd 1', 1);

-- Sample Seats for Teatr Wielki - Parter Sector, Rząd 1
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status)
VALUES
(1, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'),
(1, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(1, 3, 2.0, 0.0, 'Premium', 'AVAILABLE'),
(1, 4, 3.0, 0.0, 'Premium', 'AVAILABLE'),
(1, 5, 4.0, 0.0, 'Premium', 'AVAILABLE');

-- Sample Seats for Teatr Wielki - Parter Sector, Rząd 2
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status)
VALUES
(2, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'),
(2, 2, 1.0, 1.0, 'Premium', 'AVAILABLE'),
(2, 3, 2.0, 1.0, 'Premium', 'AVAILABLE'),
(2, 4, 3.0, 1.0, 'Premium', 'AVAILABLE'),
(2, 5, 4.0, 1.0, 'Premium', 'AVAILABLE');

-- Sample Seats for Teatr Wielki - Parter Sector, Rząd 3
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status)
VALUES
(3, 1, 0.0, 2.0, 'Premium', 'AVAILABLE'),
(3, 2, 1.0, 2.0, 'Premium', 'AVAILABLE'),
(3, 3, 2.0, 2.0, 'Premium', 'AVAILABLE'),
(3, 4, 3.0, 2.0, 'Premium', 'AVAILABLE'),
(3, 5, 4.0, 2.0, 'Premium', 'AVAILABLE');

-- Sample Seats for Teatr Wielki - Amfiteatr Sector, Rząd 1
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status)
VALUES
(4, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'),
(4, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(4, 3, 2.0, 0.0, 'Standard', 'AVAILABLE'),
(4, 4, 3.0, 0.0, 'Standard', 'AVAILABLE');

-- Sample Seats for Teatr Wielki - Amfiteatr Sector, Rząd 2
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status)
VALUES
(5, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'),
(5, 2, 1.0, 1.0, 'Standard', 'AVAILABLE'),
(5, 3, 2.0, 1.0, 'Standard', 'AVAILABLE'),
(5, 4, 3.0, 1.0, 'Standard', 'AVAILABLE');

-- Sample Seats for Teatr Wielki - Balkon I Sector, Rząd 1
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status)
VALUES
(6, 1, 0.0, 0.0, 'Economy', 'AVAILABLE'),
(6, 2, 1.0, 0.0, 'Economy', 'AVAILABLE'),
(6, 3, 2.0, 0.0, 'Economy', 'AVAILABLE'),
(6, 4, 3.0, 0.0, 'Economy', 'AVAILABLE'),
(6, 5, 4.0, 0.0, 'Economy', 'AVAILABLE'),
(6, 6, 5.0, 0.0, 'Economy', 'AVAILABLE');
