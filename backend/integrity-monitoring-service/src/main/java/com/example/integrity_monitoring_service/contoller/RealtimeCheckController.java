package com.example.integrity_monitoring_service.contoller;

import com.example.integrity_monitoring_service.dto.request.RealtimeCheckRequest;
import com.example.integrity_monitoring_service.dto.response.ApiResponse;
import com.example.integrity_monitoring_service.dto.response.RealtimeCheckResponse;
import com.example.integrity_monitoring_service.service.RealtimeCheckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrity/realtime")
@RequiredArgsConstructor
@Slf4j
public class RealtimeCheckController {

    private final RealtimeCheckService realtimeCheckService;

    /**
     * Real-time plagiarism check (REST endpoint)
     */
    @PostMapping("/check")
    public ResponseEntity<ApiResponse<RealtimeCheckResponse>> checkRealtime(
            @Valid @RequestBody RealtimeCheckRequest request) {
        log.debug("POST /api/integrity/realtime/check - Session: {}", request.getSessionId());

        ApiResponse<RealtimeCheckResponse> response =
                realtimeCheckService.checkRealtime(request);

        return ResponseEntity.ok(response);
    }
}

/**
 * WebSocket controller for real-time checks
 */
@Controller
@RequiredArgsConstructor
@Slf4j
class RealtimeCheckWebSocketController {

    private final RealtimeCheckService realtimeCheckService;

    /**
     * WebSocket endpoint for real-time checking
     */
    @MessageMapping("/check-plagiarism")
    @SendTo("/topic/plagiarism-results")
    public RealtimeCheckResponse checkPlagiarism(RealtimeCheckRequest request) {
        log.debug("WebSocket check-plagiarism - Session: {}", request.getSessionId());

        ApiResponse<RealtimeCheckResponse> response =
                realtimeCheckService.checkRealtime(request);

        return response.getData();
    }
}