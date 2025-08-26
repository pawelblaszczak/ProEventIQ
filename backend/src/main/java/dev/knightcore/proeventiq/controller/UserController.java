package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.UsersApi;
import dev.knightcore.proeventiq.api.model.UserDetailsDto;
import dev.knightcore.proeventiq.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@Validated
public class UserController implements UsersApi {
    
    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    /**
     * GET /users : List all users
     * @return List of users
     */
    @Override
    public ResponseEntity<List<UserDetailsDto>> listUsers() {
        log.debug("REST request to get all users");
        try {
            List<UserDetailsDto> users = userService.getAllUsers();
            log.debug("Found {} users", users.size());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error retrieving users", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * GET /users/{userId} : Get user by ID
     * @param userId the user ID
     * @return User details or 404 if not found
     */
    @Override
    public ResponseEntity<UserDetailsDto> getUserById(String userId) {
        log.debug("REST request to get user by ID: {}", userId);
        try {
            Optional<UserDetailsDto> user = userService.getUserById(userId);
            if (user.isPresent()) {
                log.debug("Found user: {}", userId);
                return ResponseEntity.ok(user.get());
            } else {
                log.debug("User not found: {}", userId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error retrieving user with ID: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * PUT /users/{userId} : Update user by ID
     * @param userId the user ID
     * @param userDetailsDto the updated user data
     * @return Updated user details or 404 if not found
     */
    @Override
    public ResponseEntity<UserDetailsDto> updateUser(String userId, @Valid UserDetailsDto userDetailsDto) {
        log.debug("REST request to update user with ID: {}", userId);
        try {
            // Validate that the user exists
            if (!userService.existsById(userId)) {
                log.debug("User not found for update: {}", userId);
                return ResponseEntity.notFound().build();
            }
            
            Optional<UserDetailsDto> updatedUser = userService.updateUser(userId, userDetailsDto);
            if (updatedUser.isPresent()) {
                log.debug("User updated successfully: {}", userId);
                return ResponseEntity.ok(updatedUser.get());
            } else {
                log.debug("User not found during update: {}", userId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error updating user with ID: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
