package com.smartlms.version_control_service.repository;


import java.util.List;
import java.util.Optional;

import com.smartlms.version_control_service.model.SubmissionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface SubmissionVersionRepository extends JpaRepository<SubmissionVersion, Long> {

    List<SubmissionVersion> findBySubmissionIdOrderByVersionNumberDesc(Long submissionId);

    Optional<SubmissionVersion> findByCommitHash(String commitHash);

    @Query("SELECT v FROM SubmissionVersion v WHERE v.submissionId = :submissionId AND v.versionNumber = :versionNumber")
    Optional<SubmissionVersion> findBySubmissionIdAndVersionNumber(
            @Param("submissionId") Long submissionId,
            @Param("versionNumber") Integer versionNumber);

    @Query("SELECT v FROM SubmissionVersion v WHERE v.submissionId = :submissionId ORDER BY v.versionNumber DESC LIMIT 1")
    Optional<SubmissionVersion> findLatestVersionBySubmissionId(@Param("submissionId") Long submissionId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM SubmissionVersion v WHERE v.submissionId = :submissionId")
    Integer findMaxVersionNumberBySubmissionId(@Param("submissionId") Long submissionId);

    Long countBySubmissionId(Long submissionId);

    List<SubmissionVersion> findBySubmissionIdAndIsSnapshot(Long submissionId, Boolean isSnapshot);
}