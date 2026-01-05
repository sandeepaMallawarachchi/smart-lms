package com.smartlms.feedback_service.controller;

import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.service.HuggingFaceService;
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

    private final HuggingFaceService huggingFaceService;

    @Value("${spring.application.name}")
    private String applicationName;

    @Value("${server.port}")
    private String serverPort;

    @Value("${huggingface.model}")
    private String huggingFaceModel;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("service", applicationName);
        health.put("status", "UP");
        health.put("port", serverPort);
        health.put("timestamp", LocalDateTime.now());
        health.put("aiProvider", "Hugging Face");
        health.put("aiModel", huggingFaceModel);
        health.put("aiAvailable", huggingFaceService.isAvailable());

        return ResponseEntity.ok(ApiResponse.success(health));
    }
}