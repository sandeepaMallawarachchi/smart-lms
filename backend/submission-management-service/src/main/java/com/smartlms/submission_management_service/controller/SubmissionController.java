package com.smartlms.submission_management_service.controller;

import java.util.List;
import java.util.Map;

import com.smartlms.submission_management_service.dto.request.GradeRequest;
import com.smartlms.submission_management_service.dto.request.SubmissionRequest;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.exception.AccessDeniedException;
import com.smartlms.submission_management_service.exception.ResourceNotFoundException;
import com.smartlms.submission_management_service.service.SubmissionService;
import com.smartlms.submission_management_service.util.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
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

    private final SubmissionService submissionService;

    // ── Auth helpers ──────────────────────────────────────────────────────────

    /**
     * Parse JWT claims from the request's Authorization header.
     * Returns null when the header is absent or malformed (→ 401).
     */
    private Map<String, Object> claims(HttpServletRequest req) {
        return JwtUtils.parseClaims(req.getHeader("Authorization"));
    }

    /** Throw 401 when claims are null (no / bad token). */
    private Map<String, Object> requireAuth(HttpServletRequest req) {
        Map<String, Object> c = claims(req);
        if (c == null) throw new AccessDeniedException("Authentication required");
        return c;
    }

    /** Throw 403 when the caller is not a lecturer. */
    private void requireLecturer(Map<String, Object> claims) {
        if (!JwtUtils.isLecturer(claims)) {
            throw new AccessDeniedException("Lecturer role required");
        }
    }

    /** Throw 403 when the caller is not a student. */
    private void requireStudent(Map<String, Object> claims) {
        if (!JwtUtils.isStudent(claims)) {
            throw new AccessDeniedException("Student role required");
        }
    }

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
            @Valid @RequestBody SubmissionRequest request,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        requireStudent(c);
        String callerId = JwtUtils.extractUserId(c);
        if (!callerId.equals(request.getStudentId())) {
            throw new AccessDeniedException("Cannot create a submission on behalf of another student");
        }
        log.info("POST /api/submissions - Creating submission for student={}", callerId);
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
    public ResponseEntity<ApiResponse<SubmissionResponse>> getSubmissionById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        log.info("GET /api/submissions/{} - Fetching submission", id);
        SubmissionResponse response = submissionService.getSubmissionById(id);
        if (JwtUtils.isStudent(c) && !JwtUtils.extractUserId(c).equals(response.getStudentId())) {
            throw new AccessDeniedException("You do not have permission to view submission " + id);
        }
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
    public ResponseEntity<ApiResponse<?>> getAllSubmissions(
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String assignmentId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        String callerId = JwtUtils.extractUserId(c);

        // Students may only query their own submissions.
        if (JwtUtils.isStudent(c)) {
            if (studentId == null) {
                throw new AccessDeniedException("Students must provide their own studentId filter");
            }
            if (!callerId.equals(studentId)) {
                throw new AccessDeniedException("Students may only query their own submissions");
            }
        }

        log.info("GET /api/submissions - studentId={} assignmentId={} page={} size={}",
                studentId, assignmentId, page, size);

        // Scoped queries return a bounded list — no pagination needed.
        if (studentId != null && assignmentId != null) {
            List<SubmissionResponse> submissions =
                    submissionService.getSubmissionsByStudentIdAndAssignmentId(studentId, assignmentId);
            return ResponseEntity.ok(ApiResponse.success(submissions));
        }
        if (studentId != null) {
            List<SubmissionResponse> submissions =
                    submissionService.getSubmissionsByStudentId(studentId);
            return ResponseEntity.ok(ApiResponse.success(submissions));
        }
        if (assignmentId != null) {
            List<SubmissionResponse> submissions =
                    submissionService.getSubmissionsByAssignmentId(assignmentId);
            return ResponseEntity.ok(ApiResponse.success(submissions));
        }

        // No filter — lecturer only; paginate to avoid loading the full table into memory.
        requireLecturer(c);
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SubmissionResponse> pageResult = submissionService.getAllSubmissions(pageable);
        return ResponseEntity.ok(ApiResponse.success(pageResult));
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
            @Valid @RequestBody SubmissionRequest request,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        requireStudent(c);
        String callerId = JwtUtils.extractUserId(c);
        log.info("PUT /api/submissions/{} - Updating submission by student={}", id, callerId);
        SubmissionResponse response = submissionService.updateSubmission(id, request, callerId);
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
    public ResponseEntity<ApiResponse<Void>> deleteSubmission(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        requireStudent(c);
        String callerId = JwtUtils.extractUserId(c);
        log.info("DELETE /api/submissions/{} - Deleting submission by student={}", id, callerId);
        submissionService.deleteSubmission(id, callerId);
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
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitSubmission(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        requireStudent(c);
        String callerId = JwtUtils.extractUserId(c);
        log.info("POST /api/submissions/{}/submit - Submitting by student={}", id, callerId);
        SubmissionResponse response = submissionService.submitSubmission(id, callerId);
        return ResponseEntity.ok(ApiResponse.success("Submission submitted successfully", response));
    }

    /**
     * Grades a submitted assignment.

     * This endpoint allows instructors to assign a grade and provide feedback
     * to a student's submission.

     * POST /api/submissions/{id}/grade?grade=85.5&feedback=Good work
     *
     * @param id The ID of the submission to grade
     * @param request The numerical grade to assign (required)
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
            @RequestBody GradeRequest request,
            HttpServletRequest httpRequest) {
        Map<String, Object> c = requireAuth(httpRequest);
        requireLecturer(c);
        // Override lecturerId from JWT — do not trust the request body.
        request.setLecturerId(JwtUtils.extractUserId(c));
        log.info("POST /api/submissions/{}/grade - Grading by lecturer={}", id, request.getLecturerId());
        SubmissionResponse response = submissionService.gradeSubmission(id, request);
        return ResponseEntity.ok(ApiResponse.success("Submission graded successfully", response));
    }

}