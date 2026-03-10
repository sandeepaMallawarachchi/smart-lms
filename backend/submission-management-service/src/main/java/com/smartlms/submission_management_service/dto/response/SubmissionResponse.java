package com.smartlms.submission_management_service.dto.response;

import java.time.LocalDateTime;

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
    private String studentEmail;
    private String studentRegistrationId;
    private String assignmentId;
    private String assignmentTitle;
    private String moduleCode;
    private String moduleName;
    private SubmissionStatus status;
    private SubmissionType submissionType;
    private LocalDateTime dueDate;
    private LocalDateTime submittedAt;
    private Double grade;
    private Double maxGrade;
    private String feedbackText;
    private Boolean isLate;
    private Integer versionNumber;
    private Integer currentVersionNumber;
    private Integer totalVersions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Aggregate AI / plagiarism metrics (computed from Answer rows on submit)
    private Double aiScore;
    private Double plagiarismScore;
    private Integer totalWordCount;

    // Per-question marks JSON: {"questionId": mark, ...}
    private String questionMarksJson;

    // ── Lecturer override (post-deadline) ─────────────────────────────────────

    /**
     * Grade explicitly set by the lecturer after the deadline (percentage 0–100).
     * Null until a post-deadline override is made.
     * Use {@link #finalGrade} for display — it picks the right value automatically.
     */
    private Double lecturerGrade;

    /** When the lecturer last overrode marks/feedback. Null if no override yet. */
    private LocalDateTime lecturerOverriddenAt;

    /** lecturerId who last made a post-deadline override. Null if no override yet. */
    private String lecturerOverriddenBy;

    // ── Computed display fields ────────────────────────────────────────────────

    /**
     * Whether the assignment deadline has passed at the time of this response.
     * True  → lecturer may change marks/feedback.
     * False → read-only for lecturer; final grade is AI-generated.
     */
    private Boolean isDeadlinePassed;

    /**
     * The effective final grade to display.
     * Rule:
     *   - If lecturerGrade is set → finalGrade = lecturerGrade
     *   - Else if grade (AI-computed) is set → finalGrade = grade
     *   - Else → null
     */
    private Double finalGrade;
}
