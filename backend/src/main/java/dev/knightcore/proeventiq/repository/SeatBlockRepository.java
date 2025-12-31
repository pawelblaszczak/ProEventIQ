package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.SeatBlockEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatBlockRepository extends JpaRepository<SeatBlockEntity, Long> {
    
    List<SeatBlockEntity> findByEventId(Long eventId);
    
    Optional<SeatBlockEntity> findByEventIdAndSeatId(Long eventId, Long seatId);
    
    boolean existsByEventIdAndSeatId(Long eventId, Long seatId);
    
    void deleteByEventIdAndSeatId(Long eventId, Long seatId);
}
