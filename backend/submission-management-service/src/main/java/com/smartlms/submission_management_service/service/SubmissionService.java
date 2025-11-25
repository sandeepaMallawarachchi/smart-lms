package com.smartlms.submission_management_service.service;

import com.smartlms.submission_management_service.dto.FileInfoDTO;
import com.smartlms.submission_management_service.dto.request.SubmissionRequest;
import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.exception.ResourceNotFoundException;
import com.smartlms.submission_management_service.model.Submission;
import com.smartlms.submission_management_service.model.SubmissionStatus;
import com.smartlms.submission_management_service.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private final SubmissionRepository submissionRepository;

    @Transactional
    public SubmissionResponse createSubmission(SubmissionRequest request) {
        log.info("Creating submission for student: {}", request.getStudentId());

        Submission submission = Submission.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .studentId(request.getStudentId())
                .studentName(request.getStudentName())
                .assignmentId(request.getAssignmentId())
                .assignmentTitle(request.getAssignmentTitle())
                .submissionType(request.getSubmissionType())
                .status(SubmissionStatus.DRAFT)
                .dueDate(request.getDueDate())
                .maxGrade(request.getMaxGrade())
                .versionNumber(1)
                .build();

        Submission savedSubmission = submissionRepository.save(submission);
        log.info("Submission created with ID: {}", savedSubmission.getId());

        return convertToResponse(savedSubmission);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(Long id) {
        log.info("Fetching submission with ID: {}", id);
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));
        return convertToResponse(submission);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getAllSubmissions() {
        log.info("Fetching all submissions");
        return submissionRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByStudentId(String studentId) {
        log.info("Fetching submissions for student: {}", studentId);
        return submissionRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByAssignmentId(String assignmentId) {
        log.info("Fetching submissions for assignment: {}", assignmentId);
        return submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SubmissionResponse updateSubmission(Long id, SubmissionRequest request) {
        log.info("Updating submission with ID: {}", id);
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        submission.setTitle(request.getTitle());
        submission.setDescription(request.getDescription());
        submission.setAssignmentId(request.getAssignmentId());
        submission.setAssignmentTitle(request.getAssignmentTitle());
        submission.setDueDate(request.getDueDate());
        submission.setMaxGrade(request.getMaxGrade());

        Submission updatedSubmission = submissionRepository.save(submission);
        log.info("Submission updated successfully: {}", id);

        return convertToResponse(updatedSubmission);
    }

    @Transactional
    public void deleteSubmission(Long id) {
        log.info("Deleting submission with ID: {}", id);
        if (!submissionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Submission not found with ID: " + id);
        }
        submissionRepository.deleteById(id);
        log.info("Submission deleted successfully: {}", id);
    }

    @Transactional
    public SubmissionResponse submitSubmission(Long id) {
        log.info("Submitting submission with ID: {}", id);
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        if (submission.getFiles().isEmpty()) {
            throw new IllegalStateException("Cannot submit without files");
        }

        submission.submit();
        Submission submittedSubmission = submissionRepository.save(submission);
        log.info("Submission submitted successfully: {}", id);

        return convertToResponse(submittedSubmission);
    }

    @Transactional
    public SubmissionResponse gradeSubmission(Long id, Double grade, String feedback) {
        log.info("Grading submission with ID: {}", id);
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        if (submission.getMaxGrade() != null && grade > submission.getMaxGrade()) {
            throw new IllegalArgumentException("Grade cannot exceed maximum grade");
        }

        submission.setGrade(grade);
        submission.setFeedbackText(feedback);
        submission.setStatus(SubmissionStatus.GRADED);

        Submission gradedSubmission = submissionRepository.save(submission);
        log.info("Submission graded successfully: {}", id);

        return convertToResponse(gradedSubmission);
    }

    private SubmissionResponse convertToResponse(Submission submission) {
        List<FileInfoDTO> files = submission.getFiles().stream()
                .map(file -> FileInfoDTO.builder()
                        .id(file.getId())
                        .originalFilename(file.getOriginalFilename())
                        .storedFilename(file.getStoredFilename())
                        .fileSize(file.getFileSize())
                        .contentType(file.getContentType())
                        .fileExtension(file.getFileExtension())
                        .uploadedAt(file.getUploadedAt())
                        .downloadUrl("/api/submissions/" + submission.getId() + "/files/" + file.getId())
                        .build())
                .collect(Collectors.toList());

        return SubmissionResponse.builder()
                .id(submission.getId())
                .title(submission.getTitle())
                .description(submission.getDescription())
                .studentId(submission.getStudentId())
                .studentName(submission.getStudentName())
                .assignmentId(submission.getAssignmentId())
                .assignmentTitle(submission.getAssignmentTitle())
                .status(submission.getStatus())
                .submissionType(submission.getSubmissionType())
                .dueDate(submission.getDueDate())
                .submittedAt(submission.getSubmittedAt())
                .grade(submission.getGrade())
                .maxGrade(submission.getMaxGrade())
                .feedbackText(submission.getFeedbackText())
                .isLate(submission.getIsLate())
                .versionNumber(submission.getVersionNumber())
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .files(files)
                .fileCount(files.size())
                .build();
    }
}