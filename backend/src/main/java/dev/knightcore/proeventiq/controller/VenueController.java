package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.VenuesApi;
import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SectorInput;
import dev.knightcore.proeventiq.api.model.SectorInputPosition;
import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.service.VenueService;
import dev.knightcore.proeventiq.service.SectorService;
import dev.knightcore.proeventiq.dto.SectorDTO;
import dev.knightcore.proeventiq.dto.SectorInputDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import java.math.BigDecimal;
import java.util.List;

@RestController
@Validated
public class VenueController implements VenuesApi {
    
    private final VenueService venueService;
    private final SectorService sectorService;
    
    public VenueController(VenueService venueService, SectorService sectorService) {
        this.venueService = venueService;
        this.sectorService = sectorService;
    }

    @Override
    public ResponseEntity<Sector> addSector(String venueId, SectorInput sectorInput) {
        try {
            Long id = Long.parseLong(venueId);
            SectorInputDTO inputDTO = toSectorInputDTO(sectorInput);
            SectorDTO created = sectorService.addSector(id, inputDTO);
            Sector sector = toSector(created);
            return ResponseEntity.status(HttpStatus.CREATED).body(sector);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @Override
    public ResponseEntity<Venue> addVenue(VenueInput venueInput) {
        Venue created = venueService.addVenue(venueInput);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @Override
    public ResponseEntity<Void> deleteVenue(String venueId) {
        try {
            Long id = Long.parseLong(venueId);
            boolean deleted = venueService.deleteVenue(id);
            return deleted ? 
                   ResponseEntity.status(HttpStatus.NO_CONTENT).build() : 
                   ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Venue> getVenue(String venueId) {
        try {
            Long id = Long.parseLong(venueId);
            return venueService.getVenue(id)
                    .map(venue -> ResponseEntity.status(HttpStatus.OK).body(venue))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<List<Venue>> listVenues(String name, String country, String city) {
        List<Venue> venues = venueService.listVenues(name, country, city);
        return ResponseEntity.status(HttpStatus.OK).body(venues);
    }

    @Override
    public ResponseEntity<Venue> updateVenue(String venueId, VenueInput venueInput) {
        try {
            Long id = Long.parseLong(venueId);
            return venueService.updateVenue(id, venueInput)
                    .map(venue -> ResponseEntity.status(HttpStatus.OK).body(venue))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Void> deleteSector(String venueId, String sectorId) {
        try {
            Long id = Long.parseLong(sectorId);
            boolean deleted = sectorService.deleteSector(id);
            return deleted ? 
                   ResponseEntity.status(HttpStatus.NO_CONTENT).build() : 
                   ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Sector> getSector(String venueId, String sectorId) {
        try {
            Long id = Long.parseLong(sectorId);
            return sectorService.getSector(id)
                    .map(dto -> ResponseEntity.status(HttpStatus.OK).body(toSector(dto)))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Sector> updateSector(String venueId, String sectorId, SectorInput sectorInput) {
        try {
            Long id = Long.parseLong(sectorId);
            SectorInputDTO inputDTO = toSectorInputDTO(sectorInput);
            return sectorService.updateSector(id, inputDTO)
                    .map(dto -> ResponseEntity.status(HttpStatus.OK).body(toSector(dto)))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Mapping utility methods
    private SectorInputDTO toSectorInputDTO(SectorInput input) {
        String name = input.getName();

        Integer order = null;
        if (input.getOrder() != null) {
            order = input.getOrder().intValue();
        }

        Float positionX = null;
        Float positionY = null;
        
        if (input.getPosition() != null) {
            positionX = input.getPosition().getX() != null ? input.getPosition().getX().floatValue() : null;
            positionY = input.getPosition().getY() != null ? input.getPosition().getY().floatValue() : null;
        }
        
        Integer rotation = null;
        if (input.getRotation() != null) {
            rotation = input.getRotation().intValue();
        }

        String priceCategory = input.getPriceCategory();
        String status = input.getStatus() != null ? input.getStatus().getValue() : null;
        
        return new SectorInputDTO(name, order, positionX, positionY, rotation, priceCategory, status);
    }

    private Sector toSector(SectorDTO dto) {
        Sector sector = new Sector();
        sector.setSectorId(dto.sectorId() != null ? dto.sectorId().toString() : null);
        sector.setName(dto.name());
        sector.setOrder(dto.order());
        
        if (dto.positionX() != null && dto.positionY() != null) {
            SectorInputPosition position = new SectorInputPosition();
            position.setX(BigDecimal.valueOf(dto.positionX()));
            position.setY(BigDecimal.valueOf(dto.positionY()));
            sector.setPosition(position);
        }
        
        sector.setRotation(dto.rotation());
        sector.setPriceCategory(dto.priceCategory());
        
        if (dto.status() != null) {
            sector.setStatus(Sector.StatusEnum.fromValue(dto.status()));
        }
        
        // Note: numberOfSeats and rows are not included in SectorDTO, 
        // they would need to be calculated/fetched separately if needed
        
        return sector;
    }
}
