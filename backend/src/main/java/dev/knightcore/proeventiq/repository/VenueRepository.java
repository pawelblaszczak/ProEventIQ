package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.VenueEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VenueRepository extends JpaRepository<VenueEntity, Long> {
    List<VenueEntity> findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCase(String name, String country, String city);
    Page<VenueEntity> findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCase(String name, String country, String city, Pageable pageable);
    Page<VenueEntity> findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCase(String name, String city, String country, Pageable pageable);

    // Only fetch the sectors - we'll handle the rest in the service
    @EntityGraph(attributePaths = {"sectors"})
    java.util.Optional<VenueEntity> findWithSectorsByVenueId(Long venueId);

    @Query(value = "SELECT get_seat_count_for_venue(:venueId)", nativeQuery = true)
    Integer getSeatCountForVenue(@Param("venueId") Long venueId);
}
