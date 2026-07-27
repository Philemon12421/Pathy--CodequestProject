package com.safetrack.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safetrack.api.service.NotificationService;
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
@RequestMapping("/api/wallet")
public class WalletController extends BaseController {

  private final JdbcClient jdbc;
  private final String paystackSecretKey;
  private final NotificationService notifications;
  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper objectMapper = new ObjectMapper();

  public WalletController(
      JdbcClient jdbc,
      @Value("${app.paystack-secret-key:}") String paystackSecretKey,
      NotificationService notifications) {
    this.jdbc = jdbc;
    this.paystackSecretKey = paystackSecretKey;
    this.notifications = notifications;
  }

  @GetMapping("/me")
  public ResponseEntity<?> getMe(HttpServletRequest request) {
    UUID userId = user(request).id();
    List<Map<String, Object>> rows = jdbc.sql("SELECT id, name, email, avatar_url, balance FROM users WHERE id=:id")
        .param("id", userId).query().listOfRows();
    if (rows.isEmpty()) {
      return ResponseEntity.status(404).body(Map.of("error", "User not found"));
    }
    return ResponseEntity.ok(rows.get(0));
  }

  @PatchMapping("/profile")
  public ResponseEntity<?> updateProfile(HttpServletRequest request, @RequestBody Map<String, String> body) {
    UUID userId = user(request).id();
    String name = body.get("name");
    if (name == null || name.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Name cannot be empty"));
    }
    jdbc.sql("UPDATE users SET name=:name WHERE id=:id")
        .param("name", name.trim())
        .param("id", userId)
        .update();
    // Return updated user
    List<Map<String, Object>> rows = jdbc.sql("SELECT id, name, email, avatar_url, balance FROM users WHERE id=:id")
        .param("id", userId).query().listOfRows();
    return ResponseEntity.ok(rows.get(0));
  }

  @PostMapping("/deposit")
  public ResponseEntity<?> deposit(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    if (body.get("amount") == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "Amount is required"));
    }

    double amountGhs;
    try {
      amountGhs = ((Number) body.get("amount")).doubleValue();
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount format"));
    }

    if (amountGhs <= 0) {
      return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
    }

    int amountPesewas = (int) Math.round(amountGhs * 100);
    UUID userId = user(request).id();
    String email = user(request).email();
    String reference = "dep_" + userId + "_" + System.currentTimeMillis();

    try {
      // 1. Insert pending deposit record into DB
      jdbc.sql("INSERT INTO deposits (user_id, amount, status, paystack_reference) VALUES (:user_id, :amount, 'pending', :ref)")
          .param("user_id", userId)
          .param("amount", amountGhs)
          .param("ref", reference)
          .update();

      // 2. Call Paystack Transaction Initialize
      String paystackBody = objectMapper.writeValueAsString(Map.of(
          "email", email,
          "amount", amountPesewas,
          "reference", reference,
          "currency", "GHS"
      ));

      HttpRequest paystackReq = HttpRequest.newBuilder()
          .uri(URI.create("https://api.paystack.co/transaction/initialize"))
          .header("Authorization", "Bearer " + paystackSecretKey)
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(paystackBody))
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

      return ResponseEntity.ok(Map.of(
          "amount_ghs", amountGhs,
          "reference", reference,
          "authorization_url", authorizationUrl
      ));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(Map.of("error", "Failed to initialize deposit: " + e.getMessage()));
    }
  }

  @PostMapping("/verify")
  public ResponseEntity<?> verify(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    String reference = body.get("reference") == null ? null : String.valueOf(body.get("reference"));
    if (reference == null || reference.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Reference is required"));
    }

    UUID userId = user(request).id();

    // Check deposit status in DB
    List<Map<String, Object>> rows = jdbc.sql("SELECT * FROM deposits WHERE paystack_reference=:ref AND user_id=:user_id")
        .param("ref", reference)
        .param("user_id", userId)
        .query().listOfRows();

    if (rows.isEmpty()) {
      return ResponseEntity.status(404).body(Map.of("error", "Deposit record not found"));
    }

    Map<String, Object> deposit = rows.get(0);
    String status = (String) deposit.get("status");

    if ("success".equals(status)) {
      // Already verified, return updated user info
      return getMe(request);
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

      // Success! Update deposit record and user's balance
      double amount = ((Number) deposit.get("amount")).doubleValue();

      // Update deposit status to success
      jdbc.sql("UPDATE deposits SET status='success' WHERE id=:id")
          .param("id", deposit.get("id"))
          .update();

      // Credit user's balance
      jdbc.sql("UPDATE users SET balance = balance + :amount WHERE id=:id")
          .param("amount", amount)
          .param("id", userId)
          .update();

      notifications.create(userId, "Wallet Credited", "Successfully deposited GHS " + String.format("%.2f", amount) + " to your wallet.", "wallet_deposit");

      // Return the updated user info
      return getMe(request);

    } catch (Exception e) {
      return ResponseEntity.status(500).body(Map.of("error", "Verification failed: " + e.getMessage()));
    }
  }
}
