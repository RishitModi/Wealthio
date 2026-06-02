package com.wealthio.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "financial_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinancialProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "monthly_income")
    private Double monthlyIncome;

    @Column(name = "monthly_savings")
    private Double monthlySavings;

    @Column(name = "monthly_expenses")
    private Double monthlyExpenses;

    @Column
    private Integer age;

    @Column(name = "risk_appetite")
    @Enumerated(EnumType.STRING)
    private RiskAppetite riskAppetite;

    @Column(name = "investment_goal")
    @Enumerated(EnumType.STRING)
    private InvestmentGoal investmentGoal;

    @Column(name = "investment_horizon_years")
    private Integer investmentHorizonYears;

    @Column(name = "total_savings")
    private Double totalSavings;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Custom constructor for user initialization
    public FinancialProfile(User user) {
        this.user = user;
    }


    // Enums
    public enum RiskAppetite {
        LOW, MEDIUM, HIGH, VERY_HIGH
    }

    public enum InvestmentGoal {
        RETIREMENT, WEALTH_GROWTH, SHORT_TERM, EDUCATION
    }
}

