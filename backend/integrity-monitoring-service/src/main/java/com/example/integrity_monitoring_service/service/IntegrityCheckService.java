package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.dto.request.PlagiarismCheckRequest;
import com.example.integrity_monitoring_service.dto.response.ApiResponse;
import com.example.integrity_monitoring_service.dto.response.PlagiarismCheckResponse;
import com.example.integrity_monitoring_service.exception.IntegrityCheckException;
import com.example.integrity_monitoring_service.exception.ResourceNotFoundException;
import com.example.integrity_monitoring_service.model.*;
import com.example.integrity_monitoring_service.repository.PlagiarismCheckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Main service for plagiarism checking
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrityCheckService {

    private final PlagiarismCheckRepository checkRepository;
    private final QuestionAnalyzerService questionAnalyzer;
    private final TextSimilarityService textSimilarity;
    private final JPlagService jplagService;
    private final GoogleSearchService googleSearch;
    private final SubmissionFetchService submissionFetch;

    @Value("${integrity.code-similarity-threshold:0.75}")
    private double codeSimilarityThreshold;

    @Value("${integrity.text-similarity-threshold:0.70}")
    private double textSimilarityThreshold;

    @Value("${integrity.internet-similarity-threshold:0.85}")
    private double internetSimilarityThreshold;

    /**
     * Run comprehensive plagiarism check
     */
    @Transactional
    public ApiResponse<PlagiarismCheckResponse> runPlagiarismCheck(PlagiarismCheckRequest request) {
        log.info("Running plagiarism check for submission: {}", request.getSubmissionId());

        long startTime = System.currentTimeMillis();

        try {
            // Step 1: Analyze question to determine if check is needed
            QuestionType questionType = questionAnalyzer.determineQuestionType(
                    request.getQuestionText() != null ? request.getQuestionText() : ""
            );

            boolean checkNeeded = questionAnalyzer.isPlagiarismCheckNeeded(
                    request.getQuestionText(),
                    request.getExpectedAnswer()
            );

            // Create plagiarism check record
            PlagiarismCheck check = PlagiarismCheck.builder()
                    .submissionId(request.getSubmissionId())
                    .studentId(request.getStudentId())
                    .assignmentId(request.getAssignmentId())
                    .questionId(request.getQuestionId())
                    .checkType(request.getCheckType())
                    .status(CheckStatus.IN_PROGRESS)
                    .questionType(questionType)
                    .plagiarismCheckNeeded(checkNeeded)
                    .build();

            check = checkRepository.save(check);

            // Step 2: Skip if check not needed
            if (!checkNeeded) {
                String skipReason = questionAnalyzer.getSkipReason(questionType);
                check.setStatus(CheckStatus.SKIPPED);
                check.setSkipReason(skipReason);
                check.setFlagged(false);
                check = checkRepository.save(check);

                log.info("Plagiarism check skipped for submission {}: {}",
                        request.getSubmissionId(), skipReason);

                return ApiResponse.success("Plagiarism check not needed for this question type",
                        PlagiarismCheckResponse.fromEntity(check));
            }

            // Step 3: Run appropriate checks based on type
            switch (request.getCheckType()) {
                case CODE_JPLAG:
                    runCodePlagiarismCheck(check, request);
                    break;

                case TEXT_COSINE:
                    runTextPlagiarismCheck(check, request);
                    break;

                case INTERNET_SEARCH:
                    runInternetPlagiarismCheck(check, request);
                    break;

                case COMBINED:
                    runCombinedCheck(check, request);
                    break;

                default:
                    throw new IntegrityCheckException("Unknown check type: " + request.getCheckType());
            }

            // Step 4: Finalize check
            long endTime = System.currentTimeMillis();
            check.setProcessingTimeMs(endTime - startTime);
            check.setStatus(CheckStatus.COMPLETED);
            check = checkRepository.save(check);

            log.info("Plagiarism check completed for submission {} in {}ms",
                    request.getSubmissionId(), check.getProcessingTimeMs());

            return ApiResponse.success("Plagiarism check completed",
                    PlagiarismCheckResponse.fromEntity(check));

        } catch (Exception e) {
            log.error("Error running plagiarism check: {}", e.getMessage(), e);
            throw new IntegrityCheckException("Plagiarism check failed: " + e.getMessage(), e);
        }
    }

    /**
     * Run code plagiarism check using JPlag
     */
    private void runCodePlagiarismCheck(PlagiarismCheck check, PlagiarismCheckRequest request) {
        log.debug("Running JPlag code plagiarism check");

        // Get student's code
        Map<String, String> studentCode = extractCodeFiles(request);

        // Get comparison submissions
        List<Map<String, String>> comparisonCodes = fetchComparisonSubmissions(request);

        if (comparisonCodes.isEmpty()) {
            log.warn("No submissions found for comparison");
            check.setOverallSimilarityScore(0.0);
            check.setMaxSimilarityScore(0.0);
            check.setFlagged(false);
            return;
        }

        // Run JPlag
        List<Map<String, Object>> matches = jplagService.checkCodePlagiarism(
                studentCode,
                comparisonCodes,
                determineLanguage(request.getFileName())
        );

        // Process matches
        double maxSimilarity = 0.0;
        int matchCount = 0;

        for (Map<String, Object> match : matches) {
            double similarity = (double) match.get("similarity");

            if (similarity > codeSimilarityThreshold) {
                SimilarityMatch similarityMatch = SimilarityMatch.builder()
                        .matchedStudentId((String) match.get("matchedStudent"))
                        .similarityScore(similarity)
                        .fileName(request.getFileName())
                        .tokensMatched((Integer) match.get("tokensMatched"))
                        .details((String) match.get("details"))
                        .build();

                check.addSimilarityMatch(similarityMatch);
                matchCount++;
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
        }

        check.setStudentSimilarityScore(maxSimilarity);
        check.setMaxSimilarityScore(maxSimilarity);
        check.setOverallSimilarityScore(maxSimilarity);
        check.setMatchesFound(matchCount);
        check.setFlagged(maxSimilarity > codeSimilarityThreshold);
    }

    /**
     * Run text plagiarism check using cosine similarity
     */
    private void runTextPlagiarismCheck(PlagiarismCheck check, PlagiarismCheckRequest request) {
        log.debug("Running text plagiarism check");

        String studentText = request.getTextContent();
        if (studentText == null || studentText.trim().isEmpty()) {
            log.warn("No text content provided");
            check.setOverallSimilarityScore(0.0);
            check.setFlagged(false);
            return;
        }

        // Get comparison submissions
        List<Map<String, String>> comparisonTexts = fetchComparisonTexts(request);

        if (comparisonTexts.isEmpty()) {
            log.warn("No submissions found for comparison");
            check.setOverallSimilarityScore(0.0);
            check.setFlagged(false);
            return;
        }

        // Calculate similarities
        double maxSimilarity = 0.0;
        int matchCount = 0;

        for (Map<String, String> comparison : comparisonTexts) {
            String otherText = comparison.get("content");
            String otherStudentId = comparison.get("studentId");
            Long otherSubmissionId = Long.parseLong(comparison.get("submissionId"));

            double similarity = textSimilarity.calculateSimilarity(studentText, otherText);

            if (similarity > textSimilarityThreshold) {
                SimilarityMatch match = SimilarityMatch.builder()
                        .matchedSubmissionId(otherSubmissionId)
                        .matchedStudentId(otherStudentId)
                        .similarityScore(similarity)
                        .details(String.format("Text similarity: %.2f%%", similarity * 100))
                        .build();

                check.addSimilarityMatch(match);
                matchCount++;
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
        }

        check.setStudentSimilarityScore(maxSimilarity);
        check.setMaxSimilarityScore(maxSimilarity);
        check.setOverallSimilarityScore(maxSimilarity);
        check.setMatchesFound(matchCount);
        check.setFlagged(maxSimilarity > textSimilarityThreshold);
    }

    /**
     * Run internet plagiarism check using Google Search
     */
    private void runInternetPlagiarismCheck(PlagiarismCheck check, PlagiarismCheckRequest request) {
        log.debug("Running internet plagiarism check");

        if (!request.getCheckInternet()) {
            log.debug("Internet check disabled");
            return;
        }

        String content = request.getTextContent() != null ?
                request.getTextContent() : request.getCodeContent();

        if (content == null || content.trim().isEmpty()) {
            log.warn("No content provided for internet check");
            return;
        }

        // Search internet
        List<Map<String, String>> searchResults = googleSearch.searchInternet(content, 5);

        if (searchResults.isEmpty()) {
            log.debug("No internet search results found");
            check.setInternetSimilarityScore(0.0);
            check.setInternetMatchesFound(0);
            return;
        }

        // Calculate similarity with search results
        double maxSimilarity = 0.0;
        int matchCount = 0;

        for (Map<String, String> result : searchResults) {
            String snippet = result.get("snippet");
            if (snippet == null || snippet.isEmpty()) {
                continue;
            }

            double similarity = textSimilarity.calculateSimilarity(content, snippet);

            if (similarity > internetSimilarityThreshold) {
                InternetMatch match = InternetMatch.builder()
                        .url(result.get("url"))
                        .title(result.get("title"))
                        .snippet(snippet)
                        .similarityScore(similarity)
                        .matchedText(snippet)
                        .sourceDomain(result.get("domain"))
                        .build();

                check.addInternetMatch(match);
                matchCount++;
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
        }

        check.setInternetSimilarityScore(maxSimilarity);
        check.setInternetMatchesFound(matchCount);

        // Update overall score if internet similarity is higher
        if (check.getOverallSimilarityScore() == null ||
                maxSimilarity > check.getOverallSimilarityScore()) {
            check.setOverallSimilarityScore(maxSimilarity);
            check.setMaxSimilarityScore(maxSimilarity);
        }

        // Flag if internet plagiarism detected
        if (maxSimilarity > internetSimilarityThreshold) {
            check.setFlagged(true);
        }
    }

    /**
     * Run combined check (students + internet)
     */
    private void runCombinedCheck(PlagiarismCheck check, PlagiarismCheckRequest request) {
        log.debug("Running combined plagiarism check");

        // Determine if code or text
        boolean isCode = request.getCodeContent() != null && !request.getCodeContent().isEmpty();

        if (isCode) {
            runCodePlagiarismCheck(check, request);
        } else {
            runTextPlagiarismCheck(check, request);
        }

        // Always check internet
        runInternetPlagiarismCheck(check, request);

        // Calculate overall score
        double studentScore = check.getStudentSimilarityScore() != null ?
                check.getStudentSimilarityScore() : 0.0;
        double internetScore = check.getInternetSimilarityScore() != null ?
                check.getInternetSimilarityScore() : 0.0;

        double overallScore = Math.max(studentScore, internetScore);
        check.setOverallSimilarityScore(overallScore);
        check.setMaxSimilarityScore(overallScore);

        // Flag if either check found plagiarism
        check.setFlagged(studentScore > (isCode ? codeSimilarityThreshold : textSimilarityThreshold) ||
                internetScore > internetSimilarityThreshold);
    }

    /**
     * Get plagiarism check by ID
     */
    public ApiResponse<PlagiarismCheckResponse> getCheckById(Long id) {
        PlagiarismCheck check = checkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Check not found with ID: " + id));

        return ApiResponse.success(PlagiarismCheckResponse.fromEntity(check));
    }

    /**
     * Get all flagged checks
     */
    public ApiResponse<List<PlagiarismCheckResponse>> getFlaggedChecks() {
        List<PlagiarismCheck> checks = checkRepository.findByFlaggedTrueOrderByCreatedAtDesc();

        List<PlagiarismCheckResponse> responses = checks.stream()
                .map(PlagiarismCheckResponse::fromEntity)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    /**
     * Get checks by assignment
     */
    public ApiResponse<List<PlagiarismCheckResponse>> getChecksByAssignment(String assignmentId) {
        List<PlagiarismCheck> checks = checkRepository.findByAssignmentIdOrderByCreatedAtDesc(assignmentId);

        List<PlagiarismCheckResponse> responses = checks.stream()
                .map(PlagiarismCheckResponse::fromEntity)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    // Helper methods

    private Map<String, String> extractCodeFiles(PlagiarismCheckRequest request) {
        Map<String, String> codeFiles = new HashMap<>();
        if (request.getFileName() != null && request.getCodeContent() != null) {
            codeFiles.put(request.getFileName(), request.getCodeContent());
        }
        return codeFiles;
    }

    private List<Map<String, String>> fetchComparisonSubmissions(PlagiarismCheckRequest request) {
        // Fetch from submission service
        return submissionFetch.fetchSubmissionsForComparison(request);
    }

    private List<Map<String, String>> fetchComparisonTexts(PlagiarismCheckRequest request) {
        // Fetch from submission service
        return submissionFetch.fetchTextSubmissionsForComparison(request);
    }

    private String determineLanguage(String fileName) {
        if (fileName == null) {
            return "java";
        }

        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }
}