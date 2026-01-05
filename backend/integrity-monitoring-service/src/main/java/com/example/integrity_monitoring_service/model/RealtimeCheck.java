package com.example.integrity_monitoring_service.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "realtime_checks", schema = "integrity_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RealtimeCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "text_length")
    private Integer textLength;

    @Column(name = "similarity_score")
    private Double similarityScore;

    @Column(name = "flagged")
    private Boolean flagged = false;

    @Column(name = "warning_shown")
    private Boolean warningShown = false;

    @CreationTimestamp
    @Column(name = "checked_at", nullable = false, updatable = false)
    private LocalDateTime checkedAt;
}