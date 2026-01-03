package com.smartlms.feedback_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rubrics", schema = "feedback_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rubric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "assignment_type")
    private String assignmentType;

    @Column(name = "total_points")
    private Double totalPoints;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @OneToMany(mappedBy = "rubric", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<RubricCriterion> criteria = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper methods
    public void addCriterion(RubricCriterion criterion) {
        if (criteria == null) {
            criteria = new ArrayList<>();
        }
        criteria.add(criterion);
        criterion.setRubric(this);
    }

    public void removeCriterion(RubricCriterion criterion) {
        if (criteria != null) {
            criteria.remove(criterion);
            criterion.setRubric(null);
        }
    }

    public Double calculateTotalPoints() {
        if (criteria == null || criteria.isEmpty()) {
            return 0.0;
        }
        return criteria.stream()
                .filter(c -> c.getMaxScore() != null)
                .mapToDouble(RubricCriterion::getMaxScore)
                .sum();
    }

    // Explicit getter for criteria
    public List<RubricCriterion> getCriteria() {
        if (criteria == null) {
            criteria = new ArrayList<>();
        }
        return criteria;
    }
}