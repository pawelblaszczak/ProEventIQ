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

    @Query(value = """
        SELECT v.* FROM venue v
        WHERE v.user_name = :userName
          AND LOWER(v.name) LIKE LOWER(CONCAT('%', :name, '%'))
          AND LOWER(v.country) LIKE LOWER(CONCAT('%', :country, '%'))
          AND LOWER(v.city) LIKE LOWER(CONCAT('%', :city, '%'))
          AND (:search = '' OR LOWER(v.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.city) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.country) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:minSeats = 0 OR get_venue_seat_count(v.venue_id) >= :minSeats)
        ORDER BY v.name ASC
        """,
        countQuery = """
        SELECT COUNT(*) FROM venue v
        WHERE v.user_name = :userName
          AND LOWER(v.name) LIKE LOWER(CONCAT('%', :name, '%'))
          AND LOWER(v.country) LIKE LOWER(CONCAT('%', :country, '%'))
          AND LOWER(v.city) LIKE LOWER(CONCAT('%', :city, '%'))
          AND (:search = '' OR LOWER(v.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.city) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.country) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:minSeats = 0 OR get_venue_seat_count(v.venue_id) >= :minSeats)
        """,
        nativeQuery = true)
    Page<VenueEntity> searchVenues(@Param("userName") String userName, @Param("name") String name,
            @Param("country") String country, @Param("city") String city, @Param("search") String search,
            @Param("minSeats") int minSeats, Pageable pageable);

    // Only fetch the sectors - we'll handle the rest in the service
    @EntityGraph(attributePaths = {"sectors"})
    java.util.Optional<VenueEntity> findWithSectorsByVenueId(Long venueId);

    @Query(value = "SELECT get_venue_seat_count(:venueId)", nativeQuery = true)
    Integer getVenueSeatCount(@Param("venueId") Long venueId);
}
