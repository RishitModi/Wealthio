package com.wealthio.services;

import com.wealthio.dto.*;
import com.wealthio.entities.FinancialProfile;
import com.wealthio.entities.Portfolio;
import com.wealthio.entities.PortfolioAllocation;
import com.wealthio.entities.User;
import com.wealthio.exceptions.ResourceNotFoundException;
import com.wealthio.repositories.FinancialProfileRepository;
import com.wealthio.repositories.PortfolioAllocationRepository;
import com.wealthio.repositories.PortfolioRepository;
import com.wealthio.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PortfolioService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FinancialProfileRepository financialProfileRepository;

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private PortfolioAllocationRepository portfolioAllocationRepository;

    @Autowired
    private MLService mlService;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Generate (or re-generate) a portfolio for the given user:
     * <ol>
     *   <li>Fetch financial profile from DB</li>
     *   <li>Calculate investable amount  = monthlySavings × 12 × 0.7</li>
     *   <li>Ask ML service for risk profile</li>
     *   <li>Ask ML service for asset allocation</li>
     *   <li>Persist Portfolio + PortfolioAllocation rows</li>
     *   <li>Return a PortfolioResponse DTO</li>
     * </ol>
     */
    @Transactional
    public PortfolioResponse generatePortfolio(Long userId) {
        log.info("Generating portfolio for userId={}", userId);

        // 1. Resolve user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // 2. Fetch financial profile
        FinancialProfile financialProfile = financialProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Financial profile not found for userId=" + userId +
                        ". Please complete onboarding before generating a portfolio."));

        // 3. Calculate investable amount
        double investableAmount = calculateInvestableAmount(financialProfile.getMonthlySavings());
        log.info("Investable amount for userId={}: {}", userId, investableAmount);

        // 4. Build the request the ML service expects and get the risk profile
        FinancialProfileRequest mlRequest = buildMlRequest(financialProfile);
        RiskProfileResponse riskResponse = mlService.getRiskProfile(mlRequest);
        String riskCategory = riskResponse.getRiskCategory();
        log.info("ML risk profile for userId={}: {}", userId, riskCategory);

        // 5. Get asset allocation from ML service
        List<AllocationResult> allocations = mlService.getPortfolioAllocation(riskCategory, investableAmount);
        log.info("ML allocation for userId={}: {} assets", userId, allocations.size());

        // 6. Persist or update Portfolio entity
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElse(new Portfolio(user));
        portfolio.setRiskCategory(riskCategory);
        portfolio.setTotalInvestableAmount(investableAmount);
        portfolio = portfolioRepository.save(portfolio);

        // 7. Replace existing allocations with fresh ones
        List<PortfolioAllocation> existingAllocations = portfolioAllocationRepository.findByPortfolio(portfolio);
        portfolioAllocationRepository.deleteAll(existingAllocations);

        List<PortfolioAllocation> savedAllocations = persistAllocations(portfolio, allocations);

        log.info("Portfolio generated and saved for userId={}, portfolioId={}", userId, portfolio.getId());
        return buildResponse(portfolio, savedAllocations);
    }

    /**
     * Return an existing portfolio for the user, or generate one on-demand.
     */
    @Transactional
    public PortfolioResponse getPortfolio(Long userId) {
        // Verify user exists
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return portfolioRepository.findByUserId(userId)
                .map(portfolio -> {
                    List<PortfolioAllocation> allocs = portfolioAllocationRepository.findByPortfolio(portfolio);
                    return buildResponse(portfolio, allocs);
                })
                .orElseGet(() -> {
                    log.info("No portfolio found for userId={}. Generating one now.", userId);
                    return generatePortfolio(userId);
                });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * investable = monthlySavings × 12 × 0.7
     */
    private double calculateInvestableAmount(Double monthlySavings) {
        if (monthlySavings == null || monthlySavings <= 0) {
            return 0.0;
        }
        return monthlySavings * 12 * 0.7;
    }

    /**
     * Map FinancialProfile entity fields to the DTO that MLService.getRiskProfile() expects.
     * The ML model's preference scores (equity, FD, PPF, gold) are derived from the user's
     * stored riskAppetite and investmentGoal enums.
     */
    private FinancialProfileRequest buildMlRequest(FinancialProfile fp) {
        FinancialProfileRequest req = new FinancialProfileRequest();
        req.setAge(fp.getAge() != null ? fp.getAge() : 30);
        req.setMonthlyIncome(fp.getMonthlyIncome());
        req.setMonthlySavings(fp.getMonthlySavings());
        req.setMonthlyExpenses(fp.getMonthlyExpenses());
        req.setRiskAppetite(fp.getRiskAppetite());
        req.setInvestmentGoal(fp.getInvestmentGoal());
        req.setInvestmentHorizonYears(fp.getInvestmentHorizonYears());
        req.setTotalSavings(fp.getTotalSavings());
        return req;
    }

    /**
     * Map ML AllocationResult list → PortfolioAllocation entities and save them.
     * The ML service returns raw strings for asset class; we attempt to match them
     * to our AssetClass enum, falling back to MUTUAL_FUND for unknown values.
     */
    private List<PortfolioAllocation> persistAllocations(Portfolio portfolio, List<AllocationResult> results) {
        List<PortfolioAllocation> toSave = new ArrayList<>();
        for (AllocationResult ar : results) {
            PortfolioAllocation pa = new PortfolioAllocation();
            pa.setPortfolio(portfolio);
            pa.setAssetClass(resolveAssetClass(ar.getAssetClass()));
            pa.setAllocationPercentage(ar.getPercentage());
            pa.setAllocationAmount(ar.getAmount());
            pa.setReasoning("Generated by ML risk model — risk category: " + portfolio.getRiskCategory());
            toSave.add(pa);
        }
        return portfolioAllocationRepository.saveAll(toSave);
    }

    /**
     * Map a human-readable asset class string from ML to our enum.
     */
    private PortfolioAllocation.AssetClass resolveAssetClass(String raw) {
        if (raw == null) return PortfolioAllocation.AssetClass.MUTUAL_FUND;
        return switch (raw.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")) {
            case "EQUITIES", "EQUITY", "STOCKS" -> PortfolioAllocation.AssetClass.STOCKS;
            case "GOLD" -> PortfolioAllocation.AssetClass.GOLD;
            case "BONDS", "FIXED_DEPOSIT", "FD" -> PortfolioAllocation.AssetClass.FD;
            case "ETF" -> PortfolioAllocation.AssetClass.ETF;
            case "CRYPTO" -> PortfolioAllocation.AssetClass.CRYPTO;
            default -> PortfolioAllocation.AssetClass.MUTUAL_FUND;
        };
    }

    /**
     * Assemble a PortfolioResponse from saved entities.
     */
    private PortfolioResponse buildResponse(Portfolio portfolio, List<PortfolioAllocation> allocations) {
        List<PortfolioResponse.AllocationDto> allocationDtos = allocations.stream()
                .map(pa -> PortfolioResponse.AllocationDto.builder()
                        .id(pa.getId())
                        .assetClass(pa.getAssetClass() != null ? pa.getAssetClass().name() : null)
                        .allocationPercentage(pa.getAllocationPercentage())
                        .allocationAmount(pa.getAllocationAmount())
                        .reasoning(pa.getReasoning())
                        .build())
                .collect(Collectors.toList());

        return PortfolioResponse.builder()
                .portfolioId(portfolio.getId())
                .userId(portfolio.getUser().getId())
                .riskCategory(portfolio.getRiskCategory())
                .totalInvestableAmount(portfolio.getTotalInvestableAmount())
                .allocations(allocationDtos)
                .createdAt(portfolio.getCreatedAt())
                .lastUpdated(portfolio.getLastUpdated())
                .build();
    }
}
