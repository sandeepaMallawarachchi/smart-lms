package com.smartlms.submission_management_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "assignments",
        schema = "submission_schema",
        indexes = {
                @Index(name = "idx_assignments_course", columnList = "course_id"),
                @Index(name = "idx_assignments_due_date", columnList = "due_date"),
                @Index(name = "idx_assignments_active", columnList = "is_active")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false, length = 50)
    private String courseId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "assignment_type", length = 50)
    private String assignmentType;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime startDate;

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @Column(name = "late_submission_allowed")
    private boolean lateSubmissionAllowed = false;

    @Column(name = "late_submission_deadline")
    private LocalDateTime lateSubmissionDeadline;

    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(name = "allow_resubmission")
    private boolean allowResubmission = true;

    @Column(name = "max_versions")
    private Integer maxVersions = 10;

    @Column(name = "require_rubric")
    private boolean requireRubric = false;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(columnDefinition = "jsonb")
    private String metadata; // Stored as JSON string
}
