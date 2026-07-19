package com.pathtocodequest.safetrack;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Java Spring Boot equivalent of the TypeScript SafeTrackClient.
 * This component provides convenient methods to call the backend REST API.
 * It mirrors the TypeScript methods, using RestTemplate for HTTP requests.
 */
@Component
public class SafeTrackClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private String token;

    public SafeTrackClient(@Value("${safetrack.base-url:http://localhost:4000}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restTemplate = new RestTemplate();
    }

    public void setToken(String token) {
        this.token = token;
    }

    // ---------- Auth ----------
    public AuthResponse register(RegisterRequest body) {
        return postJson("/api/auth/register", body, AuthResponse.class);
    }

    public AuthResponse login(LoginRequest body) {
        return postJson("/api/auth/login", body, AuthResponse.class);
    }

    public HealthResponse health() {
        return getJson("/api/health", HealthResponse.class);
    }

    // ---------- Incidents ----------
    public List<Incident> incidents() {
        return getJsonList("/api/incidents", Incident[].class);
    }

    public Incident createIncident(MultiValueMap<String, Object> form) {
        return postForm("/api/incidents", form, Incident.class);
    }

    public Incident updateIncident(String id, Map<String, Object> updates) {
        return patchJson(String.format("/api/incidents/%s", id), updates, Incident.class);
    }

    public SuccessResponse deleteIncident(String id) {
        return delete(String.format("/api/incidents/%s", id), SuccessResponse.class);
    }

    // ---------- Routes ----------
    public List<SavedRoute> routes() {
        return getJsonList("/api/routes", SavedRoute[].class);
    }

    public SavedRoute saveRoute(Map<String, Object> body) {
        return postJson("/api/routes", body, SavedRoute.class);
    }

    public SavedRoute toggleFavorite(String id) {
        return patch(String.format("/api/routes/%s/favorite", id), null, SavedRoute.class);
    }

    public SuccessResponse deleteRoute(String id) {
        return delete(String.format("/api/routes/%s", id), SuccessResponse.class);
    }

    // ---------- Chat ----------
    public ChatResult chat(String message, List<Map<String, String>> history) {
        var payload = Map.of("message", message, "history", history);
        return postJson("/api/ai/chat", payload, ChatResult.class);
    }

    public List<ChatHistoryItem> chatHistory() {
        return getJsonList("/api/ai/history", ChatHistoryItem[].class);
    }

    public SuccessResponse clearChatHistory() {
        return delete("/api/ai/history", SuccessResponse.class);
    }

    // ---------- Music ----------
    public List<MusicTrack> tracks() {
        return getJsonList("/api/music/tracks", MusicTrack[].class);
    }

    public MusicTrack uploadTrack(MultiValueMap<String, Object> form) {
        return postForm("/api/music/tracks", form, MusicTrack.class);
    }

    public SuccessResponse deleteTrack(String id) {
        return delete(String.format("/api/music/tracks/%s", id), SuccessResponse.class);
    }

    public List<Playlist> playlists() {
        return getJsonList("/api/music/playlists", Playlist[].class);
    }

    public Playlist createPlaylist(String name) {
        return postJson("/api/music/playlists", Map.of("name", name), Playlist.class);
    }

    public SuccessResponse addTrackToPlaylist(String playlistId, String trackId, int position) {
        var payload = Map.of("track_id", trackId, "position", position);
        return postJson(String.format("/api/music/playlists/%s/tracks", playlistId), payload, SuccessResponse.class);
    }

    public List<MusicTrack> playlistTracks(String playlistId) {
        return getJsonList(String.format("/api/music/playlists/%s/tracks", playlistId), MusicTrack[].class);
    }

    // ---------- Ads ----------
    public List<Ad> ads() {
        return getJsonList("/api/ads", Ad[].class);
    }

    public List<Ad> nearbyAds(double lat, double lng) {
        return getJsonList(String.format("/api/ads/nearby?lat=%s&lng=%s", lat, lng), Ad[].class);
    }

    public List<Ad> myAds() {
        return getJsonList("/api/ads/mine", Ad[].class);
    }

    public Ad createAd(Map<String, Object> body) {
        return postJson("/api/ads", body, Ad.class);
    }

    public Record checkoutAd(String id) {
        // The original TS uses a generic Record<string, unknown>
        return postJson(String.format("/api/ads/%s/checkout", id), null, Record.class);
    }

    public Ad activateAd(String id) {
        return post(String.format("/api/ads/%s/activate", id), null, Ad.class);
    }

    public SuccessResponse deleteAd(String id) {
        return delete(String.format("/api/ads/%s", id), SuccessResponse.class);
    }

    // ---------- Helper HTTP methods ----------

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        if (token != null && !token.isEmpty()) {
            headers.setBearerAuth(token);
        }
        return headers;
    }

    private <T> T getJson(String path, Class<T> responseType) {
        HttpEntity<Void> request = new HttpEntity<>(authHeaders());
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.GET, request, responseType);
        return response.getBody();
    }

    private <T> List<T> getJsonList(String path, Class<T[]> arrayType) {
        T[] array = getJson(path, arrayType);
        return List.of(array);
    }

    private <T> T postJson(String path, Object body, Class<T> responseType) {
        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> request = new HttpEntity<>(body, headers);
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.POST, request, responseType);
        return response.getBody();
    }

    private <T> T patchJson(String path, Object body, Class<T> responseType) {
        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> request = new HttpEntity<>(body, headers);
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.PATCH, request, responseType);
        return response.getBody();
    }

    private <T> T post(String path, Object body, Class<T> responseType) {
        HttpHeaders headers = authHeaders();
        if (body != null) {
            // Assume form-data when body is MultiValueMap
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        }
        HttpEntity<Object> request = new HttpEntity<>(body, headers);
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.POST, request, responseType);
        return response.getBody();
    }

    private <T> T postForm(String path, MultiValueMap<String, Object> form, Class<T> responseType) {
        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(form, headers);
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.POST, request, responseType);
        return response.getBody();
    }

    private <T> T delete(String path, Class<T> responseType) {
        HttpEntity<Void> request = new HttpEntity<>(authHeaders());
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.DELETE, request, responseType);
        return response.getBody();
    }

    private <T> T patch(String path, Object body, Class<T> responseType) {
        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> request = new HttpEntity<>(body, headers);
        ResponseEntity<T> response = restTemplate.exchange(baseUrl + path, HttpMethod.PATCH, request, responseType);
        return response.getBody();
    }

    // ---------- DTO classes ----------
    public static class User {
        public String id;
        public String name;
        public String email;
        public String avatar_url;
    }

    public static class AuthResponse {
        public String token;
        public User user;
    }

    public static class Incident {
        public String id;
        public String user_id;
        public String type;
        public String title;
        public String description;
        public double latitude;
        public double longitude;
        public String severity;
        public String status;
        public String media_url;
        public String reporter_name;
        public String created_at;
        public String updated_at;
    }

    public static class SavedRoute {
        public String id;
        public String user_id;
        public String name;
        public String origin_name;
        public String destination_name;
        public double origin_lat;
        public double origin_lng;
        public double destination_lat;
        public double destination_lng;
        public Object route_data;
        public boolean is_favorite;
        public String created_at;
    }

    public static class ChatResult {
        public String text;
        public Object action;
    }

    public static class ChatHistoryItem {
        public String role;
        public String content;
        public String created_at;
    }

    public static class MusicTrack {
        public String id;
        public String user_id;
        public String title;
        public String artist;
        public String album;
        public Integer duration;
        public String file_url;
        public String cover_url;
        public String created_at;
    }

    public static class Playlist {
        public String id;
        public String user_id;
        public String name;
        public String cover_url;
        public Integer track_count;
        public String created_at;
    }

    public static class Ad {
        public String id;
        public String user_id;
        public String business_name;
        public String description;
        public double latitude;
        public double longitude;
        public double radius_km;
        public String image_url;
        public String website_url;
        public String payment_status;
        public Boolean active;
        public Integer duration_days;
        public String expires_at;
        public String created_at;
        public Double distance_km;
    }

    public static class SuccessResponse {
        public boolean success;
    }

    // Generic record for checkout response (unknown fields)
    public static class Record extends java.util.HashMap<String, Object> {}

    // Request payload classes
    public static class RegisterRequest {
        public String name;
        public String email;
        public String password;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class HealthResponse {
        public String status;
        public String timestamp;
    }
}
