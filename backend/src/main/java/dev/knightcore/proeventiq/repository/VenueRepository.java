package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.VenueEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VenueRepository extends JpaRepository<VenueEntity, Long> {
    List<VenueEntity> findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCase(String name, String country, String city);
    
    // Only fetch the sectors - we'll handle the rest in the service
    @EntityGraph(attributePaths = {"sectors"})
    java.util.Optional<VenueEntity> findWithSectorsByVenueId(Long venueId);
}
