package com.smartlms.submission_management_service.dto.response;

import lombok.*;

import java.util.List;

/**
 * Complete version snapshot: header fields + all question answers.
 * This is the primary DTO for version history and report pages.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionResponse {

    // ── Version header ────────────────────────────────────────────────────────
    private Long id;
    private Long submissionId;
    private Integer versionNumber;
    private String studentId;
    /** ISO-8601 timestamp when this version was submitted. */
    private String submittedAt;
    private Boolean isLate;

    // ── Aggregate metrics (snapshot values) ──────────────────────────────────
    private Double aiScore;
    private Double plagiarismScore;
    private Integer totalWordCount;
    /** AI-computed grade at submit time. Never changes. */
    private Double aiGrade;
    private Double maxGrade;

    // ── Computed display field ────────────────────────────────────────────────
    /**
     * Effective final grade to display:
     *   - If any answer has a lecturerMark → computed from lecturer marks
     *   - Else → aiGrade
     * Computed in the service layer when building this response.
     */
    private Double finalGrade;

    /** True when a lecturer has overridden at least one question mark on this version. */
    private Boolean hasLecturerOverride;

    /**
     * True when the lecturer has graded some but not all questions.
     * When true, finalGrade is computed over graded questions only and the
     * frontend should display a "partial grade" warning to the lecturer.
     */
    private Boolean partiallyGraded;

    // ── Labels ────────────────────────────────────────────────────────────────
    private String commitMessage;
    private String createdAt;

    // ── Answer snapshots (may be empty for list view, populated for detail view) ──
    private List<VersionAnswerResponse> answers;
}
