package com.safetrack.api.controller;

import com.safetrack.api.auth.JwtService;
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
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

  public AuthController(JdbcClient jdbc, JwtService jwtService) {
    this.jdbc = jdbc;
    this.jwtService = jwtService;
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
    return ResponseEntity.status(201).body(Map.of("token", token, "user", user));
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
    Map<String, Object> publicUser = Map.of(
        "id", user.get("id"), "name", user.get("name"), "email", user.get("email"),
        "avatar_url", user.get("avatar_url") == null ? "" : user.get("avatar_url"));
    return ResponseEntity.ok(Map.of("token", token, "user", publicUser));
  }

  private boolean blank(String value) { return value == null || value.isBlank(); }
}
