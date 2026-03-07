package com.smartlms.submission_management_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Request body for PUT /api/submissions/{submissionId}/answers/{questionId}.
 *
 * Sent by the frontend debounced auto-save every ~5 seconds while the
 * student is typing. The backend upserts the Answer row for the given
 * submissionId + questionId pair.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveAnswerRequest {

    /** The question prompt text — stored as a snapshot alongside the answer. */
    private String questionText;

    /** Student ID — stored on the answer row so peer comparison can exclude all of
     *  a student's answers regardless of which submission version they belong to. */
    private String studentId;

    /** The student's full typed answer. May be empty string if clearing. */
    @NotNull(message = "Answer text must not be null")
    private String answerText;

    /** Word count computed by the frontend (avoids server re-computation). */
    private Integer wordCount;

    /** Character count computed by the frontend. */
    private Integer characterCount;
}
