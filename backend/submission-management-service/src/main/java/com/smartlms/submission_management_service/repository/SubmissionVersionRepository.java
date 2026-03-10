package com.smartlms.submission_management_service.repository;

import com.smartlms.submission_management_service.model.SubmissionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionVersionRepository extends JpaRepository<SubmissionVersion, Long> {

    /** All versions for a submission, newest first. */
    List<SubmissionVersion> findBySubmissionIdOrderByVersionNumberDesc(Long submissionId);

    /** All versions for a submission, oldest first (for timeline display). */
    List<SubmissionVersion> findBySubmissionIdOrderByVersionNumberAsc(Long submissionId);

    /** Fetch the version with the highest version_number for a given submission. */
    @Query("SELECT v FROM SubmissionVersion v WHERE v.submissionId = :submissionId " +
           "ORDER BY v.versionNumber DESC LIMIT 1")
    Optional<SubmissionVersion> findLatestBySubmissionId(@Param("submissionId") Long submissionId);

    /** Fetch a specific version by submission + version number. */
    Optional<SubmissionVersion> findBySubmissionIdAndVersionNumber(Long submissionId, Integer versionNumber);

    /** Count how many versions exist for a submission. */
    long countBySubmissionId(Long submissionId);

    /** Check for duplicate (idempotency guard). */
    boolean existsBySubmissionIdAndVersionNumber(Long submissionId, Integer versionNumber);
}
