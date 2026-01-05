package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.request.RealtimeCheckRequest;
import com.example.integrity_monitoring_service.dto.response.ApiResponse;
import com.example.integrity_monitoring_service.dto.response.RealtimeCheckResponse;
import com.example.integrity_monitoring_service.model.RealtimeCheck;
import com.example.integrity_monitoring_service.repository.RealtimeCheckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Real-time plagiarism checking as students type
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeCheckService {

    private final RealtimeCheckRepository realtimeCheckRepository;
    private final TextSimilarityService textSimilarity;
    private final GoogleSearchService googleSearch;
    private final QuestionAnalyzerService questionAnalyzer;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${integrity.realtime.enabled:true}")
    private boolean realtimeEnabled;

    @Value("${integrity.realtime.min-text-length:50}")
    private int minTextLength;

    @Value("${integrity.text-similarity-threshold:0.70}")
    private double textSimilarityThreshold;

    /**
     * Check text in real-time as student types
     */
    @Transactional
    public ApiResponse<RealtimeCheckResponse> checkRealtime(RealtimeCheckRequest request) {
        if (!realtimeEnabled) {
            return ApiResponse.success("Real-time checking disabled", null);
        }

        log.debug("Real-time check for session: {}", request.getSessionId());

        try {
            // Skip if text too short
            if (request.getTextContent().length() < minTextLength) {
                return ApiResponse.success("Text too short for checking",
                        buildResponse(request, 0.0, false));
            }

            // Check if plagiarism check needed for this question
            boolean checkNeeded = questionAnalyzer.isPlagiarismCheckNeeded(
                    request.getQuestionText(),
                    null
            );

            if (!checkNeeded) {
                return ApiResponse.success("Plagiarism check not needed for this question type",
                        buildResponse(request, 0.0, false));
            }

            // Quick similarity check (limited to avoid API quota)
            double maxSimilarity = 0.0;
            boolean flagged = false;

            // Check against internet (limited calls)
            if (request.getTextContent().length() > 100) {
                List<Map<String, String>> searchResults = googleSearch.searchInternet(
                        request.getTextContent(), 3
                );

                maxSimilarity = textSimilarity.calculateInternetSimilarity(
                        request.getTextContent(),
                        searchResults
                );

                flagged = maxSimilarity > textSimilarityThreshold;
            }

            // Save check record
            RealtimeCheck check = RealtimeCheck.builder()
                    .sessionId(request.getSessionId())
                    .studentId(request.getStudentId())
                    .questionId(request.getQuestionId())
                    .textLength(request.getTextContent().length())
                    .similarityScore(maxSimilarity)
                    .flagged(flagged)
                    .warningShown(flagged)
                    .build();

            realtimeCheckRepository.save(check);

            // Build response
            RealtimeCheckResponse response = buildResponse(request, maxSimilarity, flagged);

            // Send WebSocket notification if flagged
            if (flagged) {
                sendWarningNotification(request.getSessionId(), response);
            }

            return ApiResponse.success("Real-time check completed", response);

        } catch (Exception e) {
            log.error("Error in real-time check: {}", e.getMessage(), e);
            return ApiResponse.error("Real-time check failed: " + e.getMessage());
        }
    }

    /**
     * Build real-time check response
     */
    private RealtimeCheckResponse buildResponse(
            RealtimeCheckRequest request,
            double similarity,
            boolean flagged) {

        String warningMessage = null;
        if (flagged) {
            warningMessage = String.format(
                    "⚠️ Potential plagiarism detected (%.0f%% similarity). " +
                            "Please ensure this is your original work.",
                    similarity * 100
            );
        }

        return RealtimeCheckResponse.builder()
                .sessionId(request.getSessionId())
                .studentId(request.getStudentId())
                .questionId(request.getQuestionId())
                .similarityScore(similarity)
                .flagged(flagged)
                .warningMessage(warningMessage)
                .textLength(request.getTextContent().length())
                .checkedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Send WebSocket warning notification
     */
    private void sendWarningNotification(String sessionId, RealtimeCheckResponse response) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/plagiarism-warnings/" + sessionId,
                    response
            );
            log.debug("Sent plagiarism warning to session: {}", sessionId);
        } catch (Exception e) {
            log.error("Error sending WebSocket notification: {}", e.getMessage());
        }
    }

    /**
     * Cleanup old real-time checks (run periodically)
     */
    @Transactional
    public void cleanupOldChecks() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        realtimeCheckRepository.deleteByCheckedAtBefore(cutoff);
        log.debug("Cleaned up old real-time checks before {}", cutoff);
    }
}