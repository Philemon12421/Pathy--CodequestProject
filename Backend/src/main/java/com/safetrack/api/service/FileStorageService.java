package com.safetrack.api.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
public class FileStorageService {
  private final Path uploadDir;

  public FileStorageService(com.safetrack.api.config.AppProperties properties) throws IOException {
    this.uploadDir = Path.of(properties.uploadDir()).toAbsolutePath().normalize();
    Files.createDirectories(uploadDir);
  }

  public String save(MultipartFile file, String prefix) throws IOException {
    if (file == null || file.isEmpty()) return null;
    String original = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
    String name = prefix + System.currentTimeMillis() + "-" + original;
    Path target = uploadDir.resolve(name).normalize();
    Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    return "/uploads/" + name;
  }
}
