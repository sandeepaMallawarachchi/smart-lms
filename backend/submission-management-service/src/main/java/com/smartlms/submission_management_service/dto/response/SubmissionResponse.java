package com.smartlms.submission_management_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.smartlms.submission_management_service.dto.FileInfoDTO;
import com.smartlms.submission_management_service.model.SubmissionStatus;
import com.smartlms.submission_management_service.model.SubmissionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionResponse {

    private Long id;
    private String title;
    private String description;
    private String studentId;
    private String studentName;
    private String assignmentId;
    private String assignmentTitle;
    private SubmissionStatus status;
    private SubmissionType submissionType;
    private LocalDateTime dueDate;
    private LocalDateTime submittedAt;
    private Double grade;
    private Double maxGrade;
    private String feedbackText;
    private Boolean isLate;
    private Integer versionNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<FileInfoDTO> files;
    private Integer fileCount;
}