package dev.knightcore.proeventiq.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

/**
 * Main application configuration for component scanning
 */
@Configuration
@ComponentScan(basePackages = "dev.knightcore.proeventiq")
public class ApplicationConfig {
    // Configuration bean methods can be added here if needed
}
