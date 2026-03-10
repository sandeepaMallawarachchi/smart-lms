package com.smartlms.submission_management_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A single internet plagiarism match for one answer in one version snapshot.
 *
 * Stores the full detail needed to display a plagiarism report:
 *   - source URL
 *   - page title
 *   - the snippet from the source that matched
 *   - the portion of the student's answer that matched
 *   - similarity percentage for this specific match
 *
 * These rows are written by the frontend after it receives the plagiarism
 * check result, by calling:
 *   POST /api/submissions/{submissionId}/versions/{versionId}/answers/{questionId}/sources
 *
 * They are immutable once created.
 */
@Entity
@Table(
    name = "version_plagiarism_sources",
    schema = "submission_schema",
    indexes = @Index(name = "idx_vps_version_answer_id", columnList = "version_answer_id")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionPlagiarismSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_answer_id", nullable = false)
    private VersionAnswer versionAnswer;

    /** Full URL of the matching internet source. */
    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    /** Page title or domain name of the matching source. */
    @Column(name = "source_title", length = 500)
    private String sourceTitle;

    /** The snippet of text from the source that matched the student's answer. */
    @Column(name = "source_snippet", columnDefinition = "TEXT")
    private String sourceSnippet;

    /** The portion of the student's answer that matched this source. */
    @Column(name = "matched_text", columnDefinition = "TEXT")
    private String matchedText;

    /** Similarity percentage for this specific match (0-100). */
    @Column(name = "similarity_percentage")
    private Double similarityPercentage;

    /** When the plagiarism check that found this match was run. */
    @Column(name = "detected_at")
    private LocalDateTime detectedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
