package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.request.RealtimeCheckRequest;
import com.example.integrity_monitoring_service.dto.response.ApiResponse;
import com.example.integrity_monitoring_service.dto.response.InternetMatchResponse;
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
import java.util.ArrayList;
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
    private final SubmissionFetchService submissionFetch;

    @Value("${integrity.realtime.enabled:true}")
    private boolean realtimeEnabled;

    @Value("${integrity.realtime.min-text-length:50}")
    private int minTextLength;

    @Value("${integrity.text-similarity-threshold:0.70}")
    private double textSimilarityThreshold;

    /** Higher threshold for internet results — snippet-based corpus is noisier than peer text. */
    @Value("${integrity.internet-similarity-threshold:0.85}")
    private double internetSimilarityThreshold;

    /**
     * Check text in real-time as student types
     */
    @Transactional
    public ApiResponse<RealtimeCheckResponse> checkRealtime(RealtimeCheckRequest request) {
        if (!realtimeEnabled) {
            return ApiResponse.success("Real-time checking disabled", null);
        }

        log.info("[RealtimeCheck] Starting — session={} student={} question={} textLen={} enabled={}",
                request.getSessionId(), request.getStudentId(), request.getQuestionId(),
                request.getTextContent().length(), realtimeEnabled);

        try {
            // Skip if text too short
            if (request.getTextContent().length() < minTextLength) {
                log.info("[RealtimeCheck] Skipped — text too short ({} < {} chars)",
                        request.getTextContent().length(), minTextLength);
                return ApiResponse.success("Text too short for checking",
                        buildResponse(request, 0.0, false, List.of()));
            }

            // Check if plagiarism check needed for this question
            boolean checkNeeded = questionAnalyzer.isPlagiarismCheckNeeded(
                    request.getQuestionText(), null);
            log.debug("[RealtimeCheck] isPlagiarismCheckNeeded={}", checkNeeded);

            if (!checkNeeded) {
                log.info("[RealtimeCheck] Skipped — question type does not require plagiarism check");
                return ApiResponse.success("Plagiarism check not needed for this question type",
                        buildResponse(request, 0.0, false, List.of()));
            }

            double maxSimilarity = 0.0;
            boolean flagged = false;
            List<InternetMatchResponse> internetMatches = new ArrayList<>();

            if (request.getTextContent().length() > 100) {
                // ── Internet search (Google Custom Search API) ─────────────────
                log.debug("[RealtimeCheck] Calling Google search for text ({} chars)", request.getTextContent().length());
                List<Map<String, String>> searchResults = googleSearch.searchInternet(
                        request.getTextContent(), 3);
                log.debug("[RealtimeCheck] Google returned {} results", searchResults.size());

                double internetSimilarity = textSimilarity.calculateInternetSimilarity(
                        request.getTextContent(), searchResults);
                log.info("[RealtimeCheck] Internet similarity={} threshold={}", internetSimilarity, internetSimilarityThreshold);
                // Internet results require minimum similarity before being included in the final
                // score. Snippet-based TF-IDF naturally tops out ~0.55 even for exact copy-paste,
                // so the threshold is kept low (0.30) to avoid discarding real plagiarism.
                if (internetSimilarity >= internetSimilarityThreshold) {
                    maxSimilarity = Math.max(maxSimilarity, internetSimilarity);
                    log.info("[RealtimeCheck] Internet similarity exceeds threshold — including in score");

                    // Collect per-source scores to send back in the response
                    List<Double> perSnippet = textSimilarity.calculatePerSnippetSimilarities(
                            request.getTextContent(), searchResults);
                    for (int i = 0; i < searchResults.size(); i++) {
                        double score = i < perSnippet.size() ? perSnippet.get(i) : 0.0;
                        if (score >= internetSimilarityThreshold) {
                            Map<String, String> sr = searchResults.get(i);
                            internetMatches.add(InternetMatchResponse.builder()
                                    .url(sr.getOrDefault("url", ""))
                                    .title(sr.getOrDefault("title", ""))
                                    .snippet(sr.getOrDefault("snippet", ""))
                                    .similarityScore(Math.round(score * 1000.0) / 10.0)  // → 0-100, 1 dp
                                    .sourceDomain(sr.getOrDefault("domain", ""))
                                    .build());
                            log.debug("[RealtimeCheck] Matched source: domain={} score={}", sr.get("domain"), score);
                        }
                    }
                } else {
                    log.debug("[RealtimeCheck] Internet similarity {} below threshold {} — not included in final score",
                            internetSimilarity, internetSimilarityThreshold);
                }

                // ── Peer comparison (TF-IDF vs other students' answers) ────────
                String questionId = request.getQuestionId() != null
                        ? request.getQuestionId().toString() : null;

                if (questionId != null && !questionId.isBlank()) {
                    // Exclude by studentId — removes ALL of the student's answers across every
                    // submission version so none of their own text inflates the similarity score.
                    // Also pass submissionId as a secondary fallback for older Answer rows that
                    // were saved before studentId was captured.
                    String excludeStudentId = request.getStudentId();
                    String excludeSubmissionId = request.getSubmissionId(); // may be null for old clients
                    log.debug("[RealtimeCheck] Fetching peer answers for questionId={} excludeStudentId={} excludeSubmissionId={}",
                            questionId, excludeStudentId, excludeSubmissionId);
                    List<Map<String, String>> peerAnswers =
                            submissionFetch.fetchPeerAnswersForQuestion(questionId, excludeStudentId, excludeSubmissionId);
                    log.debug("[RealtimeCheck] Got {} peer answers", peerAnswers.size());

                    for (Map<String, String> peer : peerAnswers) {
                        String peerText = peer.get("content");
                        if (peerText == null || peerText.isBlank()) continue;
                        double peerSim = textSimilarity.calculateSimilarity(
                                request.getTextContent(), peerText);
                        if (peerSim > maxSimilarity) {
                            log.debug("[RealtimeCheck] New max peer similarity={} submissionId={}",
                                    peerSim, peer.get("submissionId"));
                            maxSimilarity = peerSim;
                        }
                    }
                    log.info("[RealtimeCheck] After peer comparison maxSimilarity={}", maxSimilarity);
                } else {
                    log.debug("[RealtimeCheck] No questionId — skipping peer comparison");
                }

                flagged = maxSimilarity > textSimilarityThreshold;
                log.info("[RealtimeCheck] Final similarity={} threshold={} flagged={}",
                        maxSimilarity, textSimilarityThreshold, flagged);
            } else {
                log.debug("[RealtimeCheck] Text <100 chars — skipping internet search and peer comparison");
            }

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
            log.debug("[RealtimeCheck] Saved record id={}", check.getId());

            RealtimeCheckResponse response = buildResponse(request, maxSimilarity, flagged, internetMatches);

            if (flagged) {
                log.warn("[RealtimeCheck] FLAGGED — sending WebSocket warning to session={}",
                        request.getSessionId());
                sendWarningNotification(request.getSessionId(), response);
            }

            return ApiResponse.success("Real-time check completed", response);

        } catch (Exception e) {
            log.error("[RealtimeCheck] ERROR — session={} question={}: {}",
                    request.getSessionId(), request.getQuestionId(), e.getMessage(), e);
            return ApiResponse.error("Real-time check failed: " + e.getMessage());
        }
    }

    /**
     * Build real-time check response
     */
    private RealtimeCheckResponse buildResponse(
            RealtimeCheckRequest request,
            double similarity,
            boolean flagged,
            List<InternetMatchResponse> internetMatches) {

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
                .internetMatches(internetMatches)
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