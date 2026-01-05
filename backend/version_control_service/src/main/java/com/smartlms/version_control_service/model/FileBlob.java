package com.smartlms.version_control_service.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "file_blobs", schema = "version_schema",
        indexes = {
                @Index(name = "idx_content_hash", columnList = "content_hash", unique = true)
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileBlob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_hash", nullable = false, unique = true, length = 64)
    private String contentHash;

    @Lob
    @Column(name = "content", nullable = false, columnDefinition = "BYTEA")
    private byte[] content;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_type", nullable = false)
    @Builder.Default
    private StorageType storageType = StorageType.FULL;

    @Column(name = "base_blob_id")
    private Long baseBlobId;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "compressed_size_bytes")
    private Long compressedSizeBytes;

    @Column(name = "is_compressed")
    @Builder.Default
    private Boolean isCompressed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "reference_count")
    @Builder.Default
    private Integer referenceCount = 0;
}