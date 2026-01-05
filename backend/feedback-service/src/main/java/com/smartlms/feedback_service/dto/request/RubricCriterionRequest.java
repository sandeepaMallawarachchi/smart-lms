package com.smartlms.feedback_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricCriterionRequest {

    @NotBlank(message = "Criterion name is required")
    private String name;

    private String description;

    @NotNull(message = "Max score is required")
    @Positive(message = "Max score must be positive")
    private Double maxScore;

    private Double weight = 1.0;

    private Integer orderIndex;

    private String evaluationGuidelines;
}