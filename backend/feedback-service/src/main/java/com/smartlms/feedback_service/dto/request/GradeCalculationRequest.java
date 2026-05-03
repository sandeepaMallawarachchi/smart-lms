package com.smartlms.feedback_service.dto.request;

import lombok.*;

/**
 * Request body for POST /api/feedback/grade.
 *
 * A lightweight, stateless endpoint that re-computes the projected grade
 * from existing AI scores + an updated plagiarism similarity score.
 * Called by the frontend when the plagiarism result arrives after feedback
 * has already been displayed (the two debounced operations fire independently).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeCalculationRequest {

    /** AI grammar score (0–10). */
    private double grammarScore;

    /** AI clarity score (0–10). */
    private double clarityScore;

    /** AI completeness score (0–10). */
    private double completenessScore;

    /** AI relevance score (0–10). */
    private double relevanceScore;

    /** Maximum marks available for this question. */
    private Integer maxPoints;

    /** Current answer word count. */
    private Integer wordCount;

    /** Expected word count for completeness penalty (long answers only). */
    private Integer expectedWordCount;

    /** Current plagiarism similarity score (0–100). Null treated as 0 (no penalty). */
    private Double similarityScore;
}
