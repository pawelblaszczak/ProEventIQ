package dev.knightcore.proeventiq.config;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Custom JWT audience validator for Keycloak tokens.
 * Validates that the JWT contains the expected audience claim.
 */
public class JwtAudienceValidator implements OAuth2TokenValidator<Jwt> {

    private final String expectedAudience;

    public JwtAudienceValidator(String expectedAudience) {
        this.expectedAudience = expectedAudience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (jwt.getAudience() != null && jwt.getAudience().contains(expectedAudience)) {
            return OAuth2TokenValidatorResult.success();
        }
        
        // If no audience or wrong audience, return failure
        OAuth2Error error = new OAuth2Error(
            "invalid_audience",
            "The required audience is missing",
            "https://tools.ietf.org/html/rfc6750#section-3.1"
        );
        
        return OAuth2TokenValidatorResult.failure(error);
    }
}
