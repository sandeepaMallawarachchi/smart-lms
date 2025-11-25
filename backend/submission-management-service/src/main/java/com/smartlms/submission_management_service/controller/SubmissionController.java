package com.smartlms.submission_management_service.controller;

import java.util.List;

import com.smartlms.submission_management_service.dto.FileInfoDTO;
import com.smartlms.submission_management_service.dto.request.SubmissionRequest;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.exception.FileStorageException;
import com.smartlms.submission_management_service.exception.ResourceNotFoundException;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST Controller for managing student submissions in the Smart LMS system.

 * This controller handles all HTTP requests related to:
 * - Creating and managing submissions (CRUD operations)
 * - Uploading and downloading files attached to submissions
 * - Submitting assignments for grading
 * - Grading submissions

 * Base URL: /api/submissions

 * Architecture Notes:
 * - Uses constructor injection via @RequiredArgsConstructor for better testability
 * - Returns standardized ApiResponse wrapper for consistent API responses
 * - Implements RESTful conventions for HTTP methods and status codes
 * - Logging enabled via @Slf4j for debugging and monitoring
 *
 * @author Smart LMS Development Team
 * @version 1.0
 */
@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
@Slf4j
public class SubmissionController {

    // Service layer dependencies injected via constructor
    private final SubmissionService submissionService;
    private final FileStorageService fileStorageService;

    /**
     * Creates a new submission for a student.

     * This endpoint allows students to create a draft submission for an assignment.
     * The submission starts in DRAFT status and can be edited before final submission.

     * POST /api/submissions
     *
     * @param request SubmissionRequest containing:
     *                - title: Submission title (required)
     *                - description: Optional description
     *                - studentId: ID of the student creating the submission (required)
     *                - studentName: Name of the student (required)
     *                - assignmentId: ID of the assignment being submitted to
     *                - submissionType: Type of submission (ASSIGNMENT, PROJECT, LAB, etc.)
     *                - dueDate: Assignment due date
     *                - maxGrade: Maximum possible grade
     *
     * @return ResponseEntity containing:
     *         - HTTP 201 CREATED status
     *         - ApiResponse wrapper with SubmissionResponse data
     *         - Success message confirming creation

     * Example Request Body:
     * {
     *   "title": "Java Programming Assignment 1",
     *   "description": "Implementation of sorting algorithms",
     *   "studentId": "IT22586766",
     *   "studentName": "John Doe",
     *   "assignmentId": "JAVA-001",
     *   "submissionType": "ASSIGNMENT",
     *   "maxGrade": 100.0
     * }

     * Example Response:
     * {
     *   "success": true,
     *   "message": "Submission created successfully",
     *   "data": {
     *     "id": 1,
     *     "title": "Java Programming Assignment 1",
     *     "status": "DRAFT",
     *     ...
     *   }
     *   "timestamp": "2025-01-23T10:30:00"
     * }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<SubmissionResponse>> createSubmission(
            @Valid @RequestBody SubmissionRequest request) {
        log.info("POST /api/submissions - Creating submission");
        SubmissionResponse response = submissionService.createSubmission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Submission created successfully", response));
    }

    /**
     * Retrieves a specific submission by its ID.

     * This endpoint fetches complete details of a submission including:
     * - Submission metadata (title, description, dates)
     * - Status information
     * - Grade information (if graded)
     * - List of attached files

     * GET /api/submissions/{id}
     *
     * @param id The unique identifier of the submission to retrieve
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with SubmissionResponse data
     *
     * @throws ResourceNotFoundException if submission with given ID doesn't exist

     * Example: GET /api/submissions/1
     *
     * Response includes full submission details with file information
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmissionById(@PathVariable Long id) {
        log.info("GET /api/submissions/{} - Fetching submission", id);
        SubmissionResponse response = submissionService.getSubmissionById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Retrieves submissions with optional filtering.

     * This endpoint supports multiple query scenarios:
     * 1. Get all submissions (no parameters)
     * 2. Get submissions by student ID
     * 3. Get submissions by assignment ID

     * GET /api/submissions?studentId=IT22586766
     * GET /api/submissions?assignmentId=JAVA-001
     * GET /api/submissions

     * @param studentId Optional parameter to filter by student
     * @param assignmentId Optional parameter to filter by assignment
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with List of SubmissionResponse

     * Use Cases:
     * - Students viewing their own submissions
     * - Instructors viewing all submissions for an assignment
     * - Admins viewing all submissions in the system

     * Example: GET /api/submissions?studentId=IT22586766
     * Returns all submissions created by student IT22586766
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getAllSubmissions(
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String assignmentId) {
        log.info("GET /api/submissions - Fetching submissions");

        List<SubmissionResponse> submissions;

        // Priority: studentId > assignmentId > all
        if (studentId != null) {
            submissions = submissionService.getSubmissionsByStudentId(studentId);
        } else if (assignmentId != null) {
            submissions = submissionService.getSubmissionsByAssignmentId(assignmentId);
        } else {
            submissions = submissionService.getAllSubmissions();
        }

        return ResponseEntity.ok(ApiResponse.success(submissions));
    }

    /**
     * Updates an existing submission.

     * This endpoint allows modification of submission details while in DRAFT status.
     * Once submitted, only certain fields can be updated.

     * PUT /api/submissions/{id}
     *
     * @param id The ID of the submission to update
     * @param request SubmissionRequest with updated information
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with updated SubmissionResponse
     *
     * @throws ResourceNotFoundException if submission doesn't exist

     * Business Rules:
     * - Can update title, description, assignment details
     * - Cannot change studentId or submissionType after creation
     * - Status changes handled by separate endpoints

     * Example: PUT /api/submissions/1
     * Updates submission details before final submission
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> updateSubmission(
            @PathVariable Long id,
            @Valid @RequestBody SubmissionRequest request) {
        log.info("PUT /api/submissions/{} - Updating submission", id);
        SubmissionResponse response = submissionService.updateSubmission(id, request);
        return ResponseEntity.ok(ApiResponse.success("Submission updated successfully", response));
    }

    /**
     * Deletes a submission and all associated files.

     * This is a hard delete operation that:
     * 1. Removes submission record from database
     * 2. Deletes all associated files from filesystem
     * 3. Cascades deletion to related entities

     * DELETE /api/submissions/{id}
     *
     * @param id The ID of the submission to delete
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with null data and success message
     *
     * @throws ResourceNotFoundException if submission doesn't exist

     * Important Notes:
     * - This operation cannot be undone
     * - Should be restricted to authorized users (students/admins)
     * - Consider soft delete in production environments
     *
     * Example: DELETE /api/submissions/1
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSubmission(@PathVariable Long id) {
        log.info("DELETE /api/submissions/{} - Deleting submission", id);
        submissionService.deleteSubmission(id);
        return ResponseEntity.ok(ApiResponse.success("Submission deleted successfully", null));
    }

    /**
     * Submits a draft submission for grading.

     * This endpoint changes the submission status from DRAFT to SUBMITTED.
     * Once submitted, the submission is locked and sent for review/grading.

     * POST /api/submissions/{id}/submit
     *
     * @param id The ID of the submission to submit
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with updated SubmissionResponse
     *         - Updated status and submission timestamp
     *
     * @throws IllegalStateException if submission has no files attached
     * @throws ResourceNotFoundException if submission doesn't exist

     * Business Rules:
     * - Submission must have at least one file attached
     * - Sets submittedAt timestamp to current time
     * - Marks as late if submitted after due date
     * - Changes status from DRAFT to SUBMITTED

     * Triggers:
     * - May trigger plagiarism detection
     * - May trigger AI feedback generation
     * - Sends notification to student and instructor
     *
     * Example: POST /api/submissions/1/submit
     */
    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitSubmission(@PathVariable Long id) {
        log.info("POST /api/submissions/{}/submit - Submitting submission", id);
        SubmissionResponse response = submissionService.submitSubmission(id);
        return ResponseEntity.ok(ApiResponse.success("Submission submitted successfully", response));
    }

    /**
     * Grades a submitted assignment.

     * This endpoint allows instructors to assign a grade and provide feedback
     * to a student's submission.

     * POST /api/submissions/{id}/grade?grade=85.5&feedback=Good work
     *
     * @param id The ID of the submission to grade
     * @param grade The numerical grade to assign (required)
     * @param feedback Optional text feedback for the student
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with graded SubmissionResponse
     *
     * @throws IllegalArgumentException if grade exceeds maxGrade
     * @throws ResourceNotFoundException if submission doesn't exist

     * Business Rules:
     * - Grade must not exceed submission's maxGrade
     * - Changes status to GRADED
     * - Stores feedback text in submission
     * - Triggers notification to student

     * Example: POST /api/submissions/1/grade?grade=85.5&feedback=Excellent work!

     * Integration Points:
     * - Notification service sends grade notification
     * - May update student's overall course grade
     * - Feedback displayed in student dashboard
     */
    @PostMapping("/{id}/grade")
    public ResponseEntity<ApiResponse<SubmissionResponse>> gradeSubmission(
            @PathVariable Long id,
            @RequestParam Double grade,
            @RequestParam(required = false) String feedback) {
        log.info("POST /api/submissions/{}/grade - Grading submission", id);
        SubmissionResponse response = submissionService.gradeSubmission(id, grade, feedback);
        return ResponseEntity.ok(ApiResponse.success("Submission graded successfully", response));
    }

    // ==================== FILE MANAGEMENT ENDPOINTS ====================

    /**
     * Uploads a file to a submission.

     * This endpoint handles file uploads for student submissions.
     * Files are stored on the filesystem with unique identifiers.

     * POST /api/submissions/{id}/files
     * Content-Type: multipart/form-data
     *
     * @param id The ID of the submission to attach the file to
     * @param file The multipart file being uploaded
     *
     * @return ResponseEntity containing:
     *         - HTTP 201 CREATED status
     *         - ApiResponse with FileInfoDTO containing file metadata
     *
     * @throws ResourceNotFoundException if submission doesn't exist
     * @throws FileStorageException if file cannot be saved
     * @throws MaxUploadSizeExceededException if file exceeds 50MB limit

     * File Processing:
     * 1. Validates filename (checks for path traversal attempts)
     * 2. Generates unique stored filename using UUID
     * 3. Creates submission-specific directory
     * 4. Saves file to filesystem
     * 5. Stores metadata in database
     * 6. Associates file with submission

     * Supported File Types:
     * - Code files (.java, .py, .js, .cpp, etc.)
     * - Documents (.pdf, .docx, .txt)
     * - Archives (.zip, .rar)
     * - Images (for documentation)

     * Example: POST /api/submissions/1/files
     * Form Data: file=@Main.java
     *
     * Response includes download URL for the uploaded file
     */
    @PostMapping("/{id}/files")
    public ResponseEntity<ApiResponse<FileInfoDTO>> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        log.info("POST /api/submissions/{}/files - Uploading file", id);
        FileInfoDTO fileInfo = fileStorageService.uploadFile(id, file);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("File uploaded successfully", fileInfo));
    }

    /**
     * Retrieves list of files attached to a submission.

     * Returns metadata for all files associated with a submission,
     * including file names, sizes, types, and download URLs.

     * GET /api/submissions/{submissionId}/files
     *
     * @param submissionId The ID of the submission
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with List of FileInfoDTO

     * FileInfoDTO includes:
     * - id: Database ID of the file record
     * - originalFilename: Name of file as uploaded
     * - storedFilename: UUID-based filename on server
     * - fileSize: Size in bytes
     * - contentType: MIME type
     * - fileExtension: File extension
     * - uploadedAt: Timestamp of upload
     * - downloadUrl: URL to download the file

     * Example: GET /api/submissions/1/files
     * Returns array of file metadata objects
     */
    @GetMapping("/{submissionId}/files")
    public ResponseEntity<ApiResponse<List<FileInfoDTO>>> getFiles(@PathVariable Long submissionId) {
        log.info("GET /api/submissions/{}/files - Fetching files", submissionId);
        List<FileInfoDTO> files = fileStorageService.getFilesBySubmissionId(submissionId);
        return ResponseEntity.ok(ApiResponse.success(files));
    }

    /**
     * Downloads a specific file from a submission.

     * This endpoint streams the file content directly to the client
     * with appropriate headers for download.

     * GET /api/submissions/{submissionId}/files/{fileId}
     *
     * @param submissionId The ID of the submission (for validation)
     * @param fileId The ID of the file to download
     * @param request HttpServletRequest for additional context
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - Resource (file content as stream)
     *         - Content-Type header set to file's MIME type
     *         - Content-Disposition header for download
     *
     * @throws ResourceNotFoundException if file doesn't exist

     * Response Headers:
     * - Content-Type: Determined from file metadata (e.g., application/pdf)
     * - Content-Disposition: attachment; filename="originalname.ext"

     * Security Considerations:
     * - Validates file belongs to specified submission
     * - Uses stored filename to prevent path traversal
     * - Stream-based download for memory efficiency

     * Example: GET /api/submissions/1/files/5
     * Downloads the file with ID 5 from submission 1

     * Used By:
     * - Students downloading their submitted files
     * - Instructors downloading submissions for review
     * - Plagiarism detection service
     * - AI feedback service
     */
    @GetMapping("/{submissionId}/files/{fileId}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long submissionId,
            @PathVariable Long fileId,
            HttpServletRequest request) {
        log.info("GET /api/submissions/{}/files/{} - Downloading file", submissionId, fileId);

        // Load file as a resource for streaming
        Resource resource = fileStorageService.loadFileAsResource(fileId);

        // Get metadata for content type and filename
        SubmissionFile fileMetadata = fileStorageService.getFileMetadata(fileId);

        // Determine content type, default to binary if unknown
        String contentType = fileMetadata.getContentType();
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        // Build response with appropriate headers for file download
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileMetadata.getOriginalFilename() + "\"")
                .body(resource);
    }

    /**
     * Deletes a file from a submission.

     * This endpoint removes a file both from the database and filesystem.

     * DELETE /api/submissions/{submissionId}/files/{fileId}
     *
     * @param submissionId The ID of the submission (for validation)
     * @param fileId The ID of the file to delete
     *
     * @return ResponseEntity containing:
     *         - HTTP 200 OK status
     *         - ApiResponse with success message
     *
     * @throws ResourceNotFoundException if file doesn't exist
     * @throws FileStorageException if file cannot be deleted from filesystem

     * Deletion Process:
     * 1. Verifies file exists in database
     * 2. Deletes physical file from filesystem
     * 3. Removes database record
     * 4. Updates submission's file count

     * Business Rules:
     * - Can only delete files from DRAFT submissions
     * - Submitted files should be locked
     * - Verify user has permission to delete

     * Example: DELETE /api/submissions/1/files/5
     * Removes file 5 from submission 1
     */
    @DeleteMapping("/{submissionId}/files/{fileId}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @PathVariable Long submissionId,
            @PathVariable Long fileId) {
        log.info("DELETE /api/submissions/{}/files/{} - Deleting file", submissionId, fileId);
        fileStorageService.deleteFile(fileId);
        return ResponseEntity.ok(ApiResponse.success("File deleted successfully", null));
    }
}