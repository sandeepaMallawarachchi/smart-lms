package com.example.integrity_monitoring_service.service;

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
 * SerpAPI Web Search Integration (FREE - 100 searches/month)
 * Docs: https://serpapi.com/search-api
 */
@Service
@Slf4j
public class GoogleSearchService {

    private final OkHttpClient client;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${serp.search.enabled:true}")
    private boolean searchEnabled;

    @Value("${serp.api-key}")
    private String apiKey;

    @Value("${serp.search-api-url:https://serpapi.com/search}")
    private String searchApiUrl;

    public GoogleSearchService() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Search internet for similar content (default 5 results).
     */
    public List<Map<String, String>> searchInternet(String query) {
        return searchInternet(query, 5);
    }

    /**
     * Search internet with custom result count.
     * Results are cached by (query, numResults) for 1 hour to avoid burning monthly quota.
     */
    @Cacheable(value = "internetSearchCache", key = "#query + ':' + #numResults")
    public List<Map<String, String>> searchInternet(String query, int numResults) {
        if (!searchEnabled) {
            log.info("[SerpAPI] DISABLED via serp.search.enabled=false — skipping internet check");
            return new ArrayList<>();
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[SerpAPI] serp.api-key is not set — skipping internet check");
            return new ArrayList<>();
        }

        String queryPreview = query.substring(0, Math.min(80, query.length()));
        log.info("[SerpAPI] Starting search — numResults={} queryPreview=\"{}\"", numResults, queryPreview);

        try {
            String searchQuery = prepareSearchQuery(query);
            String encodedQuery = URLEncoder.encode(searchQuery, StandardCharsets.UTF_8);
            String url = String.format("%s?engine=google&q=%s&num=%d&api_key=%s",
                    searchApiUrl, encodedQuery, Math.min(numResults, 10), apiKey);

            Request request = new Request.Builder()
                    .url(url)
                    .get()
                    .build();

            long t0 = System.currentTimeMillis();
            try (Response response = client.newCall(request).execute()) {
                long elapsed = System.currentTimeMillis() - t0;
                log.info("[SerpAPI] Response — HTTP {} in {}ms", response.code(), elapsed);

                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "(empty body)";
                    log.warn("[SerpAPI] HTTP {} error — body: {}", response.code(), errorBody);
                    if (response.code() == 401) {
                        log.warn("[SerpAPI] 401 Unauthorized — check that serp.api-key is correct in application.properties");
                    } else if (response.code() == 429) {
                        log.warn("[SerpAPI] 429 Too Many Requests — monthly quota exceeded (100 searches/month on free tier)");
                    }
                    return new ArrayList<>();
                }

                String responseBody = response.body() != null ? response.body().string() : "";
                if (responseBody.isEmpty()) {
                    log.warn("[SerpAPI] 200 OK but empty response body");
                    return new ArrayList<>();
                }

                List<Map<String, String>> results = parseSearchResults(responseBody);
                log.info("[SerpAPI] Search succeeded — {} results returned", results.size());
                return results;
            }

        } catch (IOException e) {
            log.warn("[SerpAPI] Network error — {} — skipping internet check", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Search Google Scholar for academic sources matching the query.
     * Uses SerpAPI engine=google_scholar.
     * Results are cached for 1 hour.
     */
    @Cacheable(value = "scholarSearchCache", key = "#query + ':' + #numResults")
    public List<Map<String, String>> searchScholar(String query, int numResults) {
        if (!searchEnabled || apiKey == null || apiKey.isBlank()) {
            log.info("[SerpAPI Scholar] Disabled or no API key — skipping scholar check");
            return new ArrayList<>();
        }
        String queryPreview = query.substring(0, Math.min(60, query.length()));
        log.info("[SerpAPI Scholar] Starting scholar search — numResults={} query=\"{}\"", numResults, queryPreview);
        try {
            String searchQuery = prepareSearchQuery(query);
            String encodedQuery = URLEncoder.encode(searchQuery, StandardCharsets.UTF_8);
            String url = String.format("%s?engine=google_scholar&q=%s&num=%d&api_key=%s",
                    searchApiUrl, encodedQuery, Math.min(numResults, 10), apiKey);
            Request request = new Request.Builder().url(url).get().build();
            long t0 = System.currentTimeMillis();
            try (Response response = client.newCall(request).execute()) {
                log.info("[SerpAPI Scholar] Response — HTTP {} in {}ms", response.code(), System.currentTimeMillis() - t0);
                if (!response.isSuccessful()) {
                    log.warn("[SerpAPI Scholar] HTTP {} — skipping scholar results", response.code());
                    return new ArrayList<>();
                }
                String body = response.body() != null ? response.body().string() : "";
                return parseScholarResults(body);
            }
        } catch (IOException e) {
            log.warn("[SerpAPI Scholar] Network error — {} — skipping", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Map<String, String>> parseScholarResults(String responseBody) {
        List<Map<String, String>> results = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode items = root.get("organic_results");
            if (items == null || !items.isArray()) {
                log.info("[SerpAPI Scholar] No organic_results in scholar response");
                return results;
            }
            for (JsonNode item : items) {
                Map<String, String> result = new HashMap<>();
                result.put("url",      item.has("link")    ? item.get("link").asText()    : "");
                result.put("title",    item.has("title")   ? item.get("title").asText()   : "");
                String snippet = item.has("snippet") ? item.get("snippet").asText() : "";
                // Append publication summary if present
                if (item.has("publication_info") && item.get("publication_info").has("summary")) {
                    String pub = item.get("publication_info").get("summary").asText();
                    if (!pub.isBlank()) snippet = snippet + " [" + pub + "]";
                }
                result.put("snippet", snippet);
                String url = result.get("url");
                if (url != null && !url.isEmpty()) result.put("domain", extractDomain(url));
                result.put("category", "ACADEMIC"); // Scholar results are always academic
                results.add(result);
            }
            log.info("[SerpAPI Scholar] Parsed {} scholar results", results.size());
        } catch (Exception e) {
            log.error("[SerpAPI Scholar] Failed to parse response — {}", e.getMessage(), e);
        }
        return results;
    }

    private String prepareSearchQuery(String text) {
        if (text == null || text.isEmpty()) return "";
        String cleaned = text.trim().replaceAll("\\s+", " ");
        String[] words = cleaned.split("\\s+");
        int wordCount = Math.min(words.length, 32);
        StringBuilder query = new StringBuilder();
        for (int i = 0; i < wordCount; i++) query.append(words[i]).append(" ");
        return query.toString().trim();
    }

    /**
     * Parse SerpAPI response.
     * Response shape: { "organic_results": [ { "title", "link", "snippet" } ] }
     */
    private List<Map<String, String>> parseSearchResults(String responseBody) {
        List<Map<String, String>> results = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode items = root.get("organic_results");
            if (items == null || !items.isArray()) {
                log.info("[SerpAPI] No organic_results in response — query returned no matches");
                return results;
            }
            for (JsonNode item : items) {
                Map<String, String> result = new HashMap<>();
                result.put("url",     item.has("link")    ? item.get("link").asText()    : "");
                result.put("title",   item.has("title")   ? item.get("title").asText()   : "");
                result.put("snippet", item.has("snippet") ? item.get("snippet").asText() : "");
                String url = result.get("url");
                if (url != null && !url.isEmpty()) result.put("domain", extractDomain(url));
                results.add(result);
            }
            log.info("[SerpAPI] Parsed {} results from response", results.size());
        } catch (Exception e) {
            log.error("[SerpAPI] Failed to parse response — {}", e.getMessage(), e);
        }
        return results;
    }

    private String extractDomain(String url) {
        try {
            return java.net.URI.create(url).getHost();
        } catch (Exception e) {
            return "unknown";
        }
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty();
    }

    /**
     * Run a live test against the Bing Web Search API.
     * GET /api/health/google-search-test
     */
    public Map<String, Object> diagnose() {
        Map<String, Object> result = new HashMap<>();
        result.put("enabled",   searchEnabled);
        result.put("apiKeySet", apiKey != null && !apiKey.isBlank());
        result.put("apiUrl",    searchApiUrl);

        if (!searchEnabled) {
            result.put("httpStatus", -1);
            result.put("success", false);
            result.put("fix", "Set serp.search.enabled=true in application.properties");
            return result;
        }
        if (apiKey == null || apiKey.isBlank()) {
            result.put("httpStatus", -1);
            result.put("success", false);
            result.put("fix", "Set serp.api-key in application.properties (https://serpapi.com → Dashboard → API Key)");
            return result;
        }

        try {
            String testQuery = URLEncoder.encode("plagiarism detection test", StandardCharsets.UTF_8);
            String url = String.format("%s?engine=google&q=%s&num=1&api_key=%s", searchApiUrl, testQuery, apiKey);
            Request request = new Request.Builder().url(url).get().build();

            try (Response response = client.newCall(request).execute()) {
                int status = response.code();
                String body = response.body() != null ? response.body().string() : "";
                result.put("httpStatus", status);
                result.put("success", response.isSuccessful());

                if (status == 401) {
                    result.put("errorBody", body.length() > 500 ? body.substring(0, 500) : body);
                    result.put("fix", "Invalid API key. Check serp.api-key in application.properties matches your key at https://serpapi.com/manage-api-key");
                } else if (status == 429) {
                    result.put("fix", "Monthly quota of 100 searches exceeded on free tier. Upgrade at https://serpapi.com/pricing");
                } else if (response.isSuccessful()) {
                    result.put("fix", "SerpAPI is working correctly");
                } else {
                    result.put("errorBody", body.length() > 300 ? body.substring(0, 300) : body);
                    result.put("fix", "Unexpected HTTP " + status + " — check https://serpapi.com/manage-api-key");
                }
            }
        } catch (IOException e) {
            result.put("httpStatus", 0);
            result.put("success", false);
            result.put("networkError", e.getMessage());
            result.put("fix", "Network error reaching SerpAPI. Check outbound internet access.");
        }
        return result;
    }
}