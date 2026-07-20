package com.safetrack.api.controller;

import com.safetrack.api.service.FileStorageService;
import com.safetrack.api.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/music")
public class MusicController extends BaseController {
  private final JdbcClient jdbc;
  private final FileStorageService files;
  private final NotificationService notifications;

  public MusicController(JdbcClient jdbc, FileStorageService files, NotificationService notifications) {
    this.jdbc = jdbc;
    this.files = files;
    this.notifications = notifications;
  }

  @GetMapping("/tracks")
  public Object tracks(HttpServletRequest request) {
    return jdbc.sql("SELECT * FROM music_tracks WHERE user_id=:user_id ORDER BY created_at DESC")
        .param("user_id", user(request).id()).query().listOfRows();
  }

  @PostMapping(value = "/tracks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<?> addTrack(HttpServletRequest request,
      @RequestParam(name = "title", required = false, defaultValue = "Unknown") String title,
      @RequestParam(name = "artist", required = false, defaultValue = "Unknown") String artist,
      @RequestParam(name = "album", required = false) String album,
      @RequestParam(name = "duration", required = false) Integer duration,
      @RequestParam(name = "audio", required = false) MultipartFile audio,
      @RequestParam(name = "cover", required = false) MultipartFile cover) throws Exception {
    String fileUrl = files.save(audio, "music-");
    if (fileUrl == null) return ResponseEntity.badRequest().body(Map.of("error", "Audio file required"));
    String coverUrl = files.save(cover, "cover-");
    Map<String, Object> track = jdbc.sql("""
        INSERT INTO music_tracks (user_id, title, artist, album, duration, file_url, cover_url)
        VALUES (:user_id,:title,:artist,:album,:duration,:file_url,:cover_url) RETURNING *
        """)
        .param("user_id", user(request).id()).param("title", title).param("artist", artist).param("album", album)
        .param("duration", duration).param("file_url", fileUrl).param("cover_url", coverUrl).query().singleRow();

    notifications.create(user(request).id(), "Music Uploaded", "You uploaded track: \"" + title + "\" by " + artist + ".", "music_uploaded");

    return ResponseEntity.status(201).body(track);

  }

  @DeleteMapping("/tracks/{id}")
  public Object deleteTrack(HttpServletRequest request, @PathVariable("id") UUID id) {
    jdbc.sql("DELETE FROM music_tracks WHERE id=:id AND user_id=:user_id").param("id", id).param("user_id", user(request).id()).update();
    return Map.of("success", true);
  }

  @GetMapping("/playlists")
  public Object playlists(HttpServletRequest request) {
    return jdbc.sql("""
        SELECT p.*, COUNT(pt.track_id) AS track_count
        FROM playlists p LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
        WHERE p.user_id=:user_id GROUP BY p.id ORDER BY p.created_at DESC
        """).param("user_id", user(request).id()).query().listOfRows();
  }

  @PostMapping("/playlists")
  public ResponseEntity<?> createPlaylist(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    Map<String, Object> playlist = jdbc.sql("INSERT INTO playlists (user_id, name) VALUES (:user_id,:name) RETURNING *")
        .param("user_id", user(request).id()).param("name", body.get("name")).query().singleRow();
    return ResponseEntity.status(201).body(playlist);
  }

  @PostMapping("/playlists/{id}/tracks")
  public Object addPlaylistTrack(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
    jdbc.sql("INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (:playlist_id,:track_id,:position) ON CONFLICT DO NOTHING")
        .param("playlist_id", id).param("track_id", UUID.fromString(String.valueOf(body.get("track_id"))))
        .param("position", body.getOrDefault("position", 0)).update();
    return Map.of("success", true);
  }

  @GetMapping("/playlists/{id}/tracks")
  public Object playlistTracks(@PathVariable("id") UUID id) {
    return jdbc.sql("SELECT mt.* FROM music_tracks mt JOIN playlist_tracks pt ON mt.id = pt.track_id WHERE pt.playlist_id=:id ORDER BY pt.position ASC")
        .param("id", id).query().listOfRows();
  }
}
