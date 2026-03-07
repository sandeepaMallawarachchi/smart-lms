package com.smartlms.submission_management_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Stores a student's typed text answer to a single question within a submission.
 *
 * One submission can have many answers (one per question). Answers are
 * automatically upserted (saved or updated) as the student types, via the
 * debounced auto-save mechanism in the frontend.
 *
 * submissionId + questionId form a logical unique key; the service layer
 * enforces this via findBySubmissionIdAndQuestionId before deciding
 * whether to INSERT or UPDATE.
 */
@Entity
@Table(name = "answers", schema = "submission_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Foreign key to the parent submission. Stored as a string to match
     *  the submission ID type used in the Submission entity (Long mapped to String). */
    @Column(name = "submission_id", nullable = false)
    private String submissionId;

    /** Student who wrote this answer. Stored so peer-comparison can exclude
     *  ALL of a student's answers (across all their submission versions) at once. */
    @Column(name = "student_id")
    private String studentId;

    /** Identifier of the question this answer belongs to. Matches Question.id
     *  from the assignment service (managed by another team's component). */
    @Column(name = "question_id", nullable = false)
    private String questionId;

    /** A snapshot of the question text at the time of saving.
     *  Stored for convenience so the grading view can display
     *  question + answer without a separate API call. */
    @Column(name = "question_text", length = 2000)
    private String questionText;

    /** The full text of the student's answer. No length cap — long essays
     *  are expected. Uses TEXT column type in PostgreSQL. */
    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    /** Number of words in answerText (computed by the frontend and sent
     *  alongside the text to avoid re-computation on the server). */
    @Column(name = "word_count")
    private Integer wordCount;

    /** Number of characters in answerText. */
    @Column(name = "character_count")
    private Integer characterCount;

    /** Timestamp automatically updated whenever answerText changes. */
    @UpdateTimestamp
    @Column(name = "last_modified", nullable = false)
    private LocalDateTime lastModified;

    /** Timestamp set once on initial INSERT. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ── AI Feedback (persisted after live feedback is received) ──────────────

    /** Grammar score 0-10 from the live AI feedback call. */
    @Column(name = "grammar_score")
    private Double grammarScore;

    /** Clarity score 0-10. */
    @Column(name = "clarity_score")
    private Double clarityScore;

    /** Completeness score 0-10. */
    @Column(name = "completeness_score")
    private Double completenessScore;

    /** Relevance score 0-10. */
    @Column(name = "relevance_score")
    private Double relevanceScore;

    /** Comma-separated list of strength bullet points from AI feedback. */
    @Column(name = "ai_strengths", columnDefinition = "TEXT")
    private String aiStrengths;

    /** Comma-separated list of improvement bullet points from AI feedback. */
    @Column(name = "ai_improvements", columnDefinition = "TEXT")
    private String aiImprovements;

    /** Comma-separated list of suggestion bullet points from AI feedback. */
    @Column(name = "ai_suggestions", columnDefinition = "TEXT")
    private String aiSuggestions;

    /** When AI feedback was last saved for this answer. */
    @Column(name = "feedback_saved_at")
    private LocalDateTime feedbackSavedAt;

    // ── Plagiarism result (persisted after realtime check) ────────────────────

    /** Similarity score 0-100 (converted from 0.0-1.0 backend value). */
    @Column(name = "similarity_score")
    private Double similarityScore;

    /** Severity bucket: LOW / MEDIUM / HIGH. */
    @Column(name = "plagiarism_severity", length = 10)
    private String plagiarismSeverity;

    /** True when severity >= MEDIUM (or explicitly flagged by the backend). */
    @Column(name = "plagiarism_flagged")
    private Boolean plagiarismFlagged;

    /** When the plagiarism result was last saved for this answer. */
    @Column(name = "plagiarism_checked_at")
    private LocalDateTime plagiarismCheckedAt;
}
