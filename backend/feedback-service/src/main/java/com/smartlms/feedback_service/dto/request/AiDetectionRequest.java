package com.smartlms.feedback_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request body for POST /api/feedback/ai-detect.
 * Submits answer text to be classified as AI-generated or human-written.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiDetectionRequest {

    @NotBlank(message = "Answer text is required")
    private String answerText;
}
