package com.example.integrity_monitoring_service.contoller;

import com.example.integrity_monitoring_service.dto.response.ApiResponse;
import com.example.integrity_monitoring_service.service.GoogleSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final GoogleSearchService googleSearch;

    @Value("${spring.application.name}")
    private String applicationName;

    @Value("${server.port}")
    private String serverPort;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("service", applicationName);
        health.put("status", "UP");
        health.put("port", serverPort);
        health.put("timestamp", LocalDateTime.now());
        health.put("googleSearchAvailable", googleSearch.isAvailable());
        health.put("features", Map.of(
                "codePlagiarism", "JPlag (20+ languages)",
                "textPlagiarism", "Cosine Similarity",
                "internetCheck", "Google Custom Search",
                "realtimeCheck", "WebSocket-based"
        ));

        return ResponseEntity.ok(ApiResponse.success(health));
    }
}