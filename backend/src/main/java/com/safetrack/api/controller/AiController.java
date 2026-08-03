package com.safetrack.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safetrack.api.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/ai")
public class AiController extends BaseController {
  private static final String SYSTEM_PROMPT = """
      You are Pathy AI - a smart, friendly assistant built into the Pathy app. You can help users perform actions in the app automatically:
      1. Navigation: when user wants to go somewhere: <action>{"type":"navigate","destination":"Place Name"}</action>
      2. Incident Reporting: when user wants to report an accident, hazard, crime/roadblock, or weather problem: <action>{"type":"report_incident","incident_type":"accident|hazard|crime|weather|other","title":"Short descriptive title","severity":"low|medium|high|critical","description":"Full description extracted from user context"}</action>
      3. Music: <action>{"type":"music","action":"play","track_name":"optional track name"}</action>
      4. Ads: <action>{"type":"place_ad","business_name":"Business Name","description":"Campaign details","radius_km":2.0}</action>
      Keep responses concise (under 150 words). Always include the <action> tag with extracted details whenever the user wants to perform an app action.
      """;
  private static final Pattern ACTION = Pattern.compile("<a?action>(.*?)</a?action>", Pattern.DOTALL);

  private final JdbcClient jdbc;
  private final AppProperties properties;
  private final ObjectMapper mapper;
  private final RestClient groqClient = RestClient.create("https://api.groq.com/openai/v1");
  private final RestClient geminiClient = RestClient.create("https://generativelanguage.googleapis.com/v1beta");

  public AiController(JdbcClient jdbc, AppProperties properties, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.properties = properties;
    this.mapper = mapper;
  }

  @PostMapping("/chat")
  public ResponseEntity<?> chat(HttpServletRequest request, @RequestBody Map<String, Object> body) throws Exception {
    String message = String.valueOf(body.get("message"));
    jdbc.sql("INSERT INTO chat_messages (user_id, role, content) VALUES (:user_id, 'user', :content)")
        .param("user_id", user(request).id()).param("content", message).update();

    List<Map<String, String>> messages = buildMessages(message, body.get("history"));
    String assistantContent = callAi(messages);

    jdbc.sql("INSERT INTO chat_messages (user_id, role, content) VALUES (:user_id, 'assistant', :content)")
        .param("user_id", user(request).id()).param("content", assistantContent).update();

    var matcher = ACTION.matcher(assistantContent);
    Object action = null;
    if (matcher.find()) {
      try { action = mapper.readValue(matcher.group(1), Object.class); } catch (Exception ignored) { }
    }
    String displayText = ACTION.matcher(assistantContent).replaceAll("").trim();
    return ResponseEntity.ok(Map.of("text", displayText, "action", action == null ? Map.of() : action));
  }

  @GetMapping("/history")
  public Object history(HttpServletRequest request) {
    return jdbc.sql("SELECT role, content, created_at FROM chat_messages WHERE user_id=:user_id ORDER BY created_at ASC LIMIT 50")
        .param("user_id", user(request).id()).query().listOfRows();
  }

  @DeleteMapping("/history")
  public Object clear(HttpServletRequest request) {
    jdbc.sql("DELETE FROM chat_messages WHERE user_id=:user_id").param("user_id", user(request).id()).update();
    return Map.of("success", true);
  }

  @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<?> transcribe(@RequestParam("file") MultipartFile file) {
    if (file == null || file.isEmpty()) {
      return ResponseEntity.ok(Map.of("text", ""));
    }

    // Option 1: Try Groq Whisper STT API
    if (hasText(properties.groqApiKey())) {
      try {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(properties.groqApiKey());

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank() || filename.endsWith(".3gp")) {
          filename = "speech_" + System.currentTimeMillis() + ".m4a";
        }

        final String finalFilename = filename;
        ByteArrayResource contentsAsResource = new ByteArrayResource(file.getBytes()) {
          @Override
          public String getFilename() {
            return finalFilename;
          }
        };

        var body = new LinkedMultiValueMap<String, Object>();
        body.add("file", contentsAsResource);
        body.add("model", "whisper-large-v3");

        var requestEntity = new HttpEntity<>(body, headers);
        var restTemplate = new RestTemplate();
        var response = restTemplate.postForEntity("https://api.groq.com/openai/v1/audio/transcriptions", requestEntity, JsonNode.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
          String text = response.getBody().path("text").asText("");
          if (hasText(text)) {
            System.out.println("✅ Groq Whisper Transcribe Success: " + text);
            return ResponseEntity.ok(Map.of("text", text.trim()));
          }
        }
      } catch (Exception e) {
        System.err.println("⚠️ Groq Whisper Transcribe Error: " + e.getMessage());
      }
    }

    // Option 2: Fallback to Gemini 1.5 Flash Audio Transcription
    if (hasText(properties.geminiApiKey())) {
      try {
        String base64Audio = java.util.Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = file.getContentType();
        if (mimeType == null || mimeType.isBlank()) mimeType = "audio/m4a";

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", "Transcribe this audio recording into plain text. Return ONLY the transcribed text."),
                    Map.of("inline_data", Map.of(
                        "mime_type", mimeType,
                        "data", base64Audio
                    ))
                ))
            )
        );

        JsonNode response = geminiClient.post()
            .uri("/models/gemini-1.5-flash:generateContent?key={key}", properties.geminiApiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .body(requestBody)
            .retrieve().body(JsonNode.class);

        JsonNode textNode = response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (!textNode.isMissingNode() && hasText(textNode.asText())) {
          String text = textNode.asText().trim();
          System.out.println("✅ Gemini Transcribe Success: " + text);
          return ResponseEntity.ok(Map.of("text", text));
        }
      } catch (Exception e) {
        System.err.println("⚠️ Gemini Transcribe Error: " + e.getMessage());
      }
    }

    String lastError = "No valid AI API Key configured for STT. Please set GROQ_API_KEY or GEMINI_API_KEY.";
    System.err.println("⚠️ STT Error: " + lastError);
    return ResponseEntity.ok(Map.of("text", "", "error", lastError));
  }

  private List<Map<String, String>> buildMessages(String message, Object history) {
    List<Map<String, String>> messages = new ArrayList<>();
    messages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));
    if (history instanceof List<?> items) {
      items.stream().skip(Math.max(0, items.size() - 10)).forEach(item -> {
        if (item instanceof Map<?, ?> m) {
          String role = "assistant".equals(m.get("role")) ? "assistant" : "user";
          messages.add(Map.of("role", role, "content", String.valueOf(m.get("content"))));
        }
      });
    }
    messages.add(Map.of("role", "user", "content", message));
    return messages;
  }

  private String callAi(List<Map<String, String>> messages) {
    if (hasText(properties.geminiApiKey())) {
      try {
        return callGemini(messages);
      } catch (Exception e) {
        System.err.println("⚠️ Gemini API Error: " + e.getMessage());
      }
    }
    if (hasText(properties.groqApiKey())) {
      try {
        return callGroq(messages);
      } catch (Exception e) {
        System.err.println("⚠️ Groq API Error: " + e.getMessage());
      }
    }
    String lastMessage = messages.isEmpty() ? "" : messages.get(messages.size() - 1).getOrDefault("content", "").toLowerCase();
    return generateSmartFallback(lastMessage);
  }

  private String generateSmartFallback(String message) {
    if (message.contains("navigat") || message.contains("dir") || message.contains("where") || message.contains("take me")) {
      String dest = message.replaceAll("(?i).*(?:navigate to|take me to|where is|directions to)", "").trim();
      if (dest.isBlank()) dest = "Destination";
      return "I can help you navigate to " + dest + ". Opening map navigation for you! <action>{\"type\":\"navigate\",\"destination\":\"" + dest + "\"}</action>";
    }
    if (message.contains("hazard") || message.contains("report") || message.contains("accident") || message.contains("incident") || message.contains("crash") || message.contains("crime")) {
      String type = message.contains("accident") || message.contains("crash") ? "accident" : message.contains("crime") || message.contains("block") ? "crime" : message.contains("weather") || message.contains("rain") ? "weather" : "hazard";
      String title = message.length() > 40 ? message.substring(0, 37) + "..." : message;
      return "I have extracted the incident details for your report. You can review and confirm below: <action>{\"type\":\"report_incident\",\"incident_type\":\"" + type + "\",\"title\":\"" + title.replace("\"", "'") + "\",\"severity\":\"high\",\"description\":\"" + message.replace("\"", "'") + "\"}</action>";
    }
    if (message.contains("music") || message.contains("song") || message.contains("play")) {
      return "Opening music for your drive! Enjoy the trip 🎵 <action>{\"type\":\"music\",\"action\":\"play\"}</action>";
    }
    if (message.contains("ad") || message.contains("business") || message.contains("promot")) {
      return "You can place interactive map ads to promote your business. <action>{\"type\":\"place_ad\",\"business_name\":\"My Business\"}</action>";
    }
    if (message.contains("hello") || message.contains("hi") || message.contains("hey")) {
      return "Hello! I am Pathy AI, your road companion. How can I assist you with navigation, reporting road hazards, or playing music today?";
    }
    return "I'm Pathy AI, your road companion. You can ask me to navigate, report a hazard, play music, or place an ad on the map!";
  }

  private String callGroq(List<Map<String, String>> messages) {
    JsonNode response = groqClient.post().uri("/chat/completions")
        .contentType(MediaType.APPLICATION_JSON)
        .header("Authorization", "Bearer " + properties.groqApiKey())
        .body(Map.of("model", "llama-3.3-70b-versatile", "messages", messages, "max_tokens", 512))
        .retrieve().body(JsonNode.class);
    JsonNode content = response.path("choices").path(0).path("message").path("content");
    return content.isMissingNode() || content.asText().isBlank() ? "Sorry, I could not generate a response." : content.asText();
  }

  private String callGemini(List<Map<String, String>> messages) {
    String prompt = toGeminiPrompt(messages);
    JsonNode response = geminiClient.post()
        .uri("/models/gemini-1.5-flash:generateContent?key={key}", properties.geminiApiKey())
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt))))))
        .retrieve().body(JsonNode.class);
    JsonNode text = response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
    return text.isMissingNode() || text.asText().isBlank() ? "Sorry, I could not generate a response." : text.asText();
  }

  private String toGeminiPrompt(List<Map<String, String>> messages) {
    StringBuilder prompt = new StringBuilder();
    for (Map<String, String> message : messages) {
      prompt.append(message.get("role")).append(": ").append(message.get("content")).append("\n\n");
    }
    return prompt.toString();
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
