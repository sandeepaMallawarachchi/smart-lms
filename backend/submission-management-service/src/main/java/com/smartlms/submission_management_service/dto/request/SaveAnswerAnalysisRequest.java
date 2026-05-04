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
    /** JSON-serialised InternetMatch[] — title, url, snippet, similarityScore, sourceDomain, sourceCategory. */
    private String plagiarismSources;

    // ── AI-computed earned mark (actual mark in 0-maxPoints scale) ───────────
    /** Actual earned mark in the question's own scale (e.g. 15.5 out of 20).
     *  Populated from LiveFeedback.projectedGrade on every auto-save cycle. */
    private Double aiGeneratedMark;

    // ── Lecturer per-question grading ────────────────────────────
    private Double lecturerMark;
    private String lecturerFeedbackText;
}
