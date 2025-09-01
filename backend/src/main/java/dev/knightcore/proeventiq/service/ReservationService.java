package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Reservation;
import dev.knightcore.proeventiq.api.model.ReservationInput;
import dev.knightcore.proeventiq.entity.ParticipantEntity;
import dev.knightcore.proeventiq.entity.ReservationEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.ParticipantRepository;
import dev.knightcore.proeventiq.repository.ReservationRepository;
import dev.knightcore.proeventiq.repository.SeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

import java.util.List;
import java.util.Optional;

@Service
public class ReservationService {
    
    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);
    
    private final ReservationRepository reservationRepository;
    private final EventRepository eventRepository;
    private final ParticipantRepository participantRepository;
    private final SeatRepository seatRepository;
    private final EntityManager entityManager;
    
    public ReservationService(ReservationRepository reservationRepository,
                             EventRepository eventRepository,
                             ParticipantRepository participantRepository,
                             SeatRepository seatRepository,
                             EntityManager entityManager) {
        this.reservationRepository = reservationRepository;
        this.eventRepository = eventRepository;
        this.participantRepository = participantRepository;
        this.seatRepository = seatRepository;
        this.entityManager = entityManager;
    }
    
    @Transactional(readOnly = true)
    public List<Reservation> getReservationsByEvent(Long eventId) {
        log.debug("Getting reservations for event ID: {}", eventId);
        
        // Verify event exists
        if (!eventRepository.existsById(eventId)) {
            log.warn("Event with ID {} not found", eventId);
            throw new IllegalArgumentException("Event not found");
        }
        
        List<ReservationEntity> entities = reservationRepository.findByEventId(eventId);
        return entities.stream()
                .map(this::toDto)
                .toList();
    }
    
    @Transactional
    public List<Reservation> updateReservation(Long eventId, List<ReservationInput> inputs) {
        log.debug("Updating reservations for event ID: {} with {} inputs", eventId, inputs.size());
        
        // Validate inputs list
        if (inputs.isEmpty()) {
            throw new IllegalArgumentException("Reservation inputs list cannot be empty");
        }
        
        // Verify event exists
        if (!eventRepository.existsById(eventId)) {
            log.warn("Event with ID {} not found", eventId);
            throw new IllegalArgumentException("Event not found");
        }
        
        // Validate all inputs first
        validateAllInputs(eventId, inputs);
        
        // Group operations
        List<ReservationInput> toInsert = new ArrayList<>();
        List<ReservationInput> toDelete = new ArrayList<>();
        List<ReservationInput> toUpdate = new ArrayList<>();
        
        for (ReservationInput input : inputs) {
            boolean hasParticipant = input.getParticipantId() != null;
            boolean hasOldParticipant = input.getOldParticipantId() != null;
            
            if (hasParticipant && !hasOldParticipant) {
                toInsert.add(input);
            } else if (!hasParticipant && hasOldParticipant) {
                toDelete.add(input);
            } else if (hasParticipant && hasOldParticipant) {
                toUpdate.add(input);
            } else {
                throw new IllegalArgumentException("Invalid reservation input: both participantId and oldParticipantId are null");
            }
        }
        
        // Perform batch operations
        if (!toInsert.isEmpty()) {
            batchInsertReservations(eventId, toInsert);
            log.debug("Batch inserted {} reservations", toInsert.size());
        }

        if (!toDelete.isEmpty()) {
            batchDeleteReservations(eventId, toDelete);
            log.debug("Batch deleted {} reservations", toDelete.size());
        }

        if (!toUpdate.isEmpty()) {
            batchUpdateReservations(eventId, toUpdate);
            log.debug("Batch updated {} reservations", toUpdate.size());
        }
        
    log.debug("Successfully processed {} reservations for event ID: {}", inputs.size(), eventId);

    // Return the full, current list of reservations for the event so callers always
    // receive the authoritative state after the update operations.
    List<ReservationEntity> allEntities = reservationRepository.findByEventId(eventId);
    return allEntities.stream().map(this::toDto).toList();
    }
    
    private void validateAllInputs(Long eventId, List<ReservationInput> inputs) {
        for (ReservationInput input : inputs) {
            validateParticipant(eventId, input.getParticipantId(), "Participant");
            validateParticipant(eventId, input.getOldParticipantId(), "Old participant");
            validateSeat(input.getSeatId());
        }
    }
    
    private void validateParticipant(Long eventId, Long participantId, String participantType) {
        if (participantId == null) {
            return;
        }
        
        Optional<ParticipantEntity> participantOpt = participantRepository.findById(participantId);
        if (participantOpt.isEmpty() || !participantOpt.get().getEventId().equals(eventId)) {
            throw new IllegalArgumentException(participantType + " not found or doesn't belong to this event: " + participantId);
        }
    }
    
    private void validateSeat(Long seatId) {
        if (seatId != null && !seatRepository.existsById(seatId)) {
            throw new IllegalArgumentException("Seat not found: " + seatId);
        }
    }
    
    private void batchInsertReservations(Long eventId, List<ReservationInput> inputs) {
        if (inputs.isEmpty()) return;

        // Build a derived table of values: SELECT p AS participant_id, s AS seat_id, e AS event_id UNION ALL ...
        StringBuilder derived = new StringBuilder();
        for (int i = 0; i < inputs.size(); i++) {
            ReservationInput in = inputs.get(i);
            if (i == 0) {
                derived.append("SELECT ")
                        .append(in.getParticipantId()).append(" AS participant_id, ")
                        .append(in.getSeatId()).append(" AS seat_id, ")
                        .append(eventId).append(" AS event_id");
            } else {
                derived.append(" UNION ALL SELECT ")
                        .append(in.getParticipantId()).append(", ")
                        .append(in.getSeatId()).append(", ")
                        .append(eventId);
            }
        }

        // Insert only those rows whose seat is not already reserved for this event.
        String sql = "INSERT INTO seat_reservation (participant_id, seat_id, event_id) " +
                "SELECT t.participant_id, t.seat_id, t.event_id FROM (" + derived.toString() + ") AS t " +
                "WHERE NOT EXISTS (SELECT 1 FROM seat_reservation sr WHERE sr.event_id = " + eventId + " AND sr.seat_id = t.seat_id)";

        int inserted = entityManager.createNativeQuery(sql).executeUpdate();
        if (inserted != inputs.size()) {
            throw new IllegalArgumentException("One or more seats are already reserved");
        }
    }
    
    private void batchDeleteReservations(Long eventId, List<ReservationInput> inputs) {
        if (inputs.isEmpty()) return;

        // Build composite pairs (reservation_id, participant_id) and delete them in a single statement
        List<String> idPairs = new ArrayList<>();
        for (ReservationInput input : inputs) {
            // Assumption: input.getId() and input.getOldParticipantId() are non-null
            idPairs.add("(" + input.getId() + ", " + input.getOldParticipantId() + ")");
        }

        String sql = "DELETE FROM seat_reservation WHERE event_id = " + eventId + " " +
                "AND (reservation_id, participant_id) IN (" + String.join(", ", idPairs) + ")";

        int deleted = entityManager.createNativeQuery(sql).executeUpdate();

        if (deleted < idPairs.size()) {
            throw new IllegalArgumentException("One or more reservation IDs not found or do not match the specified participant/event");
        }
    }
    
    private void batchUpdateReservations(Long eventId, List<ReservationInput> inputs) {
        if (inputs.isEmpty()) return;

        // Only ID-based updates are supported. Build CASE expressions keyed by reservation_id.
        List<Long> ids = new ArrayList<>();
        java.util.Map<Long, Long> idToNewParticipant = new java.util.HashMap<>();
        java.util.Map<Long, Long> idToNewSeat = new java.util.HashMap<>();

        for (ReservationInput input : inputs) {
            if (input.getId() == null) {
                throw new IllegalArgumentException("All reservation updates must include an id");
            }
            ids.add(input.getId());
            idToNewParticipant.put(input.getId(), input.getParticipantId());
            idToNewSeat.put(input.getId(), input.getSeatId());
        }

        StringBuilder sql = new StringBuilder();
        sql.append("UPDATE seat_reservation sr SET ");

        // participant_id CASE
        sql.append("sr.participant_id = CASE ");
        for (Long id : ids) {
            sql.append(" WHEN sr.reservation_id = ").append(id)
                    .append(" THEN ").append(idToNewParticipant.get(id));
        }
        sql.append(" ELSE sr.participant_id END, ");

        // seat_id CASE
        sql.append("sr.seat_id = CASE ");
        for (Long id : ids) {
            sql.append(" WHEN sr.reservation_id = ").append(id)
                    .append(" THEN ").append(idToNewSeat.get(id));
        }
        sql.append(" ELSE sr.seat_id END");

        sql.append(" WHERE sr.event_id = ").append(eventId)
           .append(" AND sr.reservation_id IN (")
           .append(ids.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(",")))
           .append(")");

        int updated = entityManager.createNativeQuery(sql.toString()).executeUpdate();

        if (updated < ids.size()) {
            throw new IllegalArgumentException("One or more reservation IDs were not found for update");
        }
    }
    
    @Transactional(readOnly = true)
    public boolean isEventExists(Long eventId) {
        return eventRepository.existsById(eventId);
    }
    
    private Reservation toDto(ReservationEntity entity) {
        Reservation dto = new Reservation();
        dto.setId(entity.getReservationId());
        dto.setParticipantId(entity.getParticipantId());
        dto.setSeatId(entity.getSeatId());
        dto.setEventId(entity.getEventId());
        return dto;
    }
}
