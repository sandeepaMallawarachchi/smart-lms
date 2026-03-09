package com.smartlms.submission_management_service.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "submissions", schema = "submission_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "student_name", nullable = false)
    private String studentName;

    @Column(name = "student_email", length = 200)
    private String studentEmail;

    @Column(name = "student_registration_id", length = 100)
    private String studentRegistrationId;

    @Column(name = "assignment_id")
    private String assignmentId;

    @Column(name = "assignment_title")
    private String assignmentTitle;

    @Column(name = "module_code", length = 50)
    private String moduleCode;

    @Column(name = "module_name", length = 200)
    private String moduleName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubmissionStatus status = SubmissionStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_type", nullable = false)
    private SubmissionType submissionType;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "grade")
    private Double grade;

    @Column(name = "max_grade")
    private Double maxGrade;

    @Column(name = "feedback_text", length = 5000)
    private String feedbackText;

    @Column(name = "is_late")
    @Builder.Default
    private Boolean isLate = false;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<SubmissionFile> files = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Version number of this submission.
     * Starts at 0 (DRAFT, no snapshot yet).
     * Incremented to 1 on first submit, 2 on second submit, etc.
     * Kept in sync with SubmissionVersion.versionNumber in version_control_service.
     */
    @Column(name = "version_number")
    @Builder.Default
    private Integer versionNumber = 0;

    /** Total versions created across all submissions for same assignment+student. */
    @Column(name = "total_versions")
    @Builder.Default
    private Integer totalVersions = 0;

    // ── Aggregate metrics (computed from Answer rows on submit) ───────────────

    /** Overall AI quality score 0-100 (weighted average of per-question AI scores). */
    @Column(name = "ai_score")
    private Double aiScore;

    /** Highest plagiarism similarity score 0-100 across all answers. */
    @Column(name = "plagiarism_score")
    private Double plagiarismScore;

    /** Total word count across all text answers. */
    @Column(name = "total_word_count")
    private Integer totalWordCount;

    /**
     * Per-question lecturer marks stored as JSON: {"questionId": mark, ...}
     * Populated when lecturer grades each question individually.
     */
    @Column(name = "question_marks_json", columnDefinition = "TEXT")
    private String questionMarksJson;

    // Helper methods
    public void addFile(SubmissionFile file) {
        files.add(file);
        file.setSubmission(this);
    }

    public void removeFile(SubmissionFile file) {
        files.remove(file);
        file.setSubmission(null);
    }

    public void submit() {
        this.versionNumber = (this.versionNumber != null ? this.versionNumber : 0) + 1;
        this.status = SubmissionStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
        if (this.dueDate != null && this.submittedAt.isAfter(this.dueDate)) {
            this.isLate = true;
            this.status = SubmissionStatus.LATE;
        }
    }
}
