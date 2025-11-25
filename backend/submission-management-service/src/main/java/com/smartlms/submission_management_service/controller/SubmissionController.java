package com.smartlms.submission_management_service.controller;

import java.util.List;

import com.smartlms.submission_management_service.dto.FileInfoDTO;
import com.smartlms.submission_management_service.dto.request.SubmissionRequest;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.model.SubmissionFile;
import com.smartlms.submission_management_service.service.FileStorageService;
import com.smartlms.submission_management_service.service.SubmissionService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
@Slf4j
public class SubmissionController {

    private final SubmissionService submissionService;
    private final FileStorageService fileStorageService;

    @PostMapping
    public ResponseEntity<ApiResponse<SubmissionResponse>> createSubmission(
            @Valid @RequestBody SubmissionRequest request) {
        log.info("POST /api/submissions - Creating submission");
        SubmissionResponse response = submissionService.createSubmission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Submission created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmissionById(@PathVariable Long id) {
        log.info("GET /api/submissions/{} - Fetching submission", id);
        SubmissionResponse response = submissionService.getSubmissionById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getAllSubmissions(
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String assignmentId) {
        log.info("GET /api/submissions - Fetching submissions");

        List<SubmissionResponse> submissions;
        if (studentId != null) {
            submissions = submissionService.getSubmissionsByStudentId(studentId);
        } else if (assignmentId != null) {
            submissions = submissionService.getSubmissionsByAssignmentId(assignmentId);
        } else {
            submissions = submissionService.getAllSubmissions();
        }

        return ResponseEntity.ok(ApiResponse.success(submissions));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> updateSubmission(
            @PathVariable Long id,
            @Valid @RequestBody SubmissionRequest request) {
        log.info("PUT /api/submissions/{} - Updating submission", id);
        SubmissionResponse response = submissionService.updateSubmission(id, request);
        return ResponseEntity.ok(ApiResponse.success("Submission updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSubmission(@PathVariable Long id) {
        log.info("DELETE /api/submissions/{} - Deleting submission", id);
        submissionService.deleteSubmission(id);
        return ResponseEntity.ok(ApiResponse.success("Submission deleted successfully", null));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitSubmission(@PathVariable Long id) {
        log.info("POST /api/submissions/{}/submit - Submitting submission", id);
        SubmissionResponse response = submissionService.submitSubmission(id);
        return ResponseEntity.ok(ApiResponse.success("Submission submitted successfully", response));
    }

    @PostMapping("/{id}/grade")
    public ResponseEntity<ApiResponse<SubmissionResponse>> gradeSubmission(
            @PathVariable Long id,
            @RequestParam Double grade,
            @RequestParam(required = false) String feedback) {
        log.info("POST /api/submissions/{}/grade - Grading submission", id);
        SubmissionResponse response = submissionService.gradeSubmission(id, grade, feedback);
        return ResponseEntity.ok(ApiResponse.success("Submission graded successfully", response));
    }

    // File Management Endpoints
    @PostMapping("/{id}/files")
    public ResponseEntity<ApiResponse<FileInfoDTO>> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        log.info("POST /api/submissions/{}/files - Uploading file", id);
        FileInfoDTO fileInfo = fileStorageService.uploadFile(id, file);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("File uploaded successfully", fileInfo));
    }

    @GetMapping("/{submissionId}/files")
    public ResponseEntity<ApiResponse<List<FileInfoDTO>>> getFiles(@PathVariable Long submissionId) {
        log.info("GET /api/submissions/{}/files - Fetching files", submissionId);
        List<FileInfoDTO> files = fileStorageService.getFilesBySubmissionId(submissionId);
        return ResponseEntity.ok(ApiResponse.success(files));
    }

    @GetMapping("/{submissionId}/files/{fileId}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long submissionId,
            @PathVariable Long fileId,
            HttpServletRequest request) {
        log.info("GET /api/submissions/{}/files/{} - Downloading file", submissionId, fileId);

        Resource resource = fileStorageService.loadFileAsResource(fileId);
        SubmissionFile fileMetadata = fileStorageService.getFileMetadata(fileId);

        String contentType = fileMetadata.getContentType();
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileMetadata.getOriginalFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{submissionId}/files/{fileId}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @PathVariable Long submissionId,
            @PathVariable Long fileId) {
        log.info("DELETE /api/submissions/{}/files/{} - Deleting file", submissionId, fileId);
        fileStorageService.deleteFile(fileId);
        return ResponseEntity.ok(ApiResponse.success("File deleted successfully", null));
    }
}