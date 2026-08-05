package com.safetrack.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safetrack.api.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/routes")
public class SavedRouteController extends BaseController {
  private final JdbcClient jdbc;
  private final ObjectMapper mapper;
  private final NotificationService notifications;

  public SavedRouteController(JdbcClient jdbc, ObjectMapper mapper, NotificationService notifications) {
    this.jdbc = jdbc;
    this.mapper = mapper;
    this.notifications = notifications;
  }

  @GetMapping
  public Object list(HttpServletRequest request) {
    return jdbc.sql("SELECT * FROM saved_routes WHERE user_id=:user_id ORDER BY is_favorite DESC, created_at DESC")
        .param("user_id", user(request).id()).query().listOfRows();
  }

  @GetMapping("/feed")
  public Object feed(HttpServletRequest request) {
    return jdbc.sql("""
        SELECT 
          r.id,
          r.user_id,
          r.name AS title,
          u.name AS author_name,
          u.avatar_url AS author_avatar,
          r.origin_name,
          r.destination_name,
          r.origin_lat,
          r.origin_lng,
          r.destination_lat,
          r.destination_lng,
          COALESCE(r.distance, 0) AS distance,
          COALESCE(r.duration, 0) AS duration,
          r.caption,
          COALESCE(r.activity_type, 'walking') AS activity_type,
          r.created_at
        FROM saved_routes r
        JOIN users u ON r.user_id = u.id
        WHERE r.is_public = TRUE
        ORDER BY r.created_at DESC
        LIMIT 100
        """)
        .query().listOfRows();
  }

  /**
   * Leaderboard — all-time: aggregate total km per user using the Haversine
   * formula on each route's origin→destination great-circle distance.
   * Returns top 50 users ranked by total_km descending.
   */
  @GetMapping("/leaderboard")
  public Object leaderboard(HttpServletRequest request) {
    return jdbc.sql("""
        SELECT
          u.id        AS user_id,
          u.name      AS user_name,
          u.avatar_url,
          COUNT(r.id) AS route_count,
          COALESCE(SUM(
            6371.0 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(r.destination_lat - r.origin_lat) / 2), 2) +
              COS(RADIANS(r.origin_lat)) * COS(RADIANS(r.destination_lat)) *
              POWER(SIN(RADIANS(r.destination_lng - r.origin_lng) / 2), 2)
            ))
          ), 0) AS total_km
        FROM users u
        LEFT JOIN saved_routes r ON r.user_id = u.id
        GROUP BY u.id, u.name, u.avatar_url
        HAVING COUNT(r.id) > 0
        ORDER BY total_km DESC
        LIMIT 50
        """)
        .query().listOfRows();
  }

  /**
   * Leaderboard — weekly: same as above but restricted to routes saved
   * within the current ISO calendar week.
   */
  @GetMapping("/leaderboard/weekly")
  public Object leaderboardWeekly(HttpServletRequest request) {
    return jdbc.sql("""
        SELECT
          u.id        AS user_id,
          u.name      AS user_name,
          u.avatar_url,
          COUNT(r.id) AS route_count,
          COALESCE(SUM(
            6371.0 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(r.destination_lat - r.origin_lat) / 2), 2) +
              COS(RADIANS(r.origin_lat)) * COS(RADIANS(r.destination_lat)) *
              POWER(SIN(RADIANS(r.destination_lng - r.origin_lng) / 2), 2)
            ))
          ), 0) AS total_km
        FROM users u
        LEFT JOIN saved_routes r ON r.user_id = u.id
          AND r.created_at >= DATE_TRUNC('week', NOW())
        GROUP BY u.id, u.name, u.avatar_url
        HAVING COUNT(r.id) > 0
        ORDER BY total_km DESC
        LIMIT 50
        """)
        .query().listOfRows();
  }

  @PostMapping
  public ResponseEntity<?> create(HttpServletRequest request, @RequestBody Map<String, Object> body) throws Exception {
    String routeData = body.get("route_data") == null ? "{}" : mapper.writeValueAsString(body.get("route_data"));
    Boolean isPublic = body.get("is_public") != null && Boolean.parseBoolean(body.get("is_public").toString());
    String caption = body.get("caption") != null ? body.get("caption").toString() : "";
    String activityType = body.get("activity_type") != null ? body.get("activity_type").toString() : "walking";
    Object distance = body.get("distance");
    Object duration = body.get("duration");

    Map<String, Object> route = jdbc.sql("""
        INSERT INTO saved_routes (user_id, name, origin_name, destination_name, origin_lat, origin_lng, destination_lat, destination_lng, route_data, is_public, caption, activity_type, distance, duration)
        VALUES (:user_id,:name,:origin_name,:destination_name,:origin_lat,:origin_lng,:destination_lat,:destination_lng,CAST(:route_data AS jsonb),:is_public,:caption,:activity_type,:distance,:duration) RETURNING *
        """)
        .param("user_id", user(request).id())
        .param("name", body.get("name"))
        .param("origin_name", body.get("origin_name"))
        .param("destination_name", body.get("destination_name"))
        .param("origin_lat", body.get("origin_lat"))
        .param("origin_lng", body.get("origin_lng"))
        .param("destination_lat", body.get("destination_lat"))
        .param("destination_lng", body.get("destination_lng"))
        .param("route_data", routeData)
        .param("is_public", isPublic)
        .param("caption", caption)
        .param("activity_type", activityType)
        .param("distance", distance)
        .param("duration", duration)
        .query().singleRow();

    notifications.create(user(request).id(), isPublic ? "Route Posted" : "Route Saved", 
        "You successfully " + (isPublic ? "posted" : "saved") + " a new route: \"" + body.get("name") + "\".", 
        "route_saved");

    return ResponseEntity.status(201).body(route);
  }


  @PatchMapping("/{id}/favorite")
  public ResponseEntity<?> toggleFavorite(HttpServletRequest request, @PathVariable("id") UUID id) {
    List<java.util.Map<String, Object>> rows = jdbc.sql("UPDATE saved_routes SET is_favorite = NOT is_favorite WHERE id=:id AND user_id=:user_id RETURNING *")
        .param("id", id).param("user_id", user(request).id()).query().listOfRows();
    if (rows.isEmpty()) return ResponseEntity.status(404).body(java.util.Map.of("error", "Route not found"));
    return ResponseEntity.ok(rows.get(0));
  }


  @DeleteMapping("/{id}")
  public Object delete(HttpServletRequest request, @PathVariable("id") UUID id) {
    jdbc.sql("DELETE FROM saved_routes WHERE id=:id AND user_id=:user_id").param("id", id).param("user_id", user(request).id()).update();
    return Map.of("success", true);
  }
}
