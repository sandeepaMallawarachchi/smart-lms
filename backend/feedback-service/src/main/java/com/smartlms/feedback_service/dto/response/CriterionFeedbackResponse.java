package com.smartlms.feedback_service.dto.response;

import com.smartlms.feedback_service.model.CriterionFeedback;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CriterionFeedbackResponse {

    private Long id;
    private Long criterionId;
    private String criterionName;
    private String criterionDescription;
    private Double score;
    private Double maxScore;
    private String feedbackText;
    private String strengths;
    private String improvements;
    private String suggestions;

    public static CriterionFeedbackResponse fromEntity(CriterionFeedback criterion) {
        return CriterionFeedbackResponse.builder()
                .id(criterion.getId())
                .criterionId(criterion.getCriterionId())
                .criterionName(criterion.getCriterionName())
                .criterionDescription(criterion.getCriterionDescription())
                .score(criterion.getScore())
                .maxScore(criterion.getMaxScore())
                .feedbackText(criterion.getFeedbackText())
                .strengths(criterion.getStrengths())
                .improvements(criterion.getImprovements())
                .suggestions(criterion.getSuggestions())
                .build();
    }
}