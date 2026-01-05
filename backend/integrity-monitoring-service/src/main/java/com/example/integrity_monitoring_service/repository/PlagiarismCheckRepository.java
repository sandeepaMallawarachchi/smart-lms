package com.example.integrity_monitoring_service.repository;

import com.example.integrity_monitoring_service.model.CheckStatus;
import com.example.integrity_monitoring_service.model.PlagiarismCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlagiarismCheckRepository extends JpaRepository<PlagiarismCheck, Long> {

    List<PlagiarismCheck> findBySubmissionIdOrderByCreatedAtDesc(Long submissionId);

    List<PlagiarismCheck> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<PlagiarismCheck> findByAssignmentIdOrderByCreatedAtDesc(String assignmentId);

    List<PlagiarismCheck> findByFlaggedTrueOrderByCreatedAtDesc();

    List<PlagiarismCheck> findByStatusOrderByCreatedAtDesc(CheckStatus status);

    Optional<PlagiarismCheck> findBySubmissionIdAndQuestionId(Long submissionId, Long questionId);

    @Query("SELECT p FROM PlagiarismCheck p WHERE p.assignmentId = :assignmentId AND p.flagged = true")
    List<PlagiarismCheck> findFlaggedByAssignment(@Param("assignmentId") String assignmentId);

    @Query("SELECT p FROM PlagiarismCheck p WHERE p.createdAt >= :since ORDER BY p.overallSimilarityScore DESC")
    List<PlagiarismCheck> findRecentChecks(@Param("since") LocalDateTime since);
}