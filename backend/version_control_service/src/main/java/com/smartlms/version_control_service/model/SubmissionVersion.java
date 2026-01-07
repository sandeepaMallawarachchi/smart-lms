package com.smartlms.version_control_service.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "submission_versions", schema = "version_schema",
        indexes = {
                @Index(name = "idx_submission_id", columnList = "submission_id"),
                @Index(name = "idx_commit_hash", columnList = "commit_hash")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "commit_hash", nullable = false, unique = true, length = 64)
    private String commitHash;

    @Column(name = "parent_version_id")
    private Long parentVersionId;

    @Column(name = "commit_message", length = 1000)
    private String commitMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false)
    private VersionTriggerType triggerType;

    @Column(name = "created_by")
    private String createdBy;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "changes_summary", length = 2000)
    private String changesSummary;

    @Column(name = "total_files")
    @Builder.Default
    private Integer totalFiles = 0;

    @Column(name = "total_size_bytes")
    @Builder.Default
    private Long totalSizeBytes = 0L;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<VersionFile> files = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_snapshot")
    @Builder.Default
    private Boolean isSnapshot = false;

    // Helper methods
    public void addFile(VersionFile file) {
        files.add(file);
        file.setVersion(this);
        totalFiles = files.size();
    }

    public void addMetadata(String key, Object value) {
        if (this.metadata == null) {
            this.metadata = new HashMap<>();
        }
        this.metadata.put(key, value);
    }
}