package com.smartlms.submission_management_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Immutable snapshot of a single question's answer at the moment of submission.
 *
 * Each VersionAnswer belongs to exactly one SubmissionVersion and captures:
 *   - The full answer text
 *   - All AI feedback scores and bullet points
 *   - The AI-generated mark (0-10 scale)
 *   - Plagiarism summary (score, severity, flagged)
 *   - Detailed plagiarism sources in the associated VersionPlagiarismSource rows
 *
 * The AI columns (grammarScore…aiGeneratedMark) are frozen at snapshot time.
 * The lecturer columns (lecturerMark, lecturerFeedbackText) may be set post-deadline
 * on the LATEST version only, and are null on all earlier versions.
 */
@Entity
@Table(
    name = "version_answers",
    schema = "submission_schema",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_version_answer_question",
        columnNames = {"version_id", "question_id"}
    ),
    indexes = @Index(name = "idx_va_version_id_question_id", columnList = "version_id, question_id")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Parent version. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private SubmissionVersion version;

    @Column(name = "question_id", nullable = false, length = 200)
    private String questionId;

    /** Snapshot of the question text at submit time. */
    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText;

    /** The student's full answer text at submit time. */
    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(name = "character_count")
    private Integer characterCount;

    // ── AI Feedback (frozen at submit time) ──────────────────────────────────

    @Column(name = "grammar_score")
    private Double grammarScore;

    @Column(name = "clarity_score")
    private Double clarityScore;

    @Column(name = "completeness_score")
    private Double completenessScore;

    @Column(name = "relevance_score")
    private Double relevanceScore;

    /** "||"-delimited strength bullet points from AI feedback. */
    @Column(name = "ai_strengths", columnDefinition = "TEXT")
    private String aiStrengths;

    /** "||"-delimited improvement bullet points. */
    @Column(name = "ai_improvements", columnDefinition = "TEXT")
    private String aiImprovements;

    /** "||"-delimited suggestion bullet points. */
    @Column(name = "ai_suggestions", columnDefinition = "TEXT")
    private String aiSuggestions;

    /**
     * AI-suggested mark on the 0-10 scale.
     * Computed as: relevance×0.40 + completeness×0.30 + clarity×0.15 + grammar×0.15
     * (weights normalised when one or more dimensions are null).
     * Frozen at submit time; NEVER overwritten by lecturer or future submissions.
     */
    @Column(name = "ai_generated_mark")
    private Double aiGeneratedMark;

    // ── Plagiarism summary (frozen at submit time) ────────────────────────────

    /** Internet + peer similarity score 0-100. */
    @Column(name = "similarity_score")
    private Double similarityScore;

    /** LOW / MEDIUM / HIGH. */
    @Column(name = "plagiarism_severity", length = 10)
    private String plagiarismSeverity;

    /** True when severity >= MEDIUM. */
    @Column(name = "plagiarism_flagged")
    private Boolean plagiarismFlagged;

    /** When the plagiarism check was last run for this answer. */
    @Column(name = "plagiarism_checked_at")
    private LocalDateTime plagiarismCheckedAt;

    // ── Lecturer override (post-deadline, only allowed on latest version) ─────

    /**
     * Lecturer-assigned mark for this question.
     * Null until a post-deadline override is saved.
     * Always null on non-latest versions.
     */
    @Column(name = "lecturer_mark")
    private Double lecturerMark;

    /** Lecturer's targeted feedback for this specific question. */
    @Column(name = "lecturer_feedback_text", columnDefinition = "TEXT")
    private String lecturerFeedbackText;

    /** When the lecturer last updated this question's mark/feedback. */
    @Column(name = "lecturer_updated_at")
    private LocalDateTime lecturerUpdatedAt;

    /** Which lecturer made the last override. */
    @Column(name = "lecturer_updated_by", length = 100)
    private String lecturerUpdatedBy;

    // ── Timestamp ─────────────────────────────────────────────────────────────

    /** When this snapshot row was created. */
    @CreationTimestamp
    @Column(name = "snapshot_created_at", nullable = false, updatable = false)
    private LocalDateTime snapshotCreatedAt;

    /** Detailed internet plagiarism source matches for this answer at this version. */
    @OneToMany(mappedBy = "versionAnswer", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<VersionPlagiarismSource> plagiarismSources = new ArrayList<>();
}
