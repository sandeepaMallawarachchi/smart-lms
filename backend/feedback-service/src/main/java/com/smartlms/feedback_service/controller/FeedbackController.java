package com.smartlms.feedback_service.controller;

import com.smartlms.feedback_service.dto.request.FeedbackRequest;
import com.smartlms.feedback_service.dto.request.GradeCalculationRequest;
import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.FeedbackResponse;
import com.smartlms.feedback_service.dto.response.GradeCalculationResponse;
import com.smartlms.feedback_service.dto.response.LiveFeedbackResponse;
import com.smartlms.feedback_service.service.FeedbackService;
import com.smartlms.feedback_service.service.LiveFeedbackService;
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
    private final LiveFeedbackService liveFeedbackService;

    /**
     * Generate real-time live feedback as the student types (synchronous, no DB persistence).
     *
     * Called by the frontend debounced callback ~3 seconds after the student
     * stops typing in a question editor. Returns lightweight scores and suggestions
     * immediately without storing any feedback record to the database.
     *
     * POST /api/feedback/live
     */
    @PostMapping("/live")
    public CompletableFuture<ResponseEntity<ApiResponse<LiveFeedbackResponse>>> generateLiveFeedback(
            @Valid @RequestBody LiveFeedbackRequest request) {
        log.info("POST /api/feedback/live — questionId={} textLen={} questionPrompt='{}'",
                request.getQuestionId(),
                request.getAnswerText().length(),
                request.getQuestionPrompt() != null
                        ? request.getQuestionPrompt().substring(0, Math.min(60, request.getQuestionPrompt().length()))
                        : "(none)");

        return liveFeedbackService.generateLiveFeedback(request)
                .thenApply(response -> {
                    log.info("POST /api/feedback/live — DONE questionId={} grammar={} clarity={}",
                            request.getQuestionId(),
                            response.getData() != null ? response.getData().getGrammarScore() : "null",
                            response.getData() != null ? response.getData().getClarityScore() : "null");
                    return ResponseEntity.ok(response);
                })
                .exceptionally(ex -> {
                    log.error("POST /api/feedback/live — FAILED questionId={}: {}",
                            request.getQuestionId(), ex.getMessage());
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                            .body(ApiResponse.error("AI feedback service temporarily unavailable: " + ex.getMessage()));
                });
    }

    /**
     * Re-compute the projected grade from existing AI scores + an updated plagiarism score.
     *
     * Called by the frontend when the plagiarism check completes after live feedback
     * has already been received (the two debounced operations fire independently).
     * This avoids keeping grade formula logic in the frontend.
     *
     * POST /api/feedback/grade
     */
    @PostMapping("/grade")
    public ResponseEntity<ApiResponse<GradeCalculationResponse>> calculateGrade(
            @RequestBody GradeCalculationRequest request) {
        log.info("POST /api/feedback/grade — maxPts={} wordCount={} simScore={}",
                request.getMaxPoints(), request.getWordCount(), request.getSimilarityScore());

        if (request.getMaxPoints() == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("maxPoints is required for grade calculation"));
        }

        LiveFeedbackResponse stub = LiveFeedbackResponse.builder()
                .grammarScore(request.getGrammarScore())
                .clarityScore(request.getClarityScore())
                .completenessScore(request.getCompletenessScore())
                .relevanceScore(request.getRelevanceScore())
                .build();

        liveFeedbackService.attachProjectedGradeFromWordCount(
                stub,
                request.getMaxPoints(),
                request.getWordCount() != null ? request.getWordCount() : 0,
                request.getExpectedWordCount(),
                request.getSimilarityScore());

        GradeCalculationResponse grade = GradeCalculationResponse.builder()
                .projectedGrade(stub.getProjectedGrade())
                .projectedGradePercent(stub.getProjectedGradePercent())
                .letterGrade(stub.getLetterGrade())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Grade calculated", grade));
    }

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