package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.exception.IntegrityCheckException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Google Custom Search API Integration (FREE - 100 queries/day)
 */
@Service
@Slf4j
public class GoogleSearchService {

    private final OkHttpClient client;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${google.api-key}")
    private String apiKey;

    @Value("${google.search-engine-id}")
    private String searchEngineId;

    @Value("${google.search-api-url}")
    private String searchApiUrl;

    public GoogleSearchService() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Search internet for similar content
     */
    @Cacheable(value = "internetSearchCache", key = "#query")
    public List<Map<String, String>> searchInternet(String query) {
        return searchInternet(query, 5);
    }

    /**
     * Search internet with custom result count
     */
    public List<Map<String, String>> searchInternet(String query, int numResults) {
        log.debug("Searching internet for: {}", query.substring(0, Math.min(50, query.length())));

        try {
            // Prepare search query (use first 32 words for better results)
            String searchQuery = prepareSearchQuery(query);
            String encodedQuery = URLEncoder.encode(searchQuery, StandardCharsets.UTF_8);

            // Build request URL
            String url = String.format("%s?key=%s&cx=%s&q=%s&num=%d",
                    searchApiUrl, apiKey, searchEngineId, encodedQuery, Math.min(numResults, 10));

            Request request = new Request.Builder()
                    .url(url)
                    .get()
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "Unknown error";
                    log.error("Google Search API error: {} - {}", response.code(), errorBody);

                    if (response.code() == 429) {
                        log.warn("Google Search API quota exceeded (100 queries/day limit)");
                        return new ArrayList<>();
                    }

                    throw new IntegrityCheckException("Google Search API error: " + errorBody);
                }

                assert response.body() != null;
                String responseBody = response.body().string();
                return parseSearchResults(responseBody);
            }

        } catch (IOException e) {
            log.error("Error searching internet: {}", e.getMessage(), e);
            throw new IntegrityCheckException("Failed to search internet", e);
        }
    }

    /**
     * Prepare search query (extract most relevant part)
     */
    private String prepareSearchQuery(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }

        // Remove extra whitespace
        String cleaned = text.trim().replaceAll("\\s+", " ");

        // Take first 32 words (Google's recommended limit for phrase search)
        String[] words = cleaned.split("\\s+");
        int wordCount = Math.min(words.length, 32);

        StringBuilder query = new StringBuilder();
        for (int i = 0; i < wordCount; i++) {
            query.append(words[i]).append(" ");
        }

        return query.toString().trim();
    }

    /**
     * Parse Google Search API response
     */
    private List<Map<String, String>> parseSearchResults(String responseBody) {
        List<Map<String, String>> results = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode items = root.get("items");

            if (items != null && items.isArray()) {
                for (JsonNode item : items) {
                    Map<String, String> result = new HashMap<>();

                    result.put("url", item.has("link") ? item.get("link").asText() : "");
                    result.put("title", item.has("title") ? item.get("title").asText() : "");
                    result.put("snippet", item.has("snippet") ? item.get("snippet").asText() : "");

                    // Extract domain
                    String url = result.get("url");
                    if (url != null && !url.isEmpty()) {
                        result.put("domain", extractDomain(url));
                    }

                    results.add(result);
                }
            }

            log.debug("Found {} search results", results.size());

        } catch (Exception e) {
            log.error("Error parsing search results: {}", e.getMessage(), e);
        }

        return results;
    }

    /**
     * Extract domain from URL
     */
    private String extractDomain(String url) {
        try {
            java.net.URL parsedUrl = new java.net.URL(url);
            return parsedUrl.getHost();
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Check if API is available
     */
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty() &&
                searchEngineId != null && !searchEngineId.isEmpty();
    }
}