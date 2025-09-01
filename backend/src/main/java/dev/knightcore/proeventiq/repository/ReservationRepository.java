package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.ReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<ReservationEntity, Long> {
    
    /**
     * Find all reservations for a specific event
     */
    List<ReservationEntity> findByEventId(Long eventId);
    
    /**
     * Find reservation by event ID and seat ID
     */
    Optional<ReservationEntity> findByEventIdAndSeatId(Long eventId, Long seatId);
    
    /**
     * Find reservation by event ID and participant ID
     */
    List<ReservationEntity> findByEventIdAndParticipantId(Long eventId, Long participantId);
    
    /**
     * Find all reservations for a specific participant
     */
    List<ReservationEntity> findByParticipantId(Long participantId);
    
    /**
     * Check if a seat is already reserved for an event
     */
    boolean existsByEventIdAndSeatId(Long eventId, Long seatId);
    
    /**
     * Count reservations for an event
     */
    @Query("SELECT COUNT(r) FROM ReservationEntity r WHERE r.eventId = :eventId")
    long countByEventId(@Param("eventId") Long eventId);
    
    /**
     * Delete reservation by event ID and participant ID
     */
    void deleteByEventIdAndParticipantId(Long eventId, Long participantId);
    
    /**
     * Delete reservations by event ID and participant IDs (batch delete)
     */
    void deleteByEventIdAndParticipantIdIn(Long eventId, List<Long> participantIds);
}
