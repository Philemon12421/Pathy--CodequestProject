package com.safetrack.api.controller;

import com.safetrack.api.auth.JwtService;
import com.safetrack.api.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final JdbcClient jdbc;
  private final JwtService jwtService;
  private final EmailService emailService;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

  public AuthController(JdbcClient jdbc, JwtService jwtService, EmailService emailService) {
    this.jdbc = jdbc;
    this.jwtService = jwtService;
    this.emailService = emailService;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
    String name = body.get("name");
    String email = body.get("email");
    String password = body.get("password");
    if (blank(name) || blank(email) || blank(password)) {
      return ResponseEntity.badRequest().body(Map.of("error", "All fields required"));
    }

    Integer count = jdbc.sql("SELECT COUNT(*) FROM users WHERE email=:email").param("email", email).query(Integer.class).single();
    if (count > 0) return ResponseEntity.status(409).body(Map.of("error", "Email already registered"));

    Map<String, Object> user = jdbc.sql("INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash) RETURNING id, name, email")
        .param("name", name).param("email", email).param("hash", encoder.encode(password)).query().singleRow();
    String token = jwtService.createToken((UUID) user.get("id"), (String) user.get("email"));
    Map<String, Object> publicUser = Map.of(
        "id", user.get("id"),
        "name", user.get("name"),
        "email", user.get("email"),
        "avatar_url", "",
        "balance", 0.00
    );
    return ResponseEntity.status(201).body(Map.of("token", token, "user", publicUser));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
    List<Map<String, Object>> rows = jdbc.sql("SELECT * FROM users WHERE email=:email")
        .param("email", body.get("email")).query().listOfRows();
    if (rows.isEmpty() || !encoder.matches(body.getOrDefault("password", ""), (String) rows.get(0).get("password_hash"))) {
      return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }

    Map<String, Object> user = rows.get(0);
    String token = jwtService.createToken((UUID) user.get("id"), (String) user.get("email"));
    
    // Read balance and handle potential null
    Number balanceNum = (Number) user.get("balance");
    double balance = balanceNum != null ? balanceNum.doubleValue() : 0.0;

    Map<String, Object> publicUser = Map.of(
        "id", user.get("id"),
        "name", user.get("name"),
        "email", user.get("email"),
        "avatar_url", user.get("avatar_url") == null ? "" : user.get("avatar_url"),
        "balance", balance
    );
    return ResponseEntity.ok(Map.of("token", token, "user", publicUser));
  }

  // ─── Forgot Password Flow ──────────────────────────────────────────────────

  @PostMapping("/forgot-password")
  public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
    String email = body.get("email");
    if (blank(email)) return ResponseEntity.badRequest().body(Map.of("error", "Email required"));

    Integer count = jdbc.sql("SELECT COUNT(*) FROM users WHERE email=:email").param("email", email).query(Integer.class).single();
    if (count == 0) {
      // Don't reveal whether the email exists — return success anyway
      return ResponseEntity.ok(Map.of("message", "If that email is registered, a code has been sent."));
    }

    String code = generateCode();
    // Clean up old codes for this email/type
    jdbc.sql("DELETE FROM verification_codes WHERE email=:email AND type='password_reset'").param("email", email).update();
    jdbc.sql("INSERT INTO verification_codes (email, code, type, expires_at) VALUES (:email, :code, 'password_reset', NOW() + INTERVAL '15 minutes')")
        .param("email", email).param("code", code).update();

    // Send code to user's email via EmailService
    emailService.sendPasswordResetOtp(email, code);

    return ResponseEntity.ok(Map.of(
        "message", "If that email is registered, a code has been sent."
    ));
  }

  @PostMapping("/verify-reset-code")
  public ResponseEntity<?> verifyResetCode(@RequestBody Map<String, String> body) {
    String email = body.get("email");
    String code = body.get("code");
    if (blank(email) || blank(code)) return ResponseEntity.badRequest().body(Map.of("error", "Email and code required"));

    List<Map<String, Object>> rows = jdbc.sql(
        "SELECT * FROM verification_codes WHERE email=:email AND code=:code AND type='password_reset' AND expires_at > NOW()")
        .param("email", email).param("code", code).query().listOfRows();

    if (rows.isEmpty()) return ResponseEntity.status(400).body(Map.of("error", "Invalid or expired code"));
    return ResponseEntity.ok(Map.of("valid", true));
  }

  @PostMapping("/reset-password")
  public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
    String email = body.get("email");
    String code = body.get("code");
    String password = body.get("password");
    if (blank(email) || blank(code) || blank(password)) return ResponseEntity.badRequest().body(Map.of("error", "All fields required"));
    if (password.length() < 6) return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));

    List<Map<String, Object>> rows = jdbc.sql(
        "SELECT * FROM verification_codes WHERE email=:email AND code=:code AND type='password_reset' AND expires_at > NOW()")
        .param("email", email).param("code", code).query().listOfRows();

    if (rows.isEmpty()) return ResponseEntity.status(400).body(Map.of("error", "Invalid or expired code"));

    jdbc.sql("UPDATE users SET password_hash=:hash WHERE email=:email")
        .param("hash", encoder.encode(password)).param("email", email).update();
    jdbc.sql("DELETE FROM verification_codes WHERE email=:email AND type='password_reset'").param("email", email).update();

    return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
  }

  // ─── Email Verification Flow ───────────────────────────────────────────────

  @PostMapping("/verify-email")
  public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> body) {
    String email = body.get("email");
    String code = body.get("code");
    if (blank(email) || blank(code)) return ResponseEntity.badRequest().body(Map.of("error", "Email and code required"));

    List<Map<String, Object>> rows = jdbc.sql(
        "SELECT * FROM verification_codes WHERE email=:email AND code=:code AND type='email_verification' AND expires_at > NOW()")
        .param("email", email).param("code", code).query().listOfRows();

    if (rows.isEmpty()) return ResponseEntity.status(400).body(Map.of("error", "Invalid or expired code"));

    jdbc.sql("UPDATE users SET is_verified=TRUE WHERE email=:email").param("email", email).update();
    jdbc.sql("DELETE FROM verification_codes WHERE email=:email AND type='email_verification'").param("email", email).update();

    return ResponseEntity.ok(Map.of("verified", true));
  }

  @PostMapping("/resend-verification")
  public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
    String email = body.get("email");
    if (blank(email)) return ResponseEntity.badRequest().body(Map.of("error", "Email required"));

    String code = generateCode();
    jdbc.sql("DELETE FROM verification_codes WHERE email=:email AND type='email_verification'").param("email", email).update();
    jdbc.sql("INSERT INTO verification_codes (email, code, type, expires_at) VALUES (:email, :code, 'email_verification', NOW() + INTERVAL '15 minutes')")
        .param("email", email).param("code", code).update();

    // Send verification code to user's email via EmailService
    emailService.sendEmailVerificationOtp(email, code);

    return ResponseEntity.ok(Map.of(
        "message", "Verification code sent"
    ));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private boolean blank(String value) { return value == null || value.isBlank(); }

  private String generateCode() {
    return String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
  }
}
