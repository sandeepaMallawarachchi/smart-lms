package com.smartlms.version_control_service.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.smartlms.version_control_service.dto.request.DiffRequest;
import com.smartlms.version_control_service.dto.request.VersionCreateRequest;
import com.smartlms.version_control_service.dto.response.ApiResponse;
import com.smartlms.version_control_service.dto.response.DiffResponse;
import com.smartlms.version_control_service.dto.response.VersionResponse;
import com.smartlms.version_control_service.service.DiffService;
import com.smartlms.version_control_service.service.VersionControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/versions")
@RequiredArgsConstructor
@Slf4j
public class VersionController {

    private final VersionControlService versionControlService;
    private final DiffService diffService;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<VersionResponse>> createVersion(
            @Valid @RequestBody VersionCreateRequest request,
            @RequestParam(required = false) MultipartFile[] files) {
        log.info("POST /api/versions/create - Creating version for submission: {}", request.getSubmissionId());

        List<Path> filePaths = new ArrayList<>();
        if (files != null && files.length > 0) {
            filePaths = saveUploadedFiles(files);
        }

        VersionResponse response = versionControlService.createVersion(request, filePaths);

        // Cleanup temp files
        filePaths.forEach(path -> {
            try {
                Files.deleteIfExists(path);
            } catch (IOException e) {
                log.error("Failed to delete temp file: {}", path, e);
            }
        });

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Version created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VersionResponse>> getVersionById(@PathVariable Long id) {
        log.info("GET /api/versions/{} - Fetching version", id);
        VersionResponse response = versionControlService.getVersionById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/submission/{submissionId}")
    public ResponseEntity<ApiResponse<List<VersionResponse>>> getVersionsBySubmissionId(
            @PathVariable Long submissionId) {
        log.info("GET /api/versions/submission/{} - Fetching versions", submissionId);
        List<VersionResponse> versions = versionControlService.getVersionsBySubmissionId(submissionId);
        return ResponseEntity.ok(ApiResponse.success(versions));
    }

    @GetMapping("/submission/{submissionId}/latest")
    public ResponseEntity<ApiResponse<VersionResponse>> getLatestVersion(@PathVariable Long submissionId) {
        log.info("GET /api/versions/submission/{}/latest - Fetching latest version", submissionId);
        VersionResponse response = versionControlService.getLatestVersion(submissionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/diff")
    public ResponseEntity<ApiResponse<DiffResponse>> generateDiff(@Valid @RequestBody DiffRequest request) {
        log.info("POST /api/versions/diff - Generating diff between {} and {}",
                request.getSourceVersionId(), request.getTargetVersionId());
        DiffResponse diff = diffService.generateDiff(request);
        return ResponseEntity.ok(ApiResponse.success(diff));
    }

    @GetMapping("/{versionId}/file")
    public ResponseEntity<byte[]> getFileContent(
            @PathVariable Long versionId,
            @RequestParam String filePath) {
        log.info("GET /api/versions/{}/file?filePath={} - Fetching file content", versionId, filePath);
        byte[] content = versionControlService.getFileContent(versionId, filePath);
        return ResponseEntity.ok(content);
    }

    private List<Path> saveUploadedFiles(MultipartFile[] files) {
        List<Path> filePaths = new ArrayList<>();
        Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"), "version-control");

        try {
            Files.createDirectories(tempDir);

            for (MultipartFile file : files) {
                String uniqueFilename = UUID.randomUUID() + "_" + file.getOriginalFilename();
                Path targetPath = tempDir.resolve(uniqueFilename);
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
                filePaths.add(targetPath);
            }
        } catch (IOException e) {
            log.error("Error saving uploaded files", e);
            throw new RuntimeException("Failed to save uploaded files", e);
        }

        return filePaths;
    }
}
