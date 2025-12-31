package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.SeatBlockApi;
import dev.knightcore.proeventiq.api.model.SeatBlock;
import dev.knightcore.proeventiq.api.model.SeatBlockInput;
import dev.knightcore.proeventiq.service.SeatBlockService;
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
public class SeatBlockController implements SeatBlockApi {

    private static final Logger log = LoggerFactory.getLogger(SeatBlockController.class);

    private final SeatBlockService seatBlockService;

    public SeatBlockController(SeatBlockService seatBlockService) {
        this.seatBlockService = seatBlockService;
    }

    @Override
    public ResponseEntity<List<SeatBlock>> getSeatBlock(Long eventId) {
        log.debug("Getting seat blocks for event ID: {}", eventId);
        
        try {
            if (!seatBlockService.isEventExists(eventId)) {
                log.warn("Event with ID {} not found", eventId);
                return ResponseEntity.notFound().build();
            }
            
            List<SeatBlock> seatBlocks = seatBlockService.getSeatBlocksByEvent(eventId);
            log.debug("Found {} seat blocks for event ID: {}", seatBlocks.size(), eventId);
            
            return ResponseEntity.ok(seatBlocks);
        } catch (Exception e) {
            log.error("Error getting seat blocks for event {}: {}", eventId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<List<SeatBlock>> updateSeatBlock(Long eventId, @Valid List<SeatBlockInput> seatBlockInput) {
        log.debug("Updating seat blocks for event ID: {} with {} inputs", eventId, seatBlockInput.size());
        
        try {
            List<SeatBlock> updatedSeatBlocks = seatBlockService.updateSeatBlock(eventId, seatBlockInput);
            
            log.debug("Successfully updated seat blocks for event ID: {}", eventId);
            return ResponseEntity.ok(updatedSeatBlocks);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid input for seat block update - Event ID: {}, Error: {}", eventId, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error updating seat blocks for event {}: {}", eventId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
