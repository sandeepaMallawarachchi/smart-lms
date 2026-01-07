package com.smartlms.feedback_service.controller;

import com.smartlms.feedback_service.dto.request.RubricRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.RubricResponse;
import com.smartlms.feedback_service.service.RubricService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rubrics")
@RequiredArgsConstructor
@Slf4j
public class RubricController {

    private final RubricService rubricService;

    /**
     * Create rubric
     */
    @PostMapping
    public ResponseEntity<ApiResponse<RubricResponse>> createRubric(
            @Valid @RequestBody RubricRequest request) {
        log.info("POST /api/rubrics - Creating rubric: {}", request.getTitle());
        ApiResponse<RubricResponse> response = rubricService.createRubric(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get rubric by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RubricResponse>> getRubricById(@PathVariable Long id) {
        log.info("GET /api/rubrics/{} - Fetching rubric", id);
        ApiResponse<RubricResponse> response = rubricService.getRubricById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all active rubrics
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RubricResponse>>> getAllActiveRubrics() {
        log.info("GET /api/rubrics - Fetching all active rubrics");
        ApiResponse<List<RubricResponse>> response = rubricService.getAllActiveRubrics();
        return ResponseEntity.ok(response);
    }

    /**
     * Update rubric
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RubricResponse>> updateRubric(
            @PathVariable Long id,
            @Valid @RequestBody RubricRequest request) {
        log.info("PUT /api/rubrics/{} - Updating rubric", id);
        ApiResponse<RubricResponse> response = rubricService.updateRubric(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete rubric
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRubric(@PathVariable Long id) {
        log.info("DELETE /api/rubrics/{} - Deleting rubric", id);
        ApiResponse<Void> response = rubricService.deleteRubric(id);
        return ResponseEntity.ok(response);
    }
}