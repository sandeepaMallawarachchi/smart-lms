package com.smartlms.version_control_service.repository;


import java.util.Optional;

import com.smartlms.version_control_service.model.FileBlob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FileBlobRepository extends JpaRepository<FileBlob, Long> {

    Optional<FileBlob> findByContentHash(String contentHash);

    @Modifying
    @Query("UPDATE FileBlob b SET b.referenceCount = b.referenceCount + 1 WHERE b.id = :blobId")
    void incrementReferenceCount(@Param("blobId") Long blobId);

    @Modifying
    @Query("UPDATE FileBlob b SET b.referenceCount = b.referenceCount - 1 WHERE b.id = :blobId")
    void decrementReferenceCount(@Param("blobId") Long blobId);

    @Query("SELECT COUNT(b) FROM FileBlob b WHERE b.referenceCount = 0")
    Long countUnreferencedBlobs();
}