package com.smartlms.submission_management_service.dto.request;

import java.time.LocalDateTime;


import com.smartlms.submission_management_service.model.SubmissionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotBlank(message = "Student ID is required")
    private String studentId;

    @NotBlank(message = "Student name is required")
    private String studentName;

    private String assignmentId;

    private String assignmentTitle;

    @NotNull(message = "Submission type is required")
    private SubmissionType submissionType;

    private LocalDateTime dueDate;

    private Double maxGrade;
}
