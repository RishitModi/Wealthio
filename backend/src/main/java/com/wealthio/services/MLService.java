package com.wealthio.services;

import com.wealthio.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class MLService {

    private final RestTemplate mlRestTemplate;

    @Autowired
    public MLService(RestTemplate mlRestTemplate) {
        this.mlRestTemplate = mlRestTemplate;
    }

    public RiskProfileResponse getRiskProfile(FinancialProfileRequest profile) {
        try {
            log.info("Calling FastAPI getRiskProfile for user profile");
            RiskProfileResponse response = mlRestTemplate.postForObject(
                    "/risk-profile", profile, RiskProfileResponse.class);
            log.info("Received risk profile response: {}", response);
            return response;
        } catch (Exception e) {
            log.error("Unexpected error in getRiskProfile: {}", e.getMessage(), e);
            return createRiskProfileFallback(e);
        }
    }

    public List<AllocationResult> getPortfolioAllocation(String riskCategory, Double investableAmount, FinancialProfileRequest profile) {
        try {
            log.info("Calling FastAPI getPortfolioAllocation for risk category: {}, amount: {}", riskCategory, investableAmount);

            PortfolioAllocationRequest request = PortfolioAllocationRequest.builder()
                    .riskCategory(riskCategory)
                    .investableAmount(investableAmount)
                    .age(profile.getAge() != null ? profile.getAge() : 30)
                    .investmentHorizonYears(profile.getInvestmentHorizonYears() != null ? profile.getInvestmentHorizonYears() : 10)
                    .monthlyIncome(profile.getMonthlyIncome() != null ? profile.getMonthlyIncome() : 0.0)
                    .monthlySavings(profile.getMonthlySavings() != null ? profile.getMonthlySavings() : 0.0)
                    .build();

            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = mlRestTemplate.postForObject(
                    "/api/ml/portfolio-allocation", request, Map.class);

            List<AllocationResult> results = new ArrayList<>();
            if (responseMap != null) {
                Object allocationsObj = responseMap.get("allocations");
                if (allocationsObj instanceof List) {
                    List<?> list = (List<?>) allocationsObj;
                    for (Object item : list) {
                        if (item instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> map = (Map<String, Object>) item;
                            AllocationResult result = AllocationResult.builder()
                                    .assetClass((String) map.get("asset_class"))
                                    .percentage(((Number) map.get("percentage")).doubleValue())
                                    .amount(investableAmount * ((Number) map.get("percentage")).doubleValue() / 100)
                                    .build();
                            results.add(result);
                        }
                    }
                }
            }
            log.info("Received portfolio allocation response with {} assets", results.size());
            return results;

        } catch (Exception e) {
            log.error("Unexpected error in getPortfolioAllocation: {}", e.getMessage(), e);
            return createPortfolioAllocationFallback(riskCategory, investableAmount);
        }
    }

    @SuppressWarnings("unchecked")
    public MarketDataSnapshot getMarketData() {
        try {
            log.info("Calling FastAPI getMarketData");
            List<String> tickers = List.of("^BSESN", "RELIANCE.NS", "TCS.NS");

            Map<String, Object> batchResponse = null;
            try {
                batchResponse = mlRestTemplate.postForObject(
                        "/api/market/stocks/batch", Map.of("tickers", tickers), Map.class);
            } catch (Exception ex) {
                log.error("Error calling FastAPI market/stocks/batch endpoint: {}", ex.getMessage());
            }

            List<MarketDataSnapshot.StockData> stockList = new ArrayList<>();
            String fetchedAt = "";

            if (batchResponse != null) {
                Object resultsObj = batchResponse.get("results");
                fetchedAt = (String) batchResponse.getOrDefault("fetched_at", "");

                if (resultsObj instanceof Map) {
                    Map<String, Object> results = (Map<String, Object>) resultsObj;
                    for (Map.Entry<String, Object> entry : results.entrySet()) {
                        if (entry.getValue() instanceof Map) {
                            Map<String, Object> tickerData = (Map<String, Object>) entry.getValue();
                            Double currentPrice = tickerData.get("current_price") instanceof Number
                                    ? ((Number) tickerData.get("current_price")).doubleValue() : 0.0;
                            String symbol = (String) tickerData.getOrDefault("ticker", entry.getKey());

                            stockList.add(MarketDataSnapshot.StockData.builder()
                                    .symbol(symbol)
                                    .price(currentPrice)
                                    .change(0.0)
                                    .changePercent(0.0)
                                    .build());
                        }
                    }
                }
            }

            MarketDataSnapshot.GoldData goldData = null;
            try {
                Map<String, Object> goldResponse = mlRestTemplate.getForObject(
                        "/api/market/gold-silver", Map.class);

                if (goldResponse != null) {
                    Object goldObj = goldResponse.get("gold");
                    if (goldObj instanceof Map) {
                        Map<String, Object> goldMap = (Map<String, Object>) goldObj;
                        Double goldPrice = goldMap.get("current_price") instanceof Number
                                ? ((Number) goldMap.get("current_price")).doubleValue() : 0.0;

                        goldData = MarketDataSnapshot.GoldData.builder()
                                .price(goldPrice)
                                .change(0.0)
                                .changePercent(0.0)
                                .build();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not retrieve gold data: {}", e.getMessage());
            }

            return MarketDataSnapshot.builder()
                    .stocks(stockList)
                    .gold(goldData)
                    .timestamp(fetchedAt)
                    .build();

        } catch (Exception e) {
            log.error("Unexpected error in getMarketData: {}", e.getMessage(), e);
            return createMarketDataFallback(e);
        }
    }

    private RiskProfileResponse createRiskProfileFallback(Exception ex) {
        return RiskProfileResponse.builder()
                .riskCategory("MODERATE")
                .confidenceScore(0.0)
                .message("FastAPI service is unavailable. Using default risk profile. Error: " + ex.getMessage())
                .build();
    }

    private List<AllocationResult> createPortfolioAllocationFallback(String riskCategory, Double investableAmount) {
        List<AllocationResult> fallback = new ArrayList<>();
        if ("LOW".equals(riskCategory)) {
            fallback.add(AllocationResult.builder().assetClass("Bonds").percentage(60.0).amount(investableAmount * 0.60).build());
            fallback.add(AllocationResult.builder().assetClass("Equities").percentage(25.0).amount(investableAmount * 0.25).build());
            fallback.add(AllocationResult.builder().assetClass("Cash").percentage(15.0).amount(investableAmount * 0.15).build());
        } else if ("MEDIUM".equals(riskCategory)) {
            fallback.add(AllocationResult.builder().assetClass("Equities").percentage(50.0).amount(investableAmount * 0.50).build());
            fallback.add(AllocationResult.builder().assetClass("Bonds").percentage(35.0).amount(investableAmount * 0.35).build());
            fallback.add(AllocationResult.builder().assetClass("Cash").percentage(15.0).amount(investableAmount * 0.15).build());
        } else {
            fallback.add(AllocationResult.builder().assetClass("Equities").percentage(75.0).amount(investableAmount * 0.75).build());
            fallback.add(AllocationResult.builder().assetClass("Bonds").percentage(15.0).amount(investableAmount * 0.15).build());
            fallback.add(AllocationResult.builder().assetClass("Cash").percentage(10.0).amount(investableAmount * 0.10).build());
        }
        return fallback;
    }

    private MarketDataSnapshot createMarketDataFallback(Exception ex) {
        List<MarketDataSnapshot.StockData> stocks = new ArrayList<>();
        stocks.add(MarketDataSnapshot.StockData.builder().symbol("SENSEX").price(0.0).change(0.0).changePercent(0.0).build());
        return MarketDataSnapshot.builder()
                .stocks(stocks)
                .gold(MarketDataSnapshot.GoldData.builder().price(0.0).change(0.0).changePercent(0.0).build())
                .timestamp(java.time.LocalDateTime.now().toString())
                .message("FastAPI service is unavailable. Error: " + ex.getMessage())
                .build();
    }
}
