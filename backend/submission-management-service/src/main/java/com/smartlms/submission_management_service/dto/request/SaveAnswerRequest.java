package com.smartlms.submission_management_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
    @Size(max = 10000, message = "Question text must not exceed 10000 characters")
    private String questionText;

    /** Student ID — stored on the answer row so peer comparison can exclude all of
     *  a student's answers regardless of which submission version they belong to. */
    @NotBlank(message = "Student ID must not be blank")
    private String studentId;

    /** The student's full typed answer. May be empty string if clearing. */
    @NotNull(message = "Answer text must not be null")
    @Size(max = 50_000, message = "Answer text must not exceed 50 000 characters")
    private String answerText;

    /** Word count computed by the frontend (avoids server re-computation). */
    @Min(value = 0, message = "Word count must not be negative")
    private Integer wordCount;

    /** Character count computed by the frontend. */
    @Min(value = 0, message = "Character count must not be negative")
    private Integer characterCount;
}
