package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.SectorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectorRepository extends JpaRepository<SectorEntity, Long> {
    List<SectorEntity> findByVenue_VenueId(Long venueId);
}
