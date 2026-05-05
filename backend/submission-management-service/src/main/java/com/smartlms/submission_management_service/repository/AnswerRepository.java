package com.smartlms.submission_management_service.repository;

import com.smartlms.submission_management_service.model.Answer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Used by the integrity service for peer-comparison plagiarism detection.
     * Returns the most recently modified answers for a question, capped by the
     * supplied Pageable limit, so the result set does not grow unboundedly with
     * student count. Callers should pass PageRequest.of(0, PEER_COMPARISON_LIMIT).
     */
    @Query("SELECT a FROM Answer a WHERE a.questionId = :questionId ORDER BY a.lastModified DESC")
    List<Answer> findByQuestionId(@Param("questionId") String questionId, Pageable pageable);
}
