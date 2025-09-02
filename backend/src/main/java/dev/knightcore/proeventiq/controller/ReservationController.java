package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.ReservationApi;
import dev.knightcore.proeventiq.api.model.Reservation;
import dev.knightcore.proeventiq.api.model.ReservationInput;
import dev.knightcore.proeventiq.service.ReservationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Validated
public class ReservationController implements ReservationApi {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Override
    public ResponseEntity<List<Reservation>> getReservation(Long eventId) {
        log.debug("Getting reservations for event ID: {}", eventId);
        
        try {
            // Check if event exists
            if (!reservationService.isEventExists(eventId)) {
                log.warn("Event with ID {} not found", eventId);
                return ResponseEntity.notFound().build();
            }
            
            List<Reservation> reservations = reservationService.getReservationsByEvent(eventId);
            log.debug("Found {} reservations for event ID: {}", reservations.size(), eventId);
            
            return ResponseEntity.ok(reservations);
        } catch (Exception e) {
            log.error("Error getting reservations for event {}: {}", eventId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<List<Reservation>> updateReservation(Long eventId, @Valid List<ReservationInput> reservationInput) {
        log.debug("Updating reservations for event ID: {} with {} inputs", eventId, reservationInput.size());
        
        try {
            List<Reservation> updatedReservations = reservationService.updateReservation(eventId, reservationInput);
            
            log.debug("Successfully updated {} reservations for event ID: {}", updatedReservations.size(), eventId);
            // Return the first reservation for backward compatibility with API response
            return ResponseEntity.ok(updatedReservations);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid input for reservation update - Event ID: {}, Error: {}", eventId, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error updating reservations for event {}: {}", eventId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
