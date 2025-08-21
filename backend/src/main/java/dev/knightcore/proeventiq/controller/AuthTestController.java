package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.service.KeycloakUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for testing Keycloak integration and user information.
 */
@RestController
@RequestMapping("/auth")
public class AuthTestController {

    private final KeycloakUserService keycloakUserService;

    public AuthTestController(KeycloakUserService keycloakUserService) {
        this.keycloakUserService = keycloakUserService;
    }

    /**
     * Get current user information from JWT token.
     */
    @GetMapping("/user-info")
    public ResponseEntity<Map<String, Object>> getUserInfo() {
        Map<String, Object> userInfo = new HashMap<>();
        
        keycloakUserService.getCurrentUserId().ifPresent(id -> userInfo.put("userId", id));
        keycloakUserService.getCurrentUsername().ifPresent(username -> userInfo.put("username", username));
        keycloakUserService.getCurrentUserEmail().ifPresent(email -> userInfo.put("email", email));
        keycloakUserService.getCurrentUserFullName().ifPresent(name -> userInfo.put("fullName", name));
        keycloakUserService.getCurrentUserFirstName().ifPresent(firstName -> userInfo.put("firstName", firstName));
        keycloakUserService.getCurrentUserLastName().ifPresent(lastName -> userInfo.put("lastName", lastName));
        
        userInfo.put("realmRoles", keycloakUserService.getCurrentUserRealmRoles());
        userInfo.put("resourceRoles", keycloakUserService.getCurrentUserResourceRoles("proeventiq-api"));
        
        return ResponseEntity.ok(userInfo);
    }

    /**
     * Test endpoint that requires authentication.
     */
    @GetMapping("/test")
    public ResponseEntity<String> testAuth() {
        return ResponseEntity.ok("Authentication successful! User: " + 
            keycloakUserService.getCurrentUsername().orElse("Unknown"));
    }

    /**
     * Test endpoint that requires admin role.
     */
    @GetMapping("/admin-test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> testAdminAuth() {
        return ResponseEntity.ok("Admin authentication successful! User: " + 
            keycloakUserService.getCurrentUsername().orElse("Unknown"));
    }

    /**
     * Health check endpoint for authentication service.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> authHealth() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Authentication Service");
        health.put("keycloak", "configured");
        return ResponseEntity.ok(health);
    }
}
