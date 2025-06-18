package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.VenuesApi;
import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SectorInput;
import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.service.VenueService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import java.util.List;

@RestController
@Validated
public class VenueController implements VenuesApi {    private final VenueService venueService;
    
    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @Override
    public ResponseEntity<Sector> addSector(String venueId, SectorInput sectorInput) {
        // TODO: Implement add sector to venue
        return ResponseEntity.status(501).build();
    }

    @Override
    public ResponseEntity<Venue> addVenue(VenueInput venueInput) {
        Venue created = venueService.addVenue(venueInput);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }    @Override
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
}
