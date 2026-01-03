package com.smartlms.feedback_service.model;

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
@Table(name = "feedbacks", schema = "feedback_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "version_id")
    private Long versionId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "rubric_id")
    private Long rubricId;

    @Column(name = "overall_feedback", columnDefinition = "TEXT")
    private String overallFeedback;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(name = "max_score")
    private Double maxScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FeedbackStatus status = FeedbackStatus.PENDING;

    @Column(name = "generated_by")
    private String generatedBy = "AI";

    @Column(name = "model_used")
    private String modelUsed;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "generation_time_ms")
    private Long generationTimeMs;

    @Column(name = "metadata", columnDefinition = "jsonb")
    @Convert(converter = MapToJsonConverter.class)
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "is_ai_generated")
    private Boolean isAiGenerated = true;

    @Column(name = "cache_hit")
    private Boolean cacheHit = false;

    @OneToMany(mappedBy = "feedback", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CriterionFeedback> criterionFeedbacks = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper methods
    public void addCriterionFeedback(CriterionFeedback criterionFeedback) {
        if (criterionFeedbacks == null) {
            criterionFeedbacks = new ArrayList<>();
        }
        criterionFeedbacks.add(criterionFeedback);
        criterionFeedback.setFeedback(this);
    }

    public void removeCriterionFeedback(CriterionFeedback criterionFeedback) {
        if (criterionFeedbacks != null) {
            criterionFeedbacks.remove(criterionFeedback);
            criterionFeedback.setFeedback(null);
        }
    }

    // Explicit getter for criterionFeedbacks
    public List<CriterionFeedback> getCriterionFeedbacks() {
        if (criterionFeedbacks == null) {
            criterionFeedbacks = new ArrayList<>();
        }
        return criterionFeedbacks;
    }

    // Explicit getter for metadata
    public Map<String, Object> getMetadata() {
        if (metadata == null) {
            metadata = new HashMap<>();
        }
        return metadata;
    }
}