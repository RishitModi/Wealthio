package com.wealthio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskProfileResponse {
    private String riskCategory;
    private Double confidenceScore;
    private String message;
}

