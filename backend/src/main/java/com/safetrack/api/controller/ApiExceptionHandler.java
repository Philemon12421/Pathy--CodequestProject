package com.safetrack.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<Map<String, String>> handleNotFound(NoResourceFoundException ex) {
    return ResponseEntity.status(404).body(Map.of("error", "Endpoint not found: " + ex.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> handle(Exception ex) {
    return ResponseEntity.internalServerError().body(Map.of("error", ex.getMessage()));
  }
}
