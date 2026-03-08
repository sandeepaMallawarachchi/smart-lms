package com.smartlms.submission_management_service.controller;

import com.smartlms.submission_management_service.dto.response.AnswerResponse;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.service.AnswerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Cross-submission answer search endpoint used by the integrity-monitoring-service
 * to fetch peer answers for plagiarism comparison.
 *
 * This endpoint is internal (service-to-service) and is NOT called from the frontend.
 *
 * Base path: /api/answers
 */
@RestController
@RequestMapping("/api/answers")
@RequiredArgsConstructor
@Slf4j
public class AnswerSearchController {

    private final AnswerService answerService;

    /**
     * Return all peer answers for a given question, excluding all answers from the
     * student currently being checked (by studentId) and optionally by submissionId
     * as a fallback for older rows where studentId was not yet stored.
     *
     * Called by integrity-monitoring-service for TF-IDF peer comparison.
     *
     * GET /api/answers/by-question?questionId={id}&excludeStudentId={id}&excludeSubmissionId={id}
     *
     * @param questionId           Required. The question whose peer answers to retrieve.
     * @param excludeStudentId     Optional. Exclude ALL answers from this student (all versions).
     * @param excludeSubmissionId  Optional. Fallback submissionId exclude for legacy rows.
     */
    @GetMapping("/by-question")
    public ResponseEntity<ApiResponse<List<AnswerResponse>>> getAnswersByQuestion(
            @RequestParam String questionId,
            @RequestParam(required = false) String excludeStudentId,
            @RequestParam(required = false) String excludeSubmissionId) {

        log.info("[AnswerSearchController] GET /api/answers/by-question — questionId={} excludeStudentId={} excludeSubmissionId={}",
                questionId, excludeStudentId, excludeSubmissionId);

        ApiResponse<List<AnswerResponse>> response =
                answerService.getAnswersByQuestion(questionId, excludeStudentId, excludeSubmissionId);

        log.info("[AnswerSearchController] returning {} peer answers for questionId={}",
                response.getData() != null ? response.getData().size() : 0, questionId);

        return ResponseEntity.ok(response);
    }
}
