package dev.knightcore.proeventiq.config;

import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Collections;

@Configuration
public class SpringdocConfiguration {

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    @Bean
    public OpenApiCustomizer serverOpenApiCustomizer() {
        return openApi -> {
            // This is to ensure server URLs include the context path
            Server server = new Server()
                    .url(contextPath)
                    .description("Default Server URL");
            openApi.setServers(Collections.singletonList(server));
        };
    }
}
