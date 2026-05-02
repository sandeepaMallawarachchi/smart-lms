package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.LiveFeedbackResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import org.springframework.scheduling.annotation.Async;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for generating lightweight, real-time AI feedback as a student types.
 *
 * Scoring principles enforced:
 *  - A correct, direct short answer MUST receive meaningful marks (≥5/10 relevance).
 *  - Strengths and scores must be consistent: positive language → non-zero scores.
 *  - Concept correctness (relevance + completeness) outweighs grammar for all answers.
 *  - Answers that merely repeat the question text without adding information are penalised.
 *  - Blank / gibberish text always scores 0.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveFeedbackService {

    private final HuggingFaceService huggingFaceService;

    // ─── Positive-signal words used to detect LLM inconsistency ─────────────
    private static final List<String> POSITIVE_SIGNAL_WORDS = Arrays.asList(
            "correct", "accurate", "relevant", "identifies", "addresses",
            "demonstrates", "applies", "understands", "shows", "explains",
            "provides", "answers", "appropriate", "good", "well", "clear",
            "direct", "concise", "precise", "valid", "proper", "reasonable"
    );

    private static final List<String> STOP_WORDS = Arrays.asList(
            "what", "how", "why", "when", "where", "which", "who", "does", "this",
            "that", "with", "from", "have", "will", "are", "the", "and", "for",
            "its", "can", "explain", "describe", "define", "give", "example",
            "list", "discuss", "name", "state", "write", "about", "used",
            "type", "kind", "form", "means", "refer", "answer", "question"
    );

    // ─── Public entry point ───────────────────────────────────────────────────

    @Async("feedbackTaskExecutor")
    public CompletableFuture<ApiResponse<LiveFeedbackResponse>> generateLiveFeedback(LiveFeedbackRequest request) {
        log.info("Generating live feedback for questionId={} textLength={}",
                request.getQuestionId(), request.getAnswerText().length());

        if (isGibberish(request.getAnswerText())) {
            log.info("Gibberish detected for questionId={} — returning zero scores", request.getQuestionId());
            return CompletableFuture.completedFuture(
                    ApiResponse.success("Gibberish detected", buildGibberishResponse(request.getQuestionId())));
        }

        try {
            String prompt      = buildPrompt(request);
            String rawResponse = huggingFaceService.generateCompletion(prompt);
            log.debug("Raw AI response (first 500 chars): {}",
                    rawResponse.substring(0, Math.min(500, rawResponse.length())));

            LiveFeedbackResponse feedback = parseResponse(rawResponse, request.getQuestionId());
            feedback = enforceConsistency(feedback, request);

            log.info("Live feedback done questionId={} grammar={} clarity={} completeness={} relevance={}",
                    request.getQuestionId(),
                    feedback.getGrammarScore(), feedback.getClarityScore(),
                    feedback.getCompletenessScore(), feedback.getRelevanceScore());

            return CompletableFuture.completedFuture(ApiResponse.success("Live feedback generated", feedback));

        } catch (Exception e) {
            log.warn("Live feedback AI call failed for questionId={}: {}", request.getQuestionId(), e.getMessage());
            CompletableFuture<ApiResponse<LiveFeedbackResponse>> failed = new CompletableFuture<>();
            failed.completeExceptionally(new RuntimeException("AI feedback service unavailable", e));
            return failed;
        }
    }

    // ─── Gibberish detection ─────────────────────────────────────────────────

    private boolean isGibberish(String text) {
        return computeGibberishRatio(text) >= 0.35;
    }

    /**
     * Returns the fraction of tokens that look like gibberish.
     * Used both by the main gate (isGibberish) and enforceConsistency
     * to suppress score-boosting for borderline suspicious answers.
     */
    private double computeGibberishRatio(String text) {
        if (text == null || text.isBlank()) return 1.0;
        String[] words = text.trim().split("\\s+");
        if (words.length == 0) return 1.0;

        int gibberishCount = 0;
        for (String word : words) {
            if (isGibberishWord(word)) gibberishCount++;
        }

        double ratio = (double) gibberishCount / words.length;
        log.info("[LiveFeedback] Gibberish check: {}/{} words flagged ({}%) — {}",
                gibberishCount, words.length, String.format("%.0f", ratio * 100),
                ratio >= 0.35 ? "GIBBERISH" : "OK");
        return ratio;
    }

    private boolean isGibberishWord(String word) {
        // Mixed letters + digits signals keyboard-mashing (j4h, krlji3ur3, e8wqueh, 0-09e8u)
        boolean hasLetter = word.matches(".*[a-zA-Z].*");
        boolean hasDigit  = word.matches(".*[0-9].*");
        if (hasLetter && hasDigit) return true;

        String cleaned = word.toLowerCase().replaceAll("[^a-z]", "");
        if (cleaned.isEmpty()) return false; // pure numbers/symbols — may be legit (e.g. "100%")

        // Single-character tokens: only 'a' and 'i' are valid English words
        if (cleaned.length() == 1) return !cleaned.equals("a") && !cleaned.equals("i");

        // No vowel at all
        if (!cleaned.matches(".*[aeiou].*")) return true;

        // Consonant run ≥ 4 (reduced from 5 — catches "krlj", "rthrt", etc.)
        return cleaned.matches(".*[^aeiou]{4,}.*");
    }

    private LiveFeedbackResponse buildGibberishResponse(String questionId) {
        return LiveFeedbackResponse.builder()
                .questionId(questionId)
                .grammarScore(0.0).clarityScore(0.0)
                .completenessScore(0.0).relevanceScore(0.0)
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

    // ─── Prompt construction ─────────────────────────────────────────────────

    /** Short-answer: ≤ 5 marks OR answer is ≤ 40 words. */
    private boolean isShortAnswer(LiveFeedbackRequest request) {
        int wordCount = request.getAnswerText().trim().split("\\s+").length;
        boolean byMarks = request.getMaxPoints() != null && request.getMaxPoints() <= 5;
        boolean byWords = wordCount <= 40;
        return byMarks || byWords;
    }

    private String buildPrompt(LiveFeedbackRequest request) {
        int wordCount = request.getAnswerText().trim().split("\\s+").length;
        boolean shortAnswer = isShortAnswer(request);

        String questionContext = (request.getQuestionPrompt() != null && !request.getQuestionPrompt().isBlank())
                ? "Question: " + request.getQuestionPrompt() + "\n"
                : "";

        String markInfo = request.getMaxPoints() != null
                ? "This question is worth " + request.getMaxPoints() + " mark(s).\n"
                : "";

        String lengthInfo = "Answer length: " + wordCount + " word(s).\n";

        if (shortAnswer) {
            return "You are a fair academic evaluator scoring a short-answer question.\n"
                    + markInfo
                    + lengthInfo
                    + "\n"
                    + "=== MANDATORY SCORING RULES ===\n"
                    + "1. CONSISTENCY: Your numeric scores MUST match your qualitative comments.\n"
                    + "   - If you write any STRENGTH that says the answer is correct, accurate, identifies\n"
                    + "     the right concept, or directly answers the question, then RELEVANCE must be >= 5\n"
                    + "     and COMPLETENESS must be >= 4. This rule is ABSOLUTE.\n"
                    + "2. SHORT-ANSWER GRADING: A one-sentence correct answer deserves full credit.\n"
                    + "   - Correct + direct + relevant = RELEVANCE 7-9, COMPLETENESS 6-8.\n"
                    + "   - Partially correct or missing detail = RELEVANCE 4-6, COMPLETENESS 3-5.\n"
                    + "   - Wrong or irrelevant = RELEVANCE 0-2, COMPLETENESS 0-2.\n"
                    + "   - NEVER give RELEVANCE 0 if the answer addresses the question topic.\n"
                    + "3. GRAMMAR: For short answers, minor grammar issues are acceptable.\n"
                    + "   - Do NOT let grammar dominate; a correct answer with poor grammar still scores well.\n"
                    + "   - Perfect grammar on a wrong answer should still give RELEVANCE 0-2.\n"
                    + "4. REPETITION: If the answer just repeats words from the question without explanation,\n"
                    + "   COMPLETENESS must be 0-3 (no new information provided).\n"
                    + "5. BLANK/GIBBERISH: ALL scores must be 0. Do not write this for meaningful answers.\n"
                    + "\n"
                    + questionContext
                    + "Student Answer: " + request.getAnswerText() + "\n\n"
                    + "Respond ONLY in this exact format (no extra text, no explanations):\n"
                    + "GRAMMAR: <integer 0-10>\n"
                    + "CLARITY: <integer 0-10>\n"
                    + "COMPLETENESS: <integer 0-10>\n"
                    + "RELEVANCE: <integer 0-10>\n"
                    + "STRENGTH1: <one specific strength of this answer, referencing the content>\n"
                    + "STRENGTH2: <one more strength, or 'Addresses the question directly' if limited>\n"
                    + "IMPROVEMENT1: <one specific improvement>\n"
                    + "IMPROVEMENT2: <one actionable improvement>\n"
                    + "SUGGESTION1: <one suggestion to strengthen the answer>\n"
                    + "SUGGESTION2: <one suggestion for better explanation>";
        } else {
            String completenessHint = request.getExpectedWordCount() != null
                    ? "Expected length: " + request.getExpectedWordCount() + " words. Current: " + wordCount + " words.\n"
                    : "";
            return "You are a fair academic evaluator scoring a long-answer question.\n"
                    + markInfo
                    + lengthInfo
                    + completenessHint
                    + "\n"
                    + "=== MANDATORY SCORING RULES ===\n"
                    + "1. CONSISTENCY: Your numeric scores MUST match your qualitative comments.\n"
                    + "   - If any STRENGTH says the answer is correct or relevant, RELEVANCE >= 5.\n"
                    + "   - If the answer is completely off-topic: RELEVANCE 0-2 and strengths must reflect this.\n"
                    + "2. SCORING GUIDE:\n"
                    + "   - Well-explained, mostly complete = 7-9 across all dimensions.\n"
                    + "   - Shows genuine understanding with some gaps = 5-7.\n"
                    + "   - Very incomplete or mostly incorrect = 2-4.\n"
                    + "   - Gibberish or blank = 0.\n"
                    + "3. REPETITION: If the answer just copies the question, COMPLETENESS must be 0-3.\n"
                    + "\n"
                    + questionContext
                    + "Student Answer: " + request.getAnswerText() + "\n\n"
                    + "Respond ONLY in this exact format (no extra text):\n"
                    + "GRAMMAR: <integer 0-10>\n"
                    + "CLARITY: <integer 0-10>\n"
                    + "COMPLETENESS: <integer 0-10>\n"
                    + "RELEVANCE: <integer 0-10>\n"
                    + "STRENGTH1: <one genuine strength, or 'None detected' if the answer is poor>\n"
                    + "STRENGTH2: <one genuine strength, or 'None detected' if the answer is poor>\n"
                    + "IMPROVEMENT1: <one specific area to improve>\n"
                    + "IMPROVEMENT2: <one specific area to improve>\n"
                    + "SUGGESTION1: <one actionable suggestion>\n"
                    + "SUGGESTION2: <one actionable suggestion>";
        }
    }

    // ─── Post-processing: consistency enforcement ─────────────────────────────

    /**
     * Enforces three rules that the LLM frequently violates:
     *
     * Rule A — Strength/score consistency:
     *   If any strength contains positive signal language (correct, accurate, identifies, etc.)
     *   then relevance must be ≥ 5 and completeness must be ≥ 4.
     *
     * Rule B — Question repetition penalty:
     *   If the answer is mostly composed of words that appear in the question (≥ 65% overlap),
     *   completeness is capped at 3 because no new information was provided.
     *
     * Rule C — Short-answer keyword floor:
     *   For short answers, if the answer shares ≥ 30% of meaningful question keywords,
     *   relevance gets a proportional floor (5–7 range) and completeness a smaller floor.
     */
    private LiveFeedbackResponse enforceConsistency(
            LiveFeedbackResponse response,
            LiveFeedbackRequest request) {

        double grammar      = response.getGrammarScore();
        double clarity      = response.getClarityScore();
        double completeness = response.getCompletenessScore();
        double relevance    = response.getRelevanceScore();

        String questionText = request.getQuestionPrompt() != null ? request.getQuestionPrompt() : "";
        String answerText   = request.getAnswerText();

        // ── Gibberish guard: if the answer is borderline suspicious, disable all
        //    score-boosting rules so the AI's low raw scores are not inflated. ──
        double gibberishRatio = computeGibberishRatio(answerText);
        boolean isSuspicious  = gibberishRatio >= 0.20;
        if (isSuspicious) {
            log.info("[LiveFeedback] questionId={} SUSPICIOUS TEXT (gibberishRatio={}) — zeroing all scores",
                    request.getQuestionId(), String.format("%.2f", gibberishRatio));
            return buildGibberishResponse(request.getQuestionId());
        }

        // ── Rule B: Question repetition detection ─────────────────────────────
        double repetitionRatio = computeRepetitionRatio(answerText, questionText);
        log.info("[LiveFeedback] questionId={} repetitionRatio={}", request.getQuestionId(), String.format("%.2f", repetitionRatio));
        if (repetitionRatio >= 0.65) {
            completeness = Math.min(completeness, 3.0);
            clarity      = Math.min(clarity,      5.0);
            log.info("[LiveFeedback] questionId={} REPETITION DETECTED — capping completeness={} clarity={}",
                    request.getQuestionId(), completeness, clarity);
        }

        // ── Rule A: Positive-strength consistency ─────────────────────────────
        // Only applies when text is clean (not suspicious). Never boosts scores
        // for answers that barely passed the gibberish gate.
        boolean hasPositiveStrength = hasPositiveLanguage(response.getStrengths());
        if (hasPositiveStrength && relevance < 5.0) {
            log.info("[LiveFeedback] questionId={} INCONSISTENCY: positive strengths but relevance={} — correcting",
                    request.getQuestionId(), relevance);
            relevance    = Math.max(relevance,    5.0);
            completeness = Math.max(completeness, 4.0);
        }

        // ── Rule C: Short-answer keyword floor ───────────────────────────────
        if (isShortAnswer(request)) {
            List<String> keywords = extractMeaningfulWords(questionText);
            int matches = countWordMatches(answerText, keywords);
            double coverage = keywords.isEmpty() ? 0.0 : (double) matches / keywords.size();
            log.info("[LiveFeedback] questionId={} shortAnswer keywordCoverage={}% ({}/{})",
                    request.getQuestionId(), String.format("%.0f", coverage * 100), matches, keywords.size());

            if (coverage >= 0.30) {
                double relevanceFloor    = 5.0 + coverage * 2.0;
                double completenessFloor = 4.0 + coverage * 1.5;
                relevance    = Math.max(relevance,    relevanceFloor);
                completeness = Math.max(completeness, completenessFloor);
                if (clarity >= 4.0) grammar = Math.max(grammar, 4.0);
                log.info("[LiveFeedback] questionId={} short-answer floors applied: relevance={} completeness={}",
                        request.getQuestionId(), relevance, completeness);
            }

            if (relevance < 1.0 && !answerText.isBlank() && !hasNegativeStrength(response.getStrengths())) {
                relevance = 1.0;
            }
        }

        // ── Cap at 10 and round to 1 decimal ─────────────────────────────────
        return LiveFeedbackResponse.builder()
                .questionId(response.getQuestionId())
                .grammarScore(    round1(Math.min(10.0, grammar)))
                .clarityScore(    round1(Math.min(10.0, clarity)))
                .completenessScore(round1(Math.min(10.0, completeness)))
                .relevanceScore(  round1(Math.min(10.0, relevance)))
                .strengths(response.getStrengths())
                .improvements(response.getImprovements())
                .suggestions(response.getSuggestions())
                .generatedAt(response.getGeneratedAt())
                .build();
    }

    /**
     * Computes what fraction of the answer's unique meaningful words
     * are also present in the question.  A high ratio (≥ 0.65) means
     * the student is largely parroting the question rather than explaining.
     */
    private double computeRepetitionRatio(String answerText, String questionText) {
        if (questionText == null || questionText.isBlank()) return 0.0;
        Set<String> questionWords = new HashSet<>(extractMeaningfulWords(questionText));
        List<String> answerWords  = extractMeaningfulWords(answerText);
        if (answerWords.isEmpty() || questionWords.isEmpty()) return 0.0;
        long overlap = answerWords.stream().filter(questionWords::contains).count();
        return (double) overlap / answerWords.size();
    }

    /** True if any strength bullet contains a word that signals the answer is correct/relevant. */
    private boolean hasPositiveLanguage(List<String> strengths) {
        if (strengths == null || strengths.isEmpty()) return false;
        for (String s : strengths) {
            if (s == null) continue;
            String lower = s.toLowerCase();
            if (lower.contains("none detected")) continue;
            for (String signal : POSITIVE_SIGNAL_WORDS) {
                if (lower.contains(signal)) return true;
            }
        }
        return false;
    }

    /** True if strength bullets clearly say there is nothing positive ("none detected", "no relevant"). */
    private boolean hasNegativeStrength(List<String> strengths) {
        if (strengths == null || strengths.isEmpty()) return true;
        for (String s : strengths) {
            if (s != null && s.toLowerCase().contains("none detected")) return true;
        }
        return false;
    }

    // ─── Word / keyword utilities ─────────────────────────────────────────────

    /**
     * Extracts meaningful words: lower-case, ≥ 4 characters, not stop words.
     * Used both for keyword coverage and repetition detection.
     */
    private List<String> extractMeaningfulWords(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.toLowerCase().split("[^a-z]+"))
                .filter(w -> w.length() >= 4)
                .filter(w -> !STOP_WORDS.contains(w))
                .collect(Collectors.toList());
    }

    private int countWordMatches(String answerText, List<String> keywords) {
        if (keywords.isEmpty()) return 0;
        String lower = answerText.toLowerCase();
        int matches = 0;
        for (String kw : keywords) {
            if (lower.contains(kw)) matches++;
        }
        return matches;
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    // ─── Response parsing ─────────────────────────────────────────────────────

    private LiveFeedbackResponse parseResponse(String raw, String questionId) {
        String text = raw.replaceAll("(?s)\\[INST\\].*?\\[/INST\\]", "").trim();
        log.debug("[LiveFeedback] Parsing response for questionId={} cleanedLen={}", questionId, text.length());

        double grammar      = extractScore(text, "GRAMMAR");
        double clarity      = extractScore(text, "CLARITY");
        double completeness = extractScore(text, "COMPLETENESS");
        double relevance    = extractScore(text, "RELEVANCE");

        log.info("[LiveFeedback] Parsed scores questionId={} grammar={} clarity={} completeness={} relevance={}",
                questionId, grammar, clarity, completeness, relevance);

        List<String> strengths    = extractLines(text, "STRENGTH");
        List<String> improvements = extractLines(text, "IMPROVEMENT");
        List<String> suggestions  = extractLines(text, "SUGGESTION");

        if (strengths.isEmpty()) {
            log.warn("[LiveFeedback] No STRENGTH lines parsed");
            strengths = List.of("Answer addresses the question topic.");
        }
        if (improvements.isEmpty()) {
            log.warn("[LiveFeedback] No IMPROVEMENT lines parsed");
            improvements = List.of("Consider expanding on key points.");
        }
        if (suggestions.isEmpty()) {
            log.warn("[LiveFeedback] No SUGGESTION lines parsed");
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

    private double extractScore(String text, String key) {
        Pattern p = Pattern.compile(key + ":\\s*(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return Math.min(10.0, Math.max(0.0, Double.parseDouble(m.group(1))));
            } catch (NumberFormatException ignored) { }
        }
        return 0.0;
    }

    private List<String> extractLines(String text, String prefix) {
        List<String> results = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        Pattern p = Pattern.compile(prefix + "\\d+:\\s*(.+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        while (m.find()) {
            String value = m.group(1).trim();
            // Skip placeholder template tokens the model sometimes echoes back
            if (value.isBlank() || value.startsWith("<") || value.startsWith("[")) continue;
            if (seen.add(value.toLowerCase())) results.add(value);
        }
        return results;
    }

}
