package com.smartlms.submission_management_service.service;

import com.smartlms.submission_management_service.dto.request.SaveAnswerRequest;
import com.smartlms.submission_management_service.dto.response.AnswerResponse;
import com.smartlms.submission_management_service.dto.response.ApiResponse;
import com.smartlms.submission_management_service.model.Answer;
import com.smartlms.submission_management_service.repository.AnswerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
     * @param submissionId  ID of the parent submission (as a string)
     * @param questionId    ID of the question being answered
     * @param request       Payload containing the answer text + metadata
     * @return ApiResponse containing the saved AnswerResponse
     */
    @Transactional
    public ApiResponse<AnswerResponse> saveAnswer(String submissionId,
                                                   String questionId,
                                                   SaveAnswerRequest request) {
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

        // Update mutable fields regardless of whether this is an INSERT or UPDATE
        answer.setQuestionText(request.getQuestionText());
        answer.setAnswerText(request.getAnswerText());
        answer.setWordCount(request.getWordCount());
        answer.setCharacterCount(request.getCharacterCount());

        Answer saved = answerRepository.save(answer);
        log.info("[AnswerService] saveAnswer DONE — answerId={} submissionId={} questionId={} wordCount={}",
                saved.getId(), submissionId, questionId, saved.getWordCount());

        return ApiResponse.success("Answer saved", toResponse(saved));
    }

    /**
     * Retrieve all answers for a submission, in question-ID order.
     *
     * @param submissionId  ID of the submission whose answers to retrieve
     * @return ApiResponse containing the list of AnswerResponse DTOs
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<AnswerResponse>> getAnswers(String submissionId) {
        log.info("[AnswerService] getAnswers — submissionId={}", submissionId);

        List<Answer> answers = answerRepository.findBySubmissionIdOrderByQuestionId(submissionId);
        List<AnswerResponse> responses = answers.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        log.info("[AnswerService] getAnswers DONE — returning {} answers for submissionId={}",
                responses.size(), submissionId);
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
                .build();
    }
}
