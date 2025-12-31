package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.SeatBlock;
import dev.knightcore.proeventiq.api.model.SeatBlockInput;
import dev.knightcore.proeventiq.entity.SeatBlockEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.SeatBlockRepository;
import dev.knightcore.proeventiq.repository.SeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class SeatBlockService {
    
    private static final Logger log = LoggerFactory.getLogger(SeatBlockService.class);
    
    private final SeatBlockRepository seatBlockRepository;
    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    
    public SeatBlockService(SeatBlockRepository seatBlockRepository,
                            EventRepository eventRepository,
                            SeatRepository seatRepository) {
        this.seatBlockRepository = seatBlockRepository;
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
    }
    
    @Transactional(readOnly = true)
    public List<SeatBlock> getSeatBlocksByEvent(Long eventId) {
        log.debug("Getting seat blocks for event ID: {}", eventId);
        
        if (!eventRepository.existsById(eventId)) {
            log.warn("Event with ID {} not found", eventId);
            throw new IllegalArgumentException("Event not found");
        }
        
        List<SeatBlockEntity> entities = seatBlockRepository.findByEventId(eventId);
        return entities.stream()
                .map(this::toDto)
                .toList();
    }
    
    @Transactional
    public List<SeatBlock> updateSeatBlock(Long eventId, List<SeatBlockInput> inputs) {
        log.debug("Updating seat blocks for event ID: {} with {} inputs", eventId, inputs.size());
        
        if (inputs.isEmpty()) {
            throw new IllegalArgumentException("Seat block inputs list cannot be empty");
        }
        
        if (!eventRepository.existsById(eventId)) {
            log.warn("Event with ID {} not found", eventId);
            throw new IllegalArgumentException("Event not found");
        }
        
        List<SeatBlockInput> toInsert = new ArrayList<>();
        List<SeatBlockInput> toDelete = new ArrayList<>();
        
        for (SeatBlockInput input : inputs) {
            Long seatId = input.getSeatId();
            if (seatBlockRepository.existsByEventIdAndSeatId(eventId, seatId)) {
                toDelete.add(input);
            } else {
                toInsert.add(input);
            }
        }
        
        if (!toInsert.isEmpty()) {
            processInsertions(eventId, toInsert);
        }
        
        if (!toDelete.isEmpty()) {
            processDeletions(eventId, toDelete);
        }
        
        return getSeatBlocksByEvent(eventId);
    }
    
    private void processInsertions(Long eventId, List<SeatBlockInput> inputs) {
        for (SeatBlockInput input : inputs) {
            Long seatId = input.getSeatId();
            if (!seatRepository.existsById(seatId)) {
                log.warn("Seat with ID {} not found, skipping block creation", seatId);
                continue;
            }
            
            if (seatBlockRepository.existsByEventIdAndSeatId(eventId, seatId)) {
                log.debug("Seat {} is already blocked for event {}, skipping", seatId, eventId);
                continue;
            }
            
            SeatBlockEntity entity = new SeatBlockEntity(eventId, seatId);
            seatBlockRepository.save(entity);
        }
    }
    
    private void processDeletions(Long eventId, List<SeatBlockInput> inputs) {
        for (SeatBlockInput input : inputs) {
            Long seatId = input.getSeatId();
            seatBlockRepository.deleteByEventIdAndSeatId(eventId, seatId);
        }
    }
    
    private SeatBlock toDto(SeatBlockEntity entity) {
        SeatBlock dto = new SeatBlock();
        dto.setId(entity.getSeatBlockId());
        dto.setEventId(entity.getEventId());
        dto.setSeatId(entity.getSeatId());
        return dto;
    }

    public boolean isEventExists(Long eventId) {
        return eventRepository.existsById(eventId);
    }
}
