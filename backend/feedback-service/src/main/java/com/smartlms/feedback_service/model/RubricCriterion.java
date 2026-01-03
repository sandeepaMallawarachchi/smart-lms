package com.smartlms.feedback_service.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.smartlms.feedback_service.model.Rubric;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rubric_criteria", schema = "feedback_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RubricCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Explicit setter for rubric (Lombok should generate this, but adding explicitly)
    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubric_id", nullable = false)
    @JsonIgnore
    private Rubric rubric;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // Explicit getter for maxScore (Lombok should generate this, but adding explicitly)
    @Getter
    @Column(name = "max_score", nullable = false)
    private Double maxScore;

    @Column(name = "weight")
    private Double weight = 1.0;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "evaluation_guidelines", columnDefinition = "TEXT")
    private String evaluationGuidelines;

}