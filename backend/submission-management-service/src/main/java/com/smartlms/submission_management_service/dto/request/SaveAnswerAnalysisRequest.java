package com.smartlms.submission_management_service.dto.request;

import lombok.*;

import java.util.List;

/**
 * Payload for PATCH /api/submissions/{submissionId}/answers/{questionId}/analysis
 *
 * Carries both AI feedback scores/bullets AND the plagiarism result.
 * Only non-null fields are written — send only what you have.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveAnswerAnalysisRequest {

    // ── AI Feedback ──────────────────────────────────────────────
    private Double grammarScore;
    private Double clarityScore;
    private Double completenessScore;
    private Double relevanceScore;
    private List<String> strengths;
    private List<String> improvements;
    private List<String> suggestions;

    // ── Plagiarism ───────────────────────────────────────────────
    private Double similarityScore;
    private String plagiarismSeverity;
    private Boolean plagiarismFlagged;

    // ── Lecturer per-question grading ────────────────────────────
    private Double lecturerMark;
    private String lecturerFeedbackText;
}
