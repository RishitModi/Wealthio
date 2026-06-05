package com.wealthio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketDataSnapshot {
    private List<StockData> stocks;
    private GoldData gold;
    private String timestamp;
    private String message;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StockData {
        private String symbol;
        private Double price;
        private Double change;
        private Double changePercent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GoldData {
        private Double price;
        private Double change;
        private Double changePercent;
    }
}

