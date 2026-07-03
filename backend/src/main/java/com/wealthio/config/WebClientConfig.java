package com.wealthio.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import io.netty.channel.ChannelOption;
import reactor.netty.http.client.HttpClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;

import org.springframework.beans.factory.annotation.Value;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Value("${ML_SERVICE_URL:http://localhost:8001}")
    private String mlServiceUrl;

    @Bean
    public WebClient webClient() {
        // Configure Netty HTTP client with generous timeouts
        // The ML service runs Prophet forecasts which can take 10-30 seconds
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10_000)  // 10s connect timeout
                .responseTimeout(Duration.ofSeconds(60));               // 60s response timeout

        // Increase buffer size for large forecast JSON responses (2 MB)
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs()
                        .maxInMemorySize(2 * 1024 * 1024))
                .build();

        return WebClient.builder()
                .baseUrl(mlServiceUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .build();
    }
}

