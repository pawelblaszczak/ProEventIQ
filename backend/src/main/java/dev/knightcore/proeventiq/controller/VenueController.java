package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.VenuesApi;
import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SectorInput;
import dev.knightcore.proeventiq.api.model.SectorInputPosition;
import dev.knightcore.proeventiq.api.model.SectorSeatsInput;
import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.api.model.VenueOption;
import dev.knightcore.proeventiq.api.model.PaginatedVenues;
import dev.knightcore.proeventiq.service.VenueService;
import jakarta.validation.Valid;
import dev.knightcore.proeventiq.service.SectorService;
import dev.knightcore.proeventiq.service.SeatService;
import dev.knightcore.proeventiq.dto.SectorDTO;
import dev.knightcore.proeventiq.dto.SectorInputDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@RestController
@Validated
public class VenueController implements VenuesApi {
    
    private final VenueService venueService;
    private final SectorService sectorService;
    private final SeatService seatService;
    
    public VenueController(VenueService venueService, SectorService sectorService, SeatService seatService) {
        this.venueService = venueService;
        this.sectorService = sectorService;
        this.seatService = seatService;
    }

    @Override
    public ResponseEntity<Sector> addSector(Long venueId, SectorInput sectorInput) {
        try {
            SectorInputDTO inputDTO = toSectorInputDTO(sectorInput);
            SectorDTO created = sectorService.addSector(venueId, inputDTO);
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
    public ResponseEntity<Void> deleteVenue(Long venueId) {
        try {
            boolean deleted = venueService.deleteVenue(venueId);
            return deleted ?
                   ResponseEntity.status(HttpStatus.NO_CONTENT).build() :
                   ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Venue> getVenue(Long venueId) {
        try {
            return venueService.getVenue(venueId)
                    .map(venue -> ResponseEntity.status(HttpStatus.OK).body(venue))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<PaginatedVenues> listVenues(String name, String country, String city, Integer page, Integer size, String search) {
        int pageNum = (page != null && page > 0) ? page - 1 : 0;
        int pageSize = (size != null && size > 0) ? size : 20;
        Page<Venue> venuePage = venueService.listVenuesPaginated(name, country, city, search, PageRequest.of(pageNum, pageSize));
        PaginatedVenues result = new PaginatedVenues()
            .items(venuePage.getContent())
            .page(pageNum + 1)
            .size(pageSize)
            .totalItems((int) venuePage.getTotalElements())
            .totalPages(venuePage.getTotalPages());
        return ResponseEntity.ok(result);
    }

    @Override
    public ResponseEntity<List<VenueOption>> listVenueOptions() {
        List<VenueOption> options = venueService.listVenueOptions();
        return ResponseEntity.status(HttpStatus.OK).body(options);
    }

    @Override
    public ResponseEntity<Venue> updateVenue(Long venueId, VenueInput venueInput) {
        try {
            return venueService.updateVenue(venueId, venueInput)
                    .map(venue -> ResponseEntity.status(HttpStatus.OK).body(venue))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Void> deleteSector(Long venueId, Long sectorId) {
        try {
            boolean deleted = sectorService.deleteSector(sectorId);
            return deleted ?
                   ResponseEntity.status(HttpStatus.NO_CONTENT).build() :
                   ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Sector> getSector(Long venueId, Long sectorId) {
        try {
            return sectorService.getSector(sectorId)
                    .map(dto -> ResponseEntity.status(HttpStatus.OK).body(toSector(dto)))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @Override
    public ResponseEntity<Sector> updateSector(Long venueId, Long sectorId, SectorInput sectorInput) {
        try {
            SectorInputDTO inputDTO = toSectorInputDTO(sectorInput);
            return sectorService.updateSector(sectorId, inputDTO)
                    .map(dto -> ResponseEntity.status(HttpStatus.OK).body(toSector(dto)))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Mapping utility methods
    private SectorInputDTO toSectorInputDTO(SectorInput input) {
        String name = input.getName();

        Integer orderNumber = null;
        if (input.getOrderNumber() != null) {
            orderNumber = input.getOrderNumber();
        }

        Float positionX = null;
        Float positionY = null;
        
        if (input.getPosition() != null) {
            positionX = input.getPosition().getX() != null ? input.getPosition().getX().floatValue() : null;
            positionY = input.getPosition().getY() != null ? input.getPosition().getY().floatValue() : null;
        }
        
        Integer rotation = null;
        if (input.getRotation() != null) {
            rotation = input.getRotation();
        }

        String priceCategory = input.getPriceCategory();
        String status = input.getStatus() != null ? input.getStatus().getValue() : null;

        return new SectorInputDTO(name, orderNumber, positionX, positionY, rotation, priceCategory, status);
    }

    private Sector toSector(SectorDTO dto) {
        Sector sector = new Sector();
        sector.setSectorId(dto.sectorId());
        sector.setName(dto.name());
        sector.setOrderNumber(dto.orderNumber());
        
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

    @Override
    public ResponseEntity<Sector> updateSectorSeats(Long venueId, Long sectorId,
            @Valid SectorSeatsInput sectorSeatsInput) {
        try {
            // Update the seats using the SeatService
            seatService.updateSectorSeats(sectorId, sectorSeatsInput.getRows());

            // Return the updated sector with all seats
            return sectorService.getSectorWithSeats(sectorId)
                    .map(sector -> ResponseEntity.status(HttpStatus.OK).body(sector))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
