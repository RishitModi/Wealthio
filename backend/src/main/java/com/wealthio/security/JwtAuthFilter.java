package com.wealthio.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Skip JWT validation for OPTIONS preflight requests (CORS)
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                filterChain.doFilter(request, response);
                return;
            }

            // Skip JWT validation for auth endpoints (registration and login)
            String requestPath = request.getRequestURI();
            if (requestPath.startsWith("/api/auth/")) {
                filterChain.doFilter(request, response);
                return;
            }

            String authHeader = request.getHeader("Authorization");
            String token = null;
            String username = null;

            // Check if Authorization header exists and starts with "Bearer "
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7); // Extract token after "Bearer "
                try {
                    username = jwtUtil.extractUsername(token);
                } catch (Exception e) {
                    logger.debug("Error extracting username from token: " + e.getMessage());
                }
            }

            // If username is extracted and no authentication exists in SecurityContext
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // Validate token and set authentication
                    if (jwtUtil.validateToken(token, userDetails)) {
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        logger.debug("JWT Token validated successfully for user: " + username);
                    } else {
                        logger.debug("JWT Token validation failed for user: " + username);
                    }
                } catch (Exception e) {
                    logger.debug("Error loading user or validating token: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            logger.error("Error in JWT filter: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}


