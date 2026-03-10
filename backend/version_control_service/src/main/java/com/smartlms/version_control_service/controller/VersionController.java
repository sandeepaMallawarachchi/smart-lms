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
import com.smartlms.version_control_service.dto.request.TextSnapshotRequest;
import com.smartlms.version_control_service.dto.request.VersionCreateRequest;
import com.smartlms.version_control_service.dto.response.ApiResponse;
import com.smartlms.version_control_service.dto.response.DiffResponse;
import com.smartlms.version_control_service.dto.response.VersionResponse;
import com.smartlms.version_control_service.service.DiffService;
import com.smartlms.version_control_service.service.VersionControlService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
        log.info("POST /api/versions/create - submissionId={}, triggerType={}, createdBy={}, commitMessage={}, fileCount={}",
                request.getSubmissionId(), request.getTriggerType(), request.getCreatedBy(),
                request.getCommitMessage(), files != null ? files.length : 0);
        log.debug("POST /api/versions/create - request metadata: {}", request.getMetadata());

        List<Path> filePaths = new ArrayList<>();
        if (files != null && files.length > 0) {
            for (MultipartFile file : files) {
                log.debug("  File: name={}, size={} bytes, contentType={}",
                        file.getOriginalFilename(), file.getSize(), file.getContentType());
            }
            filePaths = saveUploadedFiles(files);
        }

        VersionResponse response = versionControlService.createVersion(request, filePaths);
        log.info("POST /api/versions/create - RESPONSE: versionId={}, versionNumber={}, commitHash={}, totalFiles={}, totalSizeBytes={}",
                response.getId(), response.getVersionNumber(), response.getCommitHash(),
                response.getTotalFiles(), response.getTotalSizeBytes());

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

    /**
     * Create an immutable text-answer snapshot for a text-based submission.
     * Called by the frontend after submitSubmission() succeeds (fire-and-forget).
     *
     * POST /api/versions/text-snapshot
     */
    @PostMapping("/text-snapshot")
    public ResponseEntity<ApiResponse<VersionResponse>> createTextSnapshot(
            @RequestBody TextSnapshotRequest request) {
        log.info("POST /api/versions/text-snapshot — submissionId={}, studentId={}, totalWordCount={}, overallGrade={}, maxGrade={}, answerCount={}",
                request.getSubmissionId(), request.getStudentId(), request.getTotalWordCount(),
                request.getOverallGrade(), request.getMaxGrade(),
                request.getAnswers() != null ? request.getAnswers().size() : 0);
        log.debug("POST /api/versions/text-snapshot — commitMessage={}", request.getCommitMessage());
        if (request.getAnswers() != null) {
            for (int i = 0; i < request.getAnswers().size(); i++) {
                var a = request.getAnswers().get(i);
                log.debug("  Answer[{}]: questionId={}, wordCount={}, grammarScore={}, clarityScore={}, similarityScore={}, projectedGrade={}",
                        i, a.getQuestionId(), a.getWordCount(), a.getGrammarScore(),
                        a.getClarityScore(), a.getSimilarityScore(), a.getProjectedGrade());
            }
        }
        VersionResponse response = versionControlService.createTextSnapshot(request);
        log.info("POST /api/versions/text-snapshot — RESPONSE: versionId={}, versionNumber={}, commitHash={}, changesSummary={}",
                response.getId(), response.getVersionNumber(), response.getCommitHash(), response.getChangesSummary());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Text snapshot created", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VersionResponse>> getVersionById(@PathVariable Long id) {
        log.info("GET /api/versions/{} - Fetching version", id);
        VersionResponse response = versionControlService.getVersionById(id);
        log.debug("GET /api/versions/{} - RESPONSE: submissionId={}, versionNumber={}, commitHash={}, totalFiles={}, isSnapshot={}",
                id, response.getSubmissionId(), response.getVersionNumber(),
                response.getCommitHash(), response.getTotalFiles(), response.getIsSnapshot());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/submission/{submissionId}")
    public ResponseEntity<ApiResponse<List<VersionResponse>>> getVersionsBySubmissionId(
            @PathVariable Long submissionId) {
        log.info("GET /api/versions/submission/{} - Fetching versions", submissionId);
        List<VersionResponse> versions = versionControlService.getVersionsBySubmissionId(submissionId);
        log.info("GET /api/versions/submission/{} - RESPONSE: {} versions found", submissionId, versions.size());
        if (!versions.isEmpty()) {
            log.debug("GET /api/versions/submission/{} - version numbers: {}", submissionId,
                    versions.stream().map(v -> "v" + v.getVersionNumber()).collect(java.util.stream.Collectors.joining(", ")));
        }
        return ResponseEntity.ok(ApiResponse.success(versions));
    }

    @GetMapping("/submission/{submissionId}/latest")
    public ResponseEntity<ApiResponse<VersionResponse>> getLatestVersion(@PathVariable Long submissionId) {
        log.info("GET /api/versions/submission/{}/latest - Fetching latest version", submissionId);
        VersionResponse response = versionControlService.getLatestVersion(submissionId);
        log.info("GET /api/versions/submission/{}/latest - RESPONSE: versionId={}, versionNumber={}, commitHash={}",
                submissionId, response.getId(), response.getVersionNumber(), response.getCommitHash());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/diff")
    public ResponseEntity<ApiResponse<DiffResponse>> generateDiff(@Valid @RequestBody DiffRequest request) {
        log.info("POST /api/versions/diff - sourceVersionId={}, targetVersionId={}, filePath={}",
                request.getSourceVersionId(), request.getTargetVersionId(), request.getFilePath());
        DiffResponse diff = diffService.generateDiff(request);
        log.info("POST /api/versions/diff - RESPONSE: sourceV={}, targetV={}, fileDiffs={}, summary=[added={}, modified={}, deleted={}]",
                diff.getSourceVersionNumber(), diff.getTargetVersionNumber(),
                diff.getFileDiffs() != null ? diff.getFileDiffs().size() : 0,
                diff.getSummary() != null ? diff.getSummary().getFilesAdded() : 0,
                diff.getSummary() != null ? diff.getSummary().getFilesModified() : 0,
                diff.getSummary() != null ? diff.getSummary().getFilesDeleted() : 0);
        return ResponseEntity.ok(ApiResponse.success(diff));
    }

    @GetMapping("/{versionId}/download")
    public ResponseEntity<byte[]> downloadVersion(@PathVariable Long versionId) {
        log.info("GET /api/versions/{}/download - Downloading version", versionId);
        try {
            String[] filename = new String[1];
            byte[] data = versionControlService.downloadVersion(versionId, filename);
            boolean isZip = filename[0].endsWith(".zip");
            MediaType mediaType = isZip ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.APPLICATION_JSON;
            log.info("GET /api/versions/{}/download - RESPONSE: filename={}, size={} bytes, isZip={}",
                    versionId, filename[0], data.length, isZip);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename[0] + "\"")
                    .contentType(mediaType)
                    .body(data);
        } catch (Exception e) {
            log.error("Failed to download version {} — {}: {}", versionId, e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{versionId}/file")
    public ResponseEntity<byte[]> getFileContent(
            @PathVariable Long versionId,
            @RequestParam String filePath) {
        log.info("GET /api/versions/{}/file?filePath={} - Fetching file content", versionId, filePath);
        byte[] content = versionControlService.getFileContent(versionId, filePath);
        log.debug("GET /api/versions/{}/file - RESPONSE: filePath={}, contentSize={} bytes",
                versionId, filePath, content != null ? content.length : 0);
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
