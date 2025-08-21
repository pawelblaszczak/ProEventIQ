package dev.knightcore.proeventiq.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakConfig {

    private final KeycloakConfigProperties keycloakProperties;

    public KeycloakConfig(KeycloakConfigProperties keycloakProperties) {
        this.keycloakProperties = keycloakProperties;
    }

    /**
     * Keycloak admin client bean for management operations.
     * This allows the application to perform administrative tasks like:
     * - User management (create, update, delete users)
     * - Role management
     * - Realm configuration
     * 
     * Requires admin credentials to be set via environment variables:
     * - KEYCLOAK_ADMIN_USERNAME
     * - KEYCLOAK_ADMIN_PASSWORD
     */
    @Bean
    @ConditionalOnProperty(
        value = "app.keycloak.admin.enabled", 
        havingValue = "true",
        matchIfMissing = false
    )
    public Keycloak keycloakAdmin(
        @Value("${app.keycloak.admin.username:${KEYCLOAK_ADMIN_USERNAME:}}") String adminUsername,
        @Value("${app.keycloak.admin.password:${KEYCLOAK_ADMIN_PASSWORD:}}") String adminPassword,
        @Value("${app.keycloak.admin.realm:master}") String adminRealm,
        @Value("${app.keycloak.admin.client-id:admin-cli}") String adminClientId
    ) {
        if (adminUsername.isEmpty() || adminPassword.isEmpty()) {
            throw new IllegalStateException(
                "Keycloak admin client is enabled but admin credentials are not provided. " +
                "Set KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD environment variables."
            );
        }

        return KeycloakBuilder.builder()
                .serverUrl(keycloakProperties.getServerUrl())
                .realm(adminRealm) // Admin realm (usually 'master' or dedicated admin realm)
                .clientId(adminClientId) // Admin client (usually 'admin-cli')
                .username(adminUsername)
                .password(adminPassword)
                .build();
    }
}
