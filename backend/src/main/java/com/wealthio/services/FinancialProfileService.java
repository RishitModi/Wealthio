package com.wealthio.services;

import com.wealthio.dto.FinancialProfileRequest;
import com.wealthio.entities.FinancialProfile;
import com.wealthio.entities.User;
import com.wealthio.exceptions.ResourceNotFoundException;
import com.wealthio.repositories.FinancialProfileRepository;
import com.wealthio.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class FinancialProfileService {

    @Autowired
    private FinancialProfileRepository financialProfileRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Create or update financial profile for a user
     */
    public FinancialProfile createOrUpdateProfile(Long userId, FinancialProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        FinancialProfile profile = financialProfileRepository.findByUserId(userId)
                .orElse(new FinancialProfile(user));

        // Update profile fields
        profile.setMonthlyIncome(request.getMonthlyIncome());
        profile.setMonthlySavings(request.getMonthlySavings());
        profile.setMonthlyExpenses(request.getMonthlyExpenses());
        profile.setAge(request.getAge());
        profile.setRiskAppetite(request.getRiskAppetite());
        profile.setInvestmentGoal(request.getInvestmentGoal());
        profile.setInvestmentHorizonYears(request.getInvestmentHorizonYears());
        profile.setTotalSavings(request.getTotalSavings());

        // Calculate investable amount
        Double investableAmount = calculateInvestableAmount(request);
        profile.setTotalSavings(investableAmount);

        return financialProfileRepository.save(profile);
    }

    /**
     * Get financial profile by user ID
     */
    public FinancialProfile getProfileByUserId(Long userId) {
        return financialProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Financial profile not found for user id: " + userId));
    }

        /**
         * Update only the risk appetite for a user's financial profile
         */
        public FinancialProfile updateRiskAppetite(Long userId, FinancialProfile.RiskAppetite riskAppetite) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        FinancialProfile profile = financialProfileRepository.findByUserId(userId)
            .orElse(new FinancialProfile(user));

        profile.setRiskAppetite(riskAppetite);
        return financialProfileRepository.save(profile);
        }

    /**
     * Calculate investable amount
     * Formula: (monthlySavings × 12) × 0.7
     */
    public Double calculateInvestableAmount(FinancialProfileRequest request) {
        if (request.getMonthlySavings() == null) {
            return 0.0;
        }
        return (request.getMonthlySavings() * 12) * 0.7;
    }
}

