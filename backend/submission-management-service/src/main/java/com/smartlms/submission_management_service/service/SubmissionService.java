package com.smartlms.submission_management_service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlms.submission_management_service.dto.request.GradeRequest;
import com.smartlms.submission_management_service.dto.request.SubmissionRequest;
import com.smartlms.submission_management_service.dto.response.SubmissionResponse;
import com.smartlms.submission_management_service.exception.AccessDeniedException;
import com.smartlms.submission_management_service.exception.DeadlineNotPassedException;
import com.smartlms.submission_management_service.exception.ResourceNotFoundException;
import com.smartlms.submission_management_service.model.Answer;
import com.smartlms.submission_management_service.model.Submission;
import com.smartlms.submission_management_service.model.SubmissionStatus;
import com.smartlms.submission_management_service.model.SubmissionType;
import com.smartlms.submission_management_service.repository.AnswerRepository;
import com.smartlms.submission_management_service.repository.SubmissionRepository;
import com.smartlms.submission_management_service.util.AnswerScoreUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core service for managing student submissions.
 *
 * Version snapshots:
 *   submitSubmission() calls versionService.createVersionSnapshot() inside the
 *   same @Transactional context. If snapshot creation fails, the entire submit
 *   is rolled back — no partial state is ever committed.
 *
 * Lecturer grading:
 *   gradeSubmission() enforces the deadline, then writes overrides to BOTH:
 *     (a) the answers (working-copy) table — for backward compat with answer editor
 *     (b) the version_answers of the LATEST version — authoritative for reports
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final AnswerRepository answerRepository;
    private final VersionService versionService;
    private final ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public SubmissionResponse createSubmission(SubmissionRequest request) {
        log.info("Creating submission for student: {}", request.getStudentId());

        // Return the existing draft instead of creating a duplicate.
        if (request.getStudentId() != null && request.getAssignmentId() != null) {
            Optional<Submission> existing = submissionRepository
                    .findDraftByStudentIdAndAssignmentId(request.getStudentId(), request.getAssignmentId());
            if (existing.isPresent()) {
                log.info("Draft already exists (id={}) for student={} assignment={} — returning existing draft",
                        existing.get().getId(), request.getStudentId(), request.getAssignmentId());
                return convertToResponse(existing.get());
            }
        }

        Submission submission = Submission.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .studentId(request.getStudentId())
                .studentName(request.getStudentName())
                .studentEmail(request.getStudentEmail())
                .studentRegistrationId(request.getStudentRegistrationId())
                .assignmentId(request.getAssignmentId())
                .assignmentTitle(request.getAssignmentTitle())
                .moduleCode(request.getModuleCode())
                .moduleName(request.getModuleName())
                .submissionType(request.getSubmissionType() != null
                        ? request.getSubmissionType()
                        : SubmissionType.TEXT_ANSWER)
                .status(SubmissionStatus.DRAFT)
                .dueDate(request.getDueDate())
                .maxGrade(request.getMaxGrade())
                .versionNumber(0)  // 0 = draft, incremented to 1 on first submit
                .build();

        Submission saved = submissionRepository.save(submission);
        log.info("Submission created with ID: {}", saved.getId());
        return convertToResponse(saved);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(Long id) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));
        return convertToResponse(submission);
    }

    @Transactional(readOnly = true)
    public Page<SubmissionResponse> getAllSubmissions(Pageable pageable) {
        return submissionRepository.findAll(pageable)
                .map(this::convertToResponse);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByStudentId(String studentId) {
        return submissionRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByStudentIdAndAssignmentId(String studentId, String assignmentId) {
        return submissionRepository.findByStudentIdAndAssignmentId(studentId, assignmentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByAssignmentId(String assignmentId) {
        return submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SubmissionResponse updateSubmission(Long id, SubmissionRequest request, String callerId) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        if (!submission.getStudentId().equals(callerId)) {
            throw new AccessDeniedException("You do not have permission to update submission " + id);
        }

        if (submission.getStatus() != SubmissionStatus.DRAFT) {
            throw new IllegalStateException(
                    "Cannot update submission " + id + " — only DRAFT submissions may be edited (current status: "
                    + submission.getStatus() + ")");
        }

        submission.setTitle(request.getTitle());
        submission.setDescription(request.getDescription());
        submission.setAssignmentId(request.getAssignmentId());
        submission.setAssignmentTitle(request.getAssignmentTitle());
        submission.setDueDate(request.getDueDate());
        submission.setMaxGrade(request.getMaxGrade());

        return convertToResponse(submissionRepository.save(submission));
    }

    @Transactional
    public void deleteSubmission(Long id, String callerId) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));
        if (!submission.getStudentId().equals(callerId)) {
            throw new AccessDeniedException("You do not have permission to delete submission " + id);
        }
        submissionRepository.deleteById(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Submit — creates immutable version snapshot in the same transaction
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Transitions a draft submission to SUBMITTED and creates an immutable
     * version snapshot in the same database transaction.
     *
     * Flow:
     *   1. Validate: at least one answer with content exists
     *   2. Block post-deadline resubmission for already-submitted/graded work
     *   3. submission.submit() — increments versionNumber, sets status/submittedAt/isLate
     *   4. Compute aggregate AI/plagiarism metrics from current Answer rows
     *   5. Compute aiGeneratedMark per answer (set only once — immutable guard)
     *   6. Persist updated submission
     *   7. versionService.createVersionSnapshot() — same transaction, rolls back together
     */
    @Transactional
    public SubmissionResponse submitSubmission(Long id, String callerId) {
        log.info("Submitting submission with ID: {}", id);

        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        if (!submission.getStudentId().equals(callerId)) {
            throw new AccessDeniedException("You do not have permission to submit submission " + id);
        }

        // ── Validate: at least one answer with content ────────────────────────
        List<Answer> answers = answerRepository.findBySubmissionIdOrderByQuestionId(id);
        boolean hasAnswers = answers.stream()
                .anyMatch(a -> a.getWordCount() != null && a.getWordCount() >= 1);
        if (!hasAnswers) {
            throw new IllegalStateException("Cannot submit without text answers");
        }

        // ── Block post-deadline resubmission ──────────────────────────────────
        if (submission.getDueDate() != null
                && LocalDateTime.now().isAfter(submission.getDueDate())
                && (submission.getStatus() == SubmissionStatus.SUBMITTED
                        || submission.getStatus() == SubmissionStatus.LATE
                        || submission.getStatus() == SubmissionStatus.GRADED)) {
            throw new IllegalStateException("Deadline has passed — resubmission is no longer allowed");
        }

        // ── Transition status (increments versionNumber) ──────────────────────
        submission.submit();

        // ── Compute aggregate metrics ─────────────────────────────────────────
        if (!answers.isEmpty()) {
            double totalAi = answers.stream()
                    .filter(a -> a.getGrammarScore() != null || a.getClarityScore() != null
                            || a.getCompletenessScore() != null || a.getRelevanceScore() != null)
                    .mapToDouble(a -> {
                        Double mark = computeWeightedMark(a);
                        return mark != null ? mark * 10.0 : 0.0;
                    })
                    .average().orElse(0);
            submission.setAiScore(Math.round(totalAi * 10.0) / 10.0);

            if (submission.getMaxGrade() != null && submission.getMaxGrade() > 0) {
                double aiGrade = Math.round(submission.getAiScore() / 100.0 * submission.getMaxGrade() * 10) / 10.0;
                submission.setGrade(aiGrade);
            }

            double maxPlag = answers.stream()
                    .filter(a -> a.getSimilarityScore() != null)
                    .mapToDouble(Answer::getSimilarityScore)
                    .max().orElse(0);
            submission.setPlagiarismScore(maxPlag);

            int totalWords = answers.stream()
                    .filter(a -> a.getWordCount() != null)
                    .mapToInt(Answer::getWordCount)
                    .sum();
            submission.setTotalWordCount(totalWords);

            // aiGeneratedMark per answer — set only once; never overwritten on resubmit.
            // Weighted formula: relevance (40%) + completeness (30%) + clarity (15%) + grammar (15%).
            // This prioritises concept correctness over surface-level writing quality.
            List<Answer> toUpdate = new ArrayList<>();
            for (Answer a : answers) {
                if (a.getAiGeneratedMark() == null) {
                    Double mark = computeWeightedMark(a);
                    if (mark != null) {
                        a.setAiGeneratedMark(mark);
                        toUpdate.add(a);
                    }
                }
            }
            if (!toUpdate.isEmpty()) {
                answerRepository.saveAll(toUpdate);
            }
        }

        int prev = submission.getTotalVersions() != null ? submission.getTotalVersions() : 0;
        submission.setTotalVersions(prev + 1);

        Submission submitted = submissionRepository.save(submission);

        log.info("Submission {} → {} versionNumber={} aiScore={} plagiarismScore={}",
                id, submitted.getStatus(), submitted.getVersionNumber(),
                submitted.getAiScore(), submitted.getPlagiarismScore());

        // ── Snapshot — same @Transactional context: fails together or succeeds together ──
        versionService.createVersionSnapshot(submitted, answers);

        return convertToResponse(submitted);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Grade — lecturer override (post-deadline only)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Saves lecturer grade and per-question overrides — only allowed after deadline.
     *
     * Writes to:
     *   (a) submission + answers (working-copy tables) — backward compat
     *   (b) version_answers of the LATEST version — authoritative for reports
     *
     * Original AI values are never overwritten.
     */
    @Transactional
    public SubmissionResponse gradeSubmission(Long id, GradeRequest request) {
        log.info("Grading submission with ID: {}", id);

        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + id));

        // ── Deadline enforcement ──────────────────────────────────────────────
        if (submission.getDueDate() != null
                && !LocalDateTime.now().isAfter(submission.getDueDate())) {
            throw new DeadlineNotPassedException(
                    "Assignment deadline has not passed yet. Lecturer marks and feedback "
                    + "cannot be changed before the deadline. The current grade is AI-generated.");
        }

        Double grade = request.getGrade();
        if (grade != null && submission.getMaxGrade() != null && grade > submission.getMaxGrade()) {
            throw new IllegalArgumentException("Grade cannot exceed maximum grade of " + submission.getMaxGrade());
        }

        LocalDateTime now        = LocalDateTime.now();
        String        lecturerId = request.getLecturerId();

        // ── Update submission-level fields ────────────────────────────────────
        if (grade != null) submission.setLecturerGrade(grade);
        if (request.getLecturerFeedback() != null) submission.setFeedbackText(request.getLecturerFeedback());
        submission.setLecturerOverriddenAt(now);
        submission.setLecturerOverriddenBy(lecturerId);
        submission.setStatus(SubmissionStatus.GRADED);

        if (request.getQuestionScores() != null && !request.getQuestionScores().isEmpty()) {
            try {
                submission.setQuestionMarksJson(objectMapper.writeValueAsString(request.getQuestionScores()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialise questionScores for submission {}: {}", id, e.getMessage());
            }
        }

        // ── Update working-copy Answer rows ───────────────────────────────────
        Map<String, Double> scores    = request.getQuestionScores()    != null ? request.getQuestionScores()    : Map.of();
        Map<String, String> feedbacks = request.getQuestionFeedbacks() != null ? request.getQuestionFeedbacks() : Map.of();

        Set<String> allQuestionIds = new HashSet<>();
        allQuestionIds.addAll(scores.keySet());
        allQuestionIds.addAll(feedbacks.keySet());

        for (String questionId : allQuestionIds) {
            answerRepository.findBySubmissionIdAndQuestionId(id, questionId)
                    .ifPresent(answer -> {
                        if (scores.containsKey(questionId))    answer.setLecturerMark(scores.get(questionId));
                        if (feedbacks.containsKey(questionId)) answer.setLecturerFeedbackText(feedbacks.get(questionId));
                        answer.setLecturerUpdatedAt(now);
                        answer.setLecturerUpdatedBy(lecturerId);
                        answerRepository.save(answer);
                    });
        }

        Submission graded = submissionRepository.save(submission);

        // ── Write to version_answers on the LATEST version ────────────────────
        versionService.gradeVersionAnswers(id, request);

        log.info("Submission graded: id={} lecturerGrade={} by={}", id, grade, lecturerId);
        return convertToResponse(graded);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Conversion
    // ─────────────────────────────────────────────────────────────────────────

    private SubmissionResponse convertToResponse(Submission s) {
        return SubmissionResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .description(s.getDescription())
                .studentId(s.getStudentId())
                .studentName(s.getStudentName())
                .studentEmail(s.getStudentEmail())
                .studentRegistrationId(s.getStudentRegistrationId())
                .assignmentId(s.getAssignmentId())
                .assignmentTitle(s.getAssignmentTitle())
                .moduleCode(s.getModuleCode())
                .moduleName(s.getModuleName())
                .status(s.getStatus())
                .submissionType(s.getSubmissionType())
                .dueDate(s.getDueDate())
                .submittedAt(s.getSubmittedAt())
                .grade(s.getGrade())
                .maxGrade(s.getMaxGrade())
                .feedbackText(s.getFeedbackText())
                .isLate(s.getIsLate())
                .versionNumber(s.getVersionNumber())
                .currentVersionNumber(s.getVersionNumber())
                .totalVersions(s.getTotalVersions())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .aiScore(s.getAiScore())
                .plagiarismScore(s.getPlagiarismScore())
                .totalWordCount(s.getTotalWordCount())
                .questionMarksJson(s.getQuestionMarksJson())
                .lecturerGrade(s.getLecturerGrade())
                .lecturerOverriddenAt(s.getLecturerOverriddenAt())
                .lecturerOverriddenBy(s.getLecturerOverriddenBy())
                .isDeadlinePassed(s.getDueDate() != null
                        && LocalDateTime.now().isAfter(s.getDueDate()))
                .finalGrade(s.getLecturerGrade() != null
                        ? s.getLecturerGrade()
                        : s.getGrade())
                .build();
    }

    /**
     * Weighted AI mark formula (0–10 scale).
     *
     * Weights: relevance 40%, completeness 30%, clarity 15%, grammar 15%.
     * Relevance and completeness together account for 70% because they measure
     * whether the student answered the question correctly — the primary goal.
     * Grammar and clarity are secondary surface-quality signals.
     *
     * Only dimensions that have a non-null score contribute; if none exist, returns null.
     */
    private Double computeWeightedMark(Answer a) {
        return AnswerScoreUtils.computeWeightedMark(a);
    }
}
