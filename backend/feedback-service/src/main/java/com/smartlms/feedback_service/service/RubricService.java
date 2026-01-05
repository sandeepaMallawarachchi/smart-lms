package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.request.RubricRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.RubricResponse;
import com.smartlms.feedback_service.exception.ResourceNotFoundException;
import com.smartlms.feedback_service.model.Rubric;
import com.smartlms.feedback_service.model.RubricCriterion;
import com.smartlms.feedback_service.repository.RubricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RubricService {

    private final RubricRepository rubricRepository;

    @Transactional
    public ApiResponse<RubricResponse> createRubric(RubricRequest request) {
        log.info("Creating new rubric: {}", request.getTitle());

        Rubric rubric = Rubric.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .assignmentType(request.getAssignmentType())
                .createdBy(request.getCreatedBy())
                .isActive(true)
                .build();

        int orderIndex = 0;
        for (var criterionRequest : request.getCriteria()) {
            RubricCriterion criterion = RubricCriterion.builder()
                    .name(criterionRequest.getName())
                    .description(criterionRequest.getDescription())
                    .maxScore(criterionRequest.getMaxScore())
                    .weight(criterionRequest.getWeight() != null ? criterionRequest.getWeight() : 1.0)
                    .orderIndex(criterionRequest.getOrderIndex() != null ?
                            criterionRequest.getOrderIndex() : orderIndex++)
                    .evaluationGuidelines(criterionRequest.getEvaluationGuidelines())
                    .build();

            rubric.addCriterion(criterion);
        }

        rubric.setTotalPoints(rubric.calculateTotalPoints());
        rubric = rubricRepository.save(rubric);

        log.info("Rubric created successfully with ID: {}", rubric.getId());
        return ApiResponse.success("Rubric created successfully", RubricResponse.fromEntity(rubric));
    }

    public ApiResponse<RubricResponse> getRubricById(Long id) {
        Rubric rubric = rubricRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rubric not found with ID: " + id));

        return ApiResponse.success(RubricResponse.fromEntity(rubric));
    }

    public ApiResponse<List<RubricResponse>> getAllActiveRubrics() {
        List<Rubric> rubrics = rubricRepository.findByIsActiveTrueOrderByCreatedAtDesc();

        List<RubricResponse> responses = rubrics.stream()
                .map(RubricResponse::fromEntity)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    @Transactional
    public ApiResponse<RubricResponse> updateRubric(Long id, RubricRequest request) {
        log.info("Updating rubric with ID: {}", id);

        Rubric rubric = rubricRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rubric not found with ID: " + id));

        rubric.setTitle(request.getTitle());
        rubric.setDescription(request.getDescription());
        rubric.setAssignmentType(request.getAssignmentType());
        rubric.getCriteria().clear();

        int orderIndex = 0;
        for (var criterionRequest : request.getCriteria()) {
            RubricCriterion criterion = RubricCriterion.builder()
                    .name(criterionRequest.getName())
                    .description(criterionRequest.getDescription())
                    .maxScore(criterionRequest.getMaxScore())
                    .weight(criterionRequest.getWeight() != null ? criterionRequest.getWeight() : 1.0)
                    .orderIndex(criterionRequest.getOrderIndex() != null ?
                            criterionRequest.getOrderIndex() : orderIndex++)
                    .evaluationGuidelines(criterionRequest.getEvaluationGuidelines())
                    .build();

            rubric.addCriterion(criterion);
        }

        rubric.setTotalPoints(rubric.calculateTotalPoints());
        rubric = rubricRepository.save(rubric);

        log.info("Rubric updated successfully: {}", id);
        return ApiResponse.success("Rubric updated successfully", RubricResponse.fromEntity(rubric));
    }

    @Transactional
    public ApiResponse<Void> deleteRubric(Long id) {
        log.info("Deleting rubric with ID: {}", id);

        Rubric rubric = rubricRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rubric not found with ID: " + id));

        rubric.setIsActive(false);
        rubricRepository.save(rubric);

        log.info("Rubric soft deleted successfully: {}", id);
        return ApiResponse.success("Rubric deleted successfully", null);
    }
}