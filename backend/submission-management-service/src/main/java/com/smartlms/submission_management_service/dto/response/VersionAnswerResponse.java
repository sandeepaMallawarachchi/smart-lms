package com.smartlms.submission_management_service.dto.response;

import lombok.*;

import java.util.List;

/**
 * Full snapshot of one answer at a specific version.
 * AI fields are frozen; lecturer fields may be non-null only on the latest version.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionAnswerResponse {

    private Long id;
    private Long versionId;
    private String questionId;
    private String questionText;
    private String answerText;
    private Integer wordCount;
    private Integer characterCount;
    private Double maxPoints;

    // ── AI Feedback (frozen at submit time) ──────────────────────────────────
    private Double grammarScore;
    private Double clarityScore;
    private Double completenessScore;
    private Double relevanceScore;
    private List<String> strengths;
    private List<String> improvements;
    private List<String> suggestions;

    /**
     * AI-suggested mark on 0-10 scale. Immutable after snapshot creation.
     * Null if AI had no scores at submit time.
     */
    private Double aiGeneratedMark;

    // ── Plagiarism summary (frozen at submit time) ────────────────────────────
    private Double similarityScore;
    private String plagiarismSeverity;
    private Boolean plagiarismFlagged;
    private String plagiarismCheckedAt;

    /** Detailed source matches for this version answer. May be empty if never saved. */
    private List<VersionPlagiarismSourceResponse> plagiarismSources;

    // ── Lecturer override (post-deadline, latest version only) ───────────────
    /** Null until a lecturer has overridden this question's mark. */
    private Double lecturerMark;
    /** Null until a lecturer has provided feedback on this question. */
    private String lecturerFeedbackText;
    /** ISO-8601 timestamp. */
    private String lecturerUpdatedAt;
    private String lecturerUpdatedBy;

    // ── Metadata ─────────────────────────────────────────────────────────────
    private String snapshotCreatedAt;
}
