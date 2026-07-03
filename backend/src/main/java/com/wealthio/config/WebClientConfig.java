package com.wealthio.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import org.springframework.beans.factory.annotation.Value;

@Configuration
public class WebClientConfig {

    @Value("${ML_SERVICE_URL:http://localhost:8001}")
    private String mlServiceUrl;

    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                .baseUrl(mlServiceUrl)
                .build();
    }
}

