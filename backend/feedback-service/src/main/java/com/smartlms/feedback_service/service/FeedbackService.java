package com.smartlms.feedback_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlms.feedback_service.dto.request.FeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.CriterionFeedbackResponse;
import com.smartlms.feedback_service.dto.response.FeedbackResponse;
import com.smartlms.feedback_service.exception.FeedbackGenerationException;
import com.smartlms.feedback_service.exception.ResourceNotFoundException;
import com.smartlms.feedback_service.model.*;
import com.smartlms.feedback_service.repository.FeedbackRepository;
import com.smartlms.feedback_service.repository.RubricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final RubricRepository rubricRepository;
    private final HuggingFaceService huggingFaceService;
    private final FeedbackCacheService cacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generate feedback for a submission (synchronous)
     */
    @Transactional
    public ApiResponse<FeedbackResponse> generateFeedback(FeedbackRequest request) {
        log.info("Generating feedback for submission: {}", request.getSubmissionId());

        long startTime = System.currentTimeMillis();

        try {
            // Check cache first (unless force regenerate)
            if (!request.getForceRegenerate()) {
                String cacheKey = cacheService.generateCacheKey(
                        request.getSubmissionContent(),
                        request.getRubricId()
                );

                FeedbackResponse cachedFeedback = cacheService.getCachedFeedback(cacheKey);
                if (cachedFeedback != null) {
                    log.info("Returning cached feedback for submission: {}", request.getSubmissionId());

                    // Create a new feedback record with cache hit flag
                    Feedback feedback = createFeedbackFromCache(request, cachedFeedback);
                    feedback.setCacheHit(true);
                    feedback = feedbackRepository.save(feedback);

                    return ApiResponse.success("Feedback retrieved from cache",
                            FeedbackResponse.fromEntity(feedback));
                }
            }

            // Check if Hugging Face is available
            if (!huggingFaceService.isAvailable()) {
                log.warn("Hugging Face service not available, using fallback feedback");
                return generateFallbackFeedback(request);
            }

            // Get rubric if provided
            Rubric rubric = null;
            if (request.getRubricId() != null) {
                rubric = rubricRepository.findById(request.getRubricId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Rubric not found with ID: " + request.getRubricId()));
            }

            // Create feedback entity
            Feedback feedback = Feedback.builder()
                    .submissionId(request.getSubmissionId())
                    .versionId(request.getVersionId())
                    .studentId(request.getStudentId())
                    .rubricId(request.getRubricId())
                    .status(FeedbackStatus.GENERATING)
                    .isAiGenerated(true)
                    .cacheHit(false)
                    .modelUsed(huggingFaceService.getModelName())
                    .build();

            feedback = feedbackRepository.save(feedback);

            // Generate feedback using AI
            if (rubric != null) {
                generateRubricBasedFeedback(feedback, request.getSubmissionContent(), rubric);
            } else {
                generateGeneralFeedback(feedback, request.getSubmissionContent());
            }

            // Update status and timing
            long endTime = System.currentTimeMillis();
            feedback.setGenerationTimeMs(endTime - startTime);
            feedback.setStatus(FeedbackStatus.COMPLETED);
            feedback = feedbackRepository.save(feedback);

            // Cache the result
            FeedbackResponse response = FeedbackResponse.fromEntity(feedback);
            String cacheKey = cacheService.generateCacheKey(
                    request.getSubmissionContent(),
                    request.getRubricId()
            );
            cacheService.cacheFeedback(cacheKey, response);

            log.info("Feedback generated successfully for submission: {} in {}ms",
                    request.getSubmissionId(), feedback.getGenerationTimeMs());

            return ApiResponse.success("Feedback generated successfully", response);

        } catch (Exception e) {
            log.error("Error generating feedback: {}", e.getMessage(), e);
            throw new FeedbackGenerationException("Failed to generate feedback: " + e.getMessage(), e);
        }
    }

    /**
     * Generate feedback asynchronously
     */
    @Async("feedbackTaskExecutor")
    public CompletableFuture<FeedbackResponse> generateFeedbackAsync(FeedbackRequest request) {
        log.info("Starting async feedback generation for submission: {}", request.getSubmissionId());

        try {
            ApiResponse<FeedbackResponse> response = generateFeedback(request);
            return CompletableFuture.completedFuture(response.getData());
        } catch (Exception e) {
            log.error("Error in async feedback generation: {}", e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Generate rubric-based feedback
     */
    private void generateRubricBasedFeedback(Feedback feedback, String content, Rubric rubric) {
        log.debug("Generating rubric-based feedback");

        double totalScore = 0.0;
        double maxTotalScore = rubric.getTotalPoints();

        // Generate feedback for each criterion
        for (RubricCriterion criterion : rubric.getCriteria()) {
            CriterionFeedback criterionFeedback = generateCriterionFeedback(
                    content, criterion
            );

            criterionFeedback.setFeedback(feedback);
            feedback.addCriterionFeedback(criterionFeedback);

            if (criterionFeedback.getScore() != null) {
                totalScore += criterionFeedback.getScore();
            }
        }

        // Generate overall feedback
        String overallPrompt = buildOverallFeedbackPrompt(content, rubric, feedback.getCriterionFeedbacks());
        String overallFeedback = huggingFaceService.generateCompletion(overallPrompt);

        feedback.setOverallFeedback(overallFeedback);
        feedback.setOverallScore(totalScore);
        feedback.setMaxScore(maxTotalScore);
    }

    /**
     * Generate feedback for a single criterion
     */
    private CriterionFeedback generateCriterionFeedback(String content, RubricCriterion criterion) {
        String prompt = buildCriterionPrompt(content, criterion);

        try {
            String aiResponse = huggingFaceService.generateCompletion(prompt);
            return parseCriterionFeedback(aiResponse, criterion);
        } catch (Exception e) {
            log.error("Error generating criterion feedback: {}", e.getMessage());
            return createFallbackCriterionFeedback(criterion);
        }
    }

    /**
     * Build prompt for criterion evaluation
     */
    private String buildCriterionPrompt(String content, RubricCriterion criterion) {
        return String.format("""
            [INST] You are an expert educator evaluating student work. Evaluate the following submission based on this criterion:
            
            Criterion: %s
            Description: %s
            Max Score: %.1f
            Evaluation Guidelines: %s
            
            Submission Content:
            %s
            
            Please provide your evaluation in the following JSON format:
            {
              "score": <number between 0 and %.1f>,
              "feedbackText": "<brief overall assessment>",
              "strengths": "<what the student did well>",
              "improvements": "<areas that need improvement>",
              "suggestions": "<specific actionable suggestions>"
            }
            
            Respond ONLY with valid JSON, no additional text. [/INST]
            """,
                criterion.getName(),
                criterion.getDescription() != null ? criterion.getDescription() : "N/A",
                criterion.getMaxScore(),
                criterion.getEvaluationGuidelines() != null ? criterion.getEvaluationGuidelines() : "Use your best judgment",
                truncateContent(content, 2000),
                criterion.getMaxScore()
        );
    }

    /**
     * Parse criterion feedback from AI response
     */
    private CriterionFeedback parseCriterionFeedback(String aiResponse, RubricCriterion criterion) {
        try {
            // Clean the response
            String cleanedResponse = aiResponse.trim();
            if (cleanedResponse.startsWith("```json")) {
                cleanedResponse = cleanedResponse.substring(7);
            }
            if (cleanedResponse.startsWith("```")) {
                cleanedResponse = cleanedResponse.substring(3);
            }
            if (cleanedResponse.endsWith("```")) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length() - 3);
            }
            cleanedResponse = cleanedResponse.trim();

            // Find JSON in response
            int jsonStart = cleanedResponse.indexOf("{");
            int jsonEnd = cleanedResponse.lastIndexOf("}");
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            }

            JsonNode jsonNode = objectMapper.readTree(cleanedResponse);

            return CriterionFeedback.builder()
                    .criterionId(criterion.getId())
                    .criterionName(criterion.getName())
                    .criterionDescription(criterion.getDescription())
                    .maxScore(criterion.getMaxScore())
                    .score(jsonNode.has("score") ? jsonNode.get("score").asDouble() : null)
                    .feedbackText(jsonNode.has("feedbackText") ? jsonNode.get("feedbackText").asText() : null)
                    .strengths(jsonNode.has("strengths") ? jsonNode.get("strengths").asText() : null)
                    .improvements(jsonNode.has("improvements") ? jsonNode.get("improvements").asText() : null)
                    .suggestions(jsonNode.has("suggestions") ? jsonNode.get("suggestions").asText() : null)
                    .build();

        } catch (Exception e) {
            log.error("Error parsing criterion feedback JSON: {}", e.getMessage());
            log.debug("AI Response was: {}", aiResponse);
            return createFallbackCriterionFeedback(criterion);
        }
    }

    /**
     * Build overall feedback prompt
     */
    private String buildOverallFeedbackPrompt(String content, Rubric rubric,
                                              List<CriterionFeedback> criterionFeedbacks) {
        StringBuilder criteriaResults = new StringBuilder();
        for (CriterionFeedback cf : criterionFeedbacks) {
            criteriaResults.append(String.format("\n- %s: %.1f/%.1f - %s",
                    cf.getCriterionName(),
                    cf.getScore() != null ? cf.getScore() : 0,
                    cf.getMaxScore(),
                    cf.getFeedbackText() != null ? cf.getFeedbackText() : "N/A"
            ));
        }

        return String.format("""
            [INST] You are an expert educator providing overall feedback on a student submission.
            
            Rubric: %s
            %s
            
            Individual Criterion Results:%s
            
            Submission Content:
            %s
            
            Please provide a comprehensive overall assessment that:
            1. Summarizes the student's performance across all criteria
            2. Highlights the strongest aspects of the work
            3. Identifies key areas for improvement
            4. Provides encouragement and next steps
            
            Keep the feedback constructive, specific, and actionable. Limit to 3-4 paragraphs. [/INST]
            """,
                rubric.getTitle(),
                rubric.getDescription() != null ? rubric.getDescription() : "",
                criteriaResults.toString(),
                truncateContent(content, 1500)
        );
    }

    /**
     * Generate general feedback (without rubric)
     */
    private void generateGeneralFeedback(Feedback feedback, String content) {
        log.debug("Generating general feedback");

        String prompt = String.format("""
            [INST] You are an expert educator providing feedback on a student submission.
            
            Submission Content:
            %s
            
            Please provide comprehensive feedback covering:
            1. Overall quality and completeness
            2. Strengths and what was done well
            3. Areas for improvement
            4. Specific suggestions for enhancement
            5. An estimated quality score out of 100
            
            Provide your response in the following JSON format:
            {
              "overallFeedback": "<comprehensive feedback>",
              "overallScore": <number between 0 and 100>,
              "strengths": "<key strengths>",
              "improvements": "<areas to improve>",
              "suggestions": "<actionable suggestions>"
            }
            
            Respond ONLY with valid JSON, no additional text. [/INST]
            """,
                truncateContent(content, 3000)
        );

        try {
            String aiResponse = huggingFaceService.generateCompletion(prompt);

            // Clean and parse response
            String cleanedResponse = aiResponse.trim();
            if (cleanedResponse.startsWith("```json")) {
                cleanedResponse = cleanedResponse.substring(7);
            }
            if (cleanedResponse.startsWith("```")) {
                cleanedResponse = cleanedResponse.substring(3);
            }
            if (cleanedResponse.endsWith("```")) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length() - 3);
            }
            cleanedResponse = cleanedResponse.trim();

            // Find JSON in response
            int jsonStart = cleanedResponse.indexOf("{");
            int jsonEnd = cleanedResponse.lastIndexOf("}");
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            }

            JsonNode jsonNode = objectMapper.readTree(cleanedResponse);

            feedback.setOverallFeedback(jsonNode.get("overallFeedback").asText());
            feedback.setOverallScore(jsonNode.get("overallScore").asDouble());
            feedback.setMaxScore(100.0);

            // Create a single criterion feedback
            CriterionFeedback generalFeedback = CriterionFeedback.builder()
                    .criterionId(0L)
                    .criterionName("Overall Assessment")
                    .maxScore(100.0)
                    .score(jsonNode.get("overallScore").asDouble())
                    .strengths(jsonNode.has("strengths") ? jsonNode.get("strengths").asText() : null)
                    .improvements(jsonNode.has("improvements") ? jsonNode.get("improvements").asText() : null)
                    .suggestions(jsonNode.has("suggestions") ? jsonNode.get("suggestions").asText() : null)
                    .build();

            generalFeedback.setFeedback(feedback);
            feedback.addCriterionFeedback(generalFeedback);

        } catch (Exception e) {
            log.error("Error generating general feedback: {}", e.getMessage());
            feedback.setOverallFeedback("Unable to generate AI feedback. Please try again later.");
            feedback.setOverallScore(0.0);
            feedback.setMaxScore(100.0);
        }
    }

    /**
     * Generate fallback feedback when AI is unavailable
     */
    private ApiResponse<FeedbackResponse> generateFallbackFeedback(FeedbackRequest request) {
        log.info("Generating fallback feedback for submission: {}", request.getSubmissionId());

        Feedback feedback = Feedback.builder()
                .submissionId(request.getSubmissionId())
                .versionId(request.getVersionId())
                .studentId(request.getStudentId())
                .rubricId(request.getRubricId())
                .overallFeedback("AI service is currently unavailable. Your submission has been received and will be reviewed manually.")
                .status(FeedbackStatus.PENDING)
                .isAiGenerated(false)
                .build();

        feedback = feedbackRepository.save(feedback);

        return ApiResponse.success("Submission received. AI feedback temporarily unavailable.",
                FeedbackResponse.fromEntity(feedback));
    }

    /**
     * Create feedback from cached response
     */
    private Feedback createFeedbackFromCache(FeedbackRequest request, FeedbackResponse cachedResponse) {
        Feedback feedback = Feedback.builder()
                .submissionId(request.getSubmissionId())
                .versionId(request.getVersionId())
                .studentId(request.getStudentId())
                .rubricId(request.getRubricId())
                .overallFeedback(cachedResponse.getOverallFeedback())
                .overallScore(cachedResponse.getOverallScore())
                .maxScore(cachedResponse.getMaxScore())
                .status(FeedbackStatus.COMPLETED)
                .isAiGenerated(true)
                .cacheHit(true)
                .modelUsed(cachedResponse.getModelUsed())
                .build();

        // Add criterion feedbacks
        for (CriterionFeedbackResponse cfr : cachedResponse.getCriterionFeedbacks()) {
            CriterionFeedback cf = CriterionFeedback.builder()
                    .criterionId(cfr.getCriterionId())
                    .criterionName(cfr.getCriterionName())
                    .criterionDescription(cfr.getCriterionDescription())
                    .score(cfr.getScore())
                    .maxScore(cfr.getMaxScore())
                    .feedbackText(cfr.getFeedbackText())
                    .strengths(cfr.getStrengths())
                    .improvements(cfr.getImprovements())
                    .suggestions(cfr.getSuggestions())
                    .build();

            feedback.addCriterionFeedback(cf);
        }

        return feedback;
    }

    /**
     * Create fallback criterion feedback
     */
    private CriterionFeedback createFallbackCriterionFeedback(RubricCriterion criterion) {
        return CriterionFeedback.builder()
                .criterionId(criterion.getId())
                .criterionName(criterion.getName())
                .criterionDescription(criterion.getDescription())
                .maxScore(criterion.getMaxScore())
                .feedbackText("Feedback generation encountered an error. Manual review recommended.")
                .build();
    }

    /**
     * Get feedback by ID
     */
    public ApiResponse<FeedbackResponse> getFeedbackById(Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found with ID: " + id));

        return ApiResponse.success(FeedbackResponse.fromEntity(feedback));
    }

    /**
     * Get feedback by submission ID
     */
    public ApiResponse<List<FeedbackResponse>> getFeedbackBySubmissionId(Long submissionId) {
        List<Feedback> feedbacks = feedbackRepository.findBySubmissionIdOrderByCreatedAtDesc(submissionId);

        List<FeedbackResponse> responses = feedbacks.stream()
                .map(FeedbackResponse::fromEntity)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    /**
     * Get feedback by student ID
     */
    public ApiResponse<List<FeedbackResponse>> getFeedbackByStudentId(String studentId) {
        List<Feedback> feedbacks = feedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId);

        List<FeedbackResponse> responses = feedbacks.stream()
                .map(FeedbackResponse::fromEntity)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    /**
     * Utility: Truncate content to specified length
     */
    private String truncateContent(String content, int maxLength) {
        if (content == null) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + "... [truncated]";
    }
}