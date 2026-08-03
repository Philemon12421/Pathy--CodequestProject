package com.safetrack.api.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final JdbcClient jdbc;

    public ContactController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping
    public Map<String, Object> contact(@RequestBody Map<String, String> body) {
        System.out.println("Received contact form submission: " + body);
        String name = body.get("name");
        String email = body.get("email");
        String subject = body.get("subject");
        String message = body.get("message");

        jdbc.sql("INSERT INTO contact_messages (id, name, email, subject, message) VALUES (:id, :name, :email, :subject, :message)")
            .param("id", UUID.randomUUID())
            .param("name", name)
            .param("email", email)
            .param("subject", subject)
            .param("message", message)
            .update();

        return Map.of("success", true);
    }
}
