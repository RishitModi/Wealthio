package com.wealthio.services;

import com.wealthio.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class MLService {

    private final WebClient webClient;
    private static final int TIMEOUT_SECONDS = 5;

    @Autowired
    public MLService(WebClient webClient) {
        this.webClient = webClient;
    }

    /**
     * Calls FastAPI to get risk profile based on financial data
     * Makes a POST call to http://localhost:8001/api/ml/risk-profile
     *
     * @param profile User's financial profile
     * @return RiskProfileResponse with risk category and confidence score
     */
    public RiskProfileResponse getRiskProfile(FinancialProfileRequest profile) {
        try {
            log.info("Calling FastAPI getRiskProfile for user profile");

            RiskProfileResponse response = webClient
                    .post()
                    .uri("/api/ml/risk-profile")
                    .bodyValue(profile)
                    .retrieve()
                    .bodyToMono(RiskProfileResponse.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .onErrorResume(Exception.class, ex -> {
                        log.error("Error calling FastAPI risk-profile endpoint: {}", ex.getMessage());
                        return Mono.just(createRiskProfileFallback(ex));
                    })
                    .block();

            log.info("Received risk profile response: {}", response);
            return response;

        } catch (Exception e) {
            log.error("Unexpected error in getRiskProfile: {}", e.getMessage(), e);
            return createRiskProfileFallback(e);
        }
    }

    /**
     * Calls FastAPI to get portfolio allocation based on risk category
     * Makes a POST call to http://localhost:8001/api/ml/portfolio-allocation
     *
     * @param riskCategory Risk category (e.g., LOW, MEDIUM, HIGH)
     * @param investableAmount Amount available to invest
     * @return List of AllocationResult containing asset allocation
     */
    public List<AllocationResult> getPortfolioAllocation(String riskCategory, Double investableAmount) {
        try {
            log.info("Calling FastAPI getPortfolioAllocation for risk category: {}, amount: {}", riskCategory, investableAmount);

            PortfolioAllocationRequest request = PortfolioAllocationRequest.builder()
                    .riskCategory(riskCategory)
                    .investableAmount(investableAmount)
                    .build();

            @SuppressWarnings("unchecked")
            List<AllocationResult> response = webClient
                    .post()
                    .uri("/api/ml/portfolio-allocation")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(List.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .map(list -> {
                        List<AllocationResult> results = new ArrayList<>();
                        for (Object item : list) {
                            if (item instanceof java.util.Map) {
                                @SuppressWarnings("unchecked")
                                java.util.Map<String, Object> map = (java.util.Map<String, Object>) item;
                                AllocationResult result = AllocationResult.builder()
                                        .assetClass((String) map.get("assetClass"))
                                        .percentage(((Number) map.get("percentage")).doubleValue())
                                        .amount(investableAmount * ((Number) map.get("percentage")).doubleValue() / 100)
                                        .build();
                                results.add(result);
                            }
                        }
                        return results;
                    })
                    .onErrorResume(Exception.class, ex -> {
                        log.error("Error calling FastAPI portfolio-allocation endpoint: {}", ex.getMessage());
                        return Mono.just(createPortfolioAllocationFallback(riskCategory, investableAmount));
                    })
                    .block();

            log.info("Received portfolio allocation response with {} assets", response != null ? response.size() : 0);
            return response != null ? response : new ArrayList<>();

        } catch (Exception e) {
            log.error("Unexpected error in getPortfolioAllocation: {}", e.getMessage(), e);
            return createPortfolioAllocationFallback(riskCategory, investableAmount);
        }
    }

    /**
     * Calls FastAPI to get market data for stocks and gold
     * Makes GET calls to http://localhost:8001/api/market/stocks and /api/market/gold
     *
     * @return MarketDataSnapshot containing current market data
     */
    public MarketDataSnapshot getMarketData() {
        try {
            log.info("Calling FastAPI getMarketData");

            MarketDataSnapshot snapshot = webClient
                    .get()
                    .uri("/api/market/stocks")
                    .retrieve()
                    .bodyToMono(MarketDataSnapshot.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .onErrorResume(Exception.class, ex -> {
                        log.error("Error calling FastAPI market/stocks endpoint: {}", ex.getMessage());
                        return Mono.just(createMarketDataFallback(ex));
                    })
                    .block();

            // Try to get gold data
            if (snapshot != null) {
                try {
                    MarketDataSnapshot.GoldData goldData = webClient
                            .get()
                            .uri("/api/market/gold")
                            .retrieve()
                            .bodyToMono(MarketDataSnapshot.GoldData.class)
                            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                            .onErrorResume(Exception.class, ex -> {
                                log.error("Error calling FastAPI market/gold endpoint: {}", ex.getMessage());
                                return Mono.empty();
                            })
                            .block();

                    snapshot.setGold(goldData);
                } catch (Exception e) {
                    log.warn("Could not retrieve gold data: {}", e.getMessage());
                }
            }

            log.info("Received market data snapshot");
            return snapshot;

        } catch (Exception e) {
            log.error("Unexpected error in getMarketData: {}", e.getMessage(), e);
            return createMarketDataFallback(e);
        }
    }

    /**
     * Creates a fallback RiskProfileResponse when FastAPI is unavailable
     */
    private RiskProfileResponse createRiskProfileFallback(Exception ex) {
        return RiskProfileResponse.builder()
                .riskCategory("MODERATE")  // default to moderate risk
                .confidenceScore(0.0)
                .message("FastAPI service is unavailable. Using default risk profile. Error: " + ex.getMessage())
                .build();
    }

    /**
     * Creates fallback portfolio allocation when FastAPI is unavailable
     */
    private List<AllocationResult> createPortfolioAllocationFallback(String riskCategory, Double investableAmount) {
        List<AllocationResult> fallback = new ArrayList<>();

        // Default allocations based on risk category
        if ("LOW".equals(riskCategory)) {
            fallback.add(AllocationResult.builder()
                    .assetClass("Bonds")
                    .percentage(60.0)
                    .amount(investableAmount * 0.60)
                    .build());
            fallback.add(AllocationResult.builder()
                    .assetClass("Equities")
                    .percentage(25.0)
                    .amount(investableAmount * 0.25)
                    .build());
            fallback.add(AllocationResult.builder()
                    .assetClass("Cash")
                    .percentage(15.0)
                    .amount(investableAmount * 0.15)
                    .build());
        } else if ("MEDIUM".equals(riskCategory)) {
            fallback.add(AllocationResult.builder()
                    .assetClass("Equities")
                    .percentage(50.0)
                    .amount(investableAmount * 0.50)
                    .build());
            fallback.add(AllocationResult.builder()
                    .assetClass("Bonds")
                    .percentage(35.0)
                    .amount(investableAmount * 0.35)
                    .build());
            fallback.add(AllocationResult.builder()
                    .assetClass("Cash")
                    .percentage(15.0)
                    .amount(investableAmount * 0.15)
                    .build());
        } else {  // HIGH or VERY_HIGH
            fallback.add(AllocationResult.builder()
                    .assetClass("Equities")
                    .percentage(75.0)
                    .amount(investableAmount * 0.75)
                    .build());
            fallback.add(AllocationResult.builder()
                    .assetClass("Bonds")
                    .percentage(15.0)
                    .amount(investableAmount * 0.15)
                    .build());
            fallback.add(AllocationResult.builder()
                    .assetClass("Cash")
                    .percentage(10.0)
                    .amount(investableAmount * 0.10)
                    .build());
        }

        log.warn("FastAPI service unavailable. Returning fallback portfolio allocation");
        return fallback;
    }

    /**
     * Creates a fallback MarketDataSnapshot when FastAPI is unavailable
     */
    private MarketDataSnapshot createMarketDataFallback(Exception ex) {
        List<MarketDataSnapshot.StockData> stocks = new ArrayList<>();
        stocks.add(MarketDataSnapshot.StockData.builder()
                .symbol("SENSEX")
                .price(0.0)
                .change(0.0)
                .changePercent(0.0)
                .build());

        return MarketDataSnapshot.builder()
                .stocks(stocks)
                .gold(MarketDataSnapshot.GoldData.builder()
                        .price(0.0)
                        .change(0.0)
                        .changePercent(0.0)
                        .build())
                .timestamp(java.time.LocalDateTime.now().toString())
                .message("FastAPI service is unavailable. Error: " + ex.getMessage())
                .build();
    }
}

