package com.smartlms.submission_management_service.service;

import com.smartlms.submission_management_service.dto.request.GradeRequest;
import com.smartlms.submission_management_service.dto.request.SavePlagiarismSourcesRequest;
import com.smartlms.submission_management_service.dto.response.VersionAnswerResponse;
import com.smartlms.submission_management_service.dto.response.VersionPlagiarismSourceResponse;
import com.smartlms.submission_management_service.dto.response.VersionResponse;
import com.smartlms.submission_management_service.exception.DeadlineNotPassedException;
import com.smartlms.submission_management_service.exception.ResourceNotFoundException;
import com.smartlms.submission_management_service.model.*;
import com.smartlms.submission_management_service.repository.*;
import com.smartlms.submission_management_service.util.AnswerScoreUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Manages immutable version snapshots for text-based submissions.
 *
 * Core contract:
 *   - createVersionSnapshot() is called inside the same @Transactional context
 *     as submitSubmission(), so if snapshot creation fails the whole submit rolls back.
 *   - All read methods use readOnly transactions.
 *   - gradeVersionAnswers() writes lecturer overrides only to version_answers rows
 *     on the LATEST version; it must be called after deadline enforcement.
 *   - Older versions are NEVER modified.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VersionService {

    private final SubmissionVersionRepository versionRepository;
    private final VersionAnswerRepository versionAnswerRepository;
    private final VersionPlagiarismSourceRepository plagiarismSourceRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot creation (called from SubmissionService.submitSubmission)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a fully immutable version snapshot for a submission.
     *
     * Must be called INSIDE the submitSubmission @Transactional context so that
     * a failure here rolls back the entire submit operation.
     *
     * @param submission The saved Submission entity (with updated versionNumber/metrics).
     * @param answers    All Answer rows for this submission at submit time.
     */
    @Transactional
    public VersionResponse createVersionSnapshot(Submission submission, List<Answer> answers) {
        int versionNumber = submission.getVersionNumber(); // already incremented by submission.submit()

        // Idempotency guard: never create a duplicate version
        if (versionRepository.existsBySubmissionIdAndVersionNumber(submission.getId(), versionNumber)) {
            log.warn("Version snapshot already exists for submission {} version {} — skipping duplicate creation",
                    submission.getId(), versionNumber);
            return versionRepository
                    .findBySubmissionIdAndVersionNumber(submission.getId(), versionNumber)
                    .map(v -> toVersionResponse(v, true))
                    .orElseThrow();
        }

        log.info("Creating version snapshot: submissionId={} versionNumber={}", submission.getId(), versionNumber);

        // ── Build version header ──────────────────────────────────────────────
        SubmissionVersion version = SubmissionVersion.builder()
                .submissionId(submission.getId())
                .versionNumber(versionNumber)
                .studentId(submission.getStudentId())
                .submittedAt(submission.getSubmittedAt())
                .isLate(Boolean.TRUE.equals(submission.getIsLate()))
                .aiScore(submission.getAiScore())
                .plagiarismScore(submission.getPlagiarismScore())
                .totalWordCount(submission.getTotalWordCount())
                .aiGrade(submission.getGrade()) // AI-computed grade at submit time
                .maxGrade(submission.getMaxGrade())
                .commitMessage(buildCommitMessage(submission))
                .build();

        SubmissionVersion savedVersion = versionRepository.save(version);

        // ── Build version answer rows ─────────────────────────────────────────
        List<VersionAnswer> versionAnswers = new ArrayList<>();
        for (Answer a : answers) {
            VersionAnswer va = VersionAnswer.builder()
                    .version(savedVersion)
                    .questionId(a.getQuestionId())
                    .questionText(a.getQuestionText())
                    .answerText(a.getAnswerText())
                    .wordCount(a.getWordCount())
                    .characterCount(a.getCharacterCount())
                    // AI feedback snapshot
                    .grammarScore(a.getGrammarScore())
                    .clarityScore(a.getClarityScore())
                    .completenessScore(a.getCompletenessScore())
                    .relevanceScore(a.getRelevanceScore())
                    .aiStrengths(a.getAiStrengths())
                    .aiImprovements(a.getAiImprovements())
                    .aiSuggestions(a.getAiSuggestions())
                    .aiGeneratedMark(computeAiMark(a))
                    // Plagiarism summary snapshot
                    .similarityScore(a.getSimilarityScore())
                    .plagiarismSeverity(a.getPlagiarismSeverity())
                    .plagiarismFlagged(a.getPlagiarismFlagged())
                    .plagiarismCheckedAt(a.getPlagiarismCheckedAt())
                    // Lecturer fields start null — filled post-deadline on latest version only
                    .build();
            versionAnswers.add(versionAnswerRepository.save(va));
        }

        savedVersion.setAnswers(versionAnswers);

        log.info("Version snapshot created: id={} submissionId={} versionNumber={} answerCount={}",
                savedVersion.getId(), submission.getId(), versionNumber, versionAnswers.size());

        return toVersionResponse(savedVersion, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns all version headers for a submission (newest first), WITHOUT answer detail.
     * Used for the version history timeline.
     */
    @Transactional(readOnly = true)
    public List<VersionResponse> getVersions(Long submissionId) {
        return versionRepository.findBySubmissionIdOrderByVersionNumberDesc(submissionId)
                .stream()
                .map(v -> toVersionResponse(v, false))
                .collect(Collectors.toList());
    }

    /**
     * Returns the full version detail (header + all answers + plagiarism sources).
     * Used for report pages.
     */
    @Transactional(readOnly = true)
    public VersionResponse getVersion(Long submissionId, Long versionId) {
        SubmissionVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found: " + versionId));

        if (!version.getSubmissionId().equals(submissionId)) {
            throw new ResourceNotFoundException("Version " + versionId + " does not belong to submission " + submissionId);
        }

        return toVersionResponse(version, true);
    }

    /**
     * Returns the latest version (highest version_number) with full detail.
     * Used for the default feedback/report page.
     */
    @Transactional(readOnly = true)
    public VersionResponse getLatestVersion(Long submissionId) {
        SubmissionVersion version = versionRepository.findLatestBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No versions found for submission: " + submissionId));
        return toVersionResponse(version, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Plagiarism source persistence
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Saves detailed internet plagiarism sources for one answer in one version.
     * Replaces any previously saved sources for the same version+question.
     *
     * Called by the frontend after a plagiarism check completes, immediately after
     * the submit response is received.
     */
    @Transactional
    public void savePlagiarismSources(Long submissionId, Long versionId, String questionId,
                                      SavePlagiarismSourcesRequest request) {
        // Validate version ownership
        SubmissionVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found: " + versionId));
        if (!version.getSubmissionId().equals(submissionId)) {
            throw new ResourceNotFoundException("Version " + versionId + " does not belong to submission " + submissionId);
        }

        VersionAnswer va = versionAnswerRepository
                .findByVersionIdAndQuestionId(versionId, questionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "VersionAnswer not found for version " + versionId + " question " + questionId));

        // Replace all existing sources for this answer
        plagiarismSourceRepository.deleteByVersionAnswerId(va.getId());

        if (request.getSources() != null) {
            for (SavePlagiarismSourcesRequest.SourceItem src : request.getSources()) {
                LocalDateTime detectedAt = null;
                if (src.getDetectedAt() != null) {
                    try {
                        detectedAt = LocalDateTime.parse(src.getDetectedAt().replace("Z", ""));
                    } catch (Exception ignored) {
                        detectedAt = LocalDateTime.now();
                    }
                }
                VersionPlagiarismSource source = VersionPlagiarismSource.builder()
                        .versionAnswer(va)
                        .sourceUrl(src.getSourceUrl())
                        .sourceTitle(src.getSourceTitle())
                        .sourceSnippet(src.getSourceSnippet())
                        .matchedText(src.getMatchedText())
                        .similarityPercentage(src.getSimilarityPercentage())
                        .detectedAt(detectedAt)
                        .build();
                plagiarismSourceRepository.save(source);
            }
        }

        log.info("Saved {} plagiarism sources for versionId={} questionId={}",
                request.getSources() == null ? 0 : request.getSources().size(), versionId, questionId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lecturer grading on latest version
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Writes lecturer overrides to the LATEST version's VersionAnswer rows.
     *
     * Rules:
     *   - Only allowed after the assignment deadline (caller must enforce this).
     *   - Only the latest version's answers are writable; older versions are untouched.
     *   - Original AI values are never modified.
     *   - Audit fields (lecturerUpdatedAt, lecturerUpdatedBy) are always set.
     */
    @Transactional
    public void gradeVersionAnswers(Long submissionId, GradeRequest request) {
        SubmissionVersion latest = versionRepository.findLatestBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No versions found for submission: " + submissionId));

        Map<String, Double>  scores    = request.getQuestionScores()    != null ? request.getQuestionScores()    : Map.of();
        Map<String, String>  feedbacks = request.getQuestionFeedbacks() != null ? request.getQuestionFeedbacks() : Map.of();
        String               lecturerId = request.getLecturerId();
        LocalDateTime        now        = LocalDateTime.now();

        Set<String> allQuestionIds = new HashSet<>();
        allQuestionIds.addAll(scores.keySet());
        allQuestionIds.addAll(feedbacks.keySet());

        for (String questionId : allQuestionIds) {
            versionAnswerRepository.findByVersionIdAndQuestionId(latest.getId(), questionId)
                    .ifPresent(va -> {
                        if (scores.containsKey(questionId))    va.setLecturerMark(scores.get(questionId));
                        if (feedbacks.containsKey(questionId)) va.setLecturerFeedbackText(feedbacks.get(questionId));
                        va.setLecturerUpdatedAt(now);
                        va.setLecturerUpdatedBy(lecturerId);
                        versionAnswerRepository.save(va);
                    });
        }

        // Store the explicit overall grade on the version so toVersionResponse()
        // can use it directly instead of re-deriving it from per-question marks.
        if (request.getGrade() != null) {
            latest.setLecturerGrade(request.getGrade());
            versionRepository.save(latest);
        }

        log.info("Lecturer grades written to latest version id={} for submissionId={} by={}",
                latest.getId(), submissionId, lecturerId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Conversion helpers
    // ─────────────────────────────────────────────────────────────────────────

    private VersionResponse toVersionResponse(SubmissionVersion v, boolean includeAnswers) {
        List<VersionAnswerResponse> answerResponses = null;
        boolean hasLecturerOverride = false;
        boolean partiallyGraded = false;
        Double finalGrade = v.getAiGrade();

        if (includeAnswers) {
            List<VersionAnswer> answers = versionAnswerRepository.findByVersionIdOrderByQuestionId(v.getId());
            answerResponses = answers.stream()
                    .map(this::toVersionAnswerResponse)
                    .collect(Collectors.toList());

            // Use the stored lecturer grade if available; fall back to per-question
            // summation only when no explicit overall grade was set.
            List<VersionAnswer> gradedAnswers = answers.stream()
                    .filter(a -> a.getLecturerMark() != null)
                    .collect(Collectors.toList());
            boolean anyLecturerMark = !gradedAnswers.isEmpty();
            partiallyGraded = anyLecturerMark && gradedAnswers.size() < answers.size();

            if (v.getLecturerGrade() != null) {
                hasLecturerOverride = true;
                finalGrade = v.getLecturerGrade();
            } else if (anyLecturerMark) {
                hasLecturerOverride = true;
                // Denominator covers only the graded questions so that ungraded questions
                // do not silently count as 0 and drag down the student's grade.
                double maxMarksTotal = gradedAnswers.size() * 10.0;
                double lecturerTotal = gradedAnswers.stream()
                        .mapToDouble(VersionAnswer::getLecturerMark)
                        .sum();
                if (v.getMaxGrade() != null && v.getMaxGrade() > 0 && maxMarksTotal > 0) {
                    finalGrade = Math.round((lecturerTotal / maxMarksTotal) * v.getMaxGrade() * 10.0) / 10.0;
                }
            }
        }

        return VersionResponse.builder()
                .id(v.getId())
                .submissionId(v.getSubmissionId())
                .versionNumber(v.getVersionNumber())
                .studentId(v.getStudentId())
                .submittedAt(formatUtc(v.getSubmittedAt()))
                .isLate(v.getIsLate())
                .aiScore(v.getAiScore())
                .plagiarismScore(v.getPlagiarismScore())
                .totalWordCount(v.getTotalWordCount())
                .aiGrade(v.getAiGrade())
                .maxGrade(v.getMaxGrade())
                .finalGrade(finalGrade)
                .hasLecturerOverride(hasLecturerOverride)
                .partiallyGraded(partiallyGraded)
                .commitMessage(v.getCommitMessage())
                .createdAt(formatUtc(v.getCreatedAt()))
                .answers(answerResponses)
                .build();
    }

    private VersionAnswerResponse toVersionAnswerResponse(VersionAnswer va) {
        List<VersionPlagiarismSourceResponse> sources = plagiarismSourceRepository
                .findByVersionAnswerId(va.getId())
                .stream()
                .map(s -> VersionPlagiarismSourceResponse.builder()
                        .id(s.getId())
                        .sourceUrl(s.getSourceUrl())
                        .sourceTitle(s.getSourceTitle())
                        .sourceSnippet(s.getSourceSnippet())
                        .matchedText(s.getMatchedText())
                        .similarityPercentage(s.getSimilarityPercentage())
                        .detectedAt(formatUtc(s.getDetectedAt()))
                        .build())
                .collect(Collectors.toList());

        return VersionAnswerResponse.builder()
                .id(va.getId())
                .versionId(va.getVersion().getId())
                .questionId(va.getQuestionId())
                .questionText(va.getQuestionText())
                .answerText(va.getAnswerText())
                .wordCount(va.getWordCount())
                .characterCount(va.getCharacterCount())
                .grammarScore(va.getGrammarScore())
                .clarityScore(va.getClarityScore())
                .completenessScore(va.getCompletenessScore())
                .relevanceScore(va.getRelevanceScore())
                .strengths(splitPipe(va.getAiStrengths()))
                .improvements(splitPipe(va.getAiImprovements()))
                .suggestions(splitPipe(va.getAiSuggestions()))
                .aiGeneratedMark(va.getAiGeneratedMark())
                .similarityScore(va.getSimilarityScore())
                .plagiarismSeverity(va.getPlagiarismSeverity())
                .plagiarismFlagged(va.getPlagiarismFlagged())
                .plagiarismCheckedAt(formatUtc(va.getPlagiarismCheckedAt()))
                .plagiarismSources(sources)
                .lecturerMark(va.getLecturerMark())
                .lecturerFeedbackText(va.getLecturerFeedbackText())
                .lecturerUpdatedAt(formatUtc(va.getLecturerUpdatedAt()))
                .lecturerUpdatedBy(va.getLecturerUpdatedBy())
                .snapshotCreatedAt(formatUtc(va.getSnapshotCreatedAt()))
                .build();
    }

    /**
     * Weighted AI mark (0–10). Mirrors the formula in SubmissionService.
     * Weights: relevance 40%, completeness 30%, clarity 15%, grammar 15%.
     */
    private Double computeAiMark(Answer a) {
        // Prefer the pre-computed mark stored on the answer (set by AnswerService at analysis time).
        if (a.getAiGeneratedMark() != null) return a.getAiGeneratedMark();
        return AnswerScoreUtils.computeWeightedMark(a);
    }

    private String buildCommitMessage(Submission s) {
        String title = s.getAssignmentTitle() != null ? s.getAssignmentTitle() : "Submission";
        return title + " — v" + s.getVersionNumber();
    }

    private List<String> splitPipe(String value) {
        if (value == null || value.isBlank()) return List.of();
        return List.of(value.split("\\|\\|"));
    }

    /**
     * Serialises a LocalDateTime to an ISO-8601 string with a trailing 'Z' suffix,
     * indicating UTC. {@code LocalDateTime.toString()} alone omits the timezone
     * designator, which causes ambiguous parsing in JavaScript across different locales.
     */
    private static String formatUtc(LocalDateTime dt) {
        return dt != null ? dt.toString() + "Z" : null;
    }
}
