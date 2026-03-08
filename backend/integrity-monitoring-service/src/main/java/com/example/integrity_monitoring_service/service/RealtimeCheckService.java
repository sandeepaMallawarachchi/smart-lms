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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
                        buildResponse(request, 0.0, false, List.of(), 0.0, 0.0));
            }

            // Check if plagiarism check needed for this question
            boolean checkNeeded = questionAnalyzer.isPlagiarismCheckNeeded(
                    request.getQuestionText(), null);
            log.debug("[RealtimeCheck] isPlagiarismCheckNeeded={}", checkNeeded);

            if (!checkNeeded) {
                log.info("[RealtimeCheck] Skipped — question type does not require plagiarism check");
                return ApiResponse.success("Plagiarism check not needed for this question type",
                        buildResponse(request, 0.0, false, List.of(), 0.0, 0.0));
            }

            double maxSimilarity = 0.0;
            boolean flagged = false;
            List<InternetMatchResponse> internetMatches = new ArrayList<>();
            double internetSimilarityScore = 0.0;
            double peerSimilarityScore = 0.0;

            if (request.getTextContent().length() > 100) {
                // ── Internet search (Google Custom Search API) ─────────────────
                log.debug("[RealtimeCheck] Calling Google search for text ({} chars)", request.getTextContent().length());
                List<Map<String, String>> searchResults = googleSearch.searchInternet(
                        request.getTextContent(), 3);
                log.debug("[RealtimeCheck] Google returned {} results", searchResults.size());

                // ── Scholar search (academic sources) ──────────────────────────
                List<Map<String, String>> scholarResults = googleSearch.searchScholar(
                        request.getTextContent(), 2);
                log.debug("[RealtimeCheck] Scholar returned {} results", scholarResults.size());
                // Merge scholar results into searchResults for combined similarity
                List<Map<String, String>> allSearchResults = new ArrayList<>(searchResults);
                allSearchResults.addAll(scholarResults);

                double internetSimilarity = textSimilarity.calculateInternetSimilarity(
                        request.getTextContent(), allSearchResults);
                internetSimilarityScore = internetSimilarity; // track separately
                log.info("[RealtimeCheck] Internet similarity={} threshold={}", internetSimilarity, internetSimilarityThreshold);
                // Internet results require minimum similarity before being included in the final
                // score. Snippet-based TF-IDF naturally tops out ~0.55 even for exact copy-paste,
                // so the threshold is kept low (0.30) to avoid discarding real plagiarism.
                if (internetSimilarity >= internetSimilarityThreshold) {
                    maxSimilarity = Math.max(maxSimilarity, internetSimilarity);
                    log.info("[RealtimeCheck] Internet similarity exceeds threshold — including in score");

                    // Collect per-source scores to send back in the response
                    List<Double> perSnippet = textSimilarity.calculatePerSnippetSimilarities(
                            request.getTextContent(), allSearchResults);
                    for (int i = 0; i < allSearchResults.size(); i++) {
                        Map<String, String> sr = allSearchResults.get(i);
                        String domain = sr.getOrDefault("domain", "");
                        String category = sr.getOrDefault("category", categorizeSource(domain));
                        double rawScore = i < perSnippet.size() ? perSnippet.get(i) : 0.0;
                        double displayScore = Math.round(rawScore * 1000.0) / 10.0;
                        if (rawScore >= internetSimilarityThreshold) {
                            internetMatches.add(InternetMatchResponse.builder()
                                    .url(sr.getOrDefault("url", ""))
                                    .title(sr.getOrDefault("title", ""))
                                    .snippet(sr.getOrDefault("snippet", ""))
                                    .similarityScore(displayScore)
                                    .sourceDomain(domain)
                                    .sourceCategory(category)
                                    .confidenceLevel(determineConfidence(displayScore))
                                    .matchedStudentText(extractMatchedStudentText(request.getTextContent(), sr.getOrDefault("snippet", "")))
                                    .build());
                            log.debug("[RealtimeCheck] Matched source: domain={} score={}", domain, rawScore);
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
                        if (peerSim > peerSimilarityScore) peerSimilarityScore = peerSim;
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

            RealtimeCheckResponse response = buildResponse(request, maxSimilarity, flagged, internetMatches,
                    internetSimilarityScore, peerSimilarityScore);

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
            List<InternetMatchResponse> internetMatches,
            double internetSimilarityScore,
            double peerSimilarityScore) {

        String warningMessage = null;
        if (flagged) {
            warningMessage = String.format(
                    "⚠️ Potential plagiarism detected (%.0f%% similarity). " +
                            "Please ensure this is your original work.",
                    similarity * 100
            );
        }

        double riskScore = computeRiskScore(similarity, internetMatches.size(), flagged);
        String riskLevel = riskScore >= 70 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : riskScore > 5 ? "LOW" : "CLEAN";

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
                .internetSimilarityScore(internetSimilarityScore)
                .peerSimilarityScore(peerSimilarityScore)
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .build();
    }

    /**
     * Classify an internet source domain into a category.
     */
    private String categorizeSource(String domain) {
        if (domain == null || domain.isBlank()) return "OTHER";
        String d = domain.toLowerCase();
        if (d.contains("scholar.google") || d.contains("researchgate") || d.contains("academia.edu")
                || d.contains("springer") || d.contains("arxiv") || d.contains("pubmed")
                || d.contains("ieee.org") || d.contains("jstor") || d.contains("nature.com")
                || d.contains("sciencedirect") || d.contains("wiley.com") || d.contains("cambridge.org")
                || d.contains("ncbi.nlm.nih") || d.contains("tandfonline") || d.contains("sagepub")
                || d.contains("semanticscholar") || d.contains("acm.org")) {
            return "ACADEMIC";
        }
        if (d.contains("wikipedia") || d.contains("britannica") || d.contains("encyclopedia")) {
            return "ENCYCLOPEDIA";
        }
        if (d.endsWith(".gov") || d.contains(".gov.")) return "GOVERNMENT";
        if (d.endsWith(".edu") || d.contains(".edu.")) return "EDUCATIONAL";
        if (d.contains("bbc.") || d.contains("cnn.") || d.contains("reuters") || d.contains("theguardian")
                || d.contains("nytimes") || d.contains("bloomberg") || d.contains("techcrunch")
                || d.contains("wired.com") || d.contains("zdnet") || d.contains("techradar")) {
            return "NEWS";
        }
        if (d.contains("medium.com") || d.contains("wordpress") || d.contains("blogger")
                || d.contains("blogspot") || d.contains("substack") || d.contains("hashnode")) {
            return "BLOG";
        }
        if (d.contains("stackoverflow") || d.contains("github.com") || d.contains("gitlab")
                || d.contains("dev.to") || d.contains("hackernoon") || d.contains("geeksforgeeks")) {
            return "TECH_COMMUNITY";
        }
        return "OTHER";
    }

    /**
     * Determine confidence level for a similarity score (0-100 scale).
     */
    private String determineConfidence(double scorePercent) {
        if (scorePercent >= 70) return "HIGH";
        if (scorePercent >= 40) return "MEDIUM";
        return "LOW";
    }

    /**
     * Find the sentence in the student's text that best overlaps with the source snippet.
     * Returns null if no meaningful overlap found (fewer than 3 keyword words in common).
     */
    private String extractMatchedStudentText(String studentText, String snippet) {
        if (studentText == null || snippet == null || snippet.isBlank()) return null;

        // Build keyword set from snippet (words longer than 4 chars)
        String[] snippetWords = snippet.toLowerCase().split("\\W+");
        Set<String> keyWords = new HashSet<>();
        for (String word : snippetWords) {
            if (word.length() > 4) keyWords.add(word);
        }
        if (keyWords.isEmpty()) return null;

        // Split student text into sentences and find best-matching one
        String[] sentences = studentText.split("[.!?]+\\s*");
        String bestSentence = null;
        int maxOverlap = 2; // minimum threshold

        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.length() < 20) continue;
            String[] sWords = trimmed.toLowerCase().split("\\W+");
            int overlap = 0;
            for (String word : sWords) {
                if (keyWords.contains(word)) overlap++;
            }
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestSentence = trimmed;
            }
        }

        if (bestSentence != null && bestSentence.length() > 250) {
            bestSentence = bestSentence.substring(0, 250) + "…";
        }
        return bestSentence;
    }

    /**
     * Compute an aggregate risk score 0-100.
     * Base = maxSimilarity × 100, bonus up to +20 for multiple matched sources.
     */
    private double computeRiskScore(double maxSimilarity, int numMatches, boolean flagged) {
        if (!flagged && maxSimilarity < 0.20) return 0.0;
        double base = maxSimilarity * 100;
        double matchBonus = Math.min(numMatches * 5.0, 20.0);
        return Math.min(100.0, Math.round((base + matchBonus) * 10.0) / 10.0);
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