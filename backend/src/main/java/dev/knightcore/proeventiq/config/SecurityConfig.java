package dev.knightcore.proeventiq.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.security.oauth2.client-id:proeventiq-api}")
    private String clientId;

    @Value("${app.keycloak.issuer-uri}")
    private String issuerUri;

    @Value("${app.keycloak.client-secret:}")
    private String clientSecret;

    private final Environment environment;
    private final KeycloakConfigProperties keycloakConfig;

    public SecurityConfig(Environment environment, KeycloakConfigProperties keycloakConfig) {
        this.environment = environment;
        this.keycloakConfig = keycloakConfig;
    }

    @PostConstruct
    public void disableSslVerificationInDev() {
        if (java.util.List.of(environment.getActiveProfiles()).contains("dev")) {
            // Disable SSL verification for development only
            System.setProperty("com.sun.net.ssl.checkRevocation", "false");
            System.setProperty("sun.security.ssl.allowUnsafeRenegotiation", "true");
            
            // Create a custom trust manager that accepts all certificates
            javax.net.ssl.HttpsURLConnection.setDefaultHostnameVerifier(
                (hostname, session) -> hostname.equals("localhost")
            );
            
            try {
                javax.net.ssl.SSLContext sc = javax.net.ssl.SSLContext.getInstance("TLS");
                sc.init(null, new javax.net.ssl.TrustManager[]{
                    new javax.net.ssl.X509TrustManager() {
                        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                            return new java.security.cert.X509Certificate[0];
                        }
                        public void checkClientTrusted(java.security.cert.X509Certificate[] certs, String authType) {
                            // Development only - trust all certificates
                        }
                        public void checkServerTrusted(java.security.cert.X509Certificate[] certs, String authType) {
                            // Development only - trust all certificates
                        }
                    }
                }, new java.security.SecureRandom());
                javax.net.ssl.HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            } catch (Exception e) {
                throw new RuntimeException("Failed to disable SSL verification", e);
            }
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                // Allow OpenAPI/Swagger and actuator health anonymously
                .requestMatchers(
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/actuator/health",
                        "/actuator/info"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                    .decoder(jwtDecoder())
                )
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtDecoder = JwtDecoders.fromIssuerLocation(issuerUri);

        // For development: only validate issuer, skip audience validation
        // In production, you should configure proper audience validation
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuerUri);
        jwtDecoder.setJwtValidator(withIssuer);
        
        return jwtDecoder;
    }

    // Map Keycloak roles (realm_access.roles) to Spring authorities as ROLE_*
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter realmRoles = new JwtGrantedAuthoritiesConverter();
        realmRoles.setAuthoritiesClaimName("realm_access.roles");
        realmRoles.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(realmRoles);
        return converter;
    }
}
