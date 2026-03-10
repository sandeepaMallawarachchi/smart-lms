package com.smartlms.submission_management_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Immutable snapshot header created on every Submit or Resubmit.
 *
 * Version numbering:
 *   First submit  → versionNumber = 1
 *   Resubmit      → versionNumber = 2, 3, ...
 *
 * Once a row is inserted it must NEVER be modified.
 * Lecturer overrides are stored on VersionAnswer rows, not here.
 */
@Entity
@Table(
    name = "submission_versions",
    schema = "submission_schema",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_submission_version_number",
        columnNames = {"submission_id", "version_number"}
    ),
    indexes = @Index(name = "idx_sv_submission_id", columnList = "submission_id")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Foreign key to submissions.id — which submission owns this version. */
    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    /**
     * Sequential version counter scoped to this submission.
     * 1 = first submit, 2 = first resubmit, etc.
     */
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    /** Student who submitted this version. */
    @Column(name = "student_id", length = 100)
    private String studentId;

    /** Timestamp of this submit action — frozen at snapshot time. */
    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    /** True when submittedAt > dueDate at snapshot time. */
    @Column(name = "is_late")
    @Builder.Default
    private Boolean isLate = false;

    /** Overall AI quality score 0-100 (weighted avg of per-question scores) at snapshot time. */
    @Column(name = "ai_score")
    private Double aiScore;

    /** Highest plagiarism similarity score 0-100 across all answers at snapshot time. */
    @Column(name = "plagiarism_score")
    private Double plagiarismScore;

    /** Total word count across all text answers at snapshot time. */
    @Column(name = "total_word_count")
    private Integer totalWordCount;

    /** AI-computed grade at snapshot time (aiScore / 100 * maxGrade). Never changed after creation. */
    @Column(name = "ai_grade")
    private Double aiGrade;

    /** Maximum grade for the assignment. Copied from submission at snapshot time. */
    @Column(name = "max_grade")
    private Double maxGrade;

    /** Human-readable label, e.g. "Java Assignment — v2". */
    @Column(name = "commit_message", length = 500)
    private String commitMessage;

    /** When this snapshot row was created (may differ from submittedAt by milliseconds). */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** The frozen answer snapshots belonging to this version. */
    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<VersionAnswer> answers = new ArrayList<>();
}
