package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.EventsApi;
import dev.knightcore.proeventiq.api.model.Event;
import dev.knightcore.proeventiq.api.model.EventInput;
import dev.knightcore.proeventiq.api.model.PaginatedEvents;
import dev.knightcore.proeventiq.service.EventService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@Validated
public class EventController implements EventsApi {
    
    private static final Logger log = LoggerFactory.getLogger(EventController.class);
    private static final String INVALID_EVENT_ID_FORMAT = "Invalid event ID format: {}";
    private final EventService eventService;
    
    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @Override
    public ResponseEntity<Event> createEvent(@Valid EventInput eventInput) {
        log.info("Creating new event for show: {} at venue: {}", eventInput.getShowId(), eventInput.getVenueId());
        try {
            return eventService.createEvent(eventInput)
                    .map(event -> ResponseEntity.status(HttpStatus.CREATED).body(event))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(null));
        } catch (NumberFormatException e) {
            log.error("Invalid show ID or venue ID format in input");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error creating event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Void> deleteEvent(String eventId) {
        log.info("Deleting event with ID: {}", eventId);
        try {
            Long id = Long.parseLong(eventId);
            boolean deleted = eventService.deleteEvent(id);
            if (deleted) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error deleting event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Event> getEventById(String eventId) {
        log.info("Fetching event with ID: {}", eventId);
        try {
            Long id = Long.parseLong(eventId);
            return eventService.getEvent(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error fetching event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<PaginatedEvents> listEvents(String showId, OffsetDateTime dateFrom, OffsetDateTime dateTo, String venueId, Integer page, Integer size, String search) {
        log.info("Listing events with filters - showId: {}, venueId: {}, dateFrom: {}, dateTo: {}, page: {}, size: {}, search: {}", 
                showId, venueId, dateFrom, dateTo, page, size, search);
        try {
            if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
                log.warn("Invalid date range: dateFrom {} is after dateTo {}", dateFrom, dateTo);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            Long parsedShowId = null;
            Long parsedVenueId = null;
            if (showId != null && !showId.trim().isEmpty()) {
                parsedShowId = Long.parseLong(showId);
            }
            if (venueId != null && !venueId.trim().isEmpty()) {
                parsedVenueId = Long.parseLong(venueId);
            }
            int pageNum = (page != null && page > 0) ? page - 1 : 0;
            int pageSize = (size != null && size > 0) ? size : 20;
            Page<Event> eventPage = eventService.listEventsPaginated(parsedShowId, parsedVenueId, dateFrom, dateTo, search, PageRequest.of(pageNum, pageSize));
            PaginatedEvents result = new PaginatedEvents()
                .items(eventPage.getContent())
                .totalItems((int) eventPage.getTotalElements())
                .totalPages(eventPage.getTotalPages())
                .currentPage(pageNum + 1)
                .pageSize(pageSize);
            return ResponseEntity.ok(result);
        } catch (NumberFormatException e) {
            log.error("Invalid ID format in filters - showId: {}, venueId: {}", showId, venueId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error listing events: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Event> updateEvent(String eventId, @Valid EventInput eventInput) {
        log.info("Updating event with ID: {}", eventId);
        try {
            Long id = Long.parseLong(eventId);
            return eventService.updateEvent(id, eventInput)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error updating event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
