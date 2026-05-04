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
    /** JSON-serialised InternetMatch[] — title, url, snippet, similarityScore (0-100), sourceDomain, sourceCategory. */
    private String plagiarismSources;

    // ── Lecturer per-question grading ─────────────────────────────────────────

    /** Maximum marks allocated to this question. Null if not set. */
    private Double maxPoints;

    /**
     * Actual AI-suggested earned mark in the question's own scale (e.g. 15.5 for a 20-mark question).
     * Updated on every auto-save cycle from LiveFeedback.projectedGrade. Use directly — no conversion needed.
     * Null if AI feedback has not yet been received for this answer.
     */
    private Double aiGeneratedMark;

    /** Lecturer-set mark for this question (after deadline). Null until overridden. */
    private Double lecturerMark;

    /** Lecturer feedback for this question (after deadline). Null until overridden. */
    private String lecturerFeedbackText;

    /** ISO-8601 timestamp of when the lecturer last updated this question. Null until overridden. */
    private String lecturerUpdatedAt;

    /** lecturerId who last updated this question's mark/feedback. Null until overridden. */
    private String lecturerUpdatedBy;
}
