package com.smartlms.feedback_service.dto.response;

import com.smartlms.feedback_service.model.Feedback;
import com.smartlms.feedback_service.model.FeedbackStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackResponse {

    private Long id;
    private Long submissionId;
    private Long versionId;
    private String studentId;
    private Long rubricId;
    private String overallFeedback;
    private Double overallScore;
    private Double maxScore;
    private FeedbackStatus status;
    private String generatedBy;
    private String modelUsed;
    private Integer tokensUsed;
    private Long generationTimeMs;
    private Map<String, Object> metadata;
    private Boolean isAiGenerated;
    private Boolean cacheHit;
    private List<CriterionFeedbackResponse> criterionFeedbacks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FeedbackResponse fromEntity(Feedback feedback) {
        return FeedbackResponse.builder()
                .id(feedback.getId())
                .submissionId(feedback.getSubmissionId())
                .versionId(feedback.getVersionId())
                .studentId(feedback.getStudentId())
                .rubricId(feedback.getRubricId())
                .overallFeedback(feedback.getOverallFeedback())
                .overallScore(feedback.getOverallScore())
                .maxScore(feedback.getMaxScore())
                .status(feedback.getStatus())
                .generatedBy(feedback.getGeneratedBy())
                .modelUsed(feedback.getModelUsed())
                .tokensUsed(feedback.getTokensUsed())
                .generationTimeMs(feedback.getGenerationTimeMs())
                .metadata(feedback.getMetadata())
                .isAiGenerated(feedback.getIsAiGenerated())
                .cacheHit(feedback.getCacheHit())
                .criterionFeedbacks(feedback.getCriterionFeedbacks().stream()
                        .map(CriterionFeedbackResponse::fromEntity)
                        .collect(Collectors.toList()))
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }
}