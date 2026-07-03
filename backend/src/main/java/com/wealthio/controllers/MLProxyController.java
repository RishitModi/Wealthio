package com.wealthio.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/ml")
public class MLProxyController {

    private final WebClient webClient;

    @Autowired
    public MLProxyController(WebClient webClient) {
        this.webClient = webClient;
    }

    @PostMapping("/risk-profile")
    public Mono<ResponseEntity<Object>> proxyRiskProfile(@RequestBody Object body) {
        return webClient.post()
                .uri("/risk-profile")
                .bodyValue(body)
                .retrieve()
                .toEntity(Object.class);
    }

    @PostMapping("/risk-selection")
    public Mono<ResponseEntity<Object>> proxyRiskSelection(@RequestBody Object body) {
        return webClient.post()
                .uri("/risk-selection")
                .bodyValue(body)
                .retrieve()
                .toEntity(Object.class);
    }

    @GetMapping("/market/forecast")
    public Mono<ResponseEntity<Object>> proxyMarketForecast(
            @RequestParam String asset,
            @RequestParam(defaultValue = "30") int periods,
            @RequestParam(defaultValue = "INR") String currency) {
        
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/market/forecast")
                        .queryParam("asset", asset)
                        .queryParam("periods", periods)
                        .queryParam("currency", currency)
                        .build())
                .retrieve()
                .toEntity(Object.class);
    }
}
