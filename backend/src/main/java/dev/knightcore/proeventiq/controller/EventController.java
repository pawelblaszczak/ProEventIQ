package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.EventsApi;
import dev.knightcore.proeventiq.api.model.Event;
import dev.knightcore.proeventiq.api.model.EventInput;
import dev.knightcore.proeventiq.api.model.PaginatedEvents;
import dev.knightcore.proeventiq.api.model.Participant;
import dev.knightcore.proeventiq.api.model.ParticipantInput;
import dev.knightcore.proeventiq.service.EventService;
import dev.knightcore.proeventiq.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
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
    private final ReportService reportService;
    
    public EventController(EventService eventService, ReportService reportService) {
        this.eventService = eventService;
        this.reportService = reportService;
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
    public ResponseEntity<Void> deleteEvent(Long eventId) {
        log.info("Deleting event with ID: {}", eventId);
        try {
            boolean deleted = eventService.deleteEvent(eventId);
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
    public ResponseEntity<Event> getEventById(Long eventId) {
        log.info("Fetching event with ID: {}", eventId);
        try {
            return eventService.getEvent(eventId)
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
    public ResponseEntity<PaginatedEvents> listEvents(Long showId, OffsetDateTime dateFrom, OffsetDateTime dateTo, Long venueId, Integer page, Integer size, String search) {
        log.info("Listing events with filters - showId: {}, venueId: {}, dateFrom: {}, dateTo: {}, page: {}, size: {}, search: {}", 
                showId, venueId, dateFrom, dateTo, page, size, search);
        try {
            if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
                log.warn("Invalid date range: dateFrom {} is after dateTo {}", dateFrom, dateTo);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            int pageNum = (page != null && page > 0) ? page - 1 : 0;
            int pageSize = (size != null && size > 0) ? size : 20;
            Page<Event> eventPage = eventService.listEventsPaginated(showId, venueId, dateFrom, dateTo, search, PageRequest.of(pageNum, pageSize));
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
    public ResponseEntity<Event> updateEvent(Long eventId, @Valid EventInput eventInput) {
        log.info("Updating event with ID: {}", eventId);
        try {
            return eventService.updateEvent(eventId, eventInput)
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

    // PARTICIPANT ENDPOINTS
    @Override
    public ResponseEntity<List<Participant>> eventsEventIdParticipantsGet(Long eventId) {
        log.info("Listing participants for event ID: {}", eventId);
        try {
            List<Participant> participants = eventService.listParticipantsByEvent(eventId);
            return ResponseEntity.ok(participants);
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error listing participants: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Participant> eventsEventIdParticipantsPost(Long eventId, @Valid ParticipantInput participantInput) {
        log.info("Adding participant to event ID: {}", eventId);
        try {
            return eventService.addParticipant(eventId, participantInput)
                    .map(participant -> ResponseEntity.status(HttpStatus.CREATED).body(participant))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(null));
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error adding participant: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Participant> eventsEventIdParticipantsParticipantIdGet(Long eventId, Long participantId) {
        log.info("Fetching participant {} for event ID: {}", participantId, eventId);
        try {
            return eventService.getParticipant(eventId, participantId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error fetching participant: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Participant> eventsEventIdParticipantsParticipantIdPut(Long eventId, Long participantId, @Valid ParticipantInput participantInput) {
        log.info("Updating participant {} for event ID: {}", participantId, eventId);
        try {
            return eventService.updateParticipant(eventId, participantId, participantInput)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error updating participant: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Void> eventsEventIdParticipantsParticipantIdDelete(Long eventId, Long participantId) {
        log.info("Deleting participant {} from event ID: {}", participantId, eventId);
        try {
            boolean deleted = eventService.deleteParticipant(eventId, participantId);
            if (deleted) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error deleting participant: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    public ResponseEntity<org.springframework.core.io.Resource> eventsEventIdParticipantsParticipantIdTicketGet(Long eventId, Long participantId) {
        log.info("Generating participant ticket for participant {} in event ID: {}", participantId, eventId);
        try {
            return reportService.generateParticipantTicket(eventId, participantId)
                    .map(ticketBytes -> {
                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_PDF);
                        // Use centralized filename generation from ReportService
                        String filename = reportService.generateParticipantTicketFilename(eventId, participantId);
                        headers.set(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=" + filename);
                        
                        org.springframework.core.io.Resource resource = new ByteArrayResource(ticketBytes);
                        return ResponseEntity.ok()
                                .headers(headers)
                                .body(resource);
                    })
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error generating participant ticket: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Resource> eventsEventIdParticipantsTicketsZipGet(Long eventId) {
        log.info("Generating ZIP of all participant tickets for event ID: {}", eventId);
        try {
            return reportService.generateAllParticipantTicketsZip(eventId)
                    .map(zipBytes -> {
                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
                        // Use centralized filename generation from ReportService
                        String filename = reportService.generateParticipantTicketsZipFilename(eventId);
                        headers.set(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=" + filename);
                        
                        Resource resource = new ByteArrayResource(zipBytes);
                        return ResponseEntity.ok()
                                .headers(headers)
                                .body(resource);
                    })
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error generating ZIP of participant tickets: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Resource> eventsEventIdParticipantsParticipantIdMapGet(Long eventId, Long participantId) {
        log.info("Generating participant map for participant {} in event ID: {}", participantId, eventId);
        try {
            return reportService.generateParticipantMap(eventId, participantId)
                    .map(mapBytes -> {
                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_PDF);
                        // Use centralized filename generation from ReportService
                        String filename = reportService.generateParticipantMapFilename(eventId, participantId);
                        headers.set(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=" + filename);
                        
                        org.springframework.core.io.Resource resource = new ByteArrayResource(mapBytes);
                        return ResponseEntity.ok()
                                .headers(headers)
                                .body(resource);
                    })
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_EVENT_ID_FORMAT, eventId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error generating participant ticket: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
