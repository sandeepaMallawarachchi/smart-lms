package com.smartlms.feedback_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackRequest {

    @NotNull(message = "Submission ID is required")
    private Long submissionId;

    private Long versionId;

    @NotBlank(message = "Student ID is required")
    private String studentId;

    private Long rubricId;

    @NotBlank(message = "Submission content is required")
    private String submissionContent;

    private Boolean forceRegenerate = false;
}