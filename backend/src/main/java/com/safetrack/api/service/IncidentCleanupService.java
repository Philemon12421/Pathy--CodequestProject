package com.safetrack.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class IncidentCleanupService {
  private static final Logger log = LoggerFactory.getLogger(IncidentCleanupService.class);
  private final JdbcClient jdbc;
  
  @Value("${app.incident-lifetime-hours:24}")
  private int lifetimeHours;

  public IncidentCleanupService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  // Run every 10 minutes to keep database clean
  @Scheduled(fixedRate = 600000)
  public void cleanExpiredIncidents() {
    try {
      LocalDateTime cutoff = LocalDateTime.now().minusHours(lifetimeHours);
      log.info("Running scheduled incident cleanup. Deleting incidents created before: {}", cutoff);
      
      int deletedCount = jdbc.sql("DELETE FROM incidents WHERE created_at < :cutoff")
          .param("cutoff", cutoff)
          .update();
          
      if (deletedCount > 0) {
        log.info("Successfully deleted {} expired incident(s).", deletedCount);
      }
    } catch (Exception e) {
      log.error("Failed to execute scheduled incident cleanup: ", e);
    }
  }
}
