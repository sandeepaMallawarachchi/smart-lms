package com.smartlms.feedback_service.dto.response;

import com.smartlms.feedback_service.model.Rubric;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricResponse {

    private Long id;
    private String title;
    private String description;
    private String assignmentType;
    private Double totalPoints;
    private String createdBy;
    private Boolean isActive;
    private List<RubricCriterionResponse> criteria;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RubricResponse fromEntity(Rubric rubric) {
        return RubricResponse.builder()
                .id(rubric.getId())
                .title(rubric.getTitle())
                .description(rubric.getDescription())
                .assignmentType(rubric.getAssignmentType())
                .totalPoints(rubric.getTotalPoints())
                .createdBy(rubric.getCreatedBy())
                .isActive(rubric.getIsActive())
                .criteria(rubric.getCriteria().stream()
                        .map(RubricCriterionResponse::fromEntity)
                        .collect(Collectors.toList()))
                .createdAt(rubric.getCreatedAt())
                .updatedAt(rubric.getUpdatedAt())
                .build();
    }
}