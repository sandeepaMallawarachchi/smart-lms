package com.smartlms.feedback_service.repository;

import com.smartlms.feedback_service.model.Rubric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RubricRepository extends JpaRepository<Rubric, Long> {

    List<Rubric> findByIsActiveTrueOrderByCreatedAtDesc();

    List<Rubric> findByAssignmentTypeAndIsActiveTrue(String assignmentType);

    List<Rubric> findByCreatedByOrderByCreatedAtDesc(String createdBy);
}