package com.smartlms.submission_management_service.dto.request;

import lombok.*;

import java.util.Map;

/**
 * Request body for POST /api/submissions/{id}/grade
 *
 * Only allowed after the assignment deadline has passed.
 * Carries the overall grade, optional lecturer comment,
 * per-question marks, and per-question feedback texts.
 *
 * Rules:
 * - lecturerGrade and per-question marks are saved separately from AI-generated values.
 * - Original AI scores are never overwritten.
 * - lecturerId is recorded for full audit trail.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeRequest {

    /** Overall numeric grade set by the lecturer (percentage 0–100). */
    private Double grade;

    /** Optional overall free-text feedback for the student from the lecturer. */
    private String lecturerFeedback;

    /**
     * Per-question marks: { "questionId": mark, ... }
     * Stored as JSON in submission.questionMarksJson AND in each Answer.lecturerMark.
     * Overrides the AI-generated mark per question.
     */
    private Map<String, Double> questionScores;

    /**
     * Per-question feedback texts: { "questionId": "feedback text", ... }
     * Stored in each Answer.lecturerFeedbackText.
     * Separate from AI-generated feedback (aiStrengths / aiImprovements / aiSuggestions).
     */
    private Map<String, String> questionFeedbacks;

    /**
     * The ID of the lecturer who is submitting this grade.
     * Recorded in submission.lecturerOverriddenBy and answer.lecturerUpdatedBy
     * for audit purposes.
     */
    private String lecturerId;
}
