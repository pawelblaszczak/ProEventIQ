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

-- Additional Polish Venues
INSERT INTO Venue (name, country, city, address, thumbnail, description)
VALUES 
('Hala Stulecia', 'Poland', 'Wrocław', 'ul. Wystawowa 1', 'hala_stulecia.jpg', 'Zabytkowa hala widowiskowo-sportowa wpisana na listę UNESCO'),
('Atlas Arena', 'Poland', 'Łódź', 'al. Bandurskiego 7', 'atlas_arena.jpg', 'Nowoczesna hala widowiskowo-sportowa w centrum Polski'),
('Ergo Arena', 'Poland', 'Gdańsk/Sopot', 'pl. Dwóch Miast 1', 'ergo_arena.jpg', 'Wielofunkcyjna hala na granicy Gdańska i Sopotu'),
('Spodek', 'Poland', 'Katowice', 'al. Korfantego 35', 'spodek.jpg', 'Ikoniczna hala widowiskowa o charakterystycznym kształcie spodka'),
('Tauron Arena', 'Poland', 'Kraków', 'ul. Stanisława Lema 7', 'tauron_arena.jpg', 'Największa hala widowiskowo-sportowa w Polsce'),
('Filharmonia Narodowa', 'Poland', 'Warszawa', 'ul. Jasna 5', 'filharmonia_narodowa.jpg', 'Główna sala koncertowa w Polsce, siedziba Filharmonii Narodowej'),
('Teatr im. Juliusza Słowackiego', 'Poland', 'Kraków', 'pl. Świętego Ducha 1', 'teatr_slowackiego.jpg', 'Jeden z najważniejszych teatrów dramatycznych w Polsce'),
('Teatr Polski', 'Poland', 'Wrocław', 'ul. Gabrieli Zapolskiej 3', 'teatr_polski_wroclaw.jpg', 'Znany teatr dramatyczny z bogatą tradycją'),
('Teatr Muzyczny Roma', 'Poland', 'Warszawa', 'ul. Nowogrodzka 49', 'teatr_roma.jpg', 'Największy teatr muzyczny w Warszawie'),
('Teatr Wybrzeże', 'Poland', 'Gdańsk', 'ul. Św. Ducha 2', 'teatr_wybrzeze.jpg', 'Czołowy teatr dramatyczny Pomorza'),
('Teatr Wielki', 'Poland', 'Łódź', 'pl. Dąbrowskiego 1', 'teatr_wielki_lodz.jpg', 'Największy teatr operowy w Łodzi'),
('Teatr im. Stefana Jaracza', 'Poland', 'Olsztyn', 'ul. 1 Maja 4', 'teatr_jaracza_olsztyn.jpg', 'Najstarszy teatr w Olsztynie'),
('Teatr im. Aleksandra Fredry', 'Poland', 'Gniezno', 'ul. Adama Mickiewicza 9', 'teatr_fredry_gniezno.jpg', 'Znany teatr dramatyczny w Wielkopolsce'),
('Teatr im. Wojciecha Bogusławskiego', 'Poland', 'Kalisz', 'pl. Bogusławskiego 1', 'teatr_boguslawskiego_kalisz.jpg', 'Najstarszy teatr dramatyczny w Polsce'),
('Teatr im. Jana Kochanowskiego', 'Poland', 'Opole', 'pl. Teatralny 12', 'teatr_kochanowskiego_opole.jpg', 'Wiodący teatr Opolszczyzny'),
('Teatr im. Wilama Horzycy', 'Poland', 'Toruń', 'pl. Teatralny 1', 'teatr_horzycy_torun.jpg', 'Zabytkowy teatr w centrum Torunia'),
('Teatr im. Adama Mickiewicza', 'Poland', 'Częstochowa', 'ul. Kilińskiego 15', 'teatr_mickiewicza_czestochowa.jpg', 'Najważniejszy teatr w Częstochowie');

-- Sample Sectors, Rows, and Seats for Additional Polish Venues
-- Hala Stulecia (venue_id = 4)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(4, 'Główna Arena', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(7, 'Rząd A', 1), (7, 'Rząd B', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(7, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (7, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(8, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (8, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Atlas Arena (venue_id = 5)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(5, 'Płyta', 0.0, 0.0, 'VIP', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(9, 'Rząd 1', 1), (9, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(9, 1, 0.0, 0.0, 'VIP', 'AVAILABLE'), (9, 2, 1.0, 0.0, 'VIP', 'AVAILABLE'),
(10, 1, 0.0, 1.0, 'VIP', 'AVAILABLE'), (10, 2, 1.0, 1.0, 'VIP', 'AVAILABLE');

-- Ergo Arena (venue_id = 6)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(6, 'Trybuna Główna', 0.0, 0.0, 'Standard', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(11, 'Rząd I', 1), (11, 'Rząd II', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(11, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'), (11, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(12, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'), (12, 2, 1.0, 1.0, 'Standard', 'AVAILABLE');

-- Spodek (venue_id = 7)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(7, 'Arena', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(13, 'Rząd 1', 1), (13, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(13, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (13, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(14, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (14, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Tauron Arena (venue_id = 8)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(8, 'Płyta Główna', 0.0, 0.0, 'VIP', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(15, 'Rząd A', 1), (15, 'Rząd B', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(15, 1, 0.0, 0.0, 'VIP', 'AVAILABLE'), (15, 2, 1.0, 0.0, 'VIP', 'AVAILABLE'),
(16, 1, 0.0, 1.0, 'VIP', 'AVAILABLE'), (16, 2, 1.0, 1.0, 'VIP', 'AVAILABLE');

-- Filharmonia Narodowa (venue_id = 9)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(9, 'Sala Koncertowa', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(17, 'Rząd I', 1), (17, 'Rząd II', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(17, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (17, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(18, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (18, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Teatr im. Juliusza Słowackiego (venue_id = 10)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(10, 'Scena Główna', 0.0, 0.0, 'Standard', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(19, 'Rząd 1', 1), (19, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(19, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'), (19, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(20, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'), (20, 2, 1.0, 1.0, 'Standard', 'AVAILABLE');

-- Teatr Polski (venue_id = 11)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(11, 'Duża Scena', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(21, 'Rząd A', 1), (21, 'Rząd B', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(21, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (21, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(22, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (22, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Teatr Muzyczny Roma (venue_id = 12)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(12, 'Sala Widowiskowa', 0.0, 0.0, 'VIP', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(23, 'Rząd 1', 1), (23, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(23, 1, 0.0, 0.0, 'VIP', 'AVAILABLE'), (23, 2, 1.0, 0.0, 'VIP', 'AVAILABLE'),
(24, 1, 0.0, 1.0, 'VIP', 'AVAILABLE'), (24, 2, 1.0, 1.0, 'VIP', 'AVAILABLE');

-- Teatr Wybrzeże (venue_id = 13)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(13, 'Scena Kameralna', 0.0, 0.0, 'Standard', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(25, 'Rząd I', 1), (25, 'Rząd II', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(25, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'), (25, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(26, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'), (26, 2, 1.0, 1.0, 'Standard', 'AVAILABLE');

-- Teatr Wielki (Łódź, venue_id = 14)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(14, 'Scena Główna', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(27, 'Rząd 1', 1), (27, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(27, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (27, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(28, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (28, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Teatr im. Stefana Jaracza (venue_id = 15)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(15, 'Scena Kameralna', 0.0, 0.0, 'Standard', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(29, 'Rząd A', 1), (29, 'Rząd B', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(29, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'), (29, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(30, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'), (30, 2, 1.0, 1.0, 'Standard', 'AVAILABLE');

-- Teatr im. Aleksandra Fredry (venue_id = 16)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(16, 'Scena Główna', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(31, 'Rząd 1', 1), (31, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(31, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (31, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(32, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (32, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Teatr im. Wojciecha Bogusławskiego (venue_id = 17)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(17, 'Scena Kameralna', 0.0, 0.0, 'Standard', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(33, 'Rząd I', 1), (33, 'Rząd II', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(33, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'), (33, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(34, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'), (34, 2, 1.0, 1.0, 'Standard', 'AVAILABLE');

-- Teatr im. Jana Kochanowskiego (venue_id = 18)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(18, 'Scena Główna', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(35, 'Rząd 1', 1), (35, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(35, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (35, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(36, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (36, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');

-- Teatr im. Wilama Horzycy (venue_id = 19)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(19, 'Scena Kameralna', 0.0, 0.0, 'Standard', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(37, 'Rząd A', 1), (37, 'Rząd B', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(37, 1, 0.0, 0.0, 'Standard', 'AVAILABLE'), (37, 2, 1.0, 0.0, 'Standard', 'AVAILABLE'),
(38, 1, 0.0, 1.0, 'Standard', 'AVAILABLE'), (38, 2, 1.0, 1.0, 'Standard', 'AVAILABLE');

-- Teatr im. Adama Mickiewicza (venue_id = 20)
INSERT INTO Sector (venue_id, name, position_x, position_y, price_category, status) VALUES
(20, 'Scena Główna', 0.0, 0.0, 'Premium', 'ACTIVE');
INSERT INTO Row (sector_id, name, order_number) VALUES
(39, 'Rząd 1', 1), (39, 'Rząd 2', 2);
INSERT INTO Seat (row_id, order_number, position_x, position_y, price_category, status) VALUES
(39, 1, 0.0, 0.0, 'Premium', 'AVAILABLE'), (39, 2, 1.0, 0.0, 'Premium', 'AVAILABLE'),
(40, 1, 0.0, 1.0, 'Premium', 'AVAILABLE'), (40, 2, 1.0, 1.0, 'Premium', 'AVAILABLE');
