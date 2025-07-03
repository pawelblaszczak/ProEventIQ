package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Event;
import dev.knightcore.proeventiq.api.model.EventInput;
import dev.knightcore.proeventiq.entity.EventEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.ShowRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Service
public class EventService {
    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    
    private final EventRepository eventRepository;
    private final ShowRepository showRepository;
    private final VenueRepository venueRepository;
    private final ShowService showService;
    private final VenueService venueService;

    public EventService(EventRepository eventRepository, 
                       ShowRepository showRepository,
                       VenueRepository venueRepository,
                       ShowService showService,
                       VenueService venueService) {
        this.eventRepository = eventRepository;
        this.showRepository = showRepository;
        this.venueRepository = venueRepository;
        this.showService = showService;
        this.venueService = venueService;
    }

    @Transactional(readOnly = true)
    public List<Event> listEvents(Long showId, Long venueId, OffsetDateTime dateFrom, OffsetDateTime dateTo) {
        log.info("Listing events with filters - showId: {}, venueId: {}, dateFrom: {}, dateTo: {}", 
                showId, venueId, dateFrom, dateTo);
        
        LocalDateTime localDateFrom = dateFrom != null ? dateFrom.toLocalDateTime() : null;
        LocalDateTime localDateTo = dateTo != null ? dateTo.toLocalDateTime() : null;
        
        List<EventEntity> entities = eventRepository.findByFilters(showId, venueId, localDateFrom, localDateTo);
        return entities.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Event> getEvent(Long eventId) {
        log.info("Fetching event with ID: {}", eventId);
        EventEntity entity = eventRepository.findByIdWithDetails(eventId);
        return entity != null ? Optional.of(toDto(entity)) : Optional.empty();
    }

    @Transactional
    public Optional<Event> createEvent(EventInput input) {
        log.info("Creating new event for show: {} at venue: {}", input.getShowId(), input.getVenueId());
        
        // Validate that show and venue exist
        Long showId = Long.parseLong(input.getShowId());
        Long venueId = Long.parseLong(input.getVenueId());
        
        if (!showRepository.existsById(showId)) {
            log.warn("Show with ID {} not found", showId);
            return Optional.empty();
        }
        
        if (!venueRepository.existsById(venueId)) {
            log.warn("Venue with ID {} not found", venueId);
            return Optional.empty();
        }
        
        EventEntity entity = fromInput(input);
        EventEntity saved = eventRepository.save(entity);
        return Optional.of(toDto(saved));
    }

    @Transactional
    public Optional<Event> updateEvent(Long eventId, EventInput input) {
        log.info("Updating event with ID: {}", eventId);
        
        return eventRepository.findById(eventId).map(entity -> {
            // Validate that show and venue exist
            Long showId = Long.parseLong(input.getShowId());
            Long venueId = Long.parseLong(input.getVenueId());
            
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
        if (eventRepository.existsById(eventId)) {
            eventRepository.deleteById(eventId);
            return true;
        }
        return false;
    }

    @Transactional(readOnly = true)
    public Page<Event> listEventsPaginated(Long showId, Long venueId, OffsetDateTime dateFrom, OffsetDateTime dateTo, Pageable pageable) {
        log.info("Listing events (paginated) with filters - showId: {}, venueId: {}, dateFrom: {}, dateTo: {}, pageable: {}", showId, venueId, dateFrom, dateTo, pageable);
        LocalDateTime localDateFrom = dateFrom != null ? dateFrom.toLocalDateTime() : null;
        LocalDateTime localDateTo = dateTo != null ? dateTo.toLocalDateTime() : null;
        Page<EventEntity> page = eventRepository.findByFiltersPaginated(showId, venueId, localDateFrom, localDateTo, pageable);
        return page.map(this::toDto);
    }

    private Event toDto(EventEntity entity) {
        Event dto = new Event();
        dto.setEventId(entity.getEventId().toString());
        dto.setShowId(entity.getShowId().toString());
        dto.setVenueId(entity.getVenueId().toString());
        dto.setDateTime(entity.getDateTime().atOffset(ZoneOffset.UTC));
        
        // Set show and venue names from the loaded entities
        if (entity.getShow() != null) {
            dto.setShowName(entity.getShow().getName());
        }
        
        if (entity.getVenue() != null) {
            dto.setVenueName(entity.getVenue().getName());
            dto.setCity(entity.getVenue().getCity());
            dto.setAddress(entity.getVenue().getAddress());
            dto.setCountry(entity.getVenue().getCountry());
        }
        
        return dto;
    }

    private EventEntity fromInput(EventInput input) {
        EventEntity entity = new EventEntity();
        updateEventEntityFromInput(entity, input);
        return entity;
    }

    private void updateEventEntityFromInput(EventEntity entity, EventInput input) {
        entity.setShowId(Long.parseLong(input.getShowId()));
        entity.setVenueId(Long.parseLong(input.getVenueId()));
        entity.setDateTime(input.getDateTime().toLocalDateTime());
    }
    
    private dev.knightcore.proeventiq.api.model.Show convertShowEntityToDto(dev.knightcore.proeventiq.entity.ShowEntity entity) {
        dev.knightcore.proeventiq.api.model.Show dto = new dev.knightcore.proeventiq.api.model.Show();
        dto.setShowId(entity.getShowId().toString());
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
        dto.setVenueId(entity.getVenueId().toString());
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
}
