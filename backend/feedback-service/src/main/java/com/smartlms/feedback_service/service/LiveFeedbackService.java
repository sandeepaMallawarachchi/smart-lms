package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.LiveFeedbackResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for generating lightweight, real-time AI feedback as a student types.
 *
 * Unlike FeedbackService (which performs deep analysis and persists results),
 * this service:
 *  - Uses a shorter, faster prompt optimised for real-time latency
 *  - Does NOT persist feedback to the database
 *  - Returns a LiveFeedbackResponse immediately (synchronous)
 *  - Falls back to a sensible default response if the AI call fails
 *
 * Called by POST /api/feedback/live, which is invoked by the frontend
 * ~3 seconds after the student stops typing in a question editor.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveFeedbackService {

    private final HuggingFaceService huggingFaceService;

    /**
     * Generate real-time feedback for a student's in-progress text answer.
     *
     * @param request Contains questionId, answerText, questionPrompt, expectedWordCount
     * @return ApiResponse wrapping a LiveFeedbackResponse with scores and suggestions
     */
    public ApiResponse<LiveFeedbackResponse> generateLiveFeedback(LiveFeedbackRequest request) {
        log.info("Generating live feedback for questionId={} textLength={}",
                request.getQuestionId(), request.getAnswerText().length());

        try {
            String prompt = buildPrompt(request);
            String rawResponse = huggingFaceService.generateCompletion(prompt);
            log.debug("Raw live feedback response (first 500 chars): {}",
                    rawResponse.substring(0, Math.min(500, rawResponse.length())));

            LiveFeedbackResponse feedback = parseResponse(rawResponse, request.getQuestionId());
            log.info("Live feedback generated for questionId={} grammar={} clarity={}",
                    request.getQuestionId(), feedback.getGrammarScore(), feedback.getClarityScore());

            return ApiResponse.success("Live feedback generated", feedback);

        } catch (Exception e) {
            log.warn("Live feedback AI call failed for questionId={}: {} — returning fallback",
                    request.getQuestionId(), e.getMessage());
            return ApiResponse.success("Feedback generated (fallback)", buildFallback(request));
        }
    }

    // ── Prompt construction ───────────────────────────────────────────────────

    /**
     * Build a concise prompt that instructs the LLM to score and comment on
     * the student's answer. Kept deliberately short to reduce latency.
     */
    private String buildPrompt(LiveFeedbackRequest request) {
        int wordCount = request.getAnswerText().trim().split("\\s+").length;
        String completenessHint = request.getExpectedWordCount() != null
                ? " The expected length is " + request.getExpectedWordCount() + " words; current is " + wordCount + " words."
                : "";

        String questionContext = (request.getQuestionPrompt() != null && !request.getQuestionPrompt().isBlank())
                ? "Question: " + request.getQuestionPrompt() + "\n"
                : "";

        return "[INST] You are a helpful academic writing assistant. Analyze this student answer briefly.\n"
                + questionContext
                + "Student Answer: " + request.getAnswerText() + "\n"
                + completenessHint + "\n\n"
                + "Respond ONLY in this exact format (no extra text):\n"
                + "GRAMMAR: <score 0-10>\n"
                + "CLARITY: <score 0-10>\n"
                + "COMPLETENESS: <score 0-10>\n"
                + "RELEVANCE: <score 0-10>\n"
                + "STRENGTH1: <one strength>\n"
                + "STRENGTH2: <one strength>\n"
                + "IMPROVEMENT1: <one area to improve>\n"
                + "IMPROVEMENT2: <one area to improve>\n"
                + "SUGGESTION1: <one specific suggestion>\n"
                + "SUGGESTION2: <one specific suggestion>\n"
                + "[/INST]";
    }

    // ── Response parsing ──────────────────────────────────────────────────────

    /**
     * Parse the LLM output into a LiveFeedbackResponse.
     * Uses line-by-line key extraction with regex for the numeric scores.
     * Falls back to default values for any field that cannot be parsed.
     */
    private LiveFeedbackResponse parseResponse(String raw, String questionId) {
        // Remove [INST]...[/INST] wrapper if the model echoed it
        String text = raw.replaceAll("(?s)\\[INST\\].*?\\[/INST\\]", "").trim();

        double grammar       = extractScore(text, "GRAMMAR");
        double clarity       = extractScore(text, "CLARITY");
        double completeness  = extractScore(text, "COMPLETENESS");
        double relevance     = extractScore(text, "RELEVANCE");

        List<String> strengths    = extractLines(text, "STRENGTH");
        List<String> improvements = extractLines(text, "IMPROVEMENT");
        List<String> suggestions  = extractLines(text, "SUGGESTION");

        // Ensure lists are non-empty (fallback single item if parsing fails)
        if (strengths.isEmpty())    strengths    = List.of("Answer addresses the question topic.");
        if (improvements.isEmpty()) improvements = List.of("Consider expanding on key points.");
        if (suggestions.isEmpty())  suggestions  = List.of("Review for grammar and clarity.");

        return LiveFeedbackResponse.builder()
                .questionId(questionId)
                .grammarScore(grammar)
                .clarityScore(clarity)
                .completenessScore(completeness)
                .relevanceScore(relevance)
                .strengths(strengths)
                .improvements(improvements)
                .suggestions(suggestions)
                .generatedAt(LocalDateTime.now().toString())
                .build();
    }

    /** Extract a 0-10 score from a line prefixed with the given key. */
    private double extractScore(String text, String key) {
        Pattern p = Pattern.compile(key + ":\\s*([0-9](?:\\.[0-9])?|10)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                double val = Double.parseDouble(m.group(1));
                return Math.min(10.0, Math.max(0.0, val));
            } catch (NumberFormatException ignored) { }
        }
        return 6.0; // neutral fallback
    }

    /** Extract numbered list items for a given prefix (e.g. STRENGTH1, STRENGTH2). */
    private List<String> extractLines(String text, String prefix) {
        List<String> results = new ArrayList<>();
        Pattern p = Pattern.compile(prefix + "\\d+:\\s*(.+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        while (m.find()) {
            String value = m.group(1).trim();
            if (!value.isBlank()) {
                results.add(value);
            }
        }
        return results;
    }

    // ── Fallback ──────────────────────────────────────────────────────────────

    /**
     * Sensible default returned when the AI call fails or times out.
     * Scores are moderate (6/10) so the UI renders without alarming the student.
     */
    private LiveFeedbackResponse buildFallback(LiveFeedbackRequest request) {
        int wordCount = request.getAnswerText().trim().split("\\s+").length;
        int expected = request.getExpectedWordCount() != null ? request.getExpectedWordCount() : 200;
        double completeness = Math.min(10.0, (wordCount / (double) expected) * 10.0);

        return LiveFeedbackResponse.builder()
                .questionId(request.getQuestionId())
                .grammarScore(6.0)
                .clarityScore(6.0)
                .completenessScore(Math.round(completeness * 10.0) / 10.0)
                .relevanceScore(6.0)
                .strengths(List.of("You have started answering the question.", "Your answer shows engagement with the topic."))
                .improvements(List.of("Consider expanding your answer with more detail.", "Review for grammar and spelling."))
                .suggestions(List.of("Add specific examples to support your points.", "Ensure your answer directly addresses all parts of the question."))
                .generatedAt(LocalDateTime.now().toString())
                .build();
    }
}
