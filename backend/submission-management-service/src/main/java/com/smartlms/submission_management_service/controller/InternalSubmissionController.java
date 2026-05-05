package com.smartlms.submission_management_service.controller;

import com.smartlms.submission_management_service.dto.response.AnswerResponse;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.dto.response.VersionResponse;
import com.smartlms.submission_management_service.service.AnswerService;
import com.smartlms.submission_management_service.service.SubmissionService;
import com.smartlms.submission_management_service.service.VersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Internal service-to-service endpoints used by integrity-monitoring-service.
 * No JWT auth required — only reachable within the Docker network.
 *
 * Base path: /api/internal/submissions
 */
@RestController
@RequestMapping("/api/internal/submissions")
@RequiredArgsConstructor
@Slf4j
public class InternalSubmissionController {

    private final SubmissionService submissionService;
    private final VersionService versionService;
    private final AnswerService answerService;

    /**
     * GET /api/internal/submissions/{id}
     * Returns full submission metadata including studentName, assignmentTitle, submittedAt.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmission(@PathVariable Long id) {
        log.debug("[Internal] GET /api/internal/submissions/{}", id);
        SubmissionResponse response = submissionService.getSubmissionById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/internal/submissions/{id}/versions/latest
     * Returns the latest version snapshot with all answers and AI scores.
     * Used by integrity-monitoring-service to populate the AI feedback section of PDF reports.
     */
    @GetMapping("/{id}/versions/latest")
    public ResponseEntity<ApiResponse<VersionResponse>> getLatestVersion(@PathVariable Long id) {
        log.debug("[Internal] GET /api/internal/submissions/{}/versions/latest", id);
        VersionResponse response = versionService.getLatestVersion(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/internal/submissions/{id}/answers
     * Returns all answers for a submission with AI scores and plagiarism scores.
     * Used by integrity-monitoring-service to populate per-question sections in PDF reports.
     */
    @GetMapping("/{id}/answers")
    public ResponseEntity<ApiResponse<List<AnswerResponse>>> getAnswers(@PathVariable Long id) {
        log.debug("[Internal] GET /api/internal/submissions/{}/answers", id);
        return ResponseEntity.ok(answerService.getAnswers(id.toString()));
    }
}
