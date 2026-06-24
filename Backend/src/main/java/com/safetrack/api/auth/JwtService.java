package com.safetrack.api.auth;

import com.safetrack.api.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {
  private final SecretKey key;

  public JwtService(AppProperties properties) {
    byte[] secret = properties.jwtSecret().getBytes(StandardCharsets.UTF_8);
    if (secret.length < 32) {
      byte[] padded = new byte[32];
      System.arraycopy(secret, 0, padded, 0, Math.min(secret.length, padded.length));
      secret = padded;
    }
    this.key = Keys.hmacShaKeyFor(secret);
  }

  public String createToken(UUID id, String email) {
    Instant now = Instant.now();
    return Jwts.builder()
        .claims(Map.of("id", id.toString(), "email", email))
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(7 * 24 * 60 * 60)))
        .signWith(key)
        .compact();
  }

  public AuthUser parse(String token) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    return new AuthUser(UUID.fromString(claims.get("id", String.class)), claims.get("email", String.class));
  }
}
