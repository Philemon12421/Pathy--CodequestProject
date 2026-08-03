package com.safetrack.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PushTokenController extends BaseController {
    private final JdbcClient jdbc;

    public PushTokenController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @PutMapping("/push-token")
    public ResponseEntity<?> updatePushToken(HttpServletRequest request, @RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null) return ResponseEntity.badRequest().body(Map.of("error", "token is required"));

        jdbc.sql("UPDATE users SET push_token = :token WHERE id = :user_id")
            .param("token", token)
            .param("user_id", user(request).id())
            .update();

        return ResponseEntity.ok(Map.of("success", true));
    }
}
