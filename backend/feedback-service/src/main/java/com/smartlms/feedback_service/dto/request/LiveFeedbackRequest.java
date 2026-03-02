package com.smartlms.feedback_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request body for POST /api/feedback/live.
 *
 * Sent by the frontend ~3 seconds after the student stops typing in a
 * question editor. This triggers a lightweight, synchronous AI analysis
 * (no DB persistence) and returns immediate feedback scores and suggestions.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveFeedbackRequest {

    /** ID of the question being answered — echoed back in the response. */
    @NotBlank(message = "Question ID is required")
    private String questionId;

    /**
     * The student's current answer text.
     * Must be at least 20 characters to get meaningful feedback.
     */
    @NotBlank(message = "Answer text is required")
    @Size(min = 20, message = "Answer must be at least 20 characters to generate feedback")
    private String answerText;

    /** The question prompt — used by the AI to assess relevance. */
    private String questionPrompt;

    /** Target word count for the answer (used to assess completeness). */
    private Integer expectedWordCount;
}
