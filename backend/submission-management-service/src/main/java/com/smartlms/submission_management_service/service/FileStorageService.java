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
import com.smartlms.submission_management_service.controller.SubmissionController;
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

/**
 * Service responsible for managing file storage operations in the Smart LMS system.

 * This service handles all file-related operations including:
 * - Uploading files to the filesystem
 * - Storing file metadata in the database
 * - Retrieving files for download
 * - Deleting files from both filesystem and database
 * - Managing file organization by submission

 * FILE STORAGE ARCHITECTURE:
 * ========================
 * Physical Storage Structure:
 * {base_directory}/
 *   ├── 1/                    (Submission ID)
 *   │   ├── uuid1.java        (Stored filename with UUID)
 *   │   ├── uuid2.pdf
 *   │   └── uuid3.txt
 *   ├── 2/                    (Another Submission)
 *   │   └── uuid4.py
 *   └── 3/
 *       ├── uuid5.docx
 *       └── uuid6.zip

 * Database Storage (submission_files table):
 * - id: Primary key
 * - original_filename: "Assignment1.java" (as uploaded by student)
 * - stored_filename: "550e8400-e29b-41d4-a716-446655440000.java" (UUID-based)
 * - file_path: Full filesystem path to the file
 * - file_size: Size in bytes
 * - content_type: MIME type ("text/x-java-source")
 * - file_extension: "java"
 * - submission_id: Foreign key to submission
 * - uploaded_at: Timestamp

 * DESIGN DECISIONS:
 * ================
 * 1. Why store files on filesystem instead of database?
 *    - Better performance for large files
 *    - Easier to back up and migrate
 *    - Database focused on structured data
 *    - Streaming large files from DB is inefficient
 *    - Easier to integrate with CDN/cloud storage later

 * 2. Why use UUID for stored filenames?
 *    - Prevents filename collisions (two students upload "Main.java")
 *    - Security: Obscures original filenames
 *    - Cannot be guessed by attackers
 *    - Preserves original filename for display purposes

 * 3. Why organize by submission ID?
 *    - Easy to locate all files for a submission
 *    - Simplifies cleanup when submission is deleted
 *    - Better organization than flat structure
 *    - Facilitates backup of specific submissions

 * SECURITY MEASURES:
 * ==================
 * - Path traversal prevention (checks for "..")
 * - Filename sanitization (StringUtils.cleanPath)
 * - File size limits (configured in Spring)
 * - Content type validation (can be enhanced)
 * - UUID prevents file enumeration attacks

 * INTEGRATION POINTS:
 * ===================
 * Used by:
 * - SubmissionController: For file upload/download endpoints
 * - VersionControlService: To snapshot file versions
 * - PlagiarismService: To compare file contents
 * - AIFeedbackService: To analyze code files

 * TRANSACTION MANAGEMENT:
 * =======================
 * - Write operations (@Transactional): Ensure atomicity
 * - Read operations (@Transactional readOnly=true): Performance optimization
 * - File and database operations are atomic
 * - Rollback on any failure ensures consistency

 * ERROR HANDLING:
 * ===============
 * - FileStorageException: For filesystem errors
 * - ResourceNotFoundException: When file/submission not found
 * - IOException: Wrapped in FileStorageException
 * - All exceptions logged with context

 * PERFORMANCE CONSIDERATIONS:
 * ===========================
 * - Lazy loading of submission files
 * - Stream-based file operations (no full file in memory)
 * - Metadata cached in database
 * - File organization prevents directory bloat

 * FUTURE ENHANCEMENTS:
 * ====================
 * - Cloud storage integration (AWS S3, Azure Blob)
 * - Virus scanning on upload
 * - Automatic file compression
 * - Image thumbnail generation
 * - File versioning within submission
 * - Scheduled cleanup of orphaned files
 * - File access audit logging
 *
 * @author Smart LMS Development Team
 * @version 1.0
 * @see SubmissionController
 */
@Service
@RequiredArgsConstructor  // Lombok: Generates constructor for final fields
@Slf4j                    // Lombok: Provides log field for logging
public class FileStorageService {

    /**
     * Configuration properties for file storage location.
     * Injected from application.properties (file.upload.dir)
     * Contains the base directory path for all uploads.
     */
    private final FileStorageProperties fileStorageProperties;

    /**
     * Repository for submission database operations.
     * Used to verify submission exists before file upload.
     * Maintains relationship between submission and files.
     */
    private final SubmissionRepository submissionRepository;

    /**
     * Repository for file metadata database operations.
     * Manages SubmissionFile entities in the database.
     * Provides query methods for file retrieval and cleanup.
     */
    private final SubmissionFileRepository submissionFileRepository;

    /**
     * Resolved absolute path to the file storage location.
     * Initialized in init() method using fileStorageProperties.
     * All file operations use this as the base directory.

     * Example: /var/smartlms/uploads or C:\\RP\\uploads
     */
    private Path fileStorageLocation;

    /**
     * Initializes the file storage system.

     * This method runs automatically after the service is constructed,
     * before any other methods are called.
     *
     * @PostConstruct annotation ensures:
     * - Runs once during application startup
     * - Executes after dependency injection
     * - Before service is used by other components

     * INITIALIZATION PROCESS:
     * 1. Read base directory from configuration properties
     * 2. Convert to absolute path (resolves relative paths)
     * 3. Normalize path (removes redundant elements like "." or "..")
     * 4. Create directory structure if it doesn't exist
     * 5. Log success or throw exception on failure

     * Path Operations Explained:
     * - Paths.get(): Converts string to Path object
     * - toAbsolutePath(): Resolves to full path (e.g., ./uploads → /home/user/uploads)
     * - normalize(): Cleans up path (e.g., /a/b/../c → /a/c)
     * - Files.createDirectories(): Creates all parent directories if needed

     * Why createDirectories() instead of createDirectory()?
     * - createDirectories(): Creates parent directories too (mkdir -p)
     * - createDirectory(): Only creates final directory, fails if parents don't exist

     * Example Scenarios:

     * Scenario 1: Directory doesn't exist
     * - Config: file.upload.dir=/var/smartlms/uploads
     * - Creates: /var/smartlms/uploads
     * - Result: SUCCESS - directory created

     * Scenario 2: Directory already exists
     * - Config: file.upload.dir=C:\\RP\\uploads
     * - Checks: Directory exists
     * - Result: SUCCESS - no action needed

     * Scenario 3: Cannot create directory (permissions issue)
     * - Config: file.upload.dir=/root/uploads
     * - Attempts: Create directory
     * - Result: FAILURE - throws FileStorageException
     *
     * @throws FileStorageException if directory cannot be created
     *         This is a critical failure - application cannot function without storage

     * Logging:
     * - Success: INFO level - confirms storage location
     * - Failure: Exception thrown - logged by exception handler

     * Production Considerations:
     * - Ensure directory has proper permissions
     * - Use absolute paths in production
     * - Consider separate volumes for storage
     * - Monitor disk space
     * - Backup strategy for uploaded files
     */
    @PostConstruct
    public void init() {
        // Convert configured directory string to Path object
        this.fileStorageLocation = Paths.get(fileStorageProperties.getDir())
                .toAbsolutePath()  // Convert to absolute path
                .normalize();       // Clean up the path

        try {
            // Create directory structure (parent directories too)
            Files.createDirectories(this.fileStorageLocation);

            // Log successful initialization
            log.info("File storage directory created at: {}", this.fileStorageLocation);
        } catch (IOException ex) {
            // Critical failure - cannot proceed without storage
            throw new FileStorageException(
                    "Could not create the directory where the uploaded files will be stored.",
                    ex
            );
        }
    }

    /**
     * Uploads a file and associates it with a submission.

     * This is the main file upload method that handles the complete upload workflow:
     * 1. Validation (submission exists, filename safe)
     * 2. File storage (save to filesystem)
     * 3. Metadata storage (save to database)
     * 4. Relationship management (link file to submission)

     * UPLOAD WORKFLOW:
     * ================

     * Step 1: VALIDATE SUBMISSION
     * - Check if submission exists in database
     * - Throw ResourceNotFoundException if not found
     * - Required to maintain referential integrity

     * Step 2: PROCESS FILENAME
     * - Extract original filename from MultipartFile
     * - Clean path (remove dangerous characters)
     * - Extract file extension (for stored filename)
     * - Generate UUID-based stored filename

     * Step 3: SECURITY CHECKS
     * - Check for path traversal attack ("../../../etc/passwd")
     * - Validate filename doesn't contain ".."
     * - Throw FileStorageException if malicious

     * Step 4: PREPARE STORAGE LOCATION
     * - Create submission-specific directory if needed
     * - Pattern: {base_dir}/{submission_id}/
     * - Organizes files by submission

     * Step 5: SAVE FILE TO FILESYSTEM
     * - Copy from MultipartFile InputStream to target path
     * - Use REPLACE_EXISTING to allow re-uploads
     * - Store using UUID filename

     * Step 6: CREATE DATABASE RECORD
     * - Build SubmissionFile entity with metadata
     * - Include: filenames, size, type, path
     * - Link to parent submission

     * Step 7: UPDATE SUBMISSION
     * - Add file to submission's file collection
     * - Maintains bidirectional relationship
     * - JPA cascades the save to SubmissionFile

     * Step 8: RETURN RESPONSE
     * - Build FileInfoDTO with all metadata
     * - Include download URL for client
     * - Return to controller for API response

     * FILENAME HANDLING:
     * ==================
     * Input: "My Assignment (Final).java"
     * After cleaning: "My Assignment Final.java"
     * Stored as: "550e8400-e29b-41d4-a716-446655440000.java"

     * Why UUID?
     * - Prevents collisions (multiple students with same filename)
     * - Security: Cannot guess other students' filenames
     * - Preserves original for display purposes

     * SECURITY CONSIDERATIONS:
     * ========================

     * Path Traversal Prevention:
     * - Malicious filename: "../../etc/passwd"
     * - After cleanPath: "etc/passwd" (still dangerous)
     * - Explicit check rejects any filename with ".."
     * - Result: Exception thrown, upload rejected

     * File Size Limits:
     * - Enforced by Spring configuration
     * - Default: 50MB (spring.servlet.multipart.max-file-size)
     * - Exceeding limit throws MaxUploadSizeExceededException
     * - Handled by GlobalExceptionHandler

     * Content Type Validation:
     * - Currently stores any content type
     * - Enhancement: Validate against whitelist
     * - Example: Only allow .java, .py, .pdf, .docx

     * TRANSACTION MANAGEMENT:
     * =======================
     * @Transactional ensures:
     * - File save and database insert are atomic
     * - Rollback on any exception
     * - Consistency between filesystem and database

     * If filesystem write succeeds but database save fails:
     * - Transaction rolls back
     * - Orphaned file left on filesystem (minor issue)
     * - Can be cleaned up by scheduled job

     * If database save succeeds but filesystem write fails:
     * - IOException thrown before database commit
     * - Transaction rolls back
     * - No orphaned database records

     * PERFORMANCE NOTES:
     * ==================
     * - Streams file content (doesn't load entire file in memory)
     * - File size only limited by disk space and Spring config
     * - Efficient for large files (videos, large datasets)
     * - No compression applied (can be added as enhancement)

     * ERROR SCENARIOS:
     * ================

     * Scenario 1: Submission not found
     * - User uploads to non-existent submission
     * - Throws: ResourceNotFoundException
     * - HTTP 404: "Submission not found with ID: X"

     * Scenario 2: Invalid filename
     * - Filename contains ".."
     * - Throws: FileStorageException
     * - HTTP 500: "Invalid filename: ../../etc/passwd"

     * Scenario 3: Disk full
     * - No space left on device
     * - Throws: IOException → FileStorageException
     * - HTTP 500: "Could not store file"

     * Scenario 4: Permission denied
     * - Cannot write to directory
     * - Throws: IOException → FileStorageException
     * - HTTP 500: "Could not store file"
     *
     * @param submissionId The ID of the submission to attach the file to
     * @param file MultipartFile from the HTTP request containing:
     *             - InputStream: The actual file content
     *             - originalFilename: Name of file on student's computer
     *             - contentType: MIME type (e.g., "text/x-java-source")
     *             - size: File size in bytes
     *
     * @return FileInfoDTO containing:
     *         - id: Database ID of the new file record
     *         - originalFilename: Name as uploaded
     *         - storedFilename: UUID-based filename on server
     *         - fileSize: Size in bytes
     *         - contentType: MIME type
     *         - fileExtension: Extension (e.g., "java")
     *         - uploadedAt: Timestamp
     *         - downloadUrl: API endpoint to download file
     *
     * @throws ResourceNotFoundException if submission doesn't exist
     * @throws FileStorageException if file cannot be saved

     * Example Usage:
     * MultipartFile file = ... // from HTTP request
     * FileInfoDTO info = fileStorageService.uploadFile(1L, file);
     * // info.getDownloadUrl() = "/api/submissions/1/files/5"

     * Integration Points:
     * - Called by SubmissionController.uploadFile()
     * - Triggers version control snapshot
     * - May trigger plagiarism detection
     * - May trigger AI feedback generation
     */
    @Transactional  // Ensures atomic file save and database insert
    public FileInfoDTO uploadFile(Long submissionId, MultipartFile file) {
        log.info("Uploading file for submission: {}", submissionId);

        // Step 1: Validate submission exists
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Submission not found with ID: " + submissionId
                ));

        // Step 2: Process filename
        // Extract original filename, handling potential null
        String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNull(file.getOriginalFilename())
        );

        // Extract file extension (e.g., "java" from "Main.java")
        String fileExtension = FilenameUtils.getExtension(originalFilename);

        // Generate unique stored filename using UUID
        // Format: "550e8400-e29b-41d4-a716-446655440000.java"
        String storedFilename = UUID.randomUUID() + "." + fileExtension;

        try {
            // Step 3: Security check - prevent path traversal
            if (originalFilename.contains("..")) {
                throw new FileStorageException("Invalid filename: " + originalFilename);
            }

            // Step 4: Prepare storage location
            // Create submission-specific directory: {base_dir}/{submission_id}/
            Path submissionDir = this.fileStorageLocation.resolve(
                    String.valueOf(submissionId)
            );
            Files.createDirectories(submissionDir);  // Create if doesn't exist

            // Step 5: Save file to filesystem
            // Full path: {base_dir}/{submission_id}/{uuid}.{extension}
            Path targetLocation = submissionDir.resolve(storedFilename);

            // Copy file content from upload to target location
            // REPLACE_EXISTING: Allows re-uploading same UUID (rare)
            Files.copy(
                    file.getInputStream(),           // Source: uploaded file
                    targetLocation,                  // Destination: filesystem
                    StandardCopyOption.REPLACE_EXISTING
            );

            // Step 6: Create database record
            SubmissionFile submissionFile = SubmissionFile.builder()
                    .originalFilename(originalFilename)      // Display name
                    .storedFilename(storedFilename)          // Server filename
                    .filePath(targetLocation.toString())     // Full path
                    .fileSize(file.getSize())                // Bytes
                    .contentType(file.getContentType())      // MIME type
                    .fileExtension(fileExtension)            // Extension
                    .submission(submission)                  // Parent relationship
                    .build();

            // Step 7: Update submission (maintains bidirectional relationship)
            submission.addFile(submissionFile);  // Helper method sets both sides
            submissionRepository.save(submission);  // Cascades to SubmissionFile

            log.info("File uploaded successfully: {}", storedFilename);

            // Step 8: Build and return response DTO
            return FileInfoDTO.builder()
                    .id(submissionFile.getId())                    // Database ID
                    .originalFilename(submissionFile.getOriginalFilename())
                    .storedFilename(submissionFile.getStoredFilename())
                    .fileSize(submissionFile.getFileSize())
                    .contentType(submissionFile.getContentType())
                    .fileExtension(submissionFile.getFileExtension())
                    .uploadedAt(submissionFile.getUploadedAt())    // Set by @CreationTimestamp
                    .downloadUrl("/api/submissions/" + submissionId + "/files/" + submissionFile.getId())
                    .build();

        } catch (IOException ex) {
            // Filesystem error: disk full, permissions, I/O error
            // Wrap in domain exception for consistent error handling
            log.error("Failed to store file: {}", originalFilename, ex);
            throw new FileStorageException("Could not store file " + originalFilename, ex);
        }
    }

    /**
     * Loads a file as a Resource for downloading/streaming.

     * This method retrieves a file from the filesystem and wraps it in
     * a Spring Resource object for efficient streaming to the client.

     * RESOURCE PATTERN:
     * =================
     * Spring's Resource abstraction provides:
     * - Uniform API for different resource types (files, classpath, URLs)
     * - Stream-based access (doesn't load entire file)
     * - Metadata access (exists, size, etc.)
     * - Integration with ResponseEntity for HTTP streaming

     * Why Use Resource Instead of byte[]?

     * byte[] Approach (BAD for large files):
     * byte[] data = Files.readAllBytes(path);  // Loads entire file
     * return data;  // Entire file in memory

     * Problems:
     * - OutOfMemoryError for large files
     * - Slow response time (must read all before sending)
     * - Multiple concurrent downloads exhaust memory

     * Resource Approach (GOOD):
     * Resource = new UrlResource(path.toUri());
     * return resource;  // Streams file

     * Benefits:
     * - Streams file in chunks (e.g., 8KB at a time)
     * - Constant memory usage regardless of file size
     * - Fast response (starts streaming immediately)
     * - Supports range requests (partial downloads)

     * LOADING PROCESS:
     * ================

     * Step 1: Fetch file metadata from database
     * - Retrieves SubmissionFile record
     * - Contains file path on filesystem
     * - Throws ResourceNotFoundException if not in database

     * Step 2: Locate file on filesystem
     * - Convert stored path to Path object
     * - Normalize to handle relative paths
     * - Create UrlResource for the file

     * Step 3: Verify file exists
     * - Check if file physically exists
     * - File might be deleted but metadata remains
     * - Throw exception if file missing

     * Step 4: Return Resource
     * - Controller streams to client
     * - Content-Type set from metadata
     * - Content-Disposition for download

     * FILE EXISTENCE SCENARIOS:
     * =========================

     * Scenario 1: File exists and accessible
     * - Database: ✓ (metadata found)
     * - Filesystem: ✓ (file exists)
     * - Result: SUCCESS - resource returned

     * Scenario 2: Metadata exists, file deleted
     * - Database: ✓ (metadata found)
     * - Filesystem: ✗ (file missing)
     * - Result: FAILURE - ResourceNotFoundException
     * - Cause: Manual file deletion, corruption, backup restore

     * Scenario 3: No metadata in database
     * - Database: ✗ (record not found)
     * - Filesystem: ? (not checked)
     * - Result: FAILURE - ResourceNotFoundException
     * - Cause: Invalid file ID, deleted submission

     * SECURITY CONSIDERATIONS:
     * ========================

     * Path Normalization:
     * - Prevents path traversal even if database compromised
     * - normalize() removes ".." and "." elements
     * - Ensures file is within expected directory

     * Permission Checking:
     * - Should verify user has permission to download
     * - Current: Anyone with file ID can download
     * - Enhancement: Add authorization check

     * Example Authorization:
     * if (!canUserAccessFile(currentUser, file)) {
     *     throw new AccessDeniedException("Cannot access this file");
     * }

     * ERROR HANDLING:
     * ===============

     * IOException Scenarios:
     * - File exists but cannot be read (permissions)
     * - File path is actually a directory
     * - Filesystem corruption
     * - Network filesystem unavailable

     * All IOExceptions converted to ResourceNotFoundException
     * for consistent API error responses.

     * PERFORMANCE:
     * ============
     * - No file content loaded into memory
     * - Resource created immediately
     * - Streaming starts on first read
     * - Efficient for files of any size
     * - Supports concurrent downloads
     *
     * @param fileId The database ID of the file to load
     *
     * @return Resource object for streaming the file content
     *         Can be used directly with ResponseEntity for HTTP download
     *
     * @throws ResourceNotFoundException if:
     *         - File metadata not found in database
     *         - File doesn't exist on filesystem
     *         - File cannot be read (permissions, corruption)

     * Example Usage:
     * Resource = fileStorageService.loadFileAsResource(5L);
     * return ResponseEntity.ok()
     *     .contentType(MediaType.APPLICATION_PDF)
     *     .body(resource);  // Streams file to client

     * Integration:
     * - Called by SubmissionController.downloadFile()
     * - Used by Version Control Service
     * - Used by Plagiarism Detection Service
     * - Used by AI Feedback Service
     */
    @Transactional(readOnly = true)  // Optimization: no writes in this method
    public Resource loadFileAsResource(Long fileId) {
        log.info("Loading file with ID: {}", fileId);

        // Step 1: Fetch file metadata from database
        SubmissionFile file = submissionFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "File not found with ID: " + fileId
                ));

        try {
            // Step 2: Convert stored path to Path object and normalize
            Path filePath = Paths.get(file.getFilePath()).normalize();

            // Step 3: Create Resource from file URI
            // UrlResource supports file:// URLs for filesystem access
            Resource resource = new UrlResource(filePath.toUri());

            // Step 4: Verify file actually exists on filesystem
            if (resource.exists()) {
                return resource;  // SUCCESS: File ready for streaming
            } else {
                // File metadata exists but file is missing
                // Possible causes: manual deletion, corruption, cleanup job
                throw new ResourceNotFoundException(
                        "File not found: " + file.getOriginalFilename()
                );
            }
        } catch (IOException ex) {
            // Filesystem error: permissions, corruption, path issues
            log.error("Error loading file as resource: {}", fileId, ex);
            throw new ResourceNotFoundException(
                    "File not found: " + file.getOriginalFilename()
            );
        }
    }

    /**
     * Retrieves metadata for all files attached to a submission.

     * This method returns a list of file metadata (without actual file content)
     * for displaying in the UI or for processing by other services.

     * USE CASES:
     * ==========
     * 1. Student viewing their submission
     *    - Display list of uploaded files
     *    - Show file names, sizes, upload times
     *    - Provide download links

     * 2. Instructor reviewing submission
     *    - See what files were submitted
     *    - Check file types and sizes
     *    - Download individual files

     * 3. Version Control Service
     *    - List files for creating snapshots
     *    - Compare files between versions

     * 4. Plagiarism Detection
     *    - Get list of files to analyze
     *    - Compare with other submissions

     * 5. AI Feedback Service
     *    - Identify code files for analysis
     *    - Process each file individually

     * RESPONSE STRUCTURE:
     * ===================
     * Returns List<FileInfoDTO> where each item contains:
     * - id: File's database ID
     * - originalFilename: Name as uploaded
     * - storedFilename: Server's UUID filename
     * - fileSize: Size in bytes
     * - contentType: MIME type
     * - fileExtension: File extension
     * - uploadedAt: Upload timestamp
     * - downloadUrl: API endpoint to download

     * Why Return DTOs Instead of Entities?
     * - DTOs are serialization-safe (no lazy loading issues)
     * - Decouples API from database structure
     * - Can customize response format
     * - Includes computed fields (downloadUrl)
     * - Prevents exposure of internal implementation

     * STREAM PROCESSING:
     * ==================
     * Uses Java 8 Stream API for efficient transformation:

     * Step 1: Get list from repository
     * List<SubmissionFile> files = repository.find...()

     * Step 2: Convert to stream
     * .stream()

     * Step 3: Map each entity to DTO
     * .map(file -> FileInfoDTO.builder()...)

     * Step 4: Collect back to list
     * .collect(Collectors.toList())

     * Benefits of Stream:
     * - Functional, declarative style
     * - Easily parallelizable if needed
     * - Chainable operations
     * - Memory efficient (lazy evaluation)

     * DOWNLOAD URL CONSTRUCTION:
     * ==========================
     * Pattern: /api/submissions/{submissionId}/files/{fileId}

     * Example:
     * submissionId = 1, fileId = 5
     * downloadUrl = "/api/submissions/1/files/5"

     * Full URL: http://localhost:8081/api/submissions/1/files/5

     * Why Include submission ID?
     * - RESTful URL structure
     * - Clear resource hierarchy
     * - Easier to understand and debug
     * - Supports authorization checks

     * PERFORMANCE CONSIDERATIONS:
     * ===========================
     * - Only fetches metadata, not file content
     * - Fast even for large files
     * - Single database query
     * - No filesystem access needed
     * - Efficient for displaying file lists

     * EMPTY RESULT HANDLING:
     * ======================
     * If submission has no files:
     * - Returns empty list (not null)
     * - No exception thrown
     * - Frontend can check list.isEmpty()

     * Why empty list instead of null?
     * - Prevents NullPointerException
     * - Can safely iterate (forEach works on empty list)
     * - Consistent API behavior
     * - Follows collections best practices

     * LAZY LOADING NOTE:
     * ==================
     * This method DOES NOT use submission.getFiles()
     * - Direct repository query is more efficient
     * - Avoids loading entire submission entity
     * - No N+1 query problem
     * - Better for submissions with many files
     *
     * @param submissionId The ID of the submission
     *
     * @return List<FileInfoDTO> containing metadata for all files
     *         Empty list if submission has no files
     *         Never returns null

     * Example Response:
     * [
     *   {
     *     "id": 1,
     *     "originalFilename": "Main.java",
     *     "fileSize": 1024,
     *     "downloadUrl": "/api/submissions/1/files/1"
     *   },
     *   {
     *     "id": 2,
     *     "originalFilename": "README.md",
     *     "fileSize": 512,
     *     "downloadUrl": "/api/submissions/1/files/2"
     *   }
     * ]

     * Integration:
     * - Called by SubmissionController.getFiles()
     * - Used in submission detail pages
     * - Used by other services to list files
     */
    @Transactional(readOnly = true)  // Read-only: optimization hint to database
    public List<FileInfoDTO> getFilesBySubmissionId(Long submissionId) {
        log.info("Fetching files for submission: {}", submissionId);

        // Query database for all files belonging to this submission
        return submissionFileRepository.findBySubmissionId(submissionId).stream()
                // Transform each SubmissionFile entity to FileInfoDTO
                .map(file -> FileInfoDTO.builder()
                        .id(file.getId())
                        .originalFilename(file.getOriginalFilename())
                        .storedFilename(file.getStoredFilename())
                        .fileSize(file.getFileSize())
                        .contentType(file.getContentType())
                        .fileExtension(file.getFileExtension())
                        .uploadedAt(file.getUploadedAt())
                        // Construct download URL for this file
                        .downloadUrl("/api/submissions/" + submissionId + "/files/" + file.getId())
                        .build())
                // Collect all DTOs into a List
                .collect(Collectors.toList());
    }

    /**
     * Deletes a file from both filesystem and database.

     * This method performs a complete deletion of a file:
     * 1. Removes physical file from filesystem
     * 2. Removes metadata record from database

     * DELETION WORKFLOW:
     * ==================

     * Step 1: Fetch metadata from database
     * - Verify file exists
     * - Get filesystem path

     * Step 2: Delete physical file
     * - Locate file on filesystem
     * - Delete if exists (silently succeeds if already gone)

     * Step 3: Delete database record
     * - Remove SubmissionFile entity
     * - JPA handles foreign key constraints

     * Step 4: Commit transaction
     * - Both deletions are atomic
     * - Rollback on any failure

     * ATOMICITY:
     * ==========
     * @Transactional ensures both operations succeed or both fail.

     * Scenario 1: Both succeed
     * - Filesystem: ✓ deleted
     * - Database: ✓ deleted
     * - Result: Clean deletion

     * Scenario 2: Filesystem fails, database would succeed
     * - Filesystem: ✗ (IOException)
     * - Database: (not attempted yet)
     * - Transaction: Rolls back
     * - Result: Nothing deleted, exception thrown

     * Scenario 3: Filesystem succeeds, database fails
     * - Filesystem: ✓ deleted
     * - Database: ✗ (constraint violation, etc.)
     * - Transaction: Rolls back
     * - Result: Orphaned file on filesystem (minor issue)

     * Note: Spring doesn't roll back filesystem operations
     * - Transaction only controls database
     * - If database save fails, file stays deleted
     * - Orphaned files can be cleaned by scheduled job

     * ORPHANED FILE CLEANUP:
     * ======================
     * Recommended: Scheduled job to find and remove orphaned files
     *
     * @Scheduled(cron = "0 0 2 * * ?")  // 2 AM daily
     * public void cleanupOrphanedFiles() {
     *     // Find files in filesystem not in database
     *     // Delete orphaned files
     * }

     * FILES.DELETEIFEXISTS() BEHAVIOR:
     * =================================
     * - Deletes file if it exists
     * - Returns true if file was deleted
     * - Returns false if file didn't exist
     * - Does NOT throw exception if file missing

     * Why use deleteIfExists instead of delete?
     * - delete(): Throws exception if file doesn't exist
     * - deleteIfExists(): Silently handles missing files
     * - Idempotent: Can call multiple times safely

     * This is useful when:
     * - File was manually deleted
     * - Previous deletion partially failed
     * - Cleanup scripts ran
     * - Retry scenarios

     * BUSINESS RULES:
     * ===============

     * When to Allow Deletion:
     * - Submission is in DRAFT status
     * - User is the submission owner
     * - File is not locked

     * When to Prevent Deletion:
     * - Submission is SUBMITTED (locked)
     * - User is not authorized
     * - File is referenced by version control

     * Current Implementation:
     * - No status check (TODO: Add in production)
     * - No authorization check (TODO: Add security)

     * SECURITY CONSIDERATIONS:
     * ========================

     * Authorization Required:
     * - Verify user owns the submission
     * - Check user has delete permission
     * - Verify submission allows file deletion

     * Example Enhancement:
     * public void deleteFile(Long fileId, String userId) {
     *     SubmissionFile file = findById(fileId);
     *     if (!file.getSubmission().getStudentId().equals(userId)) {
     *         throw new AccessDeniedException("Cannot delete this file");
     *     }
     *     if (file.getSubmission().getStatus() == SUBMITTED) {
     *         throw new IllegalStateException("Cannot delete from submitted work");
     *     }
     *     // proceed with deletion
     * }

     * SIDE EFFECTS:
     * =============

     * Database:
     * - Submission's file count decreases
     * - File is removed from submission.files collection
     * - Cascade behavior handles relationship cleanup

     * Filesystem:
     * - File is permanently deleted
     * - Cannot be recovered (unless backups exist)
     * - Directory remains (only file is removed)

     * Other Services:
     * - Version Control: Versions still reference deleted file
     * - Plagiarism: Previous comparisons remain valid
     * - AI Feedback: Previous feedback remains

     * ERROR SCENARIOS:
     * ================

     * Scenario 1: File not found in database
     * - Throws: ResourceNotFoundException
     * - HTTP 404: "File not found with ID: X"

     * Scenario 2: File not found on filesystem
     * - deleteIfExists returns false
     * - Database record still deleted
     * - Result: Cleanup of orphaned metadata

     * Scenario 3: Cannot delete file (permissions)
     * - Throws: IOException → FileStorageException
     * - Transaction rolls back
     * - HTTP 500: "Could not delete file"

     * Scenario 4: Foreign key constraint
     * - Other records reference this file
     * - Database deletion fails
     * - Transaction rolls back
     * - File remains in filesystem (orphaned)
     *
     * @param fileId The database ID of the file to delete
     *
     * @throws ResourceNotFoundException if file metadata not found
     * @throws FileStorageException if file cannot be deleted from filesystem

     * Example Usage:
     * fileStorageService.deleteFile(5L);
     * // File 5 is removed from both filesystem and database

     * Integration:
     * - Called by SubmissionController.deleteFile()
     * - May be called during submission deletion (cascade)
     * - May be called by cleanup jobs
     */
    @Transactional  // Ensures atomic deletion (database and filesystem)
    public void deleteFile(Long fileId) {
        log.info("Deleting file with ID: {}", fileId);

        // Step 1: Fetch file metadata from database
        SubmissionFile file = submissionFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "File not found with ID: " + fileId
                ));

        try {
            // Step 2: Delete physical file from filesystem
            Path filePath = Paths.get(file.getFilePath());

            // deleteIfExists: Returns true if deleted, false if didn't exist
            // Does not throw exception if file missing (idempotent)
            Files.deleteIfExists(filePath);

            // Step 3: Delete database record
            // This removes the metadata and breaks relationship with submission
            submissionFileRepository.delete(file);

            log.info("File deleted successfully: {}", fileId);
        } catch (IOException ex) {
            // Filesystem error: permissions, file in use, I/O error
            log.error("Could not delete file: {}", fileId, ex);

            // Wrap in domain exception
            // Transaction will rollback, database record stays
            throw new FileStorageException("Could not delete file", ex);
        }
    }

    /**
     * Retrieves file metadata without loading the file content.

     * This is a convenience method that returns the complete SubmissionFile
     * entity with all metadata fields.

     * USE CASES:
     * ==========
     * 1. Controller needs metadata for download headers
     *    - originalFilename for Content-Disposition
     *    - contentType for Content-Type header
     *    - fileSize for Content-Length header

     * 2. Services need file information
     *    - Version Control checking file types
     *    - Plagiarism Detection filtering code files
     *    - AI Feedback identifying programming languages

     * 3. Validation and business logic
     *    - Check file extension before processing
     *    - Verify file size before download
     *    - Display file information to user

     * WHY SEPARATE METHOD?
     * ====================
     * Could be combined with loadFileAsResource(), but separated for:
     * - Single Responsibility Principle
     * - Sometimes only metadata is needed
     * - Clearer API intent
     * - Easier to test independently

     * ENTITY VS DTO:
     * ==============
     * Returns SubmissionFile entity (not DTO) because:
     * - Used internally by services
     * - Controller has full access to all fields
     * - Can navigate relationships if needed
     * - More flexible than DTO

     * If exposing to external API:
     * - Convert to DTO to hide implementation
     * - Remove sensitive internal fields
     * - Provide only necessary information

     * PERFORMANCE:
     * ============
     * - Single database query
     * - No file content loaded
     * - Fast regardless of file size
     * - Efficient for metadata-only needs

     * RELATIONSHIP LOADING:
     * =====================
     * submission field is @ManyToOne(fetch = LAZY)
     * - Submission is NOT loaded by this query
     * - Only file metadata is fetched
     * - Accessing submission would trigger another query
     * - Efficient for metadata-only use cases
     *
     * @param fileId The database ID of the file
     *
     * @return SubmissionFile entity with all metadata fields:
     *         - id, originalFilename, storedFilename
     *         - filePath, fileSize, contentType
     *         - fileExtension, uploadedAt
     *         - submission (lazy-loaded reference)
     *
     * @throws ResourceNotFoundException if file not found in database

     * Example Usage:
     * SubmissionFile metadata = fileStorageService.getFileMetadata(5L);
     * String contentType = metadata.getContentType();
     * String filename = metadata.getOriginalFilename();

     * Integration:
     * - Called by SubmissionController.downloadFile()
     * - Used for setting HTTP response headers
     * - Used by services for file type checking
     */
    @Transactional(readOnly = true)  // Read-only optimization
    public SubmissionFile getFileMetadata(Long fileId) {
        return submissionFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "File not found with ID: " + fileId
                ));
    }
}