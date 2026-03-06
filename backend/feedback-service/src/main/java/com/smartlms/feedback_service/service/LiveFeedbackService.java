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

        // Pre-validate: detect gibberish before calling the AI
        if (isGibberish(request.getAnswerText())) {
            log.info("Gibberish detected for questionId={} — returning zero scores", request.getQuestionId());
            return ApiResponse.success("Gibberish detected", buildGibberishResponse(request.getQuestionId()));
        }

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
            log.warn("Live feedback AI call failed for questionId={}: {}", request.getQuestionId(), e.getMessage());
            throw new RuntimeException("AI feedback service unavailable", e);
        }
    }

    // ── Gibberish detection ───────────────────────────────────────────────────

    /**
     * Heuristic gibberish detector.
     * A word is flagged as gibberish if it has no vowels OR has 5+ consecutive consonants.
     * If more than 40 % of words are gibberish, the whole text is classified as gibberish.
     */
    private boolean isGibberish(String text) {
        if (text == null || text.isBlank()) return true;
        String[] words = text.trim().split("\\s+");
        if (words.length == 0) return true;

        int gibberishCount = 0;
        for (String word : words) {
            String cleaned = word.toLowerCase().replaceAll("[^a-z]", "");
            if (cleaned.isEmpty()) continue;
            boolean hasVowel = cleaned.matches(".*[aeiou].*");
            boolean hasLongConsonantCluster = cleaned.matches(".*[^aeiou]{5,}.*");
            if (!hasVowel || hasLongConsonantCluster) gibberishCount++;
        }

        double gibberishRatio = (double) gibberishCount / words.length;
        int pct = (int) Math.round(gibberishRatio * 100);
        boolean isGibberish = gibberishRatio > 0.40;
        log.info("[LiveFeedback] Gibberish check: {}/{} words flagged ({}%) — result={}",
                gibberishCount, words.length, pct, isGibberish ? "GIBBERISH" : "OK");
        return isGibberish;
    }

    /** Zero-score response returned when gibberish text is detected. */
    private LiveFeedbackResponse buildGibberishResponse(String questionId) {
        return LiveFeedbackResponse.builder()
                .questionId(questionId)
                .grammarScore(0.0)
                .clarityScore(0.0)
                .completenessScore(0.0)
                .relevanceScore(0.0)
                .strengths(List.of("None detected — no meaningful content found."))
                .improvements(List.of(
                        "Your response appears to contain random text or gibberish.",
                        "Write in complete sentences using proper English words."))
                .suggestions(List.of(
                        "Re-read the question carefully and write a meaningful answer.",
                        "Use real words and explain your understanding of the topic."))
                .generatedAt(LocalDateTime.now().toString())
                .build();
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

        return "You are a strict academic writing evaluator. Analyze this student answer CRITICALLY and HONESTLY.\n"
                + "IMPORTANT RULES:\n"
                + "- If the answer contains gibberish, random letters, or no real words: ALL scores must be 0.\n"
                + "- If the answer does not address the question at all: RELEVANCE must be 0.\n"
                + "- If grammar is very poor or text is incoherent: GRAMMAR must be 0-2.\n"
                + "- Only give scores above 5 if the answer genuinely demonstrates understanding.\n"
                + "- Be strict. A poor answer should receive low scores.\n\n"
                + questionContext
                + "Student Answer: " + request.getAnswerText() + "\n"
                + completenessHint + "\n\n"
                + "Respond ONLY in this exact format (no extra text):\n"
                + "GRAMMAR: <score 0-10>\n"
                + "CLARITY: <score 0-10>\n"
                + "COMPLETENESS: <score 0-10>\n"
                + "RELEVANCE: <score 0-10>\n"
                + "STRENGTH1: <one genuine strength, or 'None detected' if the answer is poor>\n"
                + "STRENGTH2: <one genuine strength, or 'None detected' if the answer is poor>\n"
                + "IMPROVEMENT1: <one specific area to improve>\n"
                + "IMPROVEMENT2: <one specific area to improve>\n"
                + "SUGGESTION1: <one actionable suggestion>\n"
                + "SUGGESTION2: <one actionable suggestion>";
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
        log.debug("[LiveFeedback] Parsing response for questionId={} | cleanedLen={}",
                questionId, text.length());

        double grammar       = extractScore(text, "GRAMMAR");
        double clarity       = extractScore(text, "CLARITY");
        double completeness  = extractScore(text, "COMPLETENESS");
        double relevance     = extractScore(text, "RELEVANCE");

        log.info("[LiveFeedback] Parsed scores for questionId={} | grammar={} clarity={} completeness={} relevance={}",
                questionId, grammar, clarity, completeness, relevance);

        List<String> strengths    = extractLines(text, "STRENGTH");
        List<String> improvements = extractLines(text, "IMPROVEMENT");
        List<String> suggestions  = extractLines(text, "SUGGESTION");

        // Ensure lists are non-empty (fallback single item if parsing fails)
        if (strengths.isEmpty()) {
            log.warn("[LiveFeedback] No STRENGTH lines parsed from response");
            strengths = List.of("Answer addresses the question topic.");
        }
        if (improvements.isEmpty()) {
            log.warn("[LiveFeedback] No IMPROVEMENT lines parsed from response");
            improvements = List.of("Consider expanding on key points.");
        }
        if (suggestions.isEmpty()) {
            log.warn("[LiveFeedback] No SUGGESTION lines parsed from response");
            suggestions = List.of("Review for grammar and clarity.");
        }

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
        return 0.0; // unknown — do not assume positive score
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
     * Returned when the AI call fails or times out.
     * Only completeness (word count ratio) is estimated; all other scores are 0
     * so the student does not receive misleading positive feedback.
     */
    private LiveFeedbackResponse buildFallback(LiveFeedbackRequest request) {
        int wordCount = request.getAnswerText().trim().split("\\s+").length;
        int expected = request.getExpectedWordCount() != null ? request.getExpectedWordCount() : 200;
        double completeness = Math.min(10.0, (wordCount / (double) expected) * 10.0);

        return LiveFeedbackResponse.builder()
                .questionId(request.getQuestionId())
                .grammarScore(0.0)
                .clarityScore(0.0)
                .completenessScore(Math.round(completeness * 10.0) / 10.0)
                .relevanceScore(0.0)
                .strengths(List.of("AI analysis temporarily unavailable — scores are not available right now."))
                .improvements(List.of("Continue writing; analysis will retry automatically.", "Ensure your answer addresses the question directly."))
                .suggestions(List.of("Review your answer for grammar and clarity.", "Add specific details and examples to strengthen your response."))
                .generatedAt(LocalDateTime.now().toString())
                .build();
    }
}
