package com.smartlms.submission_management_service.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import com.smartlms.submission_management_service.config.FileStorageProperties;
import com.smartlms.submission_management_service.dto.FileInfoDTO;
import com.smartlms.submission_management_service.exception.FileStorageException;
import com.smartlms.submission_management_service.exception.ResourceNotFoundException;
import com.smartlms.submission_management_service.model.Submission;
import com.smartlms.submission_management_service.model.SubmissionFile;
import com.smartlms.submission_management_service.repository.SubmissionFileRepository;
import com.smartlms.submission_management_service.repository.SubmissionRepository;
import org.apache.commons.io.FilenameUtils;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final FileStorageProperties fileStorageProperties;
    private final SubmissionRepository submissionRepository;
    private final SubmissionFileRepository submissionFileRepository;
    private Path fileStorageLocation;

    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(fileStorageProperties.getDir())
                .toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
            log.info("File storage directory created at: {}", this.fileStorageLocation);
        } catch (IOException ex) {
            throw new FileStorageException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @Transactional
    public FileInfoDTO uploadFile(Long submissionId, MultipartFile file) {
        log.info("Uploading file for submission: {}", submissionId);

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + submissionId));

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String fileExtension = FilenameUtils.getExtension(originalFilename);
        String storedFilename = UUID.randomUUID() + "." + fileExtension;

        try {
            if (originalFilename.contains("..")) {
                throw new FileStorageException("Invalid filename: " + originalFilename);
            }

            Path submissionDir = this.fileStorageLocation.resolve(String.valueOf(submissionId));
            Files.createDirectories(submissionDir);

            Path targetLocation = submissionDir.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            SubmissionFile submissionFile = SubmissionFile.builder()
                    .originalFilename(originalFilename)
                    .storedFilename(storedFilename)
                    .filePath(targetLocation.toString())
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .fileExtension(fileExtension)
                    .submission(submission)
                    .build();

            submission.addFile(submissionFile);
            submissionRepository.save(submission);

            log.info("File uploaded successfully: {}", storedFilename);

            return FileInfoDTO.builder()
                    .id(submissionFile.getId())
                    .originalFilename(submissionFile.getOriginalFilename())
                    .storedFilename(submissionFile.getStoredFilename())
                    .fileSize(submissionFile.getFileSize())
                    .contentType(submissionFile.getContentType())
                    .fileExtension(submissionFile.getFileExtension())
                    .uploadedAt(submissionFile.getUploadedAt())
                    .downloadUrl("/api/submissions/" + submissionId + "/files/" + submissionFile.getId())
                    .build();

        } catch (IOException ex) {
            throw new FileStorageException("Could not store file " + originalFilename, ex);
        }
    }

    @Transactional(readOnly = true)
    public Resource loadFileAsResource(Long fileId) {
        log.info("Loading file with ID: {}", fileId);

        SubmissionFile file = submissionFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found with ID: " + fileId));

        try {
            Path filePath = Paths.get(file.getFilePath()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found: " + file.getOriginalFilename());
            }
        } catch (IOException ex) {
            throw new ResourceNotFoundException("File not found: " + file.getOriginalFilename());
        }
    }

    @Transactional(readOnly = true)
    public List<FileInfoDTO> getFilesBySubmissionId(Long submissionId) {
        log.info("Fetching files for submission: {}", submissionId);

        return submissionFileRepository.findBySubmissionId(submissionId).stream()
                .map(file -> FileInfoDTO.builder()
                        .id(file.getId())
                        .originalFilename(file.getOriginalFilename())
                        .storedFilename(file.getStoredFilename())
                        .fileSize(file.getFileSize())
                        .contentType(file.getContentType())
                        .fileExtension(file.getFileExtension())
                        .uploadedAt(file.getUploadedAt())
                        .downloadUrl("/api/submissions/" + submissionId + "/files/" + file.getId())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteFile(Long fileId) {
        log.info("Deleting file with ID: {}", fileId);

        SubmissionFile file = submissionFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found with ID: " + fileId));

        try {
            Path filePath = Paths.get(file.getFilePath());
            Files.deleteIfExists(filePath);
            submissionFileRepository.delete(file);
            log.info("File deleted successfully: {}", fileId);
        } catch (IOException ex) {
            log.error("Could not delete file: {}", fileId, ex);
            throw new FileStorageException("Could not delete file", ex);
        }
    }

    @Transactional(readOnly = true)
    public SubmissionFile getFileMetadata(Long fileId) {
        return submissionFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found with ID: " + fileId));
    }
}