package com.wealthio.repositories;

import com.wealthio.entities.FinancialProfile;
import com.wealthio.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FinancialProfileRepository extends JpaRepository<FinancialProfile, Long> {
    Optional<FinancialProfile> findByUser(User user);
    Optional<FinancialProfile> findByUserId(Long userId);
}

