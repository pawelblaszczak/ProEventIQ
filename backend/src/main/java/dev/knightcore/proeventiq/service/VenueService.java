package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.VenueRepository;
import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SeatRow;
import dev.knightcore.proeventiq.api.model.Seat;
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
    private static final String DATA_PREFIX = "data:";
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
    }

    @Transactional(readOnly = true)
    public Optional<Venue> getVenue(Long venueId) {
        // Use fetch join to get sectors eagerly
        return venueRepository.findWithSectorsByVenueId(venueId).map(this::toDto);
    }

    @Transactional
    public Venue addVenue(VenueInput input) {
        VenueEntity entity = fromInput(input);
        VenueEntity saved = venueRepository.save(entity);
        return toDto(saved);
    }    @Transactional
    public Optional<Venue> updateVenue(Long venueId, VenueInput input) {
        return venueRepository.findById(venueId).map(entity -> {
            entity.setName(input.getName());
            entity.setCountry(input.getCountry());
            entity.setCity(input.getCity());
            entity.setAddress(input.getAddress());
            // For now, we temporarily keep using URI/String for thumbnails in API
            // but store as binary in the database
            if (input.getThumbnail() != null) {
                try {
                    // Assuming thumbnail is a data URL: "data:image/jpeg;base64,..."
                    String uriString = input.getThumbnail().toString();
                    if (uriString.startsWith(DATA_PREFIX)) {
                        String[] parts = uriString.split(",");
                        if (parts.length == 2) {
                            String contentType = parts[0].replace(DATA_PREFIX, "").replace(";base64", "");
                            byte[] decodedBytes = java.util.Base64.getDecoder().decode(parts[1]);
                            entity.setThumbnail(decodedBytes);
                            entity.setThumbnailContentType(contentType);
                        }
                    }
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
        // For now, we temporarily keep using URI/String for thumbnails in API
        // but store as binary in the database
        if (input.getThumbnail() != null) {
            try {
                // Assuming thumbnail is a data URL: "data:image/jpeg;base64,..."
                String uriString = input.getThumbnail().toString();
                if (uriString.startsWith(DATA_PREFIX)) {
                    String[] parts = uriString.split(",");
                    if (parts.length == 2) {
                        String contentType = parts[0].replace(DATA_PREFIX, "").replace(";base64", "");
                        byte[] decodedBytes = java.util.Base64.getDecoder().decode(parts[1]);
                        entity.setThumbnail(decodedBytes);
                        entity.setThumbnailContentType(contentType);
                    }
                }
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
                Sector sectorDto = new Sector();
                sectorDto.setSectorId(sectorEntity.getSectorId() != null ? sectorEntity.getSectorId().toString() : null);
                sectorDto.setName(sectorEntity.getName());
                // Position mapping (if available)
                // sectorDto.setPosition(...); // TODO: map if needed
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
                                Seat seatDto = new Seat();
                                seatDto.setSeatId(seatEntity.getSeatId() != null ? seatEntity.getSeatId().toString() : null);
                                seatDto.setStatus(seatEntity.getStatus() != null ?
                                    Seat.StatusEnum.fromValue(seatEntity.getStatus()) : null);
                                seatDto.setPosition(null); // TODO: map position if needed
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
