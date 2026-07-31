package com.safetrack.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class AuthInterceptor implements HandlerInterceptor {
  public static final String AUTH_USER = "authUser";
  private final JwtService jwtService;
  private final ObjectMapper objectMapper;

  public AuthInterceptor(JwtService jwtService, ObjectMapper objectMapper) {
    this.jwtService = jwtService;
    this.objectMapper = objectMapper;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
    if (isPublic(request)) return true;

    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      writeError(response, 401, "No token provided");
      return false;
    }

    try {
      request.setAttribute(AUTH_USER, jwtService.parse(header.substring(7)));
      return true;
    } catch (Exception ex) {
      writeError(response, 401, "Invalid token");
      return false;
    }
  }

  private boolean isPublic(HttpServletRequest request) {
    String path = request.getRequestURI();
    String method = request.getMethod();
    if (path.startsWith("/api/auth") || path.equals("/api/health") || path.startsWith("/api/ai/transcribe")) return true;
    if (path.equals("/api/incidents") && HttpMethod.GET.matches(method)) return true;
    return path.equals("/api/ads") && HttpMethod.GET.matches(method);
  }

  private void writeError(HttpServletResponse response, int status, String message) throws Exception {
    response.setStatus(status);
    response.setContentType("application/json");
    objectMapper.writeValue(response.getWriter(), Map.of("error", message));
  }
}
