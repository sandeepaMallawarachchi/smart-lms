package com.smartlms.submission_management_service.controller;

import com.smartlms.submission_management_service.dto.request.SaveAnswerRequest;
import com.smartlms.submission_management_service.dto.request.SaveAnswerAnalysisRequest;
import com.smartlms.submission_management_service.dto.response.AnswerResponse;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.service.AnswerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for text-based student answers.
 *
 * These endpoints are called by the frontend's debounced auto-save
 * mechanism (~every 5 seconds while the student is typing), and by
 * the lecturer grading page to read student answers.
 *
 * Base path: /api/submissions/{submissionId}/answers
 */
@RestController
@RequestMapping("/api/submissions/{submissionId}/answers")
@RequiredArgsConstructor
@Slf4j
public class AnswerController {

    private final AnswerService answerService;

    /**
     * Save or update a student's answer for a specific question.
     *
     * Called automatically by the frontend after 5 seconds of no typing.
     * Performs an upsert — safe to call multiple times with the same
     * (submissionId, questionId) pair.
     *
     * PUT /api/submissions/{submissionId}/answers/{questionId}
     */
    @PutMapping("/{questionId}")
    public ResponseEntity<ApiResponse<AnswerResponse>> saveAnswer(
            @PathVariable String submissionId,
            @PathVariable String questionId,
            @Valid @RequestBody SaveAnswerRequest request) {

        int textLen = request.getAnswerText() != null ? request.getAnswerText().length() : 0;
        log.info("[AnswerController] PUT /api/submissions/{}/answers/{} — wordCount={} chars={}",
                submissionId, questionId, request.getWordCount(), textLen);

        ApiResponse<AnswerResponse> response = answerService.saveAnswer(submissionId, questionId, request);

        log.info("[AnswerController] PUT DONE — answerId={} success={}",
                response.getData() != null ? response.getData().getId() : "null",
                response.isSuccess());

        return ResponseEntity.ok(response);
    }

    /**
     * Persist AI feedback and/or plagiarism results for a specific answer.
     *
     * Called silently by the frontend after receiving live AI feedback or plagiarism results.
     * Only saves if the answer has wordCount >= 1 (enforced in the service layer).
     *
     * PATCH /api/submissions/{submissionId}/answers/{questionId}/analysis
     */
    @PatchMapping("/{questionId}/analysis")
    public ResponseEntity<ApiResponse<AnswerResponse>> saveAnalysis(
            @PathVariable String submissionId,
            @PathVariable String questionId,
            @RequestBody SaveAnswerAnalysisRequest request) {

        log.info("[AnswerController] PATCH /api/submissions/{}/answers/{}/analysis", submissionId, questionId);

        ApiResponse<AnswerResponse> response = answerService.saveAnalysis(submissionId, questionId, request);

        log.info("[AnswerController] PATCH analysis DONE — answerId={} success={}",
                response.getData() != null ? response.getData().getId() : "null",
                response.isSuccess());

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve all saved answers for a submission.
     *
     * Called by:
     *   - The answer page on load (to restore any previously auto-saved progress)
     *   - The lecturer grading page (to show student's typed text next to each question)
     *
     * GET /api/submissions/{submissionId}/answers
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AnswerResponse>>> getAnswers(
            @PathVariable String submissionId) {

        log.info("[AnswerController] GET /api/submissions/{}/answers", submissionId);

        ApiResponse<List<AnswerResponse>> response = answerService.getAnswers(submissionId);

        log.info("[AnswerController] GET DONE — returning {} answers for submissionId={}",
                response.getData() != null ? response.getData().size() : 0, submissionId);

        return ResponseEntity.ok(response);
    }
}
