package com.smartlms.submission_management_service.dto.response;

import lombok.*;

/**
 * Response DTO returned from answer endpoints.
 * Maps the Answer entity fields to a JSON-serialisable shape.
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
}
