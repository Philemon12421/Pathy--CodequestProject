package com.safetrack.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ads")
public class AdsController extends BaseController {

  private static final int AD_DURATION_DAYS = 30;
  private static final double BASE_PRICE_GHS = 50.0;
  private static final double[] RADIUS_OPTIONS = {0.5, 1.0, 2.0, 5.0, 10.0};

  private final JdbcClient jdbc;
  private final String paystackSecretKey;
  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper objectMapper = new ObjectMapper();

  public AdsController(
      JdbcClient jdbc,
      @Value("${app.paystack-secret-key:}") String paystackSecretKey) {
    this.jdbc = jdbc;
    this.paystackSecretKey = paystackSecretKey;
  }

  // ── Price helper ─────────────────────────────────────────────────────────────
  // Computes price where each larger radius option costs double the previous one.
  // Smallest size (index 0) starts at GH₵ 50; subsequent sizes are 100, 200, 400, 800 GH₵.
  // Returned amount is in pesewas for Paystack.

  private int computeAmountPesewas(double radiusKm) {
    int idx = 0;
    double minDiff = Double.MAX_VALUE;
    for (int i = 0; i < RADIUS_OPTIONS.length; i++) {
      double diff = Math.abs(RADIUS_OPTIONS[i] - radiusKm);
      if (diff < minDiff) { minDiff = diff; idx = i; }
    }
    double priceGhs = BASE_PRICE_GHS * Math.pow(2, idx);
    return (int) Math.round(priceGhs * 100); // convert to pesewas
  }

  // ── Public endpoints ─────────────────────────────────────────────────────────

  @GetMapping
  public Object list() {
    return jdbc.sql("""
        SELECT id, business_name, description, latitude, longitude, radius_km, image_url, website_url
        FROM ads WHERE payment_status='paid' AND active=true AND (expires_at IS NULL OR expires_at > NOW())
        """).query().listOfRows();
  }

  @GetMapping("/nearby")
  public ResponseEntity<?> nearby(
      @RequestParam(name = "lat", required = false) Double lat,
      @RequestParam(name = "lng", required = false) Double lng) {
    if (lat == null || lng == null)
      return ResponseEntity.badRequest().body(Map.of("error", "lat and lng required"));
    return ResponseEntity.ok(jdbc.sql("""
        SELECT * FROM (
          SELECT id, business_name, description, latitude, longitude, radius_km, image_url, website_url,
            (6371 * acos(
              cos(radians(:lat)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(:lng)) +
              sin(radians(:lat)) * sin(radians(latitude))
            )) AS distance_km
          FROM ads
          WHERE payment_status='paid' AND active=true AND (expires_at IS NULL OR expires_at > NOW())
        ) nearby_ads
        WHERE distance_km <= radius_km
        ORDER BY distance_km ASC
        """).param("lat", lat).param("lng", lng).query().listOfRows());
  }

  @GetMapping("/mine")
  public Object mine(HttpServletRequest request) {
    return jdbc.sql("SELECT * FROM ads WHERE user_id=:user_id ORDER BY created_at DESC")
        .param("user_id", user(request).id()).query().listOfRows();
  }

  @PostMapping
  public ResponseEntity<?> create(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    String businessName = body.get("business_name") == null ? null : String.valueOf(body.get("business_name"));
    if (businessName == null || businessName.isBlank())
      return ResponseEntity.badRequest().body(Map.of("error", "Business name is required"));
    if (body.get("latitude") == null || body.get("longitude") == null)
      return ResponseEntity.badRequest().body(Map.of("error", "Location is required"));

    Map<String, Object> ad = jdbc.sql("""
        INSERT INTO ads (user_id, business_name, description, latitude, longitude, radius_km, website_url)
        VALUES (:user_id,:business_name,:description,:latitude,:longitude,:radius_km,:website_url) RETURNING *
        """)
        .param("user_id", user(request).id())
        .param("business_name", businessName)
        .param("description", body.get("description"))
        .param("latitude", body.get("latitude"))
        .param("longitude", body.get("longitude"))
        .param("radius_km", body.getOrDefault("radius_km", 2))
        .param("website_url", body.get("website_url"))
        .query().singleRow();
    return ResponseEntity.status(201).body(ad);
  }

  // ── POST /api/ads/{id}/checkout ───────────────────────────────────────────────
  // Initialises a Paystack transaction and returns the authorization_url + reference.
  @PostMapping("/{id}/checkout")
  public ResponseEntity<?> checkout(HttpServletRequest request, @PathVariable("id") UUID id) {
    // Verify ad belongs to this user
    List<Map<String, Object>> rows = jdbc.sql("SELECT * FROM ads WHERE id=:id AND user_id=:user_id")
        .param("id", id).param("user_id", user(request).id()).query().listOfRows();
    if (rows.isEmpty())
      return ResponseEntity.status(404).body(Map.of("error", "Ad not found"));

    Map<String, Object> ad = rows.get(0);

    // Compute price based on radius
    double radiusKm = ((Number) ad.getOrDefault("radius_km", 2)).doubleValue();
    int amountPesewas = computeAmountPesewas(radiusKm);

    // Unique reference for this transaction
    String reference = "pathy_" + id + "_" + System.currentTimeMillis();
    String email = user(request).email();

    try {
      // Build Paystack initialize request body
      String body = objectMapper.writeValueAsString(Map.of(
          "email", email,
          "amount", amountPesewas,
          "reference", reference,
          "currency", "GHS",
          "metadata", Map.of(
              "ad_id", id.toString(),
              "business_name", ad.getOrDefault("business_name", ""),
              "radius_km", radiusKm
          )
      ));

      HttpRequest paystackReq = HttpRequest.newBuilder()
          .uri(URI.create("https://api.paystack.co/transaction/initialize"))
          .header("Authorization", "Bearer " + paystackSecretKey)
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();

      HttpResponse<String> paystackResp = httpClient.send(paystackReq, HttpResponse.BodyHandlers.ofString());

      @SuppressWarnings("unchecked")
      Map<String, Object> parsed = objectMapper.readValue(paystackResp.body(), Map.class);

      if (!(Boolean) parsed.getOrDefault("status", false)) {
        String message = (String) parsed.getOrDefault("message", "Paystack initialization failed");
        return ResponseEntity.status(502).body(Map.of("error", message));
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> data = (Map<String, Object>) parsed.get("data");
      String authorizationUrl = (String) data.get("authorization_url");

      // Persist reference so we can verify later
      jdbc.sql("UPDATE ads SET paystack_reference=:ref WHERE id=:id")
          .param("ref", reference).param("id", id).update();

      return ResponseEntity.ok(Map.of(
          "ad_id", id,
          "amount_pesewas", amountPesewas,
          "amount_ghs", amountPesewas / 100.0,
          "amount_display", "GHS " + String.format("%.2f", amountPesewas / 100.0),
          "reference", reference,
          "authorization_url", authorizationUrl
      ));

    } catch (Exception e) {
      return ResponseEntity.status(500).body(Map.of("error", "Could not initialise payment: " + e.getMessage()));
    }
  }

  // ── POST /api/ads/{id}/verify ─────────────────────────────────────────────────
  // Verifies a Paystack payment by reference, then activates the ad.
  @PostMapping("/{id}/verify")
  public ResponseEntity<?> verify(HttpServletRequest request, @PathVariable("id") UUID id,
      @RequestBody Map<String, Object> body) {
    String reference = body.get("reference") == null ? null : String.valueOf(body.get("reference"));
    if (reference == null || reference.isBlank())
      return ResponseEntity.badRequest().body(Map.of("error", "reference is required"));

    // Verify ad belongs to this user and reference matches
    List<Map<String, Object>> rows = jdbc.sql(
        "SELECT * FROM ads WHERE id=:id AND user_id=:user_id AND paystack_reference=:ref")
        .param("id", id).param("user_id", user(request).id()).param("ref", reference)
        .query().listOfRows();
    if (rows.isEmpty())
      return ResponseEntity.status(404).body(Map.of("error", "Ad or reference not found"));

    // Check if already paid (idempotent)
    Map<String, Object> ad = rows.get(0);
    if ("paid".equals(ad.get("payment_status"))) {
      return ResponseEntity.ok(ad);
    }

    try {
      // Call Paystack verify API
      HttpRequest paystackReq = HttpRequest.newBuilder()
          .uri(URI.create("https://api.paystack.co/transaction/verify/" + reference))
          .header("Authorization", "Bearer " + paystackSecretKey)
          .GET()
          .build();

      HttpResponse<String> paystackResp = httpClient.send(paystackReq, HttpResponse.BodyHandlers.ofString());

      @SuppressWarnings("unchecked")
      Map<String, Object> parsed = objectMapper.readValue(paystackResp.body(), Map.class);

      if (!(Boolean) parsed.getOrDefault("status", false)) {
        return ResponseEntity.status(402).body(Map.of("error", "Payment verification failed"));
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> data = (Map<String, Object>) parsed.get("data");
      String txStatus = (String) data.get("status");

      if (!"success".equals(txStatus)) {
        return ResponseEntity.status(402).body(Map.of(
            "error", "Payment not completed. Status: " + txStatus,
            "paystack_status", txStatus
        ));
      }

      // Payment confirmed — activate the ad
      List<Map<String, Object>> activated = jdbc.sql("""
          UPDATE ads
          SET payment_status='paid', active=true,
              expires_at = NOW() + (:days * INTERVAL '1 day')
          WHERE id=:id AND user_id=:user_id
          RETURNING *
          """)
          .param("days", AD_DURATION_DAYS)
          .param("id", id)
          .param("user_id", user(request).id())
          .query().listOfRows();

      return ResponseEntity.ok(activated.get(0));

    } catch (Exception e) {
      return ResponseEntity.status(500).body(Map.of("error", "Verification failed: " + e.getMessage()));
    }
  }

  // ── POST /api/ads/{id}/activate ───────────────────────────────────────────────
  // Directly activates the ad for simulation/simple payment confirmation.
  @PostMapping("/{id}/activate")
  public ResponseEntity<?> activate(HttpServletRequest request, @PathVariable("id") UUID id) {
    // Verify ad belongs to this user
    UUID userId = user(request).id();
    List<Map<String, Object>> rows = jdbc.sql("SELECT * FROM ads WHERE id=:id AND user_id=:user_id")
        .param("id", id).param("user_id", userId).query().listOfRows();
    if (rows.isEmpty())
      return ResponseEntity.status(404).body(Map.of("error", "Ad not found"));

    Map<String, Object> ad = rows.get(0);
    
    // If already paid, return it (idempotency)
    if ("paid".equals(ad.get("payment_status"))) {
      return ResponseEntity.ok(ad);
    }

    // Compute price based on radius
    double radiusKm = ad.get("radius_km") != null ? ((Number) ad.get("radius_km")).doubleValue() : 2.0;
    int amountPesewas = computeAmountPesewas(radiusKm);
    double priceGhs = amountPesewas / 100.0;

    // Fetch user's current balance
    Map<String, Object> userRow = jdbc.sql("SELECT balance FROM users WHERE id=:id")
        .param("id", userId).query().singleRow();
    Number balanceNum = (Number) userRow.get("balance");
    double balance = balanceNum != null ? balanceNum.doubleValue() : 0.0;

    // Check if user has enough balance
    if (balance < priceGhs) {
      return ResponseEntity.badRequest().body(Map.of(
          "error", "Insufficient balance. You need GH₵ " + String.format("%.2f", priceGhs) + 
                   " but your current balance is GH₵ " + String.format("%.2f", balance) + "."
      ));
    }

    try {
      // Deduct from balance
      jdbc.sql("UPDATE users SET balance = balance - :price WHERE id=:id")
          .param("price", priceGhs).param("id", userId).update();

      // Activate ad
      List<Map<String, Object>> activated = jdbc.sql("""
          UPDATE ads
          SET payment_status='paid', active=true,
              expires_at = NOW() + (:days * INTERVAL '1 day')
          WHERE id=:id AND user_id=:user_id
          RETURNING *
          """)
          .param("days", AD_DURATION_DAYS)
          .param("id", id)
          .param("user_id", userId)
          .query().listOfRows();

      if (activated.isEmpty()) {
        return ResponseEntity.status(500).body(Map.of("error", "Could not activate ad"));
      }
      return ResponseEntity.ok(activated.get(0));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(Map.of("error", "Activation failed: " + e.getMessage()));
    }
  }

  // ── DELETE /api/ads/{id} ──────────────────────────────────────────────────────
  @DeleteMapping("/{id}")
  public Object delete(HttpServletRequest request, @PathVariable("id") UUID id) {
    jdbc.sql("DELETE FROM ads WHERE id=:id AND user_id=:user_id")
        .param("id", id).param("user_id", user(request).id()).update();
    return Map.of("success", true);
  }
}
