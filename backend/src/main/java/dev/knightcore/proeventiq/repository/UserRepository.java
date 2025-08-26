package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, String> {
    
    /**
     * Find user by email address
     * @param email the email address
     * @return Optional containing the user if found
     */
    Optional<UserEntity> findByEmail(String email);
    
    /**
     * Check if a user exists with the given email
     * @param email the email address
     * @return true if user exists, false otherwise
     */
    boolean existsByEmail(String email);
    
    /**
     * Find users by name containing the given string (case-insensitive)
     * @param name the name to search for
     * @return list of users matching the search criteria
     */
    @Query("SELECT u FROM UserEntity u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    java.util.List<UserEntity> findByNameContainingIgnoreCase(@Param("name") String name);
}
