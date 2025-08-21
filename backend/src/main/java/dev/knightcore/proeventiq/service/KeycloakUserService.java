package dev.knightcore.proeventiq.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for extracting user information from Keycloak JWT tokens.
 */
@Service
public class KeycloakUserService {

    /**
     * Get the current authenticated user's JWT token.
     */
    public Optional<Jwt> getCurrentUserJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return Optional.of(jwt);
        }
        return Optional.empty();
    }

    /**
     * Get the current user's subject (user ID).
     */
    public Optional<String> getCurrentUserId() {
        return getCurrentUserJwt().map(Jwt::getSubject);
    }

    /**
     * Get the current user's preferred username.
     */
    public Optional<String> getCurrentUsername() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString("preferred_username"));
    }

    /**
     * Get the current user's email.
     */
    public Optional<String> getCurrentUserEmail() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString("email"));
    }

    /**
     * Get the current user's full name.
     */
    public Optional<String> getCurrentUserFullName() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString("name"));
    }

    /**
     * Get the current user's first name.
     */
    public Optional<String> getCurrentUserFirstName() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString("given_name"));
    }

    /**
     * Get the current user's last name.
     */
    public Optional<String> getCurrentUserLastName() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString("family_name"));
    }

    /**
     * Get the current user's realm roles.
     */
    @SuppressWarnings("unchecked")
    public List<String> getCurrentUserRealmRoles() {
        return getCurrentUserJwt()
            .map(jwt -> {
                Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
                if (realmAccess != null) {
                    return (List<String>) realmAccess.get("roles");
                }
                return List.<String>of();
            })
            .orElse(List.of());
    }

    /**
     * Check if the current user has a specific realm role.
     */
    public boolean hasRealmRole(String role) {
        return getCurrentUserRealmRoles().contains(role);
    }

    /**
     * Get the current user's resource roles for a specific client.
     */
    @SuppressWarnings("unchecked")
    public List<String> getCurrentUserResourceRoles(String clientId) {
        return getCurrentUserJwt()
            .map(jwt -> {
                Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
                if (resourceAccess != null) {
                    Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get(clientId);
                    if (clientAccess != null) {
                        return (List<String>) clientAccess.get("roles");
                    }
                }
                return List.<String>of();
            })
            .orElse(List.of());
    }

    /**
     * Check if the current user has a specific resource role for a client.
     */
    public boolean hasResourceRole(String clientId, String role) {
        return getCurrentUserResourceRoles(clientId).contains(role);
    }
}
