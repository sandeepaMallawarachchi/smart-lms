package com.example.integrity_monitoring_service.dto.request;

import com.example.integrity_monitoring_service.model.CheckType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlagiarismCheckRequest {

    @NotNull(message = "Submission ID is required")
    private Long submissionId;

    @NotBlank(message = "Student ID is required")
    private String studentId;

    private String assignmentId;

    private Long questionId;

    @NotNull(message = "Check type is required")
    private CheckType checkType;

    // Content to check
    private String textContent;
    private String codeContent;
    private String fileContent;
    private String fileName;

    // Comparison options
    private Boolean checkAllInAssignment = false;
    private List<Long> compareWithSubmissionIds;
    private Boolean checkInternet = true;

    // Question context (for determining if plagiarism check needed)
    private String questionText;
    private String questionType;
    private String expectedAnswer;

    // Thresholds (optional, uses defaults if not provided)
    private Double customThreshold;
}