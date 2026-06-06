package com.wealthio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioResponse {

    private Long portfolioId;
    private Long userId;

    /** Risk category determined by the ML model (e.g. LOW / MEDIUM / HIGH / VERY_HIGH) */
    private String riskCategory;

    /** Annual investable amount: monthlySavings × 12 × 0.7 */
    private Double totalInvestableAmount;

    /** Individual asset-class breakdowns */
    private List<AllocationDto> allocations;

    private LocalDateTime createdAt;
    private LocalDateTime lastUpdated;

    // ── nested DTO ────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AllocationDto {
        private Long id;
        private String assetClass;
        private Double allocationPercentage;
        private Double allocationAmount;
        private String reasoning;
    }
}
