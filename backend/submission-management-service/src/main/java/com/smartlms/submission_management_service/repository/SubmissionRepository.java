package com.smartlms.submission_management_service.repository;


import java.time.LocalDateTime;
import java.util.List;

import com.smartlms.submission_management_service.model.Submission;
import com.smartlms.submission_management_service.model.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<Submission> findByAssignmentIdOrderBySubmittedAtDesc(String assignmentId);

    List<Submission> findByStatus(SubmissionStatus status);

    List<Submission> findByStudentIdAndStatus(String studentId, SubmissionStatus status);

    @Query("SELECT s FROM Submission s WHERE s.studentId = :studentId AND s.assignmentId = :assignmentId ORDER BY s.versionNumber DESC")
    List<Submission> findByStudentIdAndAssignmentId(@Param("studentId") String studentId,
                                                    @Param("assignmentId") String assignmentId);

    @Query("SELECT s FROM Submission s WHERE s.dueDate < :now AND s.status = 'SUBMITTED' AND s.isLate = false")
    List<Submission> findOverdueSubmissions(@Param("now") LocalDateTime now);

    Long countByStudentId(String studentId);

    Long countByStudentIdAndStatus(String studentId, SubmissionStatus status);
}