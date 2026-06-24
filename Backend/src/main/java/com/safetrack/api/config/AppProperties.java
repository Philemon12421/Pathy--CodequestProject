package com.safetrack.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String jwtSecret, String uploadDir, String groqApiKey, String geminiApiKey) {}
