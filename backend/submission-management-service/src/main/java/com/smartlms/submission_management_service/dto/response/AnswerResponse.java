package com.smartlms.submission_management_service.dto.response;

import lombok.*;

import java.util.List;

/**
 * Response DTO returned from answer endpoints.
 * Maps the Answer entity fields to a JSON-serialisable shape,
 * including persisted AI feedback and plagiarism results.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnswerResponse {

    private Long id;

    /** Parent submission ID. */
    private String submissionId;

    /** Question this answer belongs to. */
    private String questionId;

    /** Snapshot of the question text stored at save time. */
    private String questionText;

    /** The student's typed answer text. */
    private String answerText;

    /** Word count as computed by the frontend. */
    private Integer wordCount;

    /** Character count as computed by the frontend. */
    private Integer characterCount;

    /** ISO-8601 formatted timestamp of when the answer was last saved. */
    private String lastModified;

    /** ISO-8601 formatted timestamp of when the answer was first created. */
    private String createdAt;

    // ── Persisted AI Feedback ────────────────────────────────────

    private Double grammarScore;
    private Double clarityScore;
    private Double completenessScore;
    private Double relevanceScore;
    private List<String> strengths;
    private List<String> improvements;
    private List<String> suggestions;
    /** ISO-8601 timestamp of when AI feedback was last saved. Null if never generated. */
    private String feedbackSavedAt;

    // ── Persisted Plagiarism Result ───────────────────────────────

    /** Similarity score 0-100. Null if check has never been run. */
    private Double similarityScore;
    private String plagiarismSeverity;
    private Boolean plagiarismFlagged;
    /** ISO-8601 timestamp of when plagiarism was last checked. */
    private String plagiarismCheckedAt;

    // ── Lecturer per-question grading ─────────────────────────────────────────

    /** Numeric mark assigned by the lecturer for this specific question. */
    private Double lecturerMark;

    /** Targeted feedback from the lecturer for this specific question. */
    private String lecturerFeedbackText;
}
