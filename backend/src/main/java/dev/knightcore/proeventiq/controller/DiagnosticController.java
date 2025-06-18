package dev.knightcore.proeventiq.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health check endpoint for monitoring
 */
@RestController
public class DiagnosticController {
    
    @GetMapping("/health")
    public String healthCheck() {
        return "Service is running";
    }
}
