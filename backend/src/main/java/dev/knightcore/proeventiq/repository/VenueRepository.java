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
    List<VenueEntity> findByUserName(String userName);
    Page<VenueEntity> findByUserNameAndNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCaseOrderByNameAsc(String userName, String name, String country, String city, Pageable pageable);
    Page<VenueEntity> findByUserNameAndNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByNameAsc(String userName, String name, String city, String country, Pageable pageable);
    List<VenueEntity> findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCaseOrderByNameAsc(String name, String country, String city);
    Page<VenueEntity> findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCaseOrderByNameAsc(String name, String country, String city, Pageable pageable); // Sorting by name can be passed via Pageable
    Page<VenueEntity> findByNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrCountryContainingIgnoreCaseOrderByNameAsc(String name, String city, String country, Pageable pageable); // Sorting by name can be passed via Pageable

    // Only fetch the sectors - we'll handle the rest in the service
    @EntityGraph(attributePaths = {"sectors"})
    java.util.Optional<VenueEntity> findWithSectorsByVenueId(Long venueId);

    @Query(value = "SELECT get_venue_seat_count(:venueId)", nativeQuery = true)
    Integer getVenueSeatCount(@Param("venueId") Long venueId);
}
