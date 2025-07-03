package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.EventEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, Long> {
    
    @Query("SELECT e FROM EventEntity e " +
           "LEFT JOIN FETCH e.show " +
           "LEFT JOIN FETCH e.venue " +
           "WHERE (:showId IS NULL OR e.showId = :showId) AND " +
           "(:venueId IS NULL OR e.venueId = :venueId) AND " +
           "(:dateFrom IS NULL OR e.dateTime >= :dateFrom) AND " +
           "(:dateTo IS NULL OR e.dateTime <= :dateTo) " +
           "ORDER BY e.dateTime ASC")
    List<EventEntity> findByFilters(@Param("showId") Long showId,
                                    @Param("venueId") Long venueId,
                                    @Param("dateFrom") LocalDateTime dateFrom,
                                    @Param("dateTo") LocalDateTime dateTo);
    
    @Query("SELECT e FROM EventEntity e " +
           "LEFT JOIN FETCH e.show " +
           "LEFT JOIN FETCH e.venue " +
           "WHERE e.eventId = :eventId")
    EventEntity findByIdWithDetails(@Param("eventId") Long eventId);
    
    @Query("SELECT e FROM EventEntity e WHERE e.showId = :showId ORDER BY e.dateTime ASC")
    List<EventEntity> findByShowId(@Param("showId") Long showId);
    
    @Query("SELECT e FROM EventEntity e WHERE e.venueId = :venueId ORDER BY e.dateTime ASC")
    List<EventEntity> findByVenueId(@Param("venueId") Long venueId);
    
    @Query("SELECT e FROM EventEntity e " +
           "LEFT JOIN FETCH e.show s " +
           "LEFT JOIN FETCH e.venue v " +
           "WHERE (:showId IS NULL OR e.showId = :showId) AND " +
           "(:venueId IS NULL OR e.venueId = :venueId) AND " +
           "(:dateFrom IS NULL OR e.dateTime >= :dateFrom) AND " +
           "(:dateTo IS NULL OR e.dateTime <= :dateTo) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "CAST(e.eventId AS string) LIKE CONCAT('%', :search, '%')) " +
           "ORDER BY e.dateTime ASC")
    Page<EventEntity> findByFiltersPaginated(@Param("showId") Long showId,
                                             @Param("venueId") Long venueId,
                                             @Param("dateFrom") LocalDateTime dateFrom,
                                             @Param("dateTo") LocalDateTime dateTo,
                                             @Param("search") String search,
                                             Pageable pageable);
}
