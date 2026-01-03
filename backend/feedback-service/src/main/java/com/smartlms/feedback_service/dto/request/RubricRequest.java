package com.smartlms.feedback_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private String assignmentType;

    private String createdBy;

    @NotEmpty(message = "At least one criterion is required")
    @Valid
    private List<RubricCriterionRequest> criteria;
}