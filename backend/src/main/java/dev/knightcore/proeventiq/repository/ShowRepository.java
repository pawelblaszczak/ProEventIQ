package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.ShowEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShowRepository extends JpaRepository<ShowEntity, Long> {
    
    @Query("SELECT s FROM ShowEntity s WHERE " +
           "(:name IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:ageFrom IS NULL OR s.ageFrom IS NULL OR s.ageFrom >= :ageFrom) AND " +
           "(:ageTo IS NULL OR s.ageTo IS NULL OR s.ageTo <= :ageTo)")
    List<ShowEntity> findByFilters(@Param("name") String name, 
                                   @Param("ageFrom") Integer ageFrom, 
                                   @Param("ageTo") Integer ageTo);

    @Query("SELECT s FROM ShowEntity s WHERE " +
           "(:name IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:ageFrom IS NULL OR s.ageFrom IS NULL OR s.ageFrom >= :ageFrom) AND " +
           "(:ageTo IS NULL OR s.ageTo IS NULL OR s.ageTo <= :ageTo) AND " +
           "(:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<ShowEntity> findByFiltersPaginated(@Param("name") String name,
                                            @Param("ageFrom") Integer ageFrom,
                                            @Param("ageTo") Integer ageTo,
                                            @Param("search") String search,
                                            Pageable pageable);
}
