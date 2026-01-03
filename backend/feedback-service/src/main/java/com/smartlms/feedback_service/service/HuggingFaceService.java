package com.smartlms.feedback_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlms.feedback_service.exception.FeedbackGenerationException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class HuggingFaceService {

    private final OkHttpClient client;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${huggingface.api-key}")
    private String apiKey;

    @Value("${huggingface.api-url}")
    private String apiUrl;

    @Value("${huggingface.model}")
    private String model;

    @Value("${huggingface.timeout:120}")
    private int timeout;

    @Value("${huggingface.max-tokens:2000}")
    private int maxTokens;

    public HuggingFaceService() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Generate completion using Hugging Face Inference API
     */
    public String generateCompletion(String prompt) {
        log.debug("Generating completion with Hugging Face model: {}", model);

        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("inputs", prompt);

            Map<String, Object> parameters = new HashMap<>();
            parameters.put("max_new_tokens", maxTokens);
            parameters.put("temperature", 0.7);
            parameters.put("top_p", 0.95);
            parameters.put("return_full_text", false);
            requestBody.put("parameters", parameters);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            Request request = new Request.Builder()
                    .url(apiUrl + "/" + model)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(jsonBody, MediaType.parse("application/json")))
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "Unknown error";
                    log.error("Hugging Face API error: {} - {}", response.code(), errorBody);

                    if (response.code() == 503) {
                        // Model is loading, wait and retry
                        log.info("Model is loading, waiting 20 seconds...");
                        Thread.sleep(20000);
                        return generateCompletion(prompt); // Retry once
                    }

                    throw new FeedbackGenerationException("API request failed: " + errorBody);
                }

                String responseBody = response.body().string();
                log.debug("Raw Hugging Face response: {}", responseBody);

                JsonNode jsonResponse = objectMapper.readTree(responseBody);

                // Handle array response
                if (jsonResponse.isArray() && jsonResponse.size() > 0) {
                    return jsonResponse.get(0).get("generated_text").asText();
                }
                // Handle object response
                else if (jsonResponse.has("generated_text")) {
                    return jsonResponse.get("generated_text").asText();
                }
                else {
                    log.error("Unexpected response format: {}", responseBody);
                    throw new FeedbackGenerationException("Unexpected response format");
                }
            }

        } catch (IOException e) {
            log.error("Error calling Hugging Face API: {}", e.getMessage(), e);
            throw new FeedbackGenerationException("Failed to generate completion", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FeedbackGenerationException("Request interrupted", e);
        }
    }

    /**
     * Check if Hugging Face API is available
     */
    public boolean isAvailable() {
        try {
            Request request = new Request.Builder()
                    .url("https://huggingface.co/api/models/" + model)
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

    /**
     * Get model name
     */
    public String getModelName() {
        return model;
    }
}