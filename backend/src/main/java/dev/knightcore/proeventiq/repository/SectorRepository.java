package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.SectorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectorRepository extends JpaRepository<SectorEntity, Long> {
    List<SectorEntity> findByVenue_VenueId(Long venueId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT get_sector_seat_count(:sectorId)", nativeQuery = true)
    int getSeatCountForSector(@org.springframework.data.repository.query.Param("sectorId") Long sectorId);

    // Invoke stored procedure to copy seats from source sector to destination sector
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "CALL copy_sector_seats(:sourceId, :destId)", nativeQuery = true)
    void copySectorSeats(@org.springframework.data.repository.query.Param("sourceId") Long sourceSectorId,
                         @org.springframework.data.repository.query.Param("destId") Long destinationSectorId);
}
