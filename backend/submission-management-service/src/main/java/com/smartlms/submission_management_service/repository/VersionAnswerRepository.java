package com.smartlms.submission_management_service.repository;

import com.smartlms.submission_management_service.model.VersionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VersionAnswerRepository extends JpaRepository<VersionAnswer, Long> {

    /** All answers for a version, ordered by question ID. */
    List<VersionAnswer> findByVersionIdOrderByQuestionId(Long versionId);

    /** Single answer for a specific version + question (for upsert during grading). */
    Optional<VersionAnswer> findByVersionIdAndQuestionId(Long versionId, String questionId);
}
