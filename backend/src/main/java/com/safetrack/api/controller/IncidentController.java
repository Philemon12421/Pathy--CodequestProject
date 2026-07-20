package com.safetrack.api.controller;

import com.safetrack.api.service.FileStorageService;
import com.safetrack.api.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController extends BaseController {
  private final JdbcClient jdbc;
  private final FileStorageService files;
  private final NotificationService notifications;

  public IncidentController(JdbcClient jdbc, FileStorageService files, NotificationService notifications) {
    this.jdbc = jdbc;
    this.files = files;
    this.notifications = notifications;
  }

  @GetMapping
  public Object list() {
    return jdbc.sql("SELECT i.*, u.name AS reporter_name FROM incidents i LEFT JOIN users u ON i.user_id = u.id WHERE i.status != 'resolved' ORDER BY i.created_at DESC LIMIT 100").query().listOfRows();
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<?> create(HttpServletRequest request,
      @RequestParam(name = "type") String type, @RequestParam(name = "title") String title,
      @RequestParam(name = "description", required = false) String description,
      @RequestParam(name = "latitude") String latitude, @RequestParam(name = "longitude") String longitude,
      @RequestParam(name = "severity", required = false, defaultValue = "medium") String severity,
      @RequestPart(name = "media", required = false) MultipartFile media) throws Exception {
    String mediaUrl = files.save(media, "");
    Map<String, Object> incident = jdbc.sql("""
        INSERT INTO incidents (user_id, type, title, description, latitude, longitude, severity, media_url)
        VALUES (:user_id,:type,:title,:description,:latitude,:longitude,:severity,:media_url) RETURNING *
        """)
        .param("user_id", user(request).id()).param("type", type).param("title", title).param("description", description)
        .param("latitude", Double.valueOf(latitude)).param("longitude", Double.valueOf(longitude)).param("severity", severity).param("media_url", mediaUrl)
        .query().singleRow();

    notifications.create(user(request).id(), "New Incident Reported", "You reported a new " + type + " incident: \"" + title + "\".", "incident_created");

    return ResponseEntity.status(201).body(incident);
  }

  @PatchMapping("/{id}")
  public ResponseEntity<?> updateStatus(HttpServletRequest request, @PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
    List<Map<String, Object>> rows = jdbc.sql("UPDATE incidents SET status=:status, updated_at=NOW() WHERE id=:id AND user_id=:user_id RETURNING *")
        .param("status", body.get("status")).param("id", id).param("user_id", user(request).id()).query().listOfRows();
    if (rows.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Incident not found"));
    return ResponseEntity.ok(rows.get(0));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(HttpServletRequest request, @PathVariable("id") UUID id) {
    List<Map<String, Object>> existing = jdbc.sql("SELECT * FROM incidents WHERE id=:id").param("id", id).query().listOfRows();
    if (existing.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Incident not found"));
    Map<String, Object> incident = existing.get(0);

    if (!user(request).id().equals(incident.get("user_id"))) {
      return ResponseEntity.status(403).body(Map.of("error", "You are not authorized to delete this incident"));
    }

    int requiredMinutes = switch (String.valueOf(incident.get("severity"))) {
      case "medium" -> 5;
      case "high" -> 10;
      case "critical" -> 15;
      default -> 2;
    };
    Instant created = ((Timestamp) incident.get("created_at")).toInstant();
    long elapsedSeconds = Instant.now().getEpochSecond() - created.getEpochSecond();
    long requiredSeconds = requiredMinutes * 60L;
    if (elapsedSeconds < requiredSeconds) {
      long remaining = requiredSeconds - elapsedSeconds;
      String time = remaining >= 60 ? (remaining / 60) + "m " + (remaining % 60) + "s" : remaining + "s";
      return ResponseEntity.badRequest().body(Map.of("error", "This incident cannot be deleted yet. For safety, " + incident.get("severity") + " intensity incidents must remain active for at least " + requiredMinutes + " minutes. Please wait another " + time + "."));
    }

    jdbc.sql("DELETE FROM incidents WHERE id=:id").param("id", id).update();
    return ResponseEntity.ok(Map.of("success", true));
  }
}
