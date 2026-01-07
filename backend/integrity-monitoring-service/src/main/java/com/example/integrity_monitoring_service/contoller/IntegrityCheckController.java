package com.example.integrity_monitoring_service.contoller;

import com.example.integrity_monitoring_service.dto.request.PlagiarismCheckRequest;
import com.example.integrity_monitoring_service.dto.response.ApiResponse;
import com.example.integrity_monitoring_service.dto.response.PlagiarismCheckResponse;
import com.example.integrity_monitoring_service.service.IntegrityCheckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/integrity/checks")
@RequiredArgsConstructor
@Slf4j
public class IntegrityCheckController {

    private final IntegrityCheckService integrityCheckService;

    /**
     * Run plagiarism check
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PlagiarismCheckResponse>> runCheck(
            @Valid @RequestBody PlagiarismCheckRequest request) {
        log.info("POST /api/integrity/checks - Running check for submission: {}",
                request.getSubmissionId());

        ApiResponse<PlagiarismCheckResponse> response =
                integrityCheckService.runPlagiarismCheck(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get plagiarism check by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PlagiarismCheckResponse>> getCheckById(
            @PathVariable Long id) {
        log.info("GET /api/integrity/checks/{} - Fetching check", id);

        ApiResponse<PlagiarismCheckResponse> response =
                integrityCheckService.getCheckById(id);

        return ResponseEntity.ok(response);
    }

    /**
     * Get all flagged checks
     */
    @GetMapping("/flagged")
    public ResponseEntity<ApiResponse<List<PlagiarismCheckResponse>>> getFlaggedChecks() {
        log.info("GET /api/integrity/checks/flagged - Fetching flagged checks");

        ApiResponse<List<PlagiarismCheckResponse>> response =
                integrityCheckService.getFlaggedChecks();

        return ResponseEntity.ok(response);
    }

    /**
     * Get checks by assignment
     */
    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<ApiResponse<List<PlagiarismCheckResponse>>> getChecksByAssignment(
            @PathVariable String assignmentId) {
        log.info("GET /api/integrity/checks/assignment/{} - Fetching checks", assignmentId);

        ApiResponse<List<PlagiarismCheckResponse>> response =
                integrityCheckService.getChecksByAssignment(assignmentId);

        return ResponseEntity.ok(response);
    }
}