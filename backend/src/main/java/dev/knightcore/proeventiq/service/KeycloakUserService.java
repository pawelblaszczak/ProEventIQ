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

    // Constants for JWT claims
    private static final String CLAIM_PREFERRED_USERNAME = "preferred_username";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_NAME = "name";
    private static final String CLAIM_GIVEN_NAME = "given_name";
    private static final String CLAIM_FAMILY_NAME = "family_name";
    private static final String CLAIM_REALM_ACCESS = "realm_access";
    private static final String CLAIM_RESOURCE_ACCESS = "resource_access";
    private static final String ROLES_KEY = "roles";

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
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString(CLAIM_PREFERRED_USERNAME));
    }

    /**
     * Get the current user's email.
     */
    public Optional<String> getCurrentUserEmail() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString(CLAIM_EMAIL));
    }

    /**
     * Get the current user's full name.
     */
    public Optional<String> getCurrentUserFullName() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString(CLAIM_NAME));
    }

    /**
     * Get the current user's first name.
     */
    public Optional<String> getCurrentUserFirstName() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString(CLAIM_GIVEN_NAME));
    }

    /**
     * Get the current user's last name.
     */
    public Optional<String> getCurrentUserLastName() {
        return getCurrentUserJwt().map(jwt -> jwt.getClaimAsString(CLAIM_FAMILY_NAME));
    }

    /**
     * Get the current user's realm roles.
     */
    @SuppressWarnings("unchecked")
    public List<String> getCurrentUserRealmRoles() {
        return getCurrentUserJwt()
            .map(jwt -> {
                Map<String, Object> realmAccess = jwt.getClaimAsMap(CLAIM_REALM_ACCESS);
                if (realmAccess != null) {
                    return (List<String>) realmAccess.get(ROLES_KEY);
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
                Map<String, Object> resourceAccess = jwt.getClaimAsMap(CLAIM_RESOURCE_ACCESS);
                if (resourceAccess != null) {
                    Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get(clientId);
                    if (clientAccess != null) {
                        return (List<String>) clientAccess.get(ROLES_KEY);
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

    /**
     * Check if a user exists in Keycloak by validating the user ID.
     * This method checks if the provided userId matches the current authenticated user.
     * For more advanced user validation, you would need to integrate with Keycloak Admin API.
     */
    public boolean isValidKeycloakUser(String userId) {
        return getCurrentUserId()
            .map(currentUserId -> currentUserId.equals(userId))
            .orElse(false);
    }

    /**
     * Get user information for a specific user ID.
     * This method only works if the userId matches the current authenticated user.
     * For accessing other users' information, you would need Keycloak Admin API integration.
     */
    public Optional<Map<String, Object>> getUserInfo(String userId) {
        if (!isValidKeycloakUser(userId)) {
            return Optional.empty();
        }

        return getCurrentUserJwt().map(jwt -> Map.of(
            "id", jwt.getSubject(),
            CLAIM_EMAIL, jwt.getClaimAsString(CLAIM_EMAIL)
        ));
    }
}
