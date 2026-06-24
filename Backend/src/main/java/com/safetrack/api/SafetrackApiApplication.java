package com.safetrack.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SafetrackApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(SafetrackApiApplication.class, args);
  }
}
