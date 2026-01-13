package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Event;
import dev.knightcore.proeventiq.api.model.EventInput;
import dev.knightcore.proeventiq.api.model.Participant;
import dev.knightcore.proeventiq.api.model.ParticipantInput;
import dev.knightcore.proeventiq.entity.EventEntity;
import dev.knightcore.proeventiq.entity.ParticipantEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.ParticipantRepository;
import dev.knightcore.proeventiq.repository.ShowRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class EventService {
    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    
    private final EventRepository eventRepository;
    private final ShowRepository showRepository;
    private final VenueRepository venueRepository;
    private final ShowService showService;
    private final VenueService venueService;
    private final ParticipantRepository participantRepository;
    private final KeycloakUserService keycloakUserService;

    public EventService(EventRepository eventRepository, 
                       ShowRepository showRepository,
                       VenueRepository venueRepository,
                       ShowService showService,
                       VenueService venueService,
                       ParticipantRepository participantRepository,
                       KeycloakUserService keycloakUserService) {
        this.eventRepository = eventRepository;
        this.showRepository = showRepository;
        this.venueRepository = venueRepository;
        this.showService = showService;
        this.venueService = venueService;
        this.participantRepository = participantRepository;
        this.keycloakUserService = keycloakUserService;
    }

    @Transactional(readOnly = true)
    public List<Event> listEvents(Long showId, Long venueId, OffsetDateTime dateFrom, OffsetDateTime dateTo) {
        log.info("Listing events with filters - showId: {}, venueId: {}, dateFrom: {}, dateTo: {}", 
                showId, venueId, dateFrom, dateTo);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        LocalDateTime localDateFrom = dateFrom != null ? dateFrom.toLocalDateTime() : null;
        LocalDateTime localDateTo = dateTo != null ? dateTo.toLocalDateTime() : null;
        List<EventEntity> entities = eventRepository.findByFilters(showId, venueId, localDateFrom, localDateTo);
        return entities.stream()
            .filter(e -> currentUsername.equals(e.getUserName()))
            .map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Event> getEvent(Long eventId) {
        log.info("Fetching event with ID: {}", eventId);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        EventEntity entity = eventRepository.findByIdWithDetails(eventId);
        if (entity != null && currentUsername.equals(entity.getUserName())) {
            return Optional.of(toDto(entity));
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Event> createEvent(EventInput input) {
        log.info("Creating new event for show: {} at venue: {}", input.getShowId(), input.getVenueId());
        // Validate that show and venue exist
        Long showId = input.getShowId();
        Long venueId = input.getVenueId();
        if (!showRepository.existsById(showId)) {
            log.warn("Show with ID {} not found", showId);
            return Optional.empty();
        }
        if (!venueRepository.existsById(venueId)) {
            log.warn("Venue with ID {} not found", venueId);
            return Optional.empty();
        }
        EventEntity entity = fromInput(input);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        entity.setUserName(currentUsername);
        EventEntity saved = eventRepository.save(entity);
        return Optional.of(toDto(saved));
    }

    @Transactional
    public Optional<Event> updateEvent(Long eventId, EventInput input) {
        log.info("Updating event with ID: {}", eventId);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        return eventRepository.findById(eventId)
            .filter(entity -> currentUsername.equals(entity.getUserName()))
            .map(entity -> {
                // Validate that show and venue exist
                Long showId = input.getShowId();
                Long venueId = input.getVenueId();
                if (!showRepository.existsById(showId)) {
                    log.warn("Show with ID {} not found", showId);
                    return null;
                }
                if (!venueRepository.existsById(venueId)) {
                    log.warn("Venue with ID {} not found", venueId);
                    return null;
                }
                updateEventEntityFromInput(entity, input);
                return toDto(eventRepository.save(entity));
            });
    }

    @Transactional
    public boolean deleteEvent(Long eventId) {
        log.info("Deleting event with ID: {}", eventId);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        Optional<EventEntity> entityOpt = eventRepository.findById(eventId);
        if (entityOpt.isPresent() && currentUsername.equals(entityOpt.get().getUserName())) {
            eventRepository.deleteById(eventId);
            return true;
        }
        return false;
    }

    @Transactional(readOnly = true)
    public Page<Event> listEventsPaginated(Long showId, Long venueId, OffsetDateTime dateFrom, OffsetDateTime dateTo, String search, Pageable pageable) {
        log.info("Listing events (paginated) with filters - showId: {}, venueId: {}, dateFrom: {}, dateTo: {}, search: {}, pageable: {}", showId, venueId, dateFrom, dateTo, search, pageable);
        String currentUsername = keycloakUserService.getCurrentUsername()
            .orElseThrow(() -> new IllegalStateException("User not authenticated"));
        LocalDateTime localDateFrom = dateFrom != null ? dateFrom.toLocalDateTime() : null;
        LocalDateTime localDateTo = dateTo != null ? dateTo.toLocalDateTime() : null;
        Page<EventEntity> page = eventRepository.findByFiltersPaginated(showId, venueId, localDateFrom, localDateTo, search, pageable);
        List<Event> filtered = page.getContent().stream()
            .filter(e -> currentUsername.equals(e.getUserName()))
            .map(this::toDto)
            .toList();
        return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
    }

    // PARTICIPANT SERVICE METHODS
    @Transactional(readOnly = true)
    public List<Participant> listParticipantsByEvent(Long eventId) {
        log.info("Fetching participants for event {}", eventId);
        List<ParticipantEntity> entities = participantRepository.findByEventId(eventId);
        return entities.stream().map(this::toParticipantDto).toList();
    }

    @Transactional
    public Optional<Participant> addParticipant(Long eventId, ParticipantInput input) {
        log.info("Adding participant to event {}: {}", eventId, input.getName());
        int children = input.getChildrenTicketCount() != null ? input.getChildrenTicketCount() : 0;
        int guardian = input.getGuardianTicketCount() != null ? input.getGuardianTicketCount() : 0;

        if (children + guardian < 1) {
            log.warn("Invalid number of tickets: children={}, guardian={}", children, guardian);
            return Optional.empty();
        }

        ParticipantEntity entity = new ParticipantEntity();
        entity.setEventId(eventId);
        entity.setName(input.getName());
        entity.setAddress(input.getAddress());
        entity.setSeatColor(input.getSeatColor());
        entity.setChildrenTicketCount(children);
        entity.setGuardianTicketCount(guardian);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        ParticipantEntity saved = participantRepository.save(entity);
        return Optional.of(toParticipantDto(saved));
    }

    @Transactional(readOnly = true)
    public Optional<Participant> getParticipant(Long eventId, Long participantId) {
        log.info("Fetching participant {} for event {}", participantId, eventId);
        return participantRepository.findByParticipantIdAndEventId(participantId, eventId)
                .map(this::toParticipantDto);
    }

    @Transactional
    public Optional<Participant> updateParticipant(Long eventId, Long participantId, ParticipantInput input) {
        log.info("Updating participant {} for event {}", participantId, eventId);
        return participantRepository.findByParticipantIdAndEventId(participantId, eventId).map(entity -> {
            if (input.getName() != null) entity.setName(input.getName());
            if (input.getAddress() != null) entity.setAddress(input.getAddress());
            if (input.getSeatColor() != null) entity.setSeatColor(input.getSeatColor());
            
            if (input.getChildrenTicketCount() != null) entity.setChildrenTicketCount(input.getChildrenTicketCount());
            if (input.getGuardianTicketCount() != null) entity.setGuardianTicketCount(input.getGuardianTicketCount());
            
            if (entity.getChildrenTicketCount() + entity.getGuardianTicketCount() < 1) {
                 throw new IllegalArgumentException("Total tickets must be at least 1");
            }

            entity.setUpdatedAt(LocalDateTime.now());
            ParticipantEntity saved = participantRepository.save(entity);
            return toParticipantDto(saved);
        });
    }

    @Transactional
    public boolean deleteParticipant(Long eventId, Long participantId) {
        log.info("Deleting participant {} from event {}", participantId, eventId);
        if (participantRepository.existsByParticipantIdAndEventId(participantId, eventId)) {
            participantRepository.deleteByParticipantIdAndEventId(participantId, eventId);
            return true;
        }
        return false;
    }

    private Event toDto(EventEntity entity) {
        Event dto = new Event();
        dto.setEventId(entity.getEventId());
        dto.setShowId(entity.getShowId());
        dto.setVenueId(entity.getVenueId());
        dto.setDateTime(entity.getDateTime().atOffset(ZoneOffset.UTC));
        dto.setTicketDescription(entity.getTicketDescription());
        // Set show and venue names from the loaded entities
        if (entity.getShow() != null) {
            dto.setShowName(entity.getShow().getName());
        }
        if (entity.getVenue() != null) {
            dto.setVenueName(entity.getVenue().getName());
            dto.setCity(entity.getVenue().getCity());
            dto.setAddress(entity.getVenue().getAddress());
            dto.setCountry(entity.getVenue().getCountry());
            // Set venueNumberOfSeats using DB function
            if (entity.getVenue().getVenueId() != null) {
                Integer seatCount = venueRepository.getVenueSeatCount(entity.getVenue().getVenueId());
                int totalSeats = seatCount != null ? seatCount : 0;
                int blocked = entity.getBlockedSeats() != null ? entity.getBlockedSeats() : 0;
                dto.setVenueNumberOfSeats(totalSeats - blocked);
            } else {
                dto.setVenueNumberOfSeats(0);
            }
        }
        // Set numberOfTickets using DB function
        dto.setNumberOfTickets(entity.getNumberOfTickets());
        dto.setBlockedSeats(entity.getBlockedSeats());

    // Set hasAllocationErrors using DB-side computed column (Formula)
    Boolean hasErrBool = entity.getHasAllocationErrors();
    dto.setHasAllocationErrors(hasErrBool != null ? hasErrBool : false);
        return dto;
    }

    private EventEntity fromInput(EventInput input) {
        EventEntity entity = new EventEntity();
        updateEventEntityFromInput(entity, input);
        return entity;
    }

    private void updateEventEntityFromInput(EventEntity entity, EventInput input) {
        entity.setShowId(input.getShowId());
        entity.setVenueId(input.getVenueId());
        entity.setDateTime(input.getDateTime().toLocalDateTime());
        entity.setTicketDescription(input.getTicketDescription());
    }
    
    private dev.knightcore.proeventiq.api.model.Show convertShowEntityToDto(dev.knightcore.proeventiq.entity.ShowEntity entity) {
        dev.knightcore.proeventiq.api.model.Show dto = new dev.knightcore.proeventiq.api.model.Show();
        dto.setShowId(entity.getShowId());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        dto.setAgeFrom(entity.getAgeFrom());
        dto.setAgeTo(entity.getAgeTo());
        dto.setThumbnailContentType(entity.getThumbnailContentType());
        
        if (entity.getThumbnail() != null) {
            dto.setThumbnail(entity.getThumbnail());
        }
        
        return dto;
    }
    
    private dev.knightcore.proeventiq.api.model.Venue convertVenueEntityToDto(dev.knightcore.proeventiq.entity.VenueEntity entity) {
        dev.knightcore.proeventiq.api.model.Venue dto = new dev.knightcore.proeventiq.api.model.Venue();
        dto.setVenueId(entity.getVenueId());
        dto.setName(entity.getName());
        dto.setCountry(entity.getCountry());
        dto.setCity(entity.getCity());
        dto.setAddress(entity.getAddress());
        dto.setDescription(entity.getDescription());
        dto.setThumbnailContentType(entity.getThumbnailContentType());
        
        if (entity.getThumbnail() != null) {
            dto.setThumbnail(entity.getThumbnail());
        }
        
        return dto;
    }

    private Participant toParticipantDto(ParticipantEntity entity) {
        Participant dto = new Participant();
        dto.setParticipantId(entity.getParticipantId());
        dto.setEventId(entity.getEventId());
        dto.setName(entity.getName());
        dto.setChildrenTicketCount(entity.getChildrenTicketCount());
        dto.setGuardianTicketCount(entity.getGuardianTicketCount());
        dto.setAllTicketCount(entity.getAllTicketCount() != null ? entity.getAllTicketCount() : entity.getChildrenTicketCount() + entity.getGuardianTicketCount());
        dto.setAddress(entity.getAddress());
        dto.setSeatColor(entity.getSeatColor());
        return dto;
    }
}
