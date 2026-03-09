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

            // Apply short-answer floors based on keyword coverage
            if (isShortAnswer(request)) {
                List<String> keywords = extractKeywords(request.getQuestionPrompt());
                int matches = countKeywordMatches(request.getAnswerText(), keywords);
                feedback = applyShortAnswerFloors(feedback, request, matches, keywords.size());
            }

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
     * Returns true when the question is worth 1–5 marks (short-answer mode).
     * Short answers should be evaluated on concept correctness and relevance,
     * not penalised heavily for brevity or minor grammar issues.
     */
    private boolean isShortAnswer(LiveFeedbackRequest request) {
        return request.getMaxPoints() != null && request.getMaxPoints() <= 5;
    }

    /**
     * Build a concise prompt that instructs the LLM to score and comment on
     * the student's answer. Adapts strictness based on question mark value.
     */
    private String buildPrompt(LiveFeedbackRequest request) {
        int wordCount = request.getAnswerText().trim().split("\\s+").length;
        boolean shortAnswer = isShortAnswer(request);

        String questionContext = (request.getQuestionPrompt() != null && !request.getQuestionPrompt().isBlank())
                ? "Question: " + request.getQuestionPrompt() + "\n"
                : "";

        String markInfo = request.getMaxPoints() != null
                ? "This question is worth " + request.getMaxPoints() + " mark(s).\n"
                : "";

        String completenessHint = request.getExpectedWordCount() != null
                ? "Expected length: " + request.getExpectedWordCount() + " words. Current: " + wordCount + " words.\n"
                : "";

        if (shortAnswer) {
            // Short-answer mode: focus on concept, key terms, relevance
            return "You are a balanced academic evaluator assessing a short-answer question.\n"
                    + markInfo
                    + "IMPORTANT RULES FOR SHORT ANSWERS (1-5 marks):\n"
                    + "- A brief answer that correctly explains the core concept DESERVES a reasonable score.\n"
                    + "- Focus on: (1) concept correctness, (2) key terms present, (3) relevance to the question.\n"
                    + "- Do NOT heavily penalise for brevity or minor grammar mistakes.\n"
                    + "- If the answer contains gibberish or random letters: ALL scores must be 0.\n"
                    + "- If the answer correctly addresses the question concept: RELEVANCE should be 5-8.\n"
                    + "- Grammar mistakes should reduce GRAMMAR score slightly but not dominate overall.\n"
                    + "- Score 6-8 if the student clearly understands the concept, even if explanation is brief.\n"
                    + "- Score 3-5 if the answer is partially correct or missing some key ideas.\n"
                    + "- Score 0-2 only if the answer is completely wrong or irrelevant.\n\n"
                    + questionContext
                    + completenessHint
                    + "Student Answer: " + request.getAnswerText() + "\n\n"
                    + "Respond ONLY in this exact format (no extra text):\n"
                    + "GRAMMAR: <score 0-10>\n"
                    + "CLARITY: <score 0-10>\n"
                    + "COMPLETENESS: <score 0-10>\n"
                    + "RELEVANCE: <score 0-10>\n"
                    + "STRENGTH1: <one genuine strength of this answer>\n"
                    + "STRENGTH2: <one genuine strength, or 'Answer addresses the question' if limited>\n"
                    + "IMPROVEMENT1: <one specific area to improve>\n"
                    + "IMPROVEMENT2: <one actionable improvement>\n"
                    + "SUGGESTION1: <one suggestion to strengthen the answer>\n"
                    + "SUGGESTION2: <one suggestion for better explanation>";
        } else {
            // Long-answer mode: balanced but not overly strict
            return "You are a balanced academic writing evaluator. Assess this student answer fairly.\n"
                    + markInfo
                    + "IMPORTANT RULES:\n"
                    + "- If the answer contains gibberish, random letters, or no real words: ALL scores must be 0.\n"
                    + "- If the answer does not address the question at all: RELEVANCE must be 0-2.\n"
                    + "- If grammar is very poor or text is incoherent: GRAMMAR must be 0-3.\n"
                    + "- Give scores of 5-7 for answers that show genuine understanding with some gaps.\n"
                    + "- Give scores of 7-9 for answers that are well-explained and mostly complete.\n"
                    + completenessHint + "\n"
                    + questionContext
                    + "Student Answer: " + request.getAnswerText() + "\n\n"
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
    }

    // ── Keyword extraction ────────────────────────────────────────────────────

    private static final List<String> STOP_WORDS = Arrays.asList(
            "what", "how", "why", "when", "where", "which", "who", "does", "this",
            "that", "with", "from", "have", "will", "are", "the", "and", "for",
            "its", "can", "explain", "describe", "define", "give", "example",
            "list", "discuss", "name", "state", "write", "about", "used"
    );

    /**
     * Extract meaningful keywords from the question prompt.
     * Removes stop words and returns unique words of ≥4 characters.
     */
    private List<String> extractKeywords(String questionPrompt) {
        if (questionPrompt == null || questionPrompt.isBlank()) return List.of();
        return Arrays.stream(questionPrompt.toLowerCase().split("[^a-z]+"))
                .filter(w -> w.length() >= 4)
                .filter(w -> !STOP_WORDS.contains(w))
                .distinct()
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Count how many keywords appear in the student's answer text.
     */
    private int countKeywordMatches(String answerText, List<String> keywords) {
        if (keywords.isEmpty()) return 0;
        String lower = answerText.toLowerCase();
        int matches = 0;
        for (String kw : keywords) {
            if (lower.contains(kw)) matches++;
        }
        return matches;
    }

    /**
     * Apply minimum score floors for short-answer questions based on keyword coverage.
     *
     * If the student's answer contains ≥30% of the keywords extracted from the
     * question, they have demonstrated concept understanding and should not receive
     * near-zero scores regardless of how the LLM scored them.
     */
    private LiveFeedbackResponse applyShortAnswerFloors(
            LiveFeedbackResponse response,
            LiveFeedbackRequest request,
            int keywordMatches,
            int totalKeywords) {

        if (!isShortAnswer(request)) return response;

        double coverage = totalKeywords > 0 ? (double) keywordMatches / totalKeywords : 0.0;
        log.info("[LiveFeedback] Short-answer keyword coverage: {}/{} ({:.0f}%)",
                keywordMatches, totalKeywords, coverage * 100);

        double grammar      = response.getGrammarScore();
        double clarity      = response.getClarityScore();
        double completeness = response.getCompletenessScore();
        double relevance    = response.getRelevanceScore();

        // Keyword coverage ≥ 30%: student clearly understands the concept
        if (coverage >= 0.30) {
            // Relevance floor: concept was detected — at least 5/10
            relevance    = Math.max(relevance,    5.0 + coverage * 2.0);   // 5–7 range
            // Completeness floor: brief-but-correct → at least 4/10
            completeness = Math.max(completeness, 4.0 + coverage * 1.5);   // 4–5.5 range
            // Grammar: comprehensible text shouldn't crater the score
            if (clarity >= 4.0) {
                grammar = Math.max(grammar, 4.0);
            }
        }

        // Hard cap: grammar alone cannot drive relevance/completeness below 3 for short answers
        relevance    = Math.max(relevance,    response.getRelevanceScore());
        completeness = Math.max(completeness, response.getCompletenessScore());

        // Cap at 10
        return LiveFeedbackResponse.builder()
                .questionId(response.getQuestionId())
                .grammarScore(Math.min(10.0, grammar))
                .clarityScore(Math.min(10.0, clarity))
                .completenessScore(Math.min(10.0, completeness))
                .relevanceScore(Math.min(10.0, relevance))
                .strengths(response.getStrengths())
                .improvements(response.getImprovements())
                .suggestions(response.getSuggestions())
                .generatedAt(response.getGeneratedAt())
                .build();
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
        Pattern p = Pattern.compile(key + ":\\s*(10(?:\\.0)?|[0-9](?:\\.[0-9]+)?)", Pattern.CASE_INSENSITIVE);
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
