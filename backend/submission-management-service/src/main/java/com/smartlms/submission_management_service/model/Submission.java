package com.smartlms.submission_management_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "submissions",
        schema = "submission_schema",  // Explicit schema
        indexes = {
                @Index(name = "idx_student_id", columnList = "student_id"),
                @Index(name = "idx_assignment_id", columnList = "assignment_id"),
                @Index(name = "idx_status", columnList = "status")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_student_assignment",
                        columnNames = {"student_id", "assignment_id"}
                )
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "current_version_id")
    private UUID currentVersionId;

    @Column(length = 20)
    private String status = "draft";

    @CreationTimestamp  // Automatically set on creation
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp  // Automatically updated
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(columnDefinition = "jsonb")
    private String metadata;  // For JSONB columns
}