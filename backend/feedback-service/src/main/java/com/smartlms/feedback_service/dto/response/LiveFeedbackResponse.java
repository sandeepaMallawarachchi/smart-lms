package com.smartlms.feedback_service.dto.response;

import lombok.*;

import java.util.List;

/**
 * Response DTO for POST /api/feedback/live.
 *
 * Contains lightweight, real-time AI analysis of a student's typed answer.
 * Unlike FeedbackResponse, this is not persisted to the database —
 * it is computed on demand and returned synchronously.
 *
 * Type-specific fields (balanceScore, comparisonDepthScore, etc.) are
 * nullable — they are only populated when answer type detection is
 * confident (>= 0.60) and the detected type has additional dimensions.
 * Frontend consumers should treat null as "not applicable for this type".
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveFeedbackResponse {

    /** Echoed from the request so the frontend knows which editor to update. */
    private String questionId;

    // ── Standard dimensions (always present) ─────────────────────────────────────

    /** Grammar and language quality score (0–10). */
    private double grammarScore;

    /** Clarity and coherence score (0–10). */
    private double clarityScore;

    /** Completeness relative to expected word count / question scope (0–10). */
    private double completenessScore;

    /** Relevance to the question prompt (0–10). */
    private double relevanceScore;

    // ── Qualitative feedback ──────────────────────────────────────────────────────

    /** Up to 2 identified strengths of the answer. */
    private List<String> strengths;

    /** Up to 2 areas that need improvement. */
    private List<String> improvements;

    /** Up to 2 actionable improvement suggestions. */
    private List<String> suggestions;

    /** ISO-8601 timestamp of when the feedback was generated. */
    private String generatedAt;

    // ── Type detection metadata (nullable) ────────────────────────────────────────

    /**
     * The AnswerType enum name detected for this answer (e.g. "COMPARATIVE_ANALYSIS").
     * Null when type detection was not run or returned low confidence.
     */
    private String detectedAnswerType;

    /**
     * Confidence of the type detection result, 0.0–0.95.
     * Only populated when detectedAnswerType is non-null.
     */
    private Double typeConfidence;

    // ── COMPARATIVE_ANALYSIS dimensions (nullable) ────────────────────────────────

    /**
     * How equally both / all subjects are covered (0–10).
     * Populated only for COMPARATIVE_ANALYSIS answers.
     */
    private Double balanceScore;

    /**
     * Depth of comparative analysis — explicit comparisons vs side-by-side listing (0–10).
     * Populated only for COMPARATIVE_ANALYSIS answers.
     */
    private Double comparisonDepthScore;

    // ── ARGUMENTATIVE dimensions (nullable) ───────────────────────────────────────

    /**
     * Strength and coherence of the argument / thesis (0–10).
     * Populated only for ARGUMENTATIVE answers.
     */
    private Double argumentationStrengthScore;

    /**
     * Quality of evidence and examples used to support claims (0–10).
     * Populated only for ARGUMENTATIVE answers.
     */
    private Double evidenceQualityScore;

    // ── PROCEDURAL dimensions (nullable) ─────────────────────────────────────────

    /**
     * Correctness of the steps described (0–10).
     * Populated only for PROCEDURAL answers.
     */
    private Double procedureAccuracyScore;

    /**
     * Whether steps are presented in a logical, correct sequence (0–10).
     * Populated only for PROCEDURAL answers.
     */
    private Double sequenceLogicScore;

    // ── Projected grade (computed server-side from AI scores + plagiarism) ────────

    /**
     * Projected earned mark in the range [0, maxPoints].
     * Null when maxPoints was not provided in the request.
     * Accounts for plagiarism penalty and (for long answers) word-count penalty.
     */
    private Double projectedGrade;

    /**
     * Projected grade expressed as a percentage (0–100).
     * Null when maxPoints was not provided.
     */
    private Double projectedGradePercent;

    /**
     * Letter grade derived from projectedGradePercent.
     * A+ ≥97, A ≥93, A- ≥90, B+ ≥87, B ≥83, B- ≥80,
     * C+ ≥77, C ≥73, C- ≥70, D+ ≥67, D ≥60, F <60.
     * Null when projectedGradePercent is not available.
     */
    private String letterGrade;
}
