package com.safetrack.api.controller;

import com.safetrack.api.auth.AuthInterceptor;
import com.safetrack.api.auth.AuthUser;
import jakarta.servlet.http.HttpServletRequest;

abstract class BaseController {
  protected AuthUser user(HttpServletRequest request) {
    return (AuthUser) request.getAttribute(AuthInterceptor.AUTH_USER);
  }
}
