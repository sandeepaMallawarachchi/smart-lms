package com.smartlms.submission_management_service.controller;

import com.smartlms.submission_management_service.dto.request.SavePlagiarismSourcesRequest;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.dto.response.VersionResponse;
import com.smartlms.submission_management_service.service.VersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for the new versioning system.
 * All routes are under /api/submissions/{submissionId}/versions
 *
 * Endpoints:
 *   GET    /api/submissions/{submissionId}/versions              — list all version headers
 *   GET    /api/submissions/{submissionId}/versions/latest       — latest version full detail
 *   GET    /api/submissions/{submissionId}/versions/{versionId}  — specific version full detail
 *   POST   /api/submissions/{submissionId}/versions/{versionId}/answers/{questionId}/sources
 *                                                                — save plagiarism sources
 */
@RestController
@RequestMapping("/api/submissions/{submissionId}/versions")
@RequiredArgsConstructor
@Slf4j
public class VersionController {

    private final VersionService versionService;

    /**
     * List all versions for a submission (header only, no answer detail).
     * Used for the version history timeline.
     *
     * GET /api/submissions/{submissionId}/versions
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<VersionResponse>>> getVersions(
            @PathVariable Long submissionId) {
        log.info("GET /api/submissions/{}/versions", submissionId);
        List<VersionResponse> versions = versionService.getVersions(submissionId);
        return ResponseEntity.ok(ApiResponse.success(versions));
    }

    /**
     * Get the latest version with full detail (answers + plagiarism sources).
     * Used as the default report view.
     *
     * GET /api/submissions/{submissionId}/versions/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<VersionResponse>> getLatestVersion(
            @PathVariable Long submissionId) {
        log.info("GET /api/submissions/{}/versions/latest", submissionId);
        VersionResponse version = versionService.getLatestVersion(submissionId);
        return ResponseEntity.ok(ApiResponse.success(version));
    }

    /**
     * Get a specific version with full detail (answers + plagiarism sources).
     * Used when the student or lecturer navigates to a historical version report.
     *
     * GET /api/submissions/{submissionId}/versions/{versionId}
     */
    @GetMapping("/{versionId}")
    public ResponseEntity<ApiResponse<VersionResponse>> getVersion(
            @PathVariable Long submissionId,
            @PathVariable Long versionId) {
        log.info("GET /api/submissions/{}/versions/{}", submissionId, versionId);
        VersionResponse version = versionService.getVersion(submissionId, versionId);
        return ResponseEntity.ok(ApiResponse.success(version));
    }

    /**
     * Save detailed internet plagiarism sources for one answer in one version.
     * Called by the frontend after the plagiarism check result arrives,
     * immediately following a successful submit.
     *
     * Replaces any previously saved sources for the same version+question.
     *
     * POST /api/submissions/{submissionId}/versions/{versionId}/answers/{questionId}/sources
     */
    @PostMapping("/{versionId}/answers/{questionId}/sources")
    public ResponseEntity<ApiResponse<Void>> savePlagiarismSources(
            @PathVariable Long submissionId,
            @PathVariable Long versionId,
            @PathVariable String questionId,
            @RequestBody SavePlagiarismSourcesRequest request) {
        log.info("POST /api/submissions/{}/versions/{}/answers/{}/sources",
                submissionId, versionId, questionId);
        versionService.savePlagiarismSources(submissionId, versionId, questionId, request);
        return ResponseEntity.ok(ApiResponse.success("Plagiarism sources saved", null));
    }
}
