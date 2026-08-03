package com.safetrack.api.service;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import java.util.UUID;
import java.util.Map;
import java.util.List;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.CompletableFuture;

@Service
public class NotificationService {
  private final JdbcClient jdbc;
  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper mapper = new ObjectMapper();

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

    // Check if user has a push token and send via Expo
    CompletableFuture.runAsync(() -> {
      List<Map<String, Object>> rows = jdbc.sql("SELECT push_token FROM users WHERE id = :id AND push_token IS NOT NULL")
          .param("id", userId).query().listOfRows();

      if (!rows.isEmpty()) {
        String pushToken = (String) rows.get(0).get("push_token");
        sendExpoPushNotification(pushToken, title, message);
      }
    });
  }

  private void sendExpoPushNotification(String pushToken, String title, String body) {
    try {
      String json = mapper.writeValueAsString(Map.of(
          "to", pushToken,
          "title", title,
          "body", body
      ));

      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create("https://exp.host/--/api/v2/push/send"))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(json))
          .build();

      httpClient.send(request, HttpResponse.BodyHandlers.discarding());
    } catch (Exception e) {
      System.err.println("⚠️ Failed to send push notification to Expo: " + e.getMessage());
    }
  }
}
