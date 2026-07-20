package com.safetrack.api.service;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class NotificationService {
  private final JdbcClient jdbc;

  public NotificationService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public void create(UUID userId, String title, String message, String type) {
    jdbc.sql("""
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (:userId, :title, :message, :type)
        """)
        .param("userId", userId)
        .param("title", title)
        .param("message", message)
        .param("type", type)
        .update();
  }
}
