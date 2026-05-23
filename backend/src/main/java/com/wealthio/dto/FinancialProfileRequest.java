package com.wealthio.dto;

import com.wealthio.entities.FinancialProfile;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FinancialProfileRequest {

    @Positive(message = "Monthly income must be positive")
    private Double monthlyIncome;

    @Positive(message = "Monthly savings must be positive")
    private Double monthlySavings;

    @Positive(message = "Monthly expenses must be positive")
    private Double monthlyExpenses;

    @Min(value = 18, message = "Age must be at least 18")
    @Max(value = 120, message = "Age must be less than 120")
    private Integer age;

    @NotNull(message = "Risk appetite cannot be null")
    private FinancialProfile.RiskAppetite riskAppetite;

    @NotNull(message = "Investment goal cannot be null")
    private FinancialProfile.InvestmentGoal investmentGoal;

    @Positive(message = "Investment horizon must be positive")
    private Integer investmentHorizonYears;

    @Positive(message = "Total savings must be positive")
    private Double totalSavings;
}

