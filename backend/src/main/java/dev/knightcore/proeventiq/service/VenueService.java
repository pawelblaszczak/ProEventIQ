package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.VenueRepository;
import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SeatRow;
import dev.knightcore.proeventiq.api.model.Seat;
import dev.knightcore.proeventiq.api.model.SectorInputPosition;
import java.util.ArrayList;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class VenueService {
    private static final Logger log = LoggerFactory.getLogger(VenueService.class);
    private final VenueRepository venueRepository;

    public VenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    @Transactional(readOnly = true)
    public List<Venue> listVenues(String name, String country, String city) {
        List<VenueEntity> entities = venueRepository.findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCase(
                name != null ? name : "",
                country != null ? country : "",
                city != null ? city : ""
        );
        return entities.stream().map(this::toDto).toList();
    }    @Transactional(readOnly = true)
    public Optional<Venue> getVenue(Long venueId) {
        log.info("Fetching venue with ID: {}", venueId);
        
        return venueRepository.findWithSectorsByVenueId(venueId).map(entity -> {
            if (entity.getSectors() != null) {
                log.info("Found venue: {}, with {} sectors", entity.getName(), entity.getSectors().size());
                
                // Force initialization of lazy collections
                for (var sector : entity.getSectors()) {
                    // Access positions to ensure they are loaded
                    log.info("Sector: {}, Position: ({}, {})", 
                        sector.getName(), sector.getPositionX(), sector.getPositionY());
                    
                    if (sector.getSeatRows() != null) {
                        for (var row : sector.getSeatRows()) {
                            if (row.getSeats() != null) {
                                // Access each seat to ensure it's loaded
                                for (var seat : row.getSeats()) {
                                    log.info("Seat in row {}: Position: ({}, {})", 
                                        row.getOrderNumber(), seat.getPositionX(), seat.getPositionY());
                                }
                            }
                        }
                    }
                }
            }
            
            return toDto(entity);
        });
    }

    @Transactional
    public Venue addVenue(VenueInput input) {
        VenueEntity entity = fromInput(input);
        VenueEntity saved = venueRepository.save(entity);
        return toDto(saved);
    }    @Transactional
    public Optional<Venue> updateVenue(Long venueId, VenueInput input) {        return venueRepository.findById(venueId).map(entity -> {
            entity.setName(input.getName());
            entity.setCountry(input.getCountry());
            entity.setCity(input.getCity());
            entity.setAddress(input.getAddress());
            // Handle thumbnail data - now it comes as byte[] from JSON
            if (input.getThumbnail() != null && input.getThumbnailContentType() != null) {
                try {
                    entity.setThumbnail(input.getThumbnail());
                    entity.setThumbnailContentType(input.getThumbnailContentType());
                } catch (Exception e) {
                    log.error("Error processing thumbnail: {}", e.getMessage());
                }
            }
            entity.setDescription(input.getDescription());
            return toDto(venueRepository.save(entity));
        });
    }

    @Transactional
    public boolean deleteVenue(Long venueId) {
        if (venueRepository.existsById(venueId)) {
            venueRepository.deleteById(venueId);
            return true;
        }
        return false;
    }    private VenueEntity fromInput(VenueInput input) {
        VenueEntity entity = new VenueEntity();
        entity.setName(input.getName());
        entity.setCountry(input.getCountry());
        entity.setCity(input.getCity());
        entity.setAddress(input.getAddress());
        // Handle thumbnail data - now it comes as byte[] from JSON
        if (input.getThumbnail() != null && input.getThumbnailContentType() != null) {
            try {
                entity.setThumbnail(input.getThumbnail());
                entity.setThumbnailContentType(input.getThumbnailContentType());
            } catch (Exception e) {
                log.error("Error processing thumbnail: {}", e.getMessage());
            }
        }
        entity.setDescription(input.getDescription());
        return entity;
    }

    private Venue toDto(VenueEntity entity) {
        Venue dto = new Venue();
        dto.setVenueId(entity.getVenueId() != null ? entity.getVenueId().toString() : null);
        dto.setName(entity.getName());
        dto.setCountry(entity.getCountry());
        dto.setCity(entity.getCity());
        dto.setAddress(entity.getAddress());
        if (entity.getThumbnail() != null && entity.getThumbnailContentType() != null) {
            try {
                dto.setThumbnail(entity.getThumbnail());
            } catch (Exception e) {
                log.error("Error setting thumbnail: {}", e.getMessage());
            }
        }
        dto.setThumbnailContentType(entity.getThumbnailContentType());
        dto.setDescription(entity.getDescription());
        // Map sectors
        if (entity.getSectors() != null) {
            List<Sector> sectorDtos = new ArrayList<>();
            int totalSeats = 0;
            for (var sectorEntity : entity.getSectors()) {
                Sector sectorDto = new Sector();                sectorDto.setSectorId(sectorEntity.getSectorId() != null ? sectorEntity.getSectorId().toString() : null);
                sectorDto.setName(sectorEntity.getName());                // Log detailed position information for debugging
                log.info("In toDto - Sector: {}, Position from entity: ({}, {}), Position in DTO: {}", 
                    sectorDto.getName(), 
                    sectorEntity.getPositionX(), 
                    sectorEntity.getPositionY(),
                    sectorDto.getPosition() != null ? 
                        "(" + sectorDto.getPosition().getX() + ", " + sectorDto.getPosition().getY() + ")" : 
                        "null");
                // Position mapping
                if (sectorEntity.getPositionX() != null && sectorEntity.getPositionY() != null) {
                    SectorInputPosition position = new SectorInputPosition();                    position.setX(java.math.BigDecimal.valueOf(sectorEntity.getPositionX()));
                    position.setY(java.math.BigDecimal.valueOf(sectorEntity.getPositionY()));
                    sectorDto.setPosition(position);
                }
                sectorDto.setStatus(sectorEntity.getStatus() != null ?
                    Sector.StatusEnum.fromValue(sectorEntity.getStatus()) : null);
                // Rows and seat count
                int sectorSeatCount = 0;
                if (sectorEntity.getSeatRows() != null) {
                    List<SeatRow> rowDtos = new ArrayList<>();
                    for (var rowEntity : sectorEntity.getSeatRows()) {
                        SeatRow rowDto = new SeatRow();
                        rowDto.setSeatRowId(rowEntity.getSeatRowId() != null ? rowEntity.getSeatRowId().toString() : null);
                        rowDto.setName(rowEntity.getOrderNumber() != null ? rowEntity.getOrderNumber().toString() : null);
                        // Seats
                        int rowSeatCount = 0;
                        if (rowEntity.getSeats() != null) {
                            List<Seat> seatDtos = new ArrayList<>();
                            for (var seatEntity : rowEntity.getSeats()) {
                                Seat seatDto = new Seat();                                seatDto.setSeatId(seatEntity.getSeatId() != null ? seatEntity.getSeatId().toString() : null);
                                seatDto.setStatus(seatEntity.getStatus() != null ?
                                    Seat.StatusEnum.fromValue(seatEntity.getStatus()) : null);
                                // Map seat position
                                if (seatEntity.getPositionX() != null && seatEntity.getPositionY() != null) {
                                    SectorInputPosition position = new SectorInputPosition();                                    position.setX(java.math.BigDecimal.valueOf(seatEntity.getPositionX()));
                                    position.setY(java.math.BigDecimal.valueOf(seatEntity.getPositionY()));
                                    seatDto.setPosition(position);
                                }
                                seatDtos.add(seatDto);
                                rowSeatCount++;
                            }
                            rowDto.setSeats(seatDtos);
                        }
                        rowDtos.add(rowDto);
                        sectorSeatCount += rowSeatCount;
                    }
                    sectorDto.setRows(rowDtos);
                }
                sectorDto.setNumberOfSeats(sectorSeatCount);
                sectorDtos.add(sectorDto);
                totalSeats += sectorSeatCount;
            }
            dto.setSectors(sectorDtos);
            dto.setNumberOfSeats(totalSeats);
        }
        return dto;
    }
}
