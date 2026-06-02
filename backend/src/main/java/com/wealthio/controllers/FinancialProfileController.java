package com.wealthio.controllers;

import com.wealthio.dto.FinancialProfileRequest;
import com.wealthio.entities.FinancialProfile;
import com.wealthio.entities.User;
import com.wealthio.exceptions.ResourceNotFoundException;
import com.wealthio.repositories.UserRepository;
import com.wealthio.services.FinancialProfileService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class FinancialProfileController {

    @Autowired
    private FinancialProfileService financialProfileService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Get current logged-in user's ID from SecurityContext
     */
    private Long getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            User user = userRepository.findByEmail(username)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + username));
            return user.getId();
        }
        throw new ResourceNotFoundException("User not authenticated");
    }

    /**
     * Create or update financial profile
     */
    @PostMapping
    public ResponseEntity<FinancialProfile> createOrUpdateProfile(@Valid @RequestBody FinancialProfileRequest request) {
        Long userId = getCurrentUserId();
        FinancialProfile profile = financialProfileService.createOrUpdateProfile(userId, request);
        return new ResponseEntity<>(profile, HttpStatus.OK);
    }

    /**
     * Get current user's financial profile
     */
    @GetMapping
    public ResponseEntity<FinancialProfile> getProfile() {
        Long userId = getCurrentUserId();
        FinancialProfile profile = financialProfileService.getProfileByUserId(userId);
        return new ResponseEntity<>(profile, HttpStatus.OK);
    }

    /**
     * Update risk appetite only
     */
    @PostMapping("/risk")
    public ResponseEntity<FinancialProfile> updateRisk(@RequestBody com.wealthio.dto.RiskSelectionDto dto) {
        Long userId = getCurrentUserId();

        // Map frontend risk labels to enum
        String selected = dto.getSelectedRisk();
        FinancialProfile.RiskAppetite appetite;
        if (selected == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        switch (selected.toLowerCase()) {
            case "conservative":
                appetite = FinancialProfile.RiskAppetite.LOW;
                break;
            case "moderate":
                appetite = FinancialProfile.RiskAppetite.MEDIUM;
                break;
            case "aggressive":
                appetite = FinancialProfile.RiskAppetite.HIGH;
                break;
            case "very aggressive":
                appetite = FinancialProfile.RiskAppetite.VERY_HIGH;
                break;
            default:
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        FinancialProfile profile = financialProfileService.updateRiskAppetite(userId, appetite);
        return new ResponseEntity<>(profile, HttpStatus.OK);
    }
}

