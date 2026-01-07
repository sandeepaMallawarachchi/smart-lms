package com.smartlms.version_control_service.service;


import com.smartlms.version_control_service.config.VersionControlProperties;
import com.smartlms.version_control_service.dto.request.VersionCreateRequest;
import com.smartlms.version_control_service.dto.response.FileInfoResponse;
import com.smartlms.version_control_service.dto.response.VersionResponse;
import com.smartlms.version_control_service.exception.ResourceNotFoundException;
import com.smartlms.version_control_service.exception.VersionControlException;
import com.smartlms.version_control_service.model.FileBlob;
import com.smartlms.version_control_service.model.StorageType;
import com.smartlms.version_control_service.model.SubmissionVersion;
import com.smartlms.version_control_service.model.VersionFile;
import com.smartlms.version_control_service.repository.FileBlobRepository;
import com.smartlms.version_control_service.repository.SubmissionVersionRepository;
import com.smartlms.version_control_service.repository.VersionFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Hex;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.stream.Collectors;

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
        log.info("Creating version for submission: {}", request.getSubmissionId());

        // Get next version number
        Integer nextVersionNumber = versionRepository
                .findMaxVersionNumberBySubmissionId(request.getSubmissionId()) + 1;

        // Get parent version if exists
        Long parentVersionId = versionRepository
                .findLatestVersionBySubmissionId(request.getSubmissionId())
                .map(SubmissionVersion::getId)
                .orElse(null);

        // Determine if this should be a snapshot
        boolean isSnapshot = nextVersionNumber % properties.getSnapshotInterval() == 0;

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

                // Check if blob already exists (deduplication)
                FileBlob blob = blobRepository.findByContentHash(contentHash)
                        .orElseGet(() -> createNewBlob(content, contentHash));

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
                log.error("Error processing file: {}", filePath, e);
                throw new VersionControlException("Failed to process file: " + filePath);
            }
        }

        version.setTotalSizeBytes(totalSize);
        version.setCommitHash(generateCommitHash(version));

        SubmissionVersion savedVersion = versionRepository.save(version);
        log.info("Version created: {} for submission: {}", nextVersionNumber, request.getSubmissionId());

        return convertToResponse(savedVersion);
    }

    @Transactional(readOnly = true)
    public VersionResponse getVersionById(Long versionId) {
        log.info("Fetching version: {}", versionId);
        SubmissionVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found: " + versionId));
        return convertToResponse(version);
    }

    @Transactional(readOnly = true)
    public List<VersionResponse> getVersionsBySubmissionId(Long submissionId) {
        log.info("Fetching versions for submission: {}", submissionId);
        return versionRepository.findBySubmissionIdOrderByVersionNumberDesc(submissionId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VersionResponse getLatestVersion(Long submissionId) {
        log.info("Fetching latest version for submission: {}", submissionId);
        SubmissionVersion version = versionRepository.findLatestVersionBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("No versions found for submission: " + submissionId));
        return convertToResponse(version);
    }

    @Transactional(readOnly = true)
    public byte[] getFileContent(Long versionId, String filePath) {
        log.info("Fetching file content for version: {}, file: {}", versionId, filePath);

        VersionFile versionFile = versionFileRepository.findByVersionIdAndFilePath(versionId, filePath)
                .orElseThrow(() -> new ResourceNotFoundException("File not found in version"));

        FileBlob blob = versionFile.getBlob();

        if (blob.getStorageType() == StorageType.FULL) {
            return blob.getContent();
        } else {
            // Reconstruct from delta (simplified - would need proper implementation)
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
