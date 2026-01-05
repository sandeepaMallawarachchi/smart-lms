package com.smartlms.feedback_service.dto.response;

import com.smartlms.feedback_service.model.RubricCriterion;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricCriterionResponse {

    private Long id;
    private String name;
    private String description;
    private Double maxScore;
    private Double weight;
    private Integer orderIndex;
    private String evaluationGuidelines;

    public static RubricCriterionResponse fromEntity(RubricCriterion criterion) {
        return RubricCriterionResponse.builder()
                .id(criterion.getId())
                .name(criterion.getName())
                .description(criterion.getDescription())
                .maxScore(criterion.getMaxScore())
                .weight(criterion.getWeight())
                .orderIndex(criterion.getOrderIndex())
                .evaluationGuidelines(criterion.getEvaluationGuidelines())
                .build();
    }
}