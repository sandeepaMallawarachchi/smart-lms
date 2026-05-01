package com.smartlms.submission_management_service.service;

import com.smartlms.submission_management_service.model.Answer;
import com.smartlms.submission_management_service.model.Submission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Asynchronous bridge that replicates each text submission snapshot to the
 * dedicated version-control-service (port 8082) after the SMS transaction commits.
 *
 * The call is fire-and-forget: any failure is logged as WARN and swallowed so
 * it never affects the student's submit response.
 *
 * Why @Async here and not inside SubmissionService?
 *   Spring's @Async proxy only intercepts calls from OTHER beans. Calling an
 *   @Async method on 'this' inside SubmissionService would bypass the proxy
 *   and execute synchronously. By placing @Async on this separate @Service
 *   bean, the proxy is active and the call truly runs on a background thread.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VersionSyncService {

    private final RestTemplate restTemplate;

    @Value("${version.service.url:http://localhost:8082}")
    private String vcsUrl;

    /**
     * Posts a text snapshot to version-control-service POST /api/versions/text-snapshot.
     * Runs asynchronously so the SMS transaction has already committed before this executes.
     */
    @Async
    public void syncTextSnapshot(Submission submission, List<Answer> answers) {
        try {
            Map<String, Object> payload = buildPayload(submission, answers);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            restTemplate.postForEntity(vcsUrl + "/api/versions/text-snapshot", request, Void.class);

            log.info("[VCS Sync] Snapshot synced — submissionId={} versionNumber={}",
                    submission.getId(), submission.getVersionNumber());
        } catch (Exception e) {
            log.warn("[VCS Sync] Non-fatal: could not sync snapshot to VCS for submissionId={}: {}",
                    submission.getId(), e.getMessage());
        }
    }

    private Map<String, Object> buildPayload(Submission submission, List<Answer> answers) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("submissionId", submission.getId());
        payload.put("studentId",    submission.getStudentId());
        payload.put("commitMessage",
                (submission.getAssignmentTitle() != null ? submission.getAssignmentTitle() : "Assignment")
                + " — v" + submission.getVersionNumber());
        payload.put("totalWordCount", submission.getTotalWordCount());
        payload.put("overallGrade",   submission.getGrade());
        payload.put("maxGrade",       submission.getMaxGrade());

        List<Map<String, Object>> answerMaps = answers.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("questionId",        a.getQuestionId());
            m.put("questionText",      a.getQuestionText());
            m.put("answerText",        a.getAnswerText());
            m.put("wordCount",         a.getWordCount());
            m.put("grammarScore",      a.getGrammarScore());
            m.put("clarityScore",      a.getClarityScore());
            m.put("completenessScore", a.getCompletenessScore());
            m.put("relevanceScore",    a.getRelevanceScore());
            m.put("strengths",         splitDelimited(a.getAiStrengths()));
            m.put("improvements",      splitDelimited(a.getAiImprovements()));
            m.put("suggestions",       splitDelimited(a.getAiSuggestions()));
            m.put("similarityScore",   a.getSimilarityScore());
            m.put("plagiarismSeverity", a.getPlagiarismSeverity());
            m.put("projectedGrade",    a.getAiGeneratedMark());
            m.put("maxPoints",         10.0);
            return m;
        }).collect(Collectors.toList());

        payload.put("answers", answerMaps);
        return payload;
    }

    /** Split "||"-delimited or comma-delimited AI feedback strings into a list. */
    private List<String> splitDelimited(String text) {
        if (text == null || text.isBlank()) return List.of();
        String delimiter = text.contains("||") ? "\\|\\|" : ",";
        return Arrays.stream(text.split(delimiter))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
