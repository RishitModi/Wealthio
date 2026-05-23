package com.wealthio.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "portfolio_allocations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Column(name = "asset_class")
    @Enumerated(EnumType.STRING)
    private AssetClass assetClass;

    @Column(name = "allocation_percentage")
    private Double allocationPercentage;

    @Column(name = "allocation_amount")
    private Double allocationAmount;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    // Custom constructor for portfolio and asset class initialization
    public PortfolioAllocation(Portfolio portfolio, AssetClass assetClass) {
        this.portfolio = portfolio;
        this.assetClass = assetClass;
    }


    // Enum
    public enum AssetClass {
        MUTUAL_FUND, GOLD, STOCKS, FD, ETF, CRYPTO
    }
}

