package com.wealthio.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioAllocationRequest {
    @JsonProperty("risk_category")
    private String riskCategory;
    
    @JsonProperty("investable_amount")
    private Double investableAmount;

    @JsonProperty("age")
    private Integer age;

    @JsonProperty("investment_horizon_years")
    private Integer investmentHorizonYears;

    @JsonProperty("monthly_income")
    private Double monthlyIncome;

    @JsonProperty("monthly_savings")
    private Double monthlySavings;
}

