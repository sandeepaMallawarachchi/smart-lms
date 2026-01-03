package com.smartlms.feedback_service.controller;

import com.smartlms.feedback_service.dto.request.FeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.FeedbackResponse;
import com.smartlms.feedback_service.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
@Slf4j
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * Generate feedback (synchronous)
     */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<FeedbackResponse>> generateFeedback(
            @Valid @RequestBody FeedbackRequest request) {
        log.info("POST /api/feedback/generate - Generating feedback for submission: {}",
                request.getSubmissionId());

        ApiResponse<FeedbackResponse> response = feedbackService.generateFeedback(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Generate feedback (asynchronous)
     */
    @PostMapping("/generate-async")
    public ResponseEntity<ApiResponse<String>> generateFeedbackAsync(
            @Valid @RequestBody FeedbackRequest request) {
        log.info("POST /api/feedback/generate-async - Starting async feedback generation for submission: {}",
                request.getSubmissionId());

        CompletableFuture<FeedbackResponse> future = feedbackService.generateFeedbackAsync(request);

        return ResponseEntity.accepted()
                .body(ApiResponse.success(
                        "Feedback generation started. Check back later for results.",
                        "Processing in background"
                ));
    }

    /**
     * Get feedback by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FeedbackResponse>> getFeedbackById(@PathVariable Long id) {
        log.info("GET /api/feedback/{} - Fetching feedback", id);
        ApiResponse<FeedbackResponse> response = feedbackService.getFeedbackById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get feedback by submission ID
     */
    @GetMapping("/submission/{submissionId}")
    public ResponseEntity<ApiResponse<List<FeedbackResponse>>> getFeedbackBySubmissionId(
            @PathVariable Long submissionId) {
        log.info("GET /api/feedback/submission/{} - Fetching feedback", submissionId);
        ApiResponse<List<FeedbackResponse>> response =
                feedbackService.getFeedbackBySubmissionId(submissionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get feedback by student ID
     */
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<FeedbackResponse>>> getFeedbackByStudentId(
            @PathVariable String studentId) {
        log.info("GET /api/feedback/student/{} - Fetching feedback", studentId);
        ApiResponse<List<FeedbackResponse>> response =
                feedbackService.getFeedbackByStudentId(studentId);
        return ResponseEntity.ok(response);
    }
}