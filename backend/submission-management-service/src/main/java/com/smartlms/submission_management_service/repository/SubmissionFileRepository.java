package com.smartlms.submission_management_service.repository;

import java.util.List;
import java.util.Optional;

import com.smartlms.submission_management_service.model.SubmissionFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface SubmissionFileRepository extends JpaRepository<SubmissionFile, Long> {

    List<SubmissionFile> findBySubmissionId(Long submissionId);

    Optional<SubmissionFile> findByStoredFilename(String storedFilename);

    void deleteBySubmissionId(Long submissionId);
}