package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.SectorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectorRepository extends JpaRepository<SectorEntity, Long> {
    List<SectorEntity> findByVenue_VenueId(Long venueId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT get_sector_seat_count(:sectorId)", nativeQuery = true)
    int getSeatCountForSector(@org.springframework.data.repository.query.Param("sectorId") Long sectorId);
}
