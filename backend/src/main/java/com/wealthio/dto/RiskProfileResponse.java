package com.wealthio.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskProfileResponse {

    /** Maps Python's "risk_category" (e.g. "MODERATE") → Java camelCase field. */
    @JsonProperty("risk_category")
    private String riskCategory;

    /** Maps Python's "confidence_score" (0.0–1.0) → Java camelCase field. */
    @JsonProperty("confidence_score")
    private Double confidenceScore;

    /** Fixed FD allocation % of total portfolio for this risk category (e.g. 15.0 for MODERATE). */
    @JsonProperty("fd_allocation")
    private Double fdAllocation;

    /**
     * Per-asset min/max bounds for the four risky assets (stocks, gold, mutual_funds, etf).
     * Keyed by asset name; each value is a map with "min" and "max" keys (% of total portfolio).
     * Java treats this as an opaque pass-through — deep inspection happens on the Python side.
     */
    @JsonProperty("boundaries")
    private Map<String, Object> boundaries;

    /**
     * The portion of investable_amount allocated to risky assets = investable_amount * (1 - fd_pct/100).
     * Null when investable_amount was not included in the request.
     */
    @JsonProperty("investable_amount_for_optimization")
    private Double investableAmountForOptimization;

    /** Populated only by the Java fallback — not present in the Python response. */
    private String message;
}


