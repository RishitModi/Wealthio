package com.wealthio.controllers;

import com.wealthio.dto.FinancialProfileRequest;
import com.wealthio.dto.RiskSelectionDto;
import com.wealthio.entities.FinancialProfile;
import com.wealthio.entities.User;
import com.wealthio.exceptions.ResourceNotFoundException;
import com.wealthio.repositories.UserRepository;
import com.wealthio.services.FinancialProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@Tag(name = "Financial Profile", description = "Create and retrieve the user's financial profile used by the ML pipeline")
@SecurityRequirement(name = "bearerAuth")
public class FinancialProfileController {

    @Autowired
    private FinancialProfileService financialProfileService;

    @Autowired
    private UserRepository userRepository;

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

    @Operation(summary = "Create or update financial profile",
               description = "Saves the authenticated user's financial details (income, savings, risk appetite, etc.). " +
                             "Calling this again will overwrite the existing profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile saved successfully"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "422", description = "Validation failed")
    })
    @PostMapping
    public ResponseEntity<FinancialProfile> createOrUpdateProfile(@Valid @RequestBody FinancialProfileRequest request) {
        Long userId = getCurrentUserId();
        FinancialProfile profile = financialProfileService.createOrUpdateProfile(userId, request);
        return new ResponseEntity<>(profile, HttpStatus.OK);
    }

    @Operation(summary = "Get financial profile",
               description = "Returns the authenticated user's current financial profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile found"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "404", description = "No profile found for this user")
    })
    @GetMapping
    public ResponseEntity<FinancialProfile> getProfile() {
        Long userId = getCurrentUserId();
        FinancialProfile profile = financialProfileService.getProfileByUserId(userId);
        return new ResponseEntity<>(profile, HttpStatus.OK);
    }

    @Operation(summary = "Update risk appetite only",
               description = "Allows the user to change only their risk appetite (conservative / moderate / aggressive / very aggressive) " +
                             "without re-submitting the entire profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Risk appetite updated"),
        @ApiResponse(responseCode = "400", description = "Unknown risk label"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    @PostMapping("/risk")
    public ResponseEntity<FinancialProfile> updateRisk(@RequestBody RiskSelectionDto dto) {
        Long userId = getCurrentUserId();

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
