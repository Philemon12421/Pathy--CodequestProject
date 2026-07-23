package com.safetrack.api.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

  private final JavaMailSender mailSender;

  @Value("${spring.mail.username:}")
  private String fromEmail;

  public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
    this.mailSender = mailSenderProvider.getIfAvailable();
  }

  public void sendPasswordResetOtp(String toEmail, String code) {
    String subject = "SafeTrack Password Reset Verification Code";
    String body = "Hello,\n\n"
        + "You requested a password reset for your SafeTrack account.\n\n"
        + "Your 6-digit OTP verification code is: " + code + "\n\n"
        + "This code will expire in 15 minutes. If you did not request a password reset, please ignore this email.\n\n"
        + "Best regards,\nThe SafeTrack Team";

    CompletableFuture.runAsync(() -> sendEmail(toEmail, subject, body));
  }

  public void sendEmailVerificationOtp(String toEmail, String code) {
    String subject = "SafeTrack Email Verification Code";
    String body = "Hello,\n\n"
        + "Your SafeTrack email verification code is: " + code + "\n\n"
        + "This code will expire in 15 minutes.\n\n"
        + "Best regards,\nThe SafeTrack Team";

    CompletableFuture.runAsync(() -> sendEmail(toEmail, subject, body));
  }

  private void sendEmail(String toEmail, String subject, String body) {
    if (mailSender != null && fromEmail != null && !fromEmail.isBlank()) {
      try {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
        System.out.println("✅ Email sent successfully to " + toEmail);
        return;
      } catch (Exception e) {
        System.err.println("⚠️ Failed to send email to " + toEmail + " via SMTP: " + e.getMessage());
        e.printStackTrace();
      }
    }

    System.out.println("══════════════════════════════════════════════");
    System.out.println("  OTP EMAIL (Fallback Log for " + toEmail + ")");
    System.out.println("  Subject: " + subject);
    System.out.println("  Content: " + body.replace("\n", " "));
    System.out.println("══════════════════════════════════════════════");
  }
}
