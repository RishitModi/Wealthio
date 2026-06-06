package com.wealthio.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI wealthioOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Wealthio API")
                        .description("""
                                REST API for the **Wealthio** AI-powered investment portfolio platform.
                                
                                All endpoints except `/api/auth/**` require a **Bearer JWT** token obtained
                                from the `/api/auth/login` or `/api/auth/register` endpoints.
                                Click **Authorize** and paste your token to test protected endpoints.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Wealthio Team")
                                .url("https://github.com/RishitModi/Wealthio"))
                        .license(new License().name("MIT")))
                // Global JWT security scheme — shows the Authorize button in Swagger UI
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Paste your JWT token (without the 'Bearer ' prefix)")));
    }
}
