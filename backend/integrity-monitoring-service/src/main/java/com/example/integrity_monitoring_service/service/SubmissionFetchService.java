package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.request.PlagiarismCheckRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fetches student answers from the Submission Management Service for peer-comparison
 * plagiarism detection.
 *
 * The primary use-case is fetching all saved answers for a given questionId so that
 * TextSimilarityService can compute TF-IDF cosine similarity between the current
 * student's answer and every other student's answer.
 */
@Service
@Slf4j
public class SubmissionFetchService {

    @Value("${submission-service.url:http://localhost:8081}")
    private String submissionServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Fetch peer text answers for a given question, excluding the student currently
     * being checked.
     *
     * Calls: GET {submissionServiceUrl}/api/answers/by-question?questionId={id}&excludeSubmissionId={id}
     *
     * Returns a list of maps, each with keys:
     *   "content"      → the peer's answer text
     *   "studentId"    → their studentId (from answerResponse; may be empty)
     *   "submissionId" → their submissionId
     *
     * Returns an empty list on any error (network, JSON parse, 4xx/5xx).
     */
    public List<Map<String, String>> fetchPeerAnswersForQuestion(String questionId,
                                                                  String excludeStudentId,
                                                                  String excludeSubmissionId) {
        List<Map<String, String>> peers = new ArrayList<>();

        if (questionId == null || questionId.isBlank()) {
            log.debug("[SubmissionFetchService] fetchPeerAnswers — questionId is blank, skipping");
            return peers;
        }

        try {
            StringBuilder url = new StringBuilder(submissionServiceUrl)
                    .append("/api/answers/by-question?questionId=")
                    .append(questionId);

            if (excludeStudentId != null && !excludeStudentId.isBlank()) {
                url.append("&excludeStudentId=").append(excludeStudentId);
            }
            if (excludeSubmissionId != null && !excludeSubmissionId.isBlank()) {
                url.append("&excludeSubmissionId=").append(excludeSubmissionId);
            }

            log.debug("[SubmissionFetchService] Calling {}", url);

            String responseBody = restTemplate.getForObject(url.toString(), String.class);
            if (responseBody == null) {
                log.warn("[SubmissionFetchService] Empty response from submission service for questionId={}", questionId);
                return peers;
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode data = root.get("data");

            if (data == null || !data.isArray()) {
                log.debug("[SubmissionFetchService] No 'data' array in response for questionId={}", questionId);
                return peers;
            }

            for (JsonNode item : data) {
                String answerText = item.has("answerText") ? item.get("answerText").asText("") : "";
                if (answerText.isBlank()) continue; // skip empty answers

                Map<String, String> peer = new HashMap<>();
                peer.put("content", answerText);
                peer.put("submissionId", item.has("submissionId") ? item.get("submissionId").asText("") : "");
                peer.put("studentId", ""); // not stored on answer row; omit to avoid PII leakage
                peers.add(peer);
            }

            log.info("[SubmissionFetchService] fetchPeerAnswers — questionId={} peers={}", questionId, peers.size());

        } catch (Exception e) {
            log.warn("[SubmissionFetchService] fetchPeerAnswers failed for questionId={}: {} — skipping peer comparison",
                    questionId, e.getMessage());
        }

        return peers;
    }

    // ── Legacy methods (code plagiarism — kept for IntegrityCheckService) ────────

    /**
     * Fetch code submissions for code-based plagiarism comparison (used by IntegrityCheckService).
     */
    public List<Map<String, String>> fetchSubmissionsForComparison(PlagiarismCheckRequest request) {
        List<Map<String, String>> submissions = new ArrayList<>();

        try {
            if (request.getCompareWithSubmissionIds() != null &&
                    !request.getCompareWithSubmissionIds().isEmpty()) {
                for (Long submissionId : request.getCompareWithSubmissionIds()) {
                    Map<String, String> sub = new HashMap<>();
                    sub.put("submissionId", submissionId.toString());
                    sub.put("studentId", "");
                    sub.put("content", "");
                    submissions.add(sub);
                }
            }
        } catch (Exception e) {
            log.error("[SubmissionFetchService] fetchSubmissionsForComparison error: {}", e.getMessage(), e);
        }

        return submissions;
    }

    /**
     * Alias used by text-based plagiarism path in IntegrityCheckService.
     * Now delegates to fetchPeerAnswersForQuestion when a questionId is available.
     */
    public List<Map<String, String>> fetchTextSubmissionsForComparison(PlagiarismCheckRequest request) {
        // If the request carries a questionId, use the real peer-answer API
        if (request.getQuestionId() != null) {
            return fetchPeerAnswersForQuestion(
                    request.getQuestionId().toString(),
                    null, // no studentId available in legacy PlagiarismCheckRequest
                    request.getSubmissionId() != null ? request.getSubmissionId().toString() : null);
        }
        // Fallback: no questionId available — return empty (no false positives)
        log.debug("[SubmissionFetchService] fetchTextSubmissionsForComparison — no questionId, returning empty");
        return new ArrayList<>();
    }
}
