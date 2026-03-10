package com.smartlms.version_control_service.service;


import com.smartlms.version_control_service.config.VersionControlProperties;
import com.smartlms.version_control_service.dto.request.TextSnapshotRequest;
import com.smartlms.version_control_service.dto.request.VersionCreateRequest;
import com.smartlms.version_control_service.dto.response.FileInfoResponse;
import com.smartlms.version_control_service.dto.response.VersionResponse;
import com.smartlms.version_control_service.exception.ResourceNotFoundException;
import com.smartlms.version_control_service.exception.VersionControlException;
import com.smartlms.version_control_service.model.FileBlob;
import com.smartlms.version_control_service.model.StorageType;
import com.smartlms.version_control_service.model.SubmissionVersion;
import com.smartlms.version_control_service.model.VersionFile;
import com.smartlms.version_control_service.model.VersionTriggerType;
import com.smartlms.version_control_service.repository.FileBlobRepository;
import com.smartlms.version_control_service.repository.SubmissionVersionRepository;
import com.smartlms.version_control_service.repository.VersionFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Hex;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class VersionControlService {

    private final SubmissionVersionRepository versionRepository;
    private final FileBlobRepository blobRepository;
    private final VersionFileRepository versionFileRepository;
    private final VersionControlProperties properties;

    @Transactional
    public VersionResponse createVersion(VersionCreateRequest request, List<Path> filePaths) {
        log.info("[createVersion] START - submissionId={}, triggerType={}, createdBy={}, fileCount={}",
                request.getSubmissionId(), request.getTriggerType(), request.getCreatedBy(), filePaths.size());
        log.debug("[createVersion] commitMessage={}, metadata={}", request.getCommitMessage(), request.getMetadata());

        // Get next version number
        Integer nextVersionNumber = versionRepository
                .findMaxVersionNumberBySubmissionId(request.getSubmissionId()) + 1;
        log.debug("[createVersion] nextVersionNumber={} for submissionId={}", nextVersionNumber, request.getSubmissionId());

        // Get parent version if exists
        Long parentVersionId = versionRepository
                .findLatestVersionBySubmissionId(request.getSubmissionId())
                .map(SubmissionVersion::getId)
                .orElse(null);
        log.debug("[createVersion] parentVersionId={}", parentVersionId);

        // Determine if this should be a snapshot
        boolean isSnapshot = nextVersionNumber % properties.getSnapshotInterval() == 0;
        log.debug("[createVersion] isSnapshot={} (interval={})", isSnapshot, properties.getSnapshotInterval());

        // Create version
        SubmissionVersion version = SubmissionVersion.builder()
                .submissionId(request.getSubmissionId())
                .versionNumber(nextVersionNumber)
                .parentVersionId(parentVersionId)
                .commitMessage(request.getCommitMessage())
                .triggerType(request.getTriggerType())
                .createdBy(request.getCreatedBy())
                .metadata(request.getMetadata())
                .isSnapshot(isSnapshot)
                .build();

        // Process files
        long totalSize = 0;
        for (Path filePath : filePaths) {
            try {
                byte[] content = Files.readAllBytes(filePath);
                String contentHash = calculateHash(content);
                log.debug("[createVersion] Processing file: path={}, size={} bytes, hash={}",
                        filePath.getFileName(), content.length, contentHash.substring(0, 12) + "...");

                // Check if blob already exists (deduplication)
                FileBlob blob = blobRepository.findByContentHash(contentHash)
                        .orElseGet(() -> {
                            log.debug("[createVersion] Creating new blob for hash={}", contentHash.substring(0, 12) + "...");
                            return createNewBlob(content, contentHash);
                        });

                // Create version file entry
                VersionFile versionFile = VersionFile.builder()
                        .version(version)
                        .filePath(filePath.toString())
                        .fileName(filePath.getFileName().toString())
                        .blob(blob)
                        .fileSizeBytes((long) content.length)
                        .contentType(detectContentType(filePath))
                        .fileExtension(getFileExtension(filePath))
                        .build();

                version.addFile(versionFile);
                totalSize += content.length;

                // Increment reference count
                blobRepository.incrementReferenceCount(blob.getId());

            } catch (IOException e) {
                log.error("[createVersion] Error processing file: {} — {}: {}", filePath, e.getClass().getSimpleName(), e.getMessage(), e);
                throw new VersionControlException("Failed to process file: " + filePath);
            }
        }

        version.setTotalSizeBytes(totalSize);
        version.setCommitHash(generateCommitHash(version));

        SubmissionVersion savedVersion = versionRepository.save(version);
        log.info("[createVersion] DONE - versionId={}, versionNumber={}, submissionId={}, commitHash={}, totalFiles={}, totalSizeBytes={}",
                savedVersion.getId(), nextVersionNumber, request.getSubmissionId(),
                savedVersion.getCommitHash(), savedVersion.getTotalFiles(), totalSize);

        return convertToResponse(savedVersion);
    }

    /**
     * Create an immutable text-answer snapshot for a text-based submission.
     *
     * Unlike createVersion() (which processes uploaded files), this method stores
     * all answer content inside the SubmissionVersion.metadata JSONB field.
     * No VersionFile or FileBlob entries are created.
     *
     * Called by the frontend immediately after submitSubmission() succeeds.
     */
    @Transactional
    public VersionResponse createTextSnapshot(TextSnapshotRequest request) {
        log.info("[TextSnapshot] START - submissionId={}, studentId={}, totalWordCount={}, overallGrade={}, maxGrade={}, answerCount={}",
                request.getSubmissionId(), request.getStudentId(), request.getTotalWordCount(),
                request.getOverallGrade(), request.getMaxGrade(),
                request.getAnswers() != null ? request.getAnswers().size() : 0);

        Integer nextVersionNumber = versionRepository
                .findMaxVersionNumberBySubmissionId(request.getSubmissionId()) + 1;
        log.debug("[TextSnapshot] nextVersionNumber={}", nextVersionNumber);

        Long parentVersionId = versionRepository
                .findLatestVersionBySubmissionId(request.getSubmissionId())
                .map(SubmissionVersion::getId)
                .orElse(null);
        log.debug("[TextSnapshot] parentVersionId={}", parentVersionId);

        // Build metadata map — stores full answer snapshots in JSONB
        java.util.Map<String, Object> metadata = new java.util.HashMap<>();
        metadata.put("type", "TEXT_SUBMISSION");
        metadata.put("overallGrade", request.getOverallGrade());
        metadata.put("maxGrade", request.getMaxGrade());
        metadata.put("totalWordCount", request.getTotalWordCount());
        metadata.put("snapshotVersion", "1");

        if (request.getAnswers() != null) {
            java.util.List<java.util.Map<String, Object>> answerMaps = new java.util.ArrayList<>();
            for (TextSnapshotRequest.AnswerSnapshot a : request.getAnswers()) {
                java.util.Map<String, Object> m = new java.util.HashMap<>();
                m.put("questionId",          a.getQuestionId());
                m.put("questionText",        a.getQuestionText());
                m.put("answerText",          a.getAnswerText());
                m.put("wordCount",           a.getWordCount());
                m.put("grammarScore",        a.getGrammarScore());
                m.put("clarityScore",        a.getClarityScore());
                m.put("completenessScore",   a.getCompletenessScore());
                m.put("relevanceScore",      a.getRelevanceScore());
                m.put("strengths",               a.getStrengths());
                m.put("improvements",            a.getImprovements());
                m.put("suggestions",             a.getSuggestions());
                m.put("similarityScore",         a.getSimilarityScore());
                m.put("plagiarismSeverity",      a.getPlagiarismSeverity());
                m.put("internetSimilarityScore", a.getInternetSimilarityScore());
                m.put("peerSimilarityScore",     a.getPeerSimilarityScore());
                m.put("riskScore",               a.getRiskScore());
                m.put("riskLevel",               a.getRiskLevel());
                m.put("internetMatches",         a.getInternetMatches());
                m.put("projectedGrade",          a.getProjectedGrade());
                m.put("maxPoints",               a.getMaxPoints());
                answerMaps.add(m);
            }
            metadata.put("answers", answerMaps);
        }

        String changesSummary = String.format(
                "Text submission v%d — %d answers, %d words, grade %.1f/%s",
                nextVersionNumber,
                request.getAnswers() != null ? request.getAnswers().size() : 0,
                request.getTotalWordCount() != null ? request.getTotalWordCount() : 0,
                request.getOverallGrade() != null ? request.getOverallGrade() : 0.0,
                request.getMaxGrade() != null ? String.valueOf(request.getMaxGrade().intValue()) : "?"
        );

        SubmissionVersion version = SubmissionVersion.builder()
                .submissionId(request.getSubmissionId())
                .versionNumber(nextVersionNumber)
                .parentVersionId(parentVersionId)
                .commitMessage(request.getCommitMessage() != null
                        ? request.getCommitMessage()
                        : "Text submission v" + nextVersionNumber)
                .triggerType(VersionTriggerType.SUBMISSION)
                .createdBy(request.getStudentId())
                .metadata(metadata)
                .changesSummary(changesSummary)
                .totalFiles(0)
                .totalSizeBytes(0L)
                .isSnapshot(true)
                .build();

        version.setCommitHash(generateCommitHash(version));

        SubmissionVersion saved = versionRepository.save(version);
        log.info("[TextSnapshot] DONE - versionId={}, versionNumber={}, submissionId={}, commitHash={}, changesSummary={}",
                saved.getId(), saved.getVersionNumber(), request.getSubmissionId(),
                saved.getCommitHash(), changesSummary);

        return convertToResponse(saved);
    }

    @Transactional(readOnly = true)
    public VersionResponse getVersionById(Long versionId) {
        log.info("[getVersionById] versionId={}", versionId);
        SubmissionVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> {
                    log.warn("[getVersionById] Version not found: id={}", versionId);
                    return new ResourceNotFoundException("Version not found: " + versionId);
                });
        log.debug("[getVersionById] Found: submissionId={}, versionNumber={}, commitHash={}, totalFiles={}",
                version.getSubmissionId(), version.getVersionNumber(), version.getCommitHash(), version.getTotalFiles());
        return convertToResponse(version);
    }

    @Transactional(readOnly = true)
    public List<VersionResponse> getVersionsBySubmissionId(Long submissionId) {
        log.info("[getVersionsBySubmissionId] submissionId={}", submissionId);
        List<SubmissionVersion> versions = versionRepository.findBySubmissionIdOrderByVersionNumberDesc(submissionId);
        log.info("[getVersionsBySubmissionId] Found {} versions for submissionId={}", versions.size(), submissionId);
        if (!versions.isEmpty()) {
            log.debug("[getVersionsBySubmissionId] Version numbers: {}",
                    versions.stream().map(v -> "v" + v.getVersionNumber()).collect(Collectors.joining(", ")));
        }
        return versions.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VersionResponse getLatestVersion(Long submissionId) {
        log.info("[getLatestVersion] submissionId={}", submissionId);
        SubmissionVersion version = versionRepository.findLatestVersionBySubmissionId(submissionId)
                .orElseThrow(() -> {
                    log.warn("[getLatestVersion] No versions found for submissionId={}", submissionId);
                    return new ResourceNotFoundException("No versions found for submission: " + submissionId);
                });
        log.info("[getLatestVersion] Found: versionId={}, versionNumber={}, commitHash={}",
                version.getId(), version.getVersionNumber(), version.getCommitHash());
        return convertToResponse(version);
    }

    @Transactional(readOnly = true)
    public byte[] getFileContent(Long versionId, String filePath) {
        log.info("[getFileContent] versionId={}, filePath={}", versionId, filePath);

        VersionFile versionFile = versionFileRepository.findByVersionIdAndFilePath(versionId, filePath)
                .orElseThrow(() -> {
                    log.warn("[getFileContent] File not found: versionId={}, filePath={}", versionId, filePath);
                    return new ResourceNotFoundException("File not found in version");
                });

        FileBlob blob = versionFile.getBlob();
        log.debug("[getFileContent] Found blob: id={}, storageType={}, sizeBytes={}, contentHash={}",
                blob.getId(), blob.getStorageType(), blob.getSizeBytes(),
                blob.getContentHash() != null ? blob.getContentHash().substring(0, 12) + "..." : "null");

        if (blob.getStorageType() == StorageType.FULL) {
            log.debug("[getFileContent] Returning full content, size={} bytes", blob.getContent().length);
            return blob.getContent();
        } else {
            log.debug("[getFileContent] Reconstructing from delta, baseBlobId={}", blob.getBaseBlobId());
            return reconstructFromDelta(blob);
        }
    }

    private FileBlob createNewBlob(byte[] content, String contentHash) {
        return blobRepository.save(FileBlob.builder()
                .contentHash(contentHash)
                .content(content)
                .storageType(StorageType.FULL)
                .sizeBytes((long) content.length)
                .isCompressed(false)
                .referenceCount(0)
                .build());
    }

    private String calculateHash(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content);
            return Hex.encodeHexString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new VersionControlException("Failed to calculate hash", e);
        }
    }

    private String generateCommitHash(SubmissionVersion version) {
        String data = version.getSubmissionId() + "-" +
                version.getVersionNumber() + "-" +
                System.currentTimeMillis();
        return calculateHash(data.getBytes()).substring(0, 40);
    }

    private String detectContentType(Path filePath) {
        try {
            return Files.probeContentType(filePath);
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    private String getFileExtension(Path filePath) {
        String fileName = filePath.getFileName().toString();
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : "";
    }

    private byte[] reconstructFromDelta(FileBlob deltaBlob) {
        // Simplified implementation - would need proper delta reconstruction
        if (deltaBlob.getBaseBlobId() != null) {
            FileBlob baseBlob = blobRepository.findById(deltaBlob.getBaseBlobId())
                    .orElseThrow(() -> new VersionControlException("Base blob not found"));
            // Apply delta to base (simplified)
            return baseBlob.getContent();
        }
        return deltaBlob.getContent();
    }

    /**
     * Download a version as a ZIP (file versions) or JSON (text snapshots).
     * Returns the raw bytes and the suggested filename.
     */
    @Transactional(readOnly = true)
    public byte[] downloadVersion(Long versionId, String[] outFilename) throws IOException {
        log.info("[downloadVersion] versionId={}", versionId);
        SubmissionVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> {
                    log.warn("[downloadVersion] Version not found: id={}", versionId);
                    return new ResourceNotFoundException("Version not found: " + versionId);
                });

        boolean isTextSnapshot = version.getMetadata() != null
                && "TEXT_SUBMISSION".equals(version.getMetadata().get("type"));
        log.debug("[downloadVersion] isTextSnapshot={}, fileCount={}", isTextSnapshot, version.getFiles().size());

        if (isTextSnapshot || version.getFiles().isEmpty()) {
            byte[] json = new ObjectMapper().writerWithDefaultPrettyPrinter()
                    .writeValueAsBytes(version.getMetadata());
            outFilename[0] = "submission-" + version.getSubmissionId()
                    + "-v" + version.getVersionNumber() + ".json";
            log.info("[downloadVersion] DONE - returning JSON: filename={}, size={} bytes", outFilename[0], json.length);
            return json;
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (VersionFile vf : version.getFiles()) {
                byte[] content;
                FileBlob blob = vf.getBlob();
                if (blob.getStorageType() == StorageType.FULL) {
                    content = blob.getContent();
                } else {
                    content = reconstructFromDelta(blob);
                }
                log.debug("[downloadVersion] Zipping file: {}, size={} bytes", vf.getFileName(), content.length);
                ZipEntry entry = new ZipEntry(vf.getFileName());
                zos.putNextEntry(entry);
                zos.write(content);
                zos.closeEntry();
            }
        }
        outFilename[0] = "submission-" + version.getSubmissionId()
                + "-v" + version.getVersionNumber() + ".zip";
        log.info("[downloadVersion] DONE - returning ZIP: filename={}, size={} bytes, fileCount={}",
                outFilename[0], baos.size(), version.getFiles().size());
        return baos.toByteArray();
    }

    private VersionResponse convertToResponse(SubmissionVersion version) {
        List<FileInfoResponse> files = version.getFiles().stream()
                .map(vf -> FileInfoResponse.builder()
                        .id(vf.getId())
                        .filePath(vf.getFilePath())
                        .fileName(vf.getFileName())
                        .fileSizeBytes(vf.getFileSizeBytes())
                        .contentType(vf.getContentType())
                        .fileExtension(vf.getFileExtension())
                        .contentHash(vf.getBlob().getContentHash())
                        .build())
                .collect(Collectors.toList());

        return VersionResponse.builder()
                .id(version.getId())
                .submissionId(version.getSubmissionId())
                .versionNumber(version.getVersionNumber())
                .commitHash(version.getCommitHash())
                .parentVersionId(version.getParentVersionId())
                .commitMessage(version.getCommitMessage())
                .triggerType(version.getTriggerType())
                .createdBy(version.getCreatedBy())
                .metadata(version.getMetadata())
                .changesSummary(version.getChangesSummary())
                .totalFiles(version.getTotalFiles())
                .totalSizeBytes(version.getTotalSizeBytes())
                .createdAt(version.getCreatedAt())
                .isSnapshot(version.getIsSnapshot())
                .files(files)
                .build();
    }
}
