package com.wealthio.controllers;

import com.wealthio.dto.MarketDataSnapshot;
import com.wealthio.dto.PortfolioResponse;
import com.wealthio.entities.User;
import com.wealthio.exceptions.ResourceNotFoundException;
import com.wealthio.repositories.UserRepository;
import com.wealthio.services.MLService;
import com.wealthio.services.PortfolioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portfolio")
@Tag(name = "Portfolio", description = "Generate and retrieve the ML-powered investment portfolio, and fetch live market data")
@SecurityRequirement(name = "bearerAuth")
public class PortfolioController {

    @Autowired
    private PortfolioService portfolioService;

    @Autowired
    private MLService mlService;

    @Autowired
    private UserRepository userRepository;

    private Long getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "User not found with email: " + userDetails.getUsername()));
            return user.getId();
        }
        throw new ResourceNotFoundException("User not authenticated");
    }

    @Operation(summary = "Generate portfolio",
               description = "Runs the full ML pipeline: fetches the user's financial profile, " +
                             "classifies risk via K-Means clustering, computes asset allocation, " +
                             "persists the results, and returns a PortfolioResponse. " +
                             "Re-calling this endpoint **replaces** any existing portfolio allocations.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Portfolio generated successfully"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "404", description = "Financial profile not found — complete onboarding first"),
        @ApiResponse(responseCode = "503", description = "ML service unavailable — fallback allocation used")
    })
    @PostMapping("/generate")
    public ResponseEntity<PortfolioResponse> generatePortfolio() {
        Long userId = getCurrentUserId();
        PortfolioResponse response = portfolioService.generatePortfolio(userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @Operation(summary = "Get portfolio",
               description = "Returns the authenticated user's existing portfolio. " +
                             "If no portfolio exists yet, it is generated automatically via the ML pipeline.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Portfolio returned (or auto-generated)"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "404", description = "Financial profile not found — complete onboarding first")
    })
    @GetMapping
    public ResponseEntity<PortfolioResponse> getPortfolio() {
        Long userId = getCurrentUserId();
        PortfolioResponse response = portfolioService.getPortfolio(userId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Live market snapshot",
               description = "Proxies a live market snapshot from the Python ML service — " +
                             "returns prices, change, and change-% for key indices, equities, and commodities.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Market data returned (may be stale if ML service is slow)"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "503", description = "ML service unavailable")
    })
    @GetMapping("/market")
    public ResponseEntity<MarketDataSnapshot> getMarketSnapshot() {
        MarketDataSnapshot snapshot = mlService.getMarketData();
        return ResponseEntity.ok(snapshot);
    }
}
