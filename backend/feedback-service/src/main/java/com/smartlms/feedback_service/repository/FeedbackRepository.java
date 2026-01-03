package com.smartlms.feedback_service.repository;

import com.smartlms.feedback_service.model.Feedback;
import com.smartlms.feedback_service.model.FeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findBySubmissionIdOrderByCreatedAtDesc(Long submissionId);

    List<Feedback> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<Feedback> findByStatusOrderByCreatedAtDesc(FeedbackStatus status);

    Optional<Feedback> findBySubmissionIdAndVersionId(Long submissionId, Long versionId);

    boolean existsBySubmissionIdAndVersionId(Long submissionId, Long versionId);
}