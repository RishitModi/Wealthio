package com.wealthio.repositories;

import com.wealthio.entities.PortfolioAllocation;
import com.wealthio.entities.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioAllocationRepository extends JpaRepository<PortfolioAllocation, Long> {
    List<PortfolioAllocation> findByPortfolio(Portfolio portfolio);
    List<PortfolioAllocation> findByPortfolioId(Long portfolioId);
}

