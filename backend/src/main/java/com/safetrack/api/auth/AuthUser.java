package com.safetrack.api.auth;

import java.util.UUID;

public record AuthUser(UUID id, String email) {}
