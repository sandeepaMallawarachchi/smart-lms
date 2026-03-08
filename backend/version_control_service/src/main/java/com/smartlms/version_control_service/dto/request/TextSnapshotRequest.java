package com.smartlms.version_control_service.dto.request;

import lombok.*;

import java.util.List;

/**
 * Request body for POST /api/versions/text-snapshot
 *
 * Creates an immutable version snapshot for a text-based (essay/written answer)
 * submission. All answer texts plus their AI scores and plagiarism results are
 * stored in the SubmissionVersion.metadata JSONB field.
 *
 * Called by the frontend immediately after a successful submitSubmission() call.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TextSnapshotRequest {

    /** ID of the parent submission row (submission_schema.submissions). */
    private Long submissionId;

    /** Student who submitted (stored in version.createdBy). */
    private String studentId;

    /** Human-readable label, e.g. "Student submission v1". */
    private String commitMessage;

    /** Total word count across all answers — stored in metadata. */
    private Integer totalWordCount;

    /** Calculated overall grade for this snapshot (sum of per-question grades). */
    private Double overallGrade;

    /** Maximum possible grade (sum of maxPoints across all questions). */
    private Double maxGrade;

    /** One entry per question answered. */
    private List<AnswerSnapshot> answers;

    /** Per-question answer snapshot stored inside metadata.answers[]. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerSnapshot {
        private String questionId;
        private String questionText;
        private String answerText;
        private Integer wordCount;

        // AI scores (0-10)
        private Double grammarScore;
        private Double clarityScore;
        private Double completenessScore;
        private Double relevanceScore;

        // Plagiarism
        private Double similarityScore;
        private String plagiarismSeverity;

        // Projected grade for this question
        private Double projectedGrade;
        private Double maxPoints;
    }
}
