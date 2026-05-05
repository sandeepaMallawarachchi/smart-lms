package com.smartlms.feedback_service.model;

import lombok.*;

/**
 * Result of automatic answer-type detection.
 *
 * Confidence semantics:
 *  0.00–0.44 → weak / no signal; fall back to generic prompt
 *  0.45–0.59 → moderate signal; fall back to generic prompt
 *  0.60–0.79 → confident; use type-specific prompt
 *  0.80–0.95 → high confidence; use type-specific prompt
 *  (capped at 0.95 — never 1.0 to reflect residual uncertainty)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypeDetectionResult {

    private AnswerType type;

    /** 0.0 = no signal at all, 0.95 = multiple strong signals confirmed by question + answer text. */
    private double confidence;

    /** Human-readable explanation of how the type was determined — logged for observability. */
    private String reasoning;

    /** Returns true when the system should use a type-specific prompt instead of the generic one. */
    public boolean isConfident() {
        return confidence >= 0.60;
    }
}
