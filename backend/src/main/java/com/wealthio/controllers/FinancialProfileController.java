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
}

