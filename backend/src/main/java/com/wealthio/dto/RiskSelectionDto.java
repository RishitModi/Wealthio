package com.wealthio.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@NoArgsConstructor
public class RiskSelectionDto {
    private String recommendedRisk;
    private String selectedRisk;
    private Map<String, Object> featureOverview;
}
