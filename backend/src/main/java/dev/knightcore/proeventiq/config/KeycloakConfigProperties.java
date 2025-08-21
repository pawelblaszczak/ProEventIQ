package dev.knightcore.proeventiq.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.keycloak")
public class KeycloakConfigProperties {

    private String issuerUri;
    private String serverUrl;
    private String realm;
    private String clientId;
    private String clientSecret;

    // Getters and setters
    public String getIssuerUri() {
        return issuerUri;
    }

    public void setIssuerUri(String issuerUri) {
        this.issuerUri = issuerUri;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    public String getRealm() {
        return realm;
    }

    public void setRealm(String realm) {
        this.realm = realm;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public boolean hasClientSecret() {
        return clientSecret != null && !clientSecret.trim().isEmpty();
    }

    // Helper methods for OAuth URLs
    public String getAuthorizationUrl() {
        return serverUrl + "/realms/" + realm + "/protocol/openid-connect/auth";
    }

    public String getTokenUrl() {
        return serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";
    }
}
