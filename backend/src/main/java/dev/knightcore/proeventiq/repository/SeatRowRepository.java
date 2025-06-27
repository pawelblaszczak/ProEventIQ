package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.SeatRowEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRowRepository extends JpaRepository<SeatRowEntity, Long> {
    List<SeatRowEntity> findBySector_SectorId(Long sectorId);
}
