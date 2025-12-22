package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.api.model.VenueOption;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.entity.SectorEntity;
import dev.knightcore.proeventiq.entity.SeatRowEntity;
import dev.knightcore.proeventiq.entity.SeatEntity;
import dev.knightcore.proeventiq.repository.VenueRepository;
import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SeatRow;
import dev.knightcore.proeventiq.api.model.Seat;
import dev.knightcore.proeventiq.api.model.SectorInputPosition;
import java.util.ArrayList;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class VenueService {
    private static final Logger log = LoggerFactory.getLogger(VenueService.class);
    private final VenueRepository venueRepository;
    private final dev.knightcore.proeventiq.repository.SectorRepository sectorRepository;
    private final KeycloakUserService keycloakUserService;

    public VenueService(VenueRepository venueRepository, 
                       dev.knightcore.proeventiq.repository.SectorRepository sectorRepository,
                       KeycloakUserService keycloakUserService) {
        this.venueRepository = venueRepository;
        this.sectorRepository = sectorRepository;
        this.keycloakUserService = keycloakUserService;
    }
    
    @Transactional(readOnly = true)
    public Optional<Venue> getVenue(Long venueId) {
        log.info("Fetching venue with ID: {}", venueId);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        return venueRepository.findWithSectorsByVenueId(venueId)
            .filter(entity -> currentUsername.equals(entity.getUserName()))
            .map(entity -> {
                logVenueDetails(entity);
                initializeLazyCollections(entity);
                return toDto(entity, true);
            });
    }

    private void logVenueDetails(VenueEntity entity) {
        if (entity.getSectors() != null) {
            log.info("Found venue: {}, with {} sectors", entity.getName(), entity.getSectors().size());
        }
    }

    private void initializeLazyCollections(VenueEntity entity) {
        if (entity.getSectors() != null) {
            for (var sector : entity.getSectors()) {
                initializeSectorCollections(sector);
            }
        }
    }

    private void initializeSectorCollections(dev.knightcore.proeventiq.entity.SectorEntity sector) {
        log.info("Sector: {}, Position: ({}, {})", 
            sector.getName(), sector.getPositionX(), sector.getPositionY());
        
        if (sector.getSeatRows() != null) {
            for (var row : sector.getSeatRows()) {
                initializeRowCollections(row);
            }
        }
    }

    private void initializeRowCollections(dev.knightcore.proeventiq.entity.SeatRowEntity row) {
        if (row.getSeats() != null) {
            // Access each seat to ensure it's loaded
            for (var seat : row.getSeats()) {
                log.info("Seat in row {}: Position: ({}, {})", 
                    row.getOrderNumber(), seat.getPositionX(), seat.getPositionY());
            }
        }
    }

    @Transactional
    public Venue addVenue(VenueInput input) {
        VenueEntity entity = fromInput(input);
        
        // Set the userName from the authentication context
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        entity.setUserName(currentUsername);
        
        VenueEntity saved = venueRepository.save(entity);
        return toDto(saved, true);
    }    

    @Transactional
    public Venue importVenue(Venue venue) {
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));

        if (venue.getVenueId() == null) {
            throw new IllegalArgumentException("venueId is required for import");
        }

        VenueEntity entity = venueRepository.findWithSectorsByVenueId(venue.getVenueId())
            .filter(e -> currentUsername.equals(e.getUserName()))
            .orElseThrow(() -> new IllegalArgumentException("Venue not found or access denied"));

        // Replace existing sectors with those from the imported venue,
        // keeping main venue properties (name, country, etc.) unchanged.
        //
        // IMPORTANT: For collections with orphanRemoval=true we must not
        // replace the collection instance itself, only mutate its contents.
        List<SectorEntity> targetSectors = entity.getSectors();
        if (targetSectors == null) {
            targetSectors = new ArrayList<>();
            entity.setSectors(targetSectors);
        } else {
            targetSectors.clear();
        }

        if (venue.getSectors() != null && !venue.getSectors().isEmpty()) {
            for (Sector sectorDto : venue.getSectors()) {
                SectorEntity sectorEntity = fromSectorDto(sectorDto, entity);
                targetSectors.add(sectorEntity);
            }
        }

        VenueEntity saved = venueRepository.save(entity);
        return toDto(saved, true);
    }
    
    @Transactional
    public Optional<Venue> updateVenue(Long venueId, VenueInput input) {
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        return venueRepository.findById(venueId)
            .filter(entity -> currentUsername.equals(entity.getUserName()))
            .map(entity -> {
                updateVenueEntityFromInput(entity, input);
                return toDto(venueRepository.save(entity), true);
            });
    }

    @Transactional
    public boolean deleteVenue(Long venueId) {
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        Optional<VenueEntity> entityOpt = venueRepository.findById(venueId);
        if (entityOpt.isPresent() && currentUsername.equals(entityOpt.get().getUserName())) {
            venueRepository.deleteById(venueId);
            return true;
        }
        return false;
    }

    private void updateVenueEntityFromInput(VenueEntity entity, VenueInput input) {
        entity.setName(input.getName());
        entity.setCountry(input.getCountry());
        entity.setCity(input.getCity());
        entity.setAddress(input.getAddress());
        entity.setDescription(input.getDescription());
        handleThumbnailUpdate(entity, input);
    }

    private void handleThumbnailUpdate(VenueEntity entity, VenueInput input) {
        if (input.getThumbnail() != null && input.getThumbnailContentType() != null) {
            try {
                byte[] thumbnailBytes = convertBase64ToBytes(input.getThumbnail());
                entity.setThumbnail(thumbnailBytes);
                entity.setThumbnailContentType(input.getThumbnailContentType());
            } catch (Exception e) {
                log.error("Error processing thumbnail: {}", e.getMessage());
            }
        }
    }

    private byte[] convertBase64ToBytes(String base64Data) {        if (base64Data == null || base64Data.isEmpty()) {
            return new byte[0];
        }
        
        // Handle data URL format (data:image/jpeg;base64,...)
        String base64String = base64Data;
        if (base64Data.contains(",")) {
            base64String = base64Data.split(",")[1];
        }
          return Base64.getDecoder().decode(base64String);
    }
    
    private VenueEntity fromInput(VenueInput input) {
        VenueEntity entity = new VenueEntity();
        updateVenueEntityFromInput(entity, input);
        return entity;
    }    

    private SectorEntity fromSectorDto(Sector sectorDto, VenueEntity venueEntity) {
        SectorEntity sectorEntity = new SectorEntity();
        sectorEntity.setName(sectorDto.getName());
        sectorEntity.setOrderNumber(sectorDto.getOrderNumber());
        sectorEntity.setRotation(sectorDto.getRotation());
        sectorEntity.setPriceCategory(sectorDto.getPriceCategory());
        if (sectorDto.getStatus() != null) {
            sectorEntity.setStatus(sectorDto.getStatus().getValue());
        }

        if (sectorDto.getPosition() != null) {
            SectorInputPosition position = sectorDto.getPosition();
            sectorEntity.setPositionX(position.getX() != null ? position.getX().floatValue() : null);
            sectorEntity.setPositionY(position.getY() != null ? position.getY().floatValue() : null);
        }

        sectorEntity.setVenue(venueEntity);

        if (sectorDto.getRows() != null && !sectorDto.getRows().isEmpty()) {
            List<SeatRowEntity> rowEntities = new ArrayList<>();
            for (SeatRow rowDto : sectorDto.getRows()) {
                SeatRowEntity rowEntity = fromSeatRowDto(rowDto, sectorEntity);
                rowEntities.add(rowEntity);
            }
            sectorEntity.setSeatRows(rowEntities);
        }

        return sectorEntity;
    }

    private SeatRowEntity fromSeatRowDto(SeatRow rowDto, SectorEntity sectorEntity) {
        SeatRowEntity rowEntity = new SeatRowEntity();
        rowEntity.setName(rowDto.getName());
        rowEntity.setOrderNumber(rowDto.getOrderNumber());
        rowEntity.setSector(sectorEntity);

        if (rowDto.getSeats() != null && !rowDto.getSeats().isEmpty()) {
            List<SeatEntity> seatEntities = new ArrayList<>();
            for (Seat seatDto : rowDto.getSeats()) {
                SeatEntity seatEntity = fromSeatDto(seatDto, rowEntity);
                seatEntities.add(seatEntity);
            }
            rowEntity.setSeats(seatEntities);
        }

        return rowEntity;
    }

    private SeatEntity fromSeatDto(Seat seatDto, SeatRowEntity rowEntity) {
        SeatEntity seatEntity = new SeatEntity();
        seatEntity.setOrderNumber(seatDto.getOrderNumber());
        seatEntity.setPriceCategory(seatDto.getPriceCategory());
        if (seatDto.getStatus() != null) {
            seatEntity.setStatus(seatDto.getStatus().getValue());
        }

        if (seatDto.getPosition() != null) {
            SectorInputPosition position = seatDto.getPosition();
            seatEntity.setPositionX(position.getX() != null ? position.getX().floatValue() : null);
            seatEntity.setPositionY(position.getY() != null ? position.getY().floatValue() : null);
        }

        seatEntity.setSeatRow(rowEntity);
        return seatEntity;
    }
    
    private Venue toDto(VenueEntity entity, Boolean includeSectors) {
        Venue dto = new Venue();
        mapBasicVenueProperties(entity, dto);
        mapVenueThumbnail(entity, dto);
        if (includeSectors) {
            mapVenueSectors(entity, dto);
        }
        // Set numberOfSeats using DB function
        if (entity.getVenueId() != null) {
            Integer seatCount = venueRepository.getVenueSeatCount(entity.getVenueId());
            dto.setNumberOfSeats(seatCount != null ? seatCount : 0);
        } else {
            dto.setNumberOfSeats(0);
        }
        return dto;
    }

    private void mapBasicVenueProperties(VenueEntity entity, Venue dto) {
        dto.setVenueId(entity.getVenueId());
        dto.setUserName(entity.getUserName());
        dto.setName(entity.getName());
        dto.setCountry(entity.getCountry());
        dto.setCity(entity.getCity());
        dto.setAddress(entity.getAddress());
        dto.setThumbnailContentType(entity.getThumbnailContentType());
        dto.setDescription(entity.getDescription());
    }

    private void mapVenueThumbnail(VenueEntity entity, Venue dto) {
        if (entity.getThumbnail() != null && entity.getThumbnailContentType() != null) {
            try {
                dto.setThumbnail(entity.getThumbnail());
            } catch (Exception e) {
                log.error("Error setting thumbnail: {}", e.getMessage());
            }
        }
    }

    private void mapVenueSectors(VenueEntity entity, Venue dto) {
        if (entity.getSectors() != null) {
            List<Sector> sectorDtos = new ArrayList<>();
            for (var sectorEntity : entity.getSectors()) {
                Sector sectorDto = mapSectorToDto(sectorEntity);
                // Set numberOfSeats using DB function
                if (sectorEntity.getSectorId() != null) {
                    int seatCount = sectorRepository.getSeatCountForSector(sectorEntity.getSectorId());
                    sectorDto.setNumberOfSeats(seatCount);
                } else {
                    sectorDto.setNumberOfSeats(0);
                }
                sectorDtos.add(sectorDto);
            }
            dto.setSectors(sectorDtos);
        }
    }

    private Sector mapSectorToDto(dev.knightcore.proeventiq.entity.SectorEntity sectorEntity) {
        Sector sectorDto = new Sector();
        sectorDto.setSectorId(sectorEntity.getSectorId());
        sectorDto.setName(sectorEntity.getName());
        sectorDto.setOrderNumber(sectorEntity.getOrderNumber());
        sectorDto.setRotation(sectorEntity.getRotation());
        sectorDto.setPriceCategory(sectorEntity.getPriceCategory());
        
        mapSectorPosition(sectorEntity, sectorDto);
        mapSectorStatus(sectorEntity, sectorDto);
        mapSectorRows(sectorEntity, sectorDto);
        
        return sectorDto;
    }

    private void mapSectorPosition(dev.knightcore.proeventiq.entity.SectorEntity sectorEntity, Sector sectorDto) {
        if (sectorEntity.getPositionX() != null && sectorEntity.getPositionY() != null) {
            SectorInputPosition position = new SectorInputPosition();
            position.setX(java.math.BigDecimal.valueOf(sectorEntity.getPositionX()));
            position.setY(java.math.BigDecimal.valueOf(sectorEntity.getPositionY()));
            sectorDto.setPosition(position);
            
            log.info("In toDto - Sector: {}, Position from entity: ({}, {}), Position in DTO: ({}, {})", 
                sectorDto.getName(), 
                sectorEntity.getPositionX(), 
                sectorEntity.getPositionY(),
                position.getX(), 
                position.getY());
        }
    }

    private void mapSectorStatus(dev.knightcore.proeventiq.entity.SectorEntity sectorEntity, Sector sectorDto) {
        sectorDto.setStatus(sectorEntity.getStatus() != null ?
            Sector.StatusEnum.fromValue(sectorEntity.getStatus()) : null);
    }

    private void mapSectorRows(dev.knightcore.proeventiq.entity.SectorEntity sectorEntity, Sector sectorDto) {
        if (sectorEntity.getSeatRows() != null) {
            List<SeatRow> rowDtos = new ArrayList<>();
            
            for (var rowEntity : sectorEntity.getSeatRows()) {
                SeatRow rowDto = mapRowToDto(rowEntity);
                rowDtos.add(rowDto);
            }
            
            sectorDto.setRows(rowDtos);
        }
    }

    private SeatRow mapRowToDto(dev.knightcore.proeventiq.entity.SeatRowEntity rowEntity) {
        SeatRow rowDto = new SeatRow();
        rowDto.setSeatRowId(rowEntity.getSeatRowId());
        rowDto.setName(rowEntity.getName());
        rowDto.setOrderNumber(rowEntity.getOrderNumber());
        
        if (rowEntity.getSeats() != null) {
            List<Seat> seatDtos = new ArrayList<>();
            
            for (var seatEntity : rowEntity.getSeats()) {
                Seat seatDto = mapSeatToDto(seatEntity);
                seatDtos.add(seatDto);
            }
            
            rowDto.setSeats(seatDtos);
        }
        
        return rowDto;
    }

    private Seat mapSeatToDto(dev.knightcore.proeventiq.entity.SeatEntity seatEntity) {
        Seat seatDto = new Seat();
        seatDto.setSeatId(seatEntity.getSeatId());
        seatDto.setOrderNumber(seatEntity.getOrderNumber());
        seatDto.setPriceCategory(seatEntity.getPriceCategory());
        seatDto.setStatus(seatEntity.getStatus() != null ?
            Seat.StatusEnum.fromValue(seatEntity.getStatus()) : null);
        
        if (seatEntity.getPositionX() != null && seatEntity.getPositionY() != null) {
            SectorInputPosition position = new SectorInputPosition();
            position.setX(java.math.BigDecimal.valueOf(seatEntity.getPositionX()));
            position.setY(java.math.BigDecimal.valueOf(seatEntity.getPositionY()));
            seatDto.setPosition(position);
        }
        
        return seatDto;
    }

    @Transactional(readOnly = true)
    public List<VenueOption> listVenueOptions() {
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        List<VenueEntity> entities = venueRepository.findByUserName(currentUsername);
        return entities.stream()
                .map(entity -> new VenueOption(
                    entity.getVenueId(),
                    entity.getName()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<Venue> listVenuesPaginated(String name, String country, String city, String search, Pageable pageable) {
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        String nameFilter = (name != null) ? name : "";
        String countryFilter = (country != null) ? country : "";
        String cityFilter = (city != null) ? city : "";
        String searchFilter = (search != null) ? search : "";
        // If search is provided, override other filters for a broad search
        if (!searchFilter.isEmpty()) {
            return venueRepository.findByUserNameAndNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByNameAsc(
                currentUsername, searchFilter, searchFilter, searchFilter, pageable
            ).map(entity -> toDto(entity, false));
        }
        return venueRepository.findByUserNameAndNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCaseOrderByNameAsc(
            currentUsername, nameFilter, countryFilter, cityFilter, pageable
        ).map(entity -> toDto(entity, false));
    }
}
