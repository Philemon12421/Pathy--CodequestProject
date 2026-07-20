package com.safetrack.api.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController extends BaseController {
  private final JdbcClient jdbc;

  public NotificationController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  public Object list(HttpServletRequest request) {
    return jdbc.sql("SELECT * FROM notifications WHERE user_id=:user_id ORDER BY created_at DESC LIMIT 100")
        .param("user_id", user(request).id()).query().listOfRows();
  }

  @PatchMapping("/{id}/read")
  public ResponseEntity<?> markAsRead(HttpServletRequest request, @PathVariable("id") UUID id) {
    int updated = jdbc.sql("UPDATE notifications SET read=true WHERE id=:id AND user_id=:user_id")
        .param("id", id).param("user_id", user(request).id()).update();
    if (updated == 0) return ResponseEntity.status(404).body(Map.of("error", "Notification not found"));
    return ResponseEntity.ok(Map.of("success", true));
  }

  @PostMapping("/read-all")
  public ResponseEntity<?> readAll(HttpServletRequest request) {
    jdbc.sql("UPDATE notifications SET read=true WHERE user_id=:user_id")
        .param("user_id", user(request).id()).update();
    return ResponseEntity.ok(Map.of("success", true));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(HttpServletRequest request, @PathVariable("id") UUID id) {
    int deleted = jdbc.sql("DELETE FROM notifications WHERE id=:id AND user_id=:user_id")
        .param("id", id).param("user_id", user(request).id()).update();
    if (deleted == 0) return ResponseEntity.status(404).body(Map.of("error", "Notification not found"));
    return ResponseEntity.ok(Map.of("success", true));
  }

  @DeleteMapping
  public ResponseEntity<?> deleteAll(HttpServletRequest request) {
    jdbc.sql("DELETE FROM notifications WHERE user_id=:user_id")
        .param("user_id", user(request).id()).update();
    return ResponseEntity.ok(Map.of("success", true));
  }
}
