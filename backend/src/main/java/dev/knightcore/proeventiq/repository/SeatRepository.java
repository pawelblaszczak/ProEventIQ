package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.SeatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<SeatEntity, Long> {
    List<SeatEntity> findBySeatRow_SeatRowId(Long seatRowId);
}
