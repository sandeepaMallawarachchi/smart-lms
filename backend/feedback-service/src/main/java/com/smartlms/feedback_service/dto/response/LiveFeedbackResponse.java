package com.smartlms.feedback_service.dto.response;

import lombok.*;

import java.util.List;

/**
 * Response DTO for POST /api/feedback/live.
 *
 * Contains lightweight, real-time AI analysis of a student's typed answer.
 * Unlike FeedbackResponse, this is not persisted to the database —
 * it is computed on demand and returned synchronously.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveFeedbackResponse {

    /** Echoed from the request so the frontend knows which editor to update. */
    private String questionId;

    /** Grammar and language quality score (0–10). */
    private double grammarScore;

    /** Clarity and coherence score (0–10). */
    private double clarityScore;

    /** Completeness relative to expected word count / question scope (0–10). */
    private double completenessScore;

    /** Relevance to the question prompt (0–10). */
    private double relevanceScore;

    /** Up to 3 actionable improvement suggestions. */
    private List<String> suggestions;

    /** Up to 3 identified strengths of the answer. */
    private List<String> strengths;

    /** Up to 3 areas that need improvement. */
    private List<String> improvements;

    /** ISO-8601 timestamp of when the feedback was generated. */
    private String generatedAt;
}
