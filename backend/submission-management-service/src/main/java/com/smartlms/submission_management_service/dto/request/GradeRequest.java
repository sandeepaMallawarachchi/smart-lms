package com.smartlms.submission_management_service.dto.request;

import lombok.*;

import java.util.Map;

/**
 * Request body for POST /api/submissions/{id}/grade
 *
 * Carries the overall grade, optional lecturer comment, and per-question marks.
 * questionScores maps questionId → mark (Double).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeRequest {

    /** Overall numeric grade for the submission (sum of per-question marks). */
    private Double grade;

    /** Optional free-text feedback for the student. */
    private String lecturerFeedback;

    /**
     * Per-question marks: { "questionId": mark, ... }
     * Stored as JSON in submission.questionMarksJson.
     */
    private Map<String, Double> questionScores;
}
