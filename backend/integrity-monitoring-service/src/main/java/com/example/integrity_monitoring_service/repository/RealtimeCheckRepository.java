package com.example.integrity_monitoring_service.repository;

import com.example.integrity_monitoring_service.model.RealtimeCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RealtimeCheckRepository extends JpaRepository<RealtimeCheck, Long> {

    List<RealtimeCheck> findBySessionIdOrderByCheckedAtDesc(String sessionId);

    List<RealtimeCheck> findByStudentIdAndQuestionIdOrderByCheckedAtDesc(String studentId, Long questionId);

    Optional<RealtimeCheck> findTopBySessionIdOrderByCheckedAtDesc(String sessionId);

    List<RealtimeCheck> findByFlaggedTrueAndCheckedAtAfter(LocalDateTime since);

    void deleteByCheckedAtBefore(LocalDateTime before);
}