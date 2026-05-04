package com.smartlms.submission_management_service.service;

import com.smartlms.submission_management_service.dto.request.SaveAnswerRequest;
import com.smartlms.submission_management_service.dto.request.SaveAnswerAnalysisRequest;
import com.smartlms.submission_management_service.dto.response.AnswerResponse;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.model.Answer;
import com.smartlms.submission_management_service.repository.AnswerRepository;
import com.smartlms.submission_management_service.util.AnswerScoreUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for text-based answer storage.
 *
 * Each call to saveAnswer performs an UPSERT:
 *   - If an Answer row already exists for the (submissionId, questionId) pair → UPDATE it.
 *   - Otherwise → INSERT a new Answer row.
 *
 * This is safe to call on every debounced auto-save from the frontend
 * (approximately every 5 seconds while the student is typing).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnswerService {

    private final AnswerRepository answerRepository;

    /**
     * Save or update a student's typed answer for one question.
     *
     * @param submissionIdStr  ID of the parent submission (path variable — parsed to Long)
     * @param questionId       ID of the question being answered
     * @param request          Payload containing the answer text + metadata
     * @return ApiResponse containing the saved AnswerResponse
     */
    @Transactional
    public ApiResponse<AnswerResponse> saveAnswer(String submissionIdStr,
                                                   String questionId,
                                                   SaveAnswerRequest request) {
        String submissionId = submissionIdStr;
        int textLen = request.getAnswerText() != null ? request.getAnswerText().length() : 0;
        log.info("[AnswerService] saveAnswer — submissionId={} questionId={} wordCount={} chars={}",
                submissionId, questionId, request.getWordCount(), textLen);

        // Attempt to find an existing answer for this (submissionId, questionId) pair
        boolean[] isNew = { false };
        Answer answer = answerRepository
                .findBySubmissionIdAndQuestionId(submissionId, questionId)
                .orElseGet(() -> {
                    log.info("[AnswerService] No existing answer — INSERT new row for submissionId={} questionId={}",
                            submissionId, questionId);
                    isNew[0] = true;
                    return Answer.builder()
                            .submissionId(submissionId)
                            .questionId(questionId)
                            .build();
                });

        if (!isNew[0]) {
            log.debug("[AnswerService] Existing answer found id={} — UPDATE", answer.getId());
        }

        // Update mutable fields regardless of whether this is an INSERT or UPDATE.
        // Word count is recomputed server-side from answerText so that a client sending
        // an inflated wordCount cannot bypass minimum-word-count enforcement at submit time.
        String answerText = request.getAnswerText();
        answer.setQuestionText(request.getQuestionText());
        answer.setAnswerText(answerText);
        answer.setWordCount(countWords(answerText));
        answer.setCharacterCount(answerText != null ? answerText.length() : 0);
        if (request.getStudentId() != null) answer.setStudentId(request.getStudentId());
        if (request.getMaxPoints() != null) answer.setMaxPoints(request.getMaxPoints());

        Answer saved = answerRepository.save(answer);
        log.info("[AnswerService] saveAnswer DONE — answerId={} submissionId={} questionId={} wordCount={}",
                saved.getId(), submissionId, questionId, saved.getWordCount());

        return ApiResponse.success("Answer saved", toResponse(saved));
    }

    /**
     * Retrieve all answers for a submission, in question-ID order.
     *
     * @param submissionIdStr  ID of the submission (path variable — parsed to Long)
     * @return ApiResponse containing the list of AnswerResponse DTOs
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<AnswerResponse>> getAnswers(String submissionIdStr) {
        String submissionId = submissionIdStr;
        log.info("[AnswerService] getAnswers — submissionId={}", submissionId);

        List<Answer> answers = answerRepository.findBySubmissionIdOrderByQuestionId(submissionId);
        List<AnswerResponse> responses = answers.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        log.info("[AnswerService] getAnswers DONE — returning {} answers for submissionId={}",
                responses.size(), submissionId);
        return ApiResponse.success(responses);
    }

    /**
     * Persist AI feedback and/or plagiarism results for an answer.
     *
     * Only overwrites fields that are non-null in the request, so the frontend
     * can call this independently after receiving AI feedback OR plagiarism results.
     *
     * Only saves if the answer has at least one word (wordCount >= 1).
     *
     * @param submissionId  Parent submission ID
     * @param questionId    Question this analysis belongs to
     * @param request       Non-null fields will be written; null fields are ignored
     * @return ApiResponse containing the updated AnswerResponse
     */
    @Transactional
    public ApiResponse<AnswerResponse> saveAnalysis(String submissionIdStr,
                                                     String questionId,
                                                     SaveAnswerAnalysisRequest request) {
        String submissionId = submissionIdStr;
        log.info("[AnswerService] saveAnalysis — submissionId={} questionId={}", submissionId, questionId);

        // If the answer row doesn't exist yet (feedback fired before the 5s auto-save),
        // skip silently — the frontend will retry on the next typing event.
        Answer answer = answerRepository
                .findBySubmissionIdAndQuestionId(submissionId, questionId)
                .orElse(null);
        if (answer == null) {
            log.info("[AnswerService] saveAnalysis SKIPPED — answer row not yet created for submissionId={} questionId={}", submissionId, questionId);
            return ApiResponse.success("Skipped — answer not yet saved", null);
        }

        // Guard: only persist analysis if student has written at least one word
        int wc = answer.getWordCount() != null ? answer.getWordCount() : 0;
        if (wc < 1) {
            log.info("[AnswerService] saveAnalysis SKIPPED — wordCount={} for questionId={}", wc, questionId);
            return ApiResponse.success("Skipped — no answer text", toResponse(answer));
        }

        // ── AI feedback fields ────────────────────────────────────────────────
        boolean hasFeedback = request.getGrammarScore() != null
                || request.getClarityScore() != null
                || request.getCompletenessScore() != null
                || request.getRelevanceScore() != null;

        if (hasFeedback) {
            if (request.getGrammarScore()      != null) answer.setGrammarScore(request.getGrammarScore());
            if (request.getClarityScore()      != null) answer.setClarityScore(request.getClarityScore());
            if (request.getCompletenessScore() != null) answer.setCompletenessScore(request.getCompletenessScore());
            if (request.getRelevanceScore()    != null) answer.setRelevanceScore(request.getRelevanceScore());
            if (request.getStrengths()    != null) answer.setAiStrengths(String.join("||", request.getStrengths()));
            if (request.getImprovements() != null) answer.setAiImprovements(String.join("||", request.getImprovements()));
            if (request.getSuggestions()  != null) answer.setAiSuggestions(String.join("||", request.getSuggestions()));
            answer.setFeedbackSavedAt(LocalDateTime.now());
            log.info("[AnswerService] saveAnalysis — AI feedback saved for questionId={} grammar={} clarity={} completeness={} relevance={}",
                    questionId, request.getGrammarScore(), request.getClarityScore(),
                    request.getCompletenessScore(), request.getRelevanceScore());
        }

        // ── Plagiarism fields ─────────────────────────────────────────────────
        boolean hasPlagiarism = request.getSimilarityScore() != null
                || request.getPlagiarismSeverity() != null;

        if (hasPlagiarism) {
            if (request.getSimilarityScore()   != null) answer.setSimilarityScore(request.getSimilarityScore());
            if (request.getPlagiarismSeverity() != null) answer.setPlagiarismSeverity(request.getPlagiarismSeverity());
            if (request.getPlagiarismFlagged()  != null) answer.setPlagiarismFlagged(request.getPlagiarismFlagged());
            if (request.getPlagiarismSources()  != null) answer.setPlagiarismSources(request.getPlagiarismSources());
            answer.setPlagiarismCheckedAt(LocalDateTime.now());
            log.info("[AnswerService] saveAnalysis — plagiarism saved for questionId={} score={} severity={} flagged={}",
                    questionId, request.getSimilarityScore(), request.getPlagiarismSeverity(), request.getPlagiarismFlagged());
        }

        // ── AI earned mark ────────────────────────────────────────────────────
        if (request.getAiGeneratedMark() != null) {
            answer.setAiGeneratedMark(request.getAiGeneratedMark());
            log.info("[AnswerService] saveAnalysis — aiGeneratedMark={} saved for questionId={}", request.getAiGeneratedMark(), questionId);
        }

        // ── Lecturer per-question marks ───────────────────────────────────────
        if (request.getLecturerMark() != null) {
            answer.setLecturerMark(request.getLecturerMark());
            log.info("[AnswerService] saveAnalysis — lecturer mark={} saved for questionId={}", request.getLecturerMark(), questionId);
        }
        if (request.getLecturerFeedbackText() != null) {
            answer.setLecturerFeedbackText(request.getLecturerFeedbackText());
        }

        Answer saved = answerRepository.save(answer);
        log.info("[AnswerService] saveAnalysis DONE — answerId={} questionId={}", saved.getId(), questionId);
        return ApiResponse.success("Analysis saved", toResponse(saved));
    }

    /**
     * Retrieve all peer answers for a given question, excluding all answers that
     * belong to the student currently being checked (by studentId OR submissionId).
     *
     * Filtering by studentId ensures that ALL of a student's submission versions
     * (e.g. draft v1, draft v2, final) are excluded — not just the one active session.
     * The submissionId fallback handles rows saved before studentId was captured.
     *
     * Used exclusively by the integrity-monitoring-service for peer-comparison
     * plagiarism detection — not exposed to frontend clients.
     *
     * @param questionId          ID of the question to look up
     * @param excludeStudentId    Student to exclude (all their answers removed), or null
     * @param excludeSubmissionId Fallback: specific submission to exclude, or null
     * @return ApiResponse containing the list of peer AnswerResponse DTOs
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<AnswerResponse>> getAnswersByQuestion(String questionId,
                                                                   String excludeStudentId,
                                                                   String excludeSubmissionId) {
        log.info("[AnswerService] getAnswersByQuestion — questionId={} excludeStudentId={} excludeSubmissionId={}",
                questionId, excludeStudentId, excludeSubmissionId);

        // Cap at 200 most-recent peer answers — enough for meaningful plagiarism
        // comparison without loading the full table as student count grows.
        final int PEER_COMPARISON_LIMIT = 200;
        List<Answer> answers = answerRepository.findByQuestionId(
                questionId, PageRequest.of(0, PEER_COMPARISON_LIMIT));

        List<AnswerResponse> responses = answers.stream()
                .filter(a -> {
                    // Exclude answers that definitely belong to the same student.
                    if (excludeStudentId != null && excludeStudentId.equals(a.getStudentId())) return false;
                    // Exclude answers from the same submission (catches the exact submission being checked).
                    if (excludeSubmissionId != null && excludeSubmissionId.equals(a.getSubmissionId())) return false;
                    // Exclude old rows where studentId was never stored when a student context is
                    // available: we cannot confirm these rows belong to a different student, so
                    // including them risks false plagiarism positives against the same student's
                    // earlier drafts that happened to have a different submissionId.
                    if (a.getStudentId() == null && excludeStudentId != null) return false;
                    return true;
                })
                .map(this::toResponse)
                .collect(Collectors.toList());

        log.info("[AnswerService] getAnswersByQuestion DONE — returning {} peer answers for questionId={}",
                responses.size(), questionId);
        return ApiResponse.success(responses);
    }

    // ── Mapping helper ──────────────────────────────────────────────────────────

    private AnswerResponse toResponse(Answer a) {
        return AnswerResponse.builder()
                .id(a.getId())
                .submissionId(a.getSubmissionId())
                .questionId(a.getQuestionId())
                .questionText(a.getQuestionText())
                .answerText(a.getAnswerText())
                .wordCount(a.getWordCount())
                .characterCount(a.getCharacterCount())
                .lastModified(a.getLastModified() != null ? a.getLastModified().toString() : null)
                .createdAt(a.getCreatedAt() != null ? a.getCreatedAt().toString() : null)
                // AI feedback
                .grammarScore(a.getGrammarScore())
                .clarityScore(a.getClarityScore())
                .completenessScore(a.getCompletenessScore())
                .relevanceScore(a.getRelevanceScore())
                .strengths(splitPipe(a.getAiStrengths()))
                .improvements(splitPipe(a.getAiImprovements()))
                .suggestions(splitPipe(a.getAiSuggestions()))
                .feedbackSavedAt(a.getFeedbackSavedAt() != null ? a.getFeedbackSavedAt().toString() : null)
                // Plagiarism
                .similarityScore(a.getSimilarityScore())
                .plagiarismSeverity(a.getPlagiarismSeverity())
                .plagiarismFlagged(a.getPlagiarismFlagged())
                .plagiarismCheckedAt(a.getPlagiarismCheckedAt() != null ? a.getPlagiarismCheckedAt().toString() : null)
                .plagiarismSources(a.getPlagiarismSources())
                // Lecturer per-question grading (post-deadline overrides)
                .maxPoints(a.getMaxPoints())
                .aiGeneratedMark(a.getAiGeneratedMark())
                .lecturerMark(a.getLecturerMark())
                .lecturerFeedbackText(a.getLecturerFeedbackText())
                .lecturerUpdatedAt(a.getLecturerUpdatedAt() != null ? a.getLecturerUpdatedAt().toString() : null)
                .lecturerUpdatedBy(a.getLecturerUpdatedBy())
                .build();
    }

    private List<String> splitPipe(String value) {
        return AnswerScoreUtils.splitPipe(value);
    }

    /**
     * Count words in a plain-text string by splitting on whitespace.
     * Returns 0 for null or blank input.
     */
    static int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }
}
