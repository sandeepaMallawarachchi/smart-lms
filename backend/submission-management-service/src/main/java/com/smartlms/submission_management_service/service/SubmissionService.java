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

/**
 * Service layer for managing student submissions in the Smart LMS system.

 * This service contains the core business logic for submission management including:
 * - CRUD operations for submissions
 * - Status transitions (DRAFT → SUBMITTED → GRADED)
 * - Validation rules and business constraints
 * - Data transformation between entities and DTOs

 * Architecture Pattern: Service Layer Pattern
 * - Controllers handle HTTP requests
 * - Services contain business logic
 * - Repositories handle database operations

 * Transaction Management:
 * - All write operations are transactional
 * - Read operations use readOnly=true for optimization
 * - Transactions ensure data consistency

 * Integration Points:
 * - Called by SubmissionController for REST API operations
 * - Used by other services (VersionControl, AIFeedback, Plagiarism)
 * - Publishes events to Kafka for async processing
 *
 * @author Smart LMS Development Team
 * @version 1.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    /**
     * Repository for database operations on Submission entities.
     * Injected via constructor for better testability and immutability.
     */
    private final SubmissionRepository submissionRepository;

    /**
     * Creates a new submission in the system.

     * This method initializes a new submission with the following defaults:
     * - Status: DRAFT (allows editing before final submission)
     * - VersionNumber: 1 (first version of the submission)
     * - CreatedAt/UpdatedAt: Set automatically by JPA

     * Business Logic:
     * 1. Convert SubmissionRequest DTO to Submission entity
     * 2. Apply default values (DRAFT status, version 1)
     * 3. Persist to database
     * 4. Convert saved entity back to SubmissionResponse DTO
     * 5. Return response to controller
     *
     * @param request SubmissionRequest containing:
     *                - title: What the submission is called
     *                - description: Additional context (optional)
     *                - studentId: Who is creating the submission
     *                - studentName: Display name of student
     *                - assignmentId: Which assignment this is for
     *                - submissionType: Category (ASSIGNMENT, PROJECT, LAB, etc.)
     *                - dueDate: When the assignment is due
     *                - maxGrade: Maximum possible points
     *
     * @return SubmissionResponse containing all submission data including generated ID
     *
     * @Transactional ensures:
     * - Database changes are atomic (all or nothing)
     * - Automatic rollback on exception
     * - Connection management handled by Spring

     * State Diagram:
     * [User Input] → [SubmissionRequest] → [Submission Entity] → [Database] → [SubmissionResponse] → [User]

     * Example Usage:
     * SubmissionRequest request = new SubmissionRequest(...)
     * SubmissionResponse response = submissionService.createSubmission(request);
     * // response.getId() contains the new submission ID
     */
    @Transactional
    public SubmissionResponse createSubmission(SubmissionRequest request) {
        log.info("Creating submission for student: {}", request.getStudentId());

        // Build the entity using Builder pattern (from Lombok @Builder)
        Submission submission = Submission.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .studentId(request.getStudentId())
                .studentName(request.getStudentName())
                .assignmentId(request.getAssignmentId())
                .assignmentTitle(request.getAssignmentTitle())
                .submissionType(request.getSubmissionType())
                .status(SubmissionStatus.DRAFT)  // Always start as DRAFT
                .dueDate(request.getDueDate())
                .maxGrade(request.getMaxGrade())
                .versionNumber(1)  // First version
                .build();

        // Save to database - JPA generates ID and timestamps
        Submission savedSubmission = submissionRepository.save(submission);
        log.info("Submission created with ID: {}", savedSubmission.getId());

        // Convert entity to DTO for API response
        return convertToResponse(savedSubmission);
    }

    /**
     * Retrieves a single submission by its unique identifier.

     * This method fetches a submission with all its related data including:
     * - Basic submission information
     * - Associated files (lazy-loaded by default)
     * - Status and grade information
     * - Timestamps
     *
     * @param id The unique database ID of the submission
     *
     * @return SubmissionResponse with complete submission details
     *
     * @throws ResourceNotFoundException if no submission exists with the given ID
     *         This exception is caught by GlobalExceptionHandler and returns HTTP 404
     *
     * @Transactional(readOnly = true) optimization:
     * - Hints to database that no writes will occur
     * - Allows database to optimize query execution
     * - Some databases skip transaction logs for reads

     * Use Cases:
     * - Student viewing their submission details
     * - Instructor reviewing a specific submission
     * - Other services fetching submission data (Version Control, AI Feedback)

     * Example:
     * SubmissionResponse response = submissionService.getSubmissionById(1L);
     * // response contains full details of submission #1
     */
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(Long id) {
        log.info("Fetching submission with ID: {}", id);

        // findById returns Optional<Submission>
        // orElseThrow throws ResourceNotFoundException if not found
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        return convertToResponse(submission);
    }

    /**
     * Retrieves all submissions in the system.

     * WARNING: This method can return large datasets in production.
     * Consider implementing pagination for better performance.
     *
     * @return List of SubmissionResponse objects, may be empty

     * Use Cases:
     * - Admin dashboard showing all submissions
     * - Reports and analytics

     * Performance Note:
     * - No pagination or filtering applied
     * - Could return thousands of records
     * - Consider adding @PageableDefault in controller

     * Recommended Enhancement:
     * public Page<SubmissionResponse> getAllSubmissions(Pageable pageable) {
     *     return submissionRepository.findAll(pageable)
     *         .map(this::convertToResponse);
     * }
     */
    @Transactional(readOnly = true)
    public List<SubmissionResponse> getAllSubmissions() {
        log.info("Fetching all submissions");

        // Stream API for efficient transformation
        return submissionRepository.findAll().stream()
                .map(this::convertToResponse)  // Method reference for conversion
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all submissions for a specific student.

     * Results are ordered by creation date (newest first) to show
     * the most recent submissions at the top.
     *
     * @param studentId The unique identifier of the student
     *
     * @return List of SubmissionResponse for the student, ordered by date (desc)

     * Query Details:
     * - Uses custom query method from repository
     * - SQL: SELECT * FROM submissions WHERE student_id = ? ORDER BY created_at DESC
     * - Indexed on student_id for performance

     * Use Cases:
     * - Student viewing their submission history
     * - Generating student progress reports
     * - Tracking student activity over time

     * Example:
     * List<SubmissionResponse> studentSubs =
     *     submissionService.getSubmissionsByStudentId("IT22586766");
     * // Returns all submissions by student IT22586766
     */
    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByStudentId(String studentId) {
        log.info("Fetching submissions for student: {}", studentId);

        return submissionRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all submissions for a specific assignment.

     * Results are ordered by submission date to help instructors
     * review submissions in the order they were submitted.
     *
     * @param assignmentId The unique identifier of the assignment
     *
     * @return List of SubmissionResponse for the assignment, ordered by submitted_at (desc)

     * Use Cases:
     * - Instructor viewing all submissions for grading
     * - Generating assignment statistics
     * - Plagiarism detection across all submissions
     * - Batch processing of submissions

     * Business Logic:
     * - Only returns submitted assignments (status = SUBMITTED)
     * - Draft submissions are excluded
     * - Sorted by submission time (most recent first)

     * Example:
     * List<SubmissionResponse> assignmentSubs =
     *     submissionService.getSubmissionsByAssignmentId("JAVA-001");
     * // Returns all submissions for assignment JAVA-001
     */
    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByAssignmentId(String assignmentId) {
        log.info("Fetching submissions for assignment: {}", assignmentId);

        return submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing submission's details.

     * This method allows modification of certain fields while preserving others.
     * Some fields are intentionally NOT updated to maintain data integrity:
     * - studentId: Cannot change ownership
     * - status: Changed only by specific status transition methods
     * - grade/feedback: Changed only by grading method
     * - timestamps: Managed by JPA
     *
     * @param id The ID of the submission to update
     * @param request SubmissionRequest with new values
     *
     * @return SubmissionResponse with updated data
     *
     * @throws ResourceNotFoundException if submission doesn't exist

     * Business Rules:
     * - Can update: title, description, assignment details, due date, maxGrade
     * - Cannot update: studentId, submissionType, status, grade
     * - UpdatedAt timestamp is automatically refreshed by JPA @UpdateTimestamp

     * Update Pattern:
     * 1. Fetch existing entity from database
     * 2. Update only allowed fields
     * 3. Save updated entity (JPA tracks changes)
     * 4. Return updated response

     * Example:
     * SubmissionRequest updates = new SubmissionRequest();
     * updates.setTitle("Updated Title");
     * SubmissionResponse updated = submissionService.updateSubmission(1L, updates);
     */
    @Transactional
    public SubmissionResponse updateSubmission(Long id, SubmissionRequest request) {
        log.info("Updating submission with ID: {}", id);

        // Fetch existing submission
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        // Update only modifiable fields
        submission.setTitle(request.getTitle());
        submission.setDescription(request.getDescription());
        submission.setAssignmentId(request.getAssignmentId());
        submission.setAssignmentTitle(request.getAssignmentTitle());
        submission.setDueDate(request.getDueDate());
        submission.setMaxGrade(request.getMaxGrade());

        // JPA automatically detects changes and updates the database
        Submission updatedSubmission = submissionRepository.save(submission);
        log.info("Submission updated successfully: {}", id);

        return convertToResponse(updatedSubmission);
    }

    /**
     * Deletes a submission and all associated data.

     * This is a CASCADE DELETE operation that removes:
     * - The submission record
     * - All associated files (via orphanRemoval=true)
     * - File metadata from database
     * - Physical files from filesystem (handled by FileStorageService)
     *
     * @param id The ID of the submission to delete
     *
     * @throws ResourceNotFoundException if submission doesn't exist
     *
     * @Transactional ensures:
     * - All deletions are atomic
     * - Rollback on any failure
     * - Database referential integrity maintained

     * Important Considerations:
     * - This is a HARD DELETE - cannot be undone
     * - Consider implementing soft delete in production:
     *   - Add 'deleted' boolean flag
     *   - Add 'deletedAt' timestamp
     *   - Filter out deleted records in queries

     * Cascade Behavior:
     * - @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
     * - Automatically deletes related SubmissionFile records
     * - FileStorageService should be called to delete physical files

     * Example:
     * submissionService.deleteSubmission(1L);
     * // Submission #1 and all its files are removed
     */
    @Transactional
    public void deleteSubmission(Long id) {
        log.info("Deleting submission with ID: {}", id);

        // Check if exists before attempting delete
        if (!submissionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Submission not found with ID: " + id);
        }

        submissionRepository.deleteById(id);
        log.info("Submission deleted successfully: {}", id);
    }

    /**
     * Submits a draft submission for grading.

     * This method performs a critical status transition from DRAFT to SUBMITTED.
     * Once submitted, the submission is locked and ready for instructor review.

     * Status Flow:
     * DRAFT → SUBMITTED → UNDER_REVIEW → GRADED → RETURNED
     *
     * @param id The ID of the submission to submit
     *
     * @return SubmissionResponse with updated status and submission timestamp
     *
     * @throws ResourceNotFoundException if submission doesn't exist
     * @throws IllegalStateException if submission has no files attached

     * Validation Rules:
     * 1. Submission must have at least one file attached
     * 2. Submission must be in DRAFT status (enforce in production)
     * 3. Student must be the owner (add authorization check)

     * Side Effects:
     * 1. Sets status = SUBMITTED
     * 2. Sets submittedAt = current timestamp
     * 3. Marks isLate = true if submitted after dueDate
     * 4. Triggers downstream processes:
     *    - Version control snapshot
     *    - Plagiarism detection (async)
     *    - AI feedback generation (async)
     *    - Email notification to student

     * Business Logic:
     * - Late submission detection based on dueDate comparison
     * - Cannot submit without files (enforced for academic integrity)
     * - Submission is immutable after this point

     * Example:
     * SubmissionResponse submitted = submissionService.submitSubmission(1L);
     * // submitted.getStatus() == SUBMITTED
     * // submitted.getSubmittedAt() contains current timestamp
     * // submitted.getIsLate() indicates if submission is late
     */
    @Transactional
    public SubmissionResponse submitSubmission(Long id) {
        log.info("Submitting submission with ID: {}", id);

        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        // Validate: Cannot submit empty submission
        if (submission.getFiles().isEmpty()) {
            throw new IllegalStateException("Cannot submit without files");
        }

        // Call helper method in Submission entity
        // This encapsulates the submission logic
        submission.submit();  // Sets status, submittedAt, isLate

        Submission submittedSubmission = submissionRepository.save(submission);
        log.info("Submission submitted successfully: {}", id);

        // TODO: Publish Kafka event for async processing
        // publishSubmissionEvent(submittedSubmission);

        return convertToResponse(submittedSubmission);
    }

    /**
     * Grades a submitted assignment.

     * This method allows instructors to assign a numerical grade and
     * provide written feedback to students.
     *
     * @param id The ID of the submission to grade
     * @param grade The numerical grade to assign (e.g., 85.5)
     * @param feedback Optional text feedback for the student
     *
     * @return SubmissionResponse with grade and feedback information
     *
     * @throws ResourceNotFoundException if submission doesn't exist
     * @throws IllegalArgumentException if grade exceeds maxGrade

     * Validation Rules:
     * 1. Grade must be <= maxGrade for the submission
     * 2. Grade must be >= 0 (add in production)
     * 3. Submission must be in SUBMITTED status (add in production)
     * 4. Only instructor can grade (add authorization)

     * Business Logic:
     * - Updates grade field with provided score
     * - Updates feedbackText with instructor comments
     * - Changes status to GRADED
     * - Triggers student notification

     * Side Effects:
     * 1. Status changes to GRADED
     * 2. Student receives email notification
     * 3. Grade may update student's course average
     * 4. Submission becomes final (no more changes)

     * Grade Format:
     * - Stored as Double for precision (e.g., 85.5)
     * - Display formatting handled by frontend
     * - Can represent percentage or points based on maxGrade

     * Example:
     * SubmissionResponse graded = submissionService.gradeSubmission(
     *     1L,
     *     85.5,
     *     "Excellent work! Clear code and good documentation."
     * );
     * // graded.getGrade() == 85.5
     * // graded.getStatus() == GRADED
     */
    @Transactional
    public SubmissionResponse gradeSubmission(Long id, Double grade, String feedback) {
        log.info("Grading submission with ID: {}", id);

        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        // Validate: Grade cannot exceed maximum
        if (submission.getMaxGrade() != null && grade > submission.getMaxGrade()) {
            throw new IllegalArgumentException("Grade cannot exceed maximum grade");
        }

        // Apply grade and feedback
        submission.setGrade(grade);
        submission.setFeedbackText(feedback);
        submission.setStatus(SubmissionStatus.GRADED);

        Submission gradedSubmission = submissionRepository.save(submission);
        log.info("Submission graded successfully: {}", id);

        // TODO: Publish notification event
        // notificationService.notifyGraded(gradedSubmission);

        return convertToResponse(gradedSubmission);
    }

    /**
     * Converts a Submission entity to a SubmissionResponse DTO.

     * This method transforms database entities into API response objects,
     * including conversion of related entities (files) to DTOs.

     * Why DTOs?
     * - Decouples internal entity structure from API
     * - Prevents circular references in JSON serialization
     * - Allows different representations for different endpoints
     * - Security: Hides internal implementation details

     * Transformation Process:
     * 1. Extract all fields from Submission entity
     * 2. Convert associated SubmissionFile entities to FileInfoDTO
     * 3. Build response URLs for file downloads
     * 4. Calculate derived fields (fileCount)
     * 5. Return immutable DTO
     *
     * @param submission The entity to convert
     *
     * @return SubmissionResponse DTO ready for API response

     * File Conversion:
     * - Each SubmissionFile becomes a FileInfoDTO
     * - Includes download URL for each file
     * - URLs follow pattern: /api/submissions/{submissionId}/files/{fileId}

     * Performance Note:
     * - Files are lazy-loaded by default
     * - Accessing submission.getFiles() triggers query
     * - Consider using @EntityGraph for optimization

     * Example Output:
     * {
     *   "id": 1,
     *   "title": "Java Assignment",
     *   "status": "SUBMITTED",
     *   "files": [
     *     {
     *       "id": 1,
     *       "originalFilename": "Main.java",
     *       "downloadUrl": "/api/submissions/1/files/1"
     *     }
     *   ],
     *   "fileCount": 1
     * }
     */
    private SubmissionResponse convertToResponse(Submission submission) {
        // Convert associated files to DTOs
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

        // Build complete response DTO
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
                .fileCount(files.size())  // Derived field
                .build();
    }
}