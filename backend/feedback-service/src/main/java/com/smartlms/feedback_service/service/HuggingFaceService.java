package com.smartlms.feedback_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlms.feedback_service.exception.FeedbackGenerationException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class HuggingFaceService {

    private OkHttpClient client;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${huggingface.api-key}")
    private String apiKey;

    @Value("${huggingface.api-url}")
    private String apiUrl;

    @Value("${huggingface.model}")
    private String model;

    @Value("${huggingface.timeout:120}")
    private int timeout;

    @Value("${huggingface.max-tokens:500}")
    private int maxTokens;

    @PostConstruct
    public void init() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(timeout, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
        log.info("[HuggingFace] Initialized — model='{}' apiUrl='{}' maxTokens={} readTimeout={}s",
                model, apiUrl, maxTokens, timeout);
    }

    private static final int MAX_503_RETRIES = 3;

    /**
     * Generate completion using Hugging Face OpenAI-compatible chat completions API.
     * Endpoint: POST {apiUrl}/chat/completions
     * Retries up to MAX_503_RETRIES times on HTTP 503 (model loading) before giving up.
     */
    public String generateCompletion(String prompt) {
        return generateCompletion(prompt, 0);
    }

    private String generateCompletion(String prompt, int attempt) {
        String url = apiUrl + "/chat/completions";
        log.info("[HuggingFace] POST {} | model='{}' | promptChars={}", url, model, prompt.length());

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(message));
            requestBody.put("max_tokens", maxTokens);
            requestBody.put("temperature", 0.7);

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.debug("[HuggingFace] Request body: {}", jsonBody);

            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(jsonBody, MediaType.parse("application/json")))
                    .build();

            long startMs = System.currentTimeMillis();

            try (Response response = client.newCall(request).execute()) {
                long elapsedMs = System.currentTimeMillis() - startMs;
                log.info("[HuggingFace] Response: HTTP {} in {}ms", response.code(), elapsedMs);

                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "(no body)";
                    log.error("[HuggingFace] ERROR HTTP {} | url='{}' | model='{}' | body={}",
                            response.code(), url, model, errorBody);

                    if (response.code() == 503) {
                        if (attempt >= MAX_503_RETRIES) {
                            throw new FeedbackGenerationException(
                                    "Model unavailable after " + MAX_503_RETRIES + " retries (HTTP 503)");
                        }
                        log.info("[HuggingFace] Model loading (503), waiting 20 s then retrying (attempt {}/{})...",
                                attempt + 1, MAX_503_RETRIES);
                        Thread.sleep(20000);
                        return generateCompletion(prompt, attempt + 1);
                    }

                    throw new FeedbackGenerationException(
                            "API request failed: HTTP " + response.code() + " — " + errorBody);
                }

                String responseBody = response.body() != null ? response.body().string() : "";
                log.debug("[HuggingFace] Raw response body: {}", responseBody);

                JsonNode json = objectMapper.readTree(responseBody);
                JsonNode choices = json.get("choices");

                if (choices != null && choices.isArray() && choices.size() > 0) {
                    JsonNode contentNode = choices.get(0).path("message").path("content");
                    String content = contentNode.asText("");
                    if (!content.isBlank()) {
                        log.info("[HuggingFace] Success — extracted {}chars of content", content.length());
                        log.debug("[HuggingFace] Content preview: {}",
                                content.substring(0, Math.min(300, content.length())));
                        return content.trim();
                    }
                    log.warn("[HuggingFace] choices[0].message.content is blank | fullBody={}", responseBody);
                } else {
                    log.warn("[HuggingFace] No 'choices' array in response | fullBody={}", responseBody);
                }

                throw new FeedbackGenerationException("Unexpected response format from Hugging Face API");
            }

        } catch (IOException e) {
            log.error("[HuggingFace] IOException calling '{}': {}", url, e.getMessage(), e);
            throw new FeedbackGenerationException("Failed to generate completion", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FeedbackGenerationException("Request interrupted", e);
        }
    }

    /**
     * Check if the model exists on Hugging Face Hub.
     */
    public boolean isAvailable() {
        try {
            String baseModel = model.contains(":") ? model.split(":")[0] : model;

            Request request = new Request.Builder()
                    .url("https://huggingface.co/api/models/" + baseModel)
                    .get()
                    .build();

            try (Response response = client.newCall(request).execute()) {
                return response.isSuccessful();
            }
        } catch (Exception e) {
            log.warn("Hugging Face API is not available: {}", e.getMessage());
            return false;
        }
    }

    public String getModelName() {
        return model;
    }
}