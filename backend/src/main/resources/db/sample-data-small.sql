SET NAMES utf8mb4;

-- Sample Venues
insert into venue (name, country, city, address, thumbnail, thumbnail_content_type, description)
values 
('Teatr Wielki - Opera Narodowa', 'Poland', 'Warszawa', 'pl. Teatralny 1', NULL, NULL, 'Główna polska scena operowa, gmach z 1833 roku zaprojektowany przez Antonio Corazziego');

-- Sample Sectors for Teatr Wielki - Opera Narodowa
insert into sector (venue_id, name, position_x, position_y, price_category, status)
values
(1, 'Parter', 0.0, 0.0, 'Premium', 'active'),
(1, 'Amfiteatr', 0.0, 10.0, 'Standard', 'active'),
(1, 'Balkon I', 0.0, 20.0, 'Economy', 'active');

-- Sample Seat Rows for Teatr Wielki - Parter Sector
insert into seat_row (sector_id, name, order_number)
values
(1, 'Rząd 1', 1),
(1, 'Rząd 2', 2),
(1, 'Rząd 3', 3);

-- Sample Seat Rows for Teatr Wielki - Amfiteatr Sector
insert into seat_row (sector_id, name, order_number)
values
(2, 'Rząd 1', 1),
(2, 'Rząd 2', 2);

-- Sample Seat Rows for Teatr Wielki - Balkon I Sector
insert into seat_row (sector_id, name, order_number)
values
(3, 'Rząd 1', 1);

-- Sample Seats for Teatr Wielki - Parter Sector, Rząd 1
insert into seat (seat_row_id, order_number, position_x, position_y, price_category, status)
values
(1, 1, 0.0, 0.0, 'Premium', 'active'),
(1, 2, 1.0, 0.0, 'Premium', 'active'),
(1, 3, 2.0, 0.0, 'Premium', 'active'),
(1, 4, 3.0, 0.0, 'Premium', 'active'),
(1, 5, 4.0, 0.0, 'Premium', 'active');

-- Sample Seats for Teatr Wielki - Parter Sector, Rząd 2
insert into seat (seat_row_id, order_number, position_x, position_y, price_category, status)
values
(2, 1, 0.0, 1.0, 'Premium', 'active'),
(2, 2, 1.0, 1.0, 'Premium', 'active'),
(2, 3, 2.0, 1.0, 'Premium', 'active'),
(2, 4, 3.0, 1.0, 'Premium', 'active'),
(2, 5, 4.0, 1.0, 'Premium', 'active');

-- Sample Seats for Teatr Wielki - Parter Sector, Rząd 3
insert into seat (seat_row_id, order_number, position_x, position_y, price_category, status)
values
(3, 1, 0.0, 2.0, 'Premium', 'active'),
(3, 2, 1.0, 2.0, 'Premium', 'active'),
(3, 3, 2.0, 2.0, 'Premium', 'active'),
(3, 4, 3.0, 2.0, 'Premium', 'active'),
(3, 5, 4.0, 2.0, 'Premium', 'active');

-- Sample Seats for Teatr Wielki - Amfiteatr Sector, Rząd 1
insert into seat (seat_row_id, order_number, position_x, position_y, price_category, status)
values
(4, 1, 0.0, 0.0, 'Standard', 'active'),
(4, 2, 1.0, 0.0, 'Standard', 'active'),
(4, 3, 2.0, 0.0, 'Standard', 'active'),
(4, 4, 3.0, 0.0, 'Standard', 'active');

-- Sample Seats for Teatr Wielki - Amfiteatr Sector, Rząd 2
insert into seat (seat_row_id, order_number, position_x, position_y, price_category, status)
values
(5, 1, 0.0, 1.0, 'Standard', 'active'),
(5, 2, 1.0, 1.0, 'Standard', 'active'),
(5, 3, 2.0, 1.0, 'Standard', 'active'),
(5, 4, 3.0, 1.0, 'Standard', 'active');

-- Sample Seats for Teatr Wielki - Balkon I Sector, Rząd 1
insert into seat (seat_row_id, order_number, position_x, position_y, price_category, status)
values
(6, 1, 0.0, 0.0, 'Economy', 'active'),
(6, 2, 1.0, 0.0, 'Economy', 'active'),
(6, 3, 2.0, 0.0, 'Economy', 'active'),
(6, 4, 3.0, 0.0, 'Economy', 'active'),
(6, 5, 4.0, 0.0, 'Economy', 'active'),
(6, 6, 5.0, 0.0, 'Economy', 'active');