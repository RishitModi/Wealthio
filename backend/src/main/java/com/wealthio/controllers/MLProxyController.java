package com.wealthio.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@RestController
@RequestMapping("/api/ml")
public class MLProxyController {

    private final RestTemplate mlRestTemplate;

    @Autowired
    public MLProxyController(RestTemplate mlRestTemplate) {
        this.mlRestTemplate = mlRestTemplate;
    }

    @PostMapping("/risk-profile")
    public ResponseEntity<Object> proxyRiskProfile(@RequestBody Object body) {
        try {
            ResponseEntity<Object> response = mlRestTemplate.postForEntity(
                    "/risk-profile", body, Object.class);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .headers(e.getResponseHeaders())
                    .body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(503)
                    .body(Map.of("message", "ML Service is currently offline or unreachable: " + e.getMessage()));
        }
    }

    @PostMapping("/risk-selection")
    public ResponseEntity<Object> proxyRiskSelection(@RequestBody Object body) {
        try {
            ResponseEntity<Object> response = mlRestTemplate.postForEntity(
                    "/risk-selection", body, Object.class);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .headers(e.getResponseHeaders())
                    .body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(503)
                    .body(Map.of("message", "ML Service is currently offline or unreachable: " + e.getMessage()));
        }
    }

    @GetMapping("/market/forecast")
    public ResponseEntity<Object> proxyMarketForecast(
            @RequestParam String asset,
            @RequestParam(defaultValue = "30") int periods,
            @RequestParam(defaultValue = "INR") String currency) {

        String url = "/api/market/forecast?asset={asset}&periods={periods}&currency={currency}";
        try {
            ResponseEntity<Object> response = mlRestTemplate.getForEntity(
                    url, Object.class, asset, periods, currency);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .headers(e.getResponseHeaders())
                    .body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(503)
                    .body(Map.of("message", "ML Service is currently offline or unreachable: " + e.getMessage()));
        }
    }
}
