package com.example.integrity_monitoring_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "plagiarism_checks", schema = "integrity_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlagiarismCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "assignment_id")
    private String assignmentId;

    @Column(name = "question_id")
    private Long questionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "check_type", nullable = false)
    private CheckType checkType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CheckStatus status = CheckStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private QuestionType questionType;

    @Column(name = "plagiarism_check_needed")
    private Boolean plagiarismCheckNeeded = true;

    @Column(name = "skip_reason")
    private String skipReason;

    // Similarity Scores
    @Column(name = "overall_similarity_score")
    private Double overallSimilarityScore;

    @Column(name = "max_similarity_score")
    private Double maxSimilarityScore;

    @Column(name = "student_similarity_score")
    private Double studentSimilarityScore;

    @Column(name = "internet_similarity_score")
    private Double internetSimilarityScore;

    @Column(name = "flagged")
    private Boolean flagged = false;

    @Column(name = "matches_found")
    private Integer matchesFound = 0;

    @Column(name = "internet_matches_found")
    private Integer internetMatchesFound = 0;

    @Column(name = "processing_time_ms")
    private Long processingTimeMs;

    @Column(name = "metadata", columnDefinition = "jsonb")
    @Convert(converter = MapToJsonConverter.class)
    private Map<String, Object> metadata = new HashMap<>();

    @OneToMany(mappedBy = "plagiarismCheck", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SimilarityMatch> similarityMatches = new ArrayList<>();

    @OneToMany(mappedBy = "plagiarismCheck", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InternetMatch> internetMatches = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper methods
    public void addSimilarityMatch(SimilarityMatch match) {
        if (similarityMatches == null) {
            similarityMatches = new ArrayList<>();
        }
        similarityMatches.add(match);
        match.setPlagiarismCheck(this);
    }

    public void addInternetMatch(InternetMatch match) {
        if (internetMatches == null) {
            internetMatches = new ArrayList<>();
        }
        internetMatches.add(match);
        match.setPlagiarismCheck(this);
    }

    public List<SimilarityMatch> getSimilarityMatches() {
        if (similarityMatches == null) {
            similarityMatches = new ArrayList<>();
        }
        return similarityMatches;
    }

    public List<InternetMatch> getInternetMatches() {
        if (internetMatches == null) {
            internetMatches = new ArrayList<>();
        }
        return internetMatches;
    }

    public Map<String, Object> getMetadata() {
        if (metadata == null) {
            metadata = new HashMap<>();
        }
        return metadata;
    }
}