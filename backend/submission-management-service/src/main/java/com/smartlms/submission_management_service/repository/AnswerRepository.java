package com.smartlms.submission_management_service.repository;

import com.smartlms.submission_management_service.model.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * JPA repository for Answer entities.
 *
 * The primary query pattern is look-up by submissionId (to get all answers
 * for a submission) or by submissionId + questionId (for upsert logic in
 * the service layer).
 */
@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {

    /**
     * Returns all answers for a given submission, ordered by question ID
     * so the grading view receives them in a consistent order.
     */
    List<Answer> findBySubmissionIdOrderByQuestionId(String submissionId);

    /**
     * Used by the upsert logic: check whether an answer already exists
     * before deciding to INSERT vs UPDATE.
     */
    Optional<Answer> findBySubmissionIdAndQuestionId(String submissionId, String questionId);
}
