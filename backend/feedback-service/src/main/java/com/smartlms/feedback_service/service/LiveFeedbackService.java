package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.LiveFeedbackResponse;
import com.smartlms.feedback_service.model.AnswerType;
import com.smartlms.feedback_service.model.TypeDetectionResult;
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
 *  - Answer type is automatically detected; type-specific prompts are used when confidence ≥ 0.60.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveFeedbackService {

    private final HuggingFaceService       huggingFaceService;
    private final AnswerTypeDetector       answerTypeDetector;
    private final TypeSpecificPromptBuilder typeSpecificPromptBuilder;

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

    /** Words describing answer FORMAT/task type — excluded from topic keyword extraction. */
    private static final Set<String> TASK_WORDS = Set.of(
            "compare", "contrast", "analyze", "analyse", "evaluate", "examine",
            "identify", "justify", "outline", "assess",
            "difference", "differences", "similarity", "similarities",
            "advantage", "advantages", "disadvantage", "disadvantages",
            "characteristics", "features", "reasons", "least", "together", "complete"
    );

    // ─── Public entry point ───────────────────────────────────────────────────

    @Async("feedbackTaskExecutor")
    public CompletableFuture<ApiResponse<LiveFeedbackResponse>> generateLiveFeedback(LiveFeedbackRequest request) {
        log.info("Generating live feedback for questionId={} textLength={}",
                request.getQuestionId(), request.getAnswerText().length());

        // ── Gibberish gate ────────────────────────────────────────────────────
        if (isGibberish(request.getAnswerText())) {
            log.info("Gibberish detected for questionId={} — returning zero scores", request.getQuestionId());
            return CompletableFuture.completedFuture(
                    ApiResponse.success("Gibberish detected", buildGibberishResponse(request.getQuestionId())));
        }

        try {
            // ── Answer type detection ─────────────────────────────────────────
            int wordCount = countWords(request.getAnswerText());
            TypeDetectionResult typeResult = answerTypeDetector.detect(
                    request.getQuestionPrompt(),
                    request.getAnswerText(),
                    request.getMaxPoints(),
                    wordCount);
            log.info("[LiveFeedback] Type detection: questionId={} type={} confidence={} reason={}",
                    request.getQuestionId(), typeResult.getType(),
                    String.format("%.2f", typeResult.getConfidence()), typeResult.getReasoning());

            // ── Prompt selection ──────────────────────────────────────────────
            String prompt = typeResult.isConfident()
                    ? typeSpecificPromptBuilder.buildPrompt(typeResult.getType(), request, wordCount)
                    : buildPrompt(request);
            prompt = injectTopicRelevanceCheck(prompt, request);

            String rawResponse = huggingFaceService.generateCompletion(prompt);
            log.debug("Raw AI response (first 500 chars): {}",
                    rawResponse.substring(0, Math.min(500, rawResponse.length())));

            // ── Parse + retry on format failure ───────────────────────────────
            LiveFeedbackResponse feedback = parseResponse(rawResponse, request.getQuestionId(), typeResult);
            if (isParseFailure(feedback)) {
                log.warn("[LiveFeedback] questionId={} parse failure detected (all zeros, no bullets) — retrying with strict format",
                        request.getQuestionId());
                String strictPrompt = buildStrictRetryPrompt(request);
                String retryResponse = huggingFaceService.generateCompletion(strictPrompt);
                log.debug("[LiveFeedback] Retry response (first 500 chars): {}",
                        retryResponse.substring(0, Math.min(500, retryResponse.length())));
                LiveFeedbackResponse retryFeedback = parseResponse(retryResponse, request.getQuestionId(), typeResult);
                if (!isParseFailure(retryFeedback)) {
                    feedback = retryFeedback;
                    log.info("[LiveFeedback] questionId={} retry succeeded", request.getQuestionId());
                } else {
                    log.warn("[LiveFeedback] questionId={} retry also failed — using original", request.getQuestionId());
                }
            }

            // ── Consistency enforcement ───────────────────────────────────────
            feedback = enforceConsistency(feedback, request);

            // ── Compute projected grade (business logic moved from frontend) ──
            attachProjectedGrade(feedback, request);

            // ── Stamp type metadata ───────────────────────────────────────────
            feedback.setDetectedAnswerType(typeResult.getType().name());
            feedback.setTypeConfidence(typeResult.getConfidence());

            log.info("Live feedback done questionId={} type={} grammar={} clarity={} completeness={} relevance={}",
                    request.getQuestionId(), typeResult.getType(),
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
        // All-uppercase tokens of 2+ letters are almost always acronyms (SQL, XSS, VPN, HTTP…)
        if (word.matches("[A-Z]{2,}")) return false;

        // Mixed letters + digits: only flag as gibberish if the word is short AND looks random.
        // Technical terms like "mp3", "h264", "2G", "IPv6", "3D" are NOT gibberish.
        boolean hasLetter = word.matches(".*[a-zA-Z].*");
        boolean hasDigit  = word.matches(".*[0-9].*");
        if (hasLetter && hasDigit) {
            // Short alphanumeric tokens ≤ 5 chars are likely technical abbreviations — allow them
            if (word.length() <= 5) return false;
            // Longer mixed tokens with ≥ 4 consecutive digits are likely gibberish (e.g. k3r94j2)
            if (word.matches(".*[0-9]{3,}.*") && word.length() > 6) return true;
            // Otherwise accept (e.g. "IPv6", "h264", "802.11")
            return false;
        }

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

    // ─── Generic prompt construction (used when type confidence < 0.60) ──────

    /** Short-answer: ≤ 5 marks OR answer is ≤ 40 words. */
    private boolean isShortAnswer(LiveFeedbackRequest request) {
        int wordCount = countWords(request.getAnswerText());
        boolean byMarks = request.getMaxPoints() != null && request.getMaxPoints() <= 5;
        boolean byWords = wordCount <= 40;
        return byMarks || byWords;
    }

    private String buildPrompt(LiveFeedbackRequest request) {
        int wordCount = countWords(request.getAnswerText());
        boolean shortAnswer = isShortAnswer(request);

        String questionContext = (request.getQuestionPrompt() != null && !request.getQuestionPrompt().isBlank())
                ? "Question: " + request.getQuestionPrompt() + "\n"
                : "";

        String markInfo = request.getMaxPoints() != null
                ? "This question is worth " + request.getMaxPoints() + " mark(s).\n"
                : "";

        String reasoningSteps =
                "Before scoring, work through these steps:\n"
                + "  1. What specific topic or skill does the question test?\n"
                + "  2. What did the student actually write — which concepts did they address?\n"
                + "  3. What is correct or effective? What is missing or wrong?\n"
                + "  4. Assign scores that honestly reflect this analysis.\n\n";

        String scoringScale =
                "Scoring scale (apply consistently to all dimensions):\n"
                + "  0-3 = weak — missing, incorrect, or not relevant\n"
                + "  4-6 = partial — some correct elements but significant gaps\n"
                + "  7-9 = strong — mostly correct with minor gaps\n"
                + "  10  = excellent — complete and accurate\n\n";

        // Flexible 1–3 bullets per section; extractLines() handles any count via STRENGTH\d+ regex.
        // Evidence requirement: STRENGTH and IMPROVEMENT bullets must reference the student's words.
        String flexibleFormat =
                "GRAMMAR: <integer>\n"
                + "CLARITY: <integer>\n"
                + "COMPLETENESS: <integer>\n"
                + "RELEVANCE: <integer>\n"
                + "STRENGTH1: <quote or paraphrase specific text from the student's answer that is correct>\n"
                + "STRENGTH2: <a second specific strength from the answer; write 'None detected' if no second one>\n"
                + "STRENGTH3: <a third strength if clearly present; omit this line otherwise>\n"
                + "IMPROVEMENT1: <reference specific words or ideas from the answer — state what is wrong or missing>\n"
                + "IMPROVEMENT2: <a second improvement point referencing the answer's content>\n"
                + "IMPROVEMENT3: <a third improvement if needed; omit this line if two are sufficient>\n"
                + "SUGGESTION1: <one actionable step the student can take immediately to improve>\n"
                + "SUGGESTION2: <a second distinct suggestion; omit this line if one is sufficient>\n";

        if (shortAnswer) {
            return "You are a fair academic evaluator scoring a short-answer question.\n"
                    + markInfo
                    + "Answer length: " + wordCount + " word(s).\n\n"
                    + reasoningSteps
                    + scoringScale
                    + "=== SCORING GUIDELINES ===\n"
                    + "SHORT-ANSWER GRADING:\n"
                    + "  Correct, direct, and relevant = RELEVANCE 7-9, COMPLETENESS 6-8.\n"
                    + "  Partially correct or missing detail = RELEVANCE 4-6, COMPLETENESS 3-5.\n"
                    + "  Wrong or irrelevant = RELEVANCE 0-2, COMPLETENESS 0-2.\n"
                    + "  A one-sentence correct answer deserves full credit.\n"
                    + "CONSISTENCY: If a STRENGTH says the answer is correct, RELEVANCE should be >= 5.\n"
                    + "GRAMMAR: Minor issues are acceptable — a correct answer with minor grammar still scores well.\n"
                    + "REPETITION: If the answer just repeats question words without explanation, COMPLETENESS 0-3.\n"
                    + "\n"
                    + questionContext
                    + "Student Answer: " + request.getAnswerText() + "\n\n"
                    + "Respond using this format (scores must be integers 0-10):\n"
                    + flexibleFormat;
        } else {
            String completenessHint = request.getExpectedWordCount() != null
                    ? "Expected length: " + request.getExpectedWordCount() + " words. Current: " + wordCount + " words.\n"
                    : "";
            return "You are a fair academic evaluator scoring a long-answer question.\n"
                    + markInfo
                    + "Answer length: " + wordCount + " word(s).\n"
                    + completenessHint + "\n"
                    + reasoningSteps
                    + scoringScale
                    + "=== SCORING GUIDELINES ===\n"
                    + "CONSISTENCY: Numeric scores should match the qualitative comments.\n"
                    + "  If a STRENGTH says the answer is correct or relevant, RELEVANCE should be >= 5.\n"
                    + "  If the answer is completely off-topic, RELEVANCE 0-2.\n"
                    + "SCORING:\n"
                    + "  Well-explained and mostly complete = 7-9 across all dimensions.\n"
                    + "  Shows genuine understanding with some gaps = 5-7.\n"
                    + "  Very incomplete or mostly incorrect = 2-4.\n"
                    + "  Gibberish or blank = 0.\n"
                    + "REPETITION: If the answer just copies the question, COMPLETENESS 0-3.\n"
                    + "\n"
                    + questionContext
                    + "Student Answer: " + request.getAnswerText() + "\n\n"
                    + "Respond using this format (scores must be integers 0-10):\n"
                    + flexibleFormat;
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
     *
     * Type-specific scores (balanceScore, comparisonDepthScore, etc.) are copied
     * through unchanged — they are not subject to these rules.
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

        // ── Gibberish guard: borderline suspicious answers must not be score-boosted ──
        double gibberishRatio = computeGibberishRatio(answerText);
        boolean isSuspicious  = gibberishRatio >= 0.20;
        if (isSuspicious) {
            log.info("[LiveFeedback] questionId={} SUSPICIOUS TEXT (gibberishRatio={}) — zeroing all scores",
                    request.getQuestionId(), String.format("%.2f", gibberishRatio));
            return buildGibberishResponse(request.getQuestionId());
        }

        // ── Grammar / Clarity floor for non-gibberish text ────────────────────
        // The model sometimes returns 0 for grammar/clarity when the answer type
        // doesn't match what was expected (e.g. a definition given for a comparison question).
        // These dimensions reflect writing quality, not task completion, so they should
        // never be 0 for text that passed the gibberish check.
        if (grammar < 3.0) {
            log.info("[LiveFeedback] questionId={} Grammar floored to 3.0 (non-gibberish text got {})",
                    request.getQuestionId(), grammar);
            grammar = 3.0;
        }
        if (clarity < 3.0) {
            log.info("[LiveFeedback] questionId={} Clarity floored to 3.0 (non-gibberish text got {})",
                    request.getQuestionId(), clarity);
            clarity = 3.0;
        }

        // ── Off-topic guard ───────────────────────────────────────────────────
        // When none of the question's topic keywords (including synonyms) appear in
        // the answer, the student has answered the wrong topic entirely.
        // Cap BOTH relevance and completeness — well-written irrelevant text should
        // not appear to score well on any content dimension.
        boolean offTopic = isAnswerOffTopic(answerText, questionText);
        if (offTopic) {
            log.info("[LiveFeedback] questionId={} OFF-TOPIC: question keywords absent — capping relevance→2.0 completeness→3.0",
                    request.getQuestionId());
            relevance    = Math.min(relevance,    2.0);
            completeness = Math.min(completeness, 3.0);
        }

        // ── Required-component completeness cap ──────────────────────────────
        // When the question lists multiple required topics (e.g. sensors, actuators, controller)
        // and the answer covers only some of them, cap completeness proportionally.
        int completenessTopicCap = computeCompletenessCapFromTopics(answerText, questionText);
        if (completenessTopicCap < 10 && completeness > completenessTopicCap) {
            log.info("[LiveFeedback] questionId={} MISSING REQUIRED TOPICS: capping completeness from {} to {}",
                    request.getQuestionId(), completeness, completenessTopicCap);
            completeness = completenessTopicCap;
        }

        // ── Rule B: Question repetition detection ─────────────────────────────
        double repetitionRatio  = computeRepetitionRatio(answerText, questionText);
        boolean repetitionDetected = repetitionRatio >= 0.65;
        log.info("[LiveFeedback] questionId={} repetitionRatio={}", request.getQuestionId(), String.format("%.2f", repetitionRatio));
        if (repetitionDetected) {
            completeness = Math.min(completeness, 3.0);
            clarity      = Math.min(clarity,      5.0);
            log.info("[LiveFeedback] questionId={} REPETITION DETECTED — capping completeness={} clarity={}",
                    request.getQuestionId(), completeness, clarity);
        }

        // ── Rule A: Positive-strength consistency ─────────────────────────────
        // The repetition cap takes precedence: if Rule B already determined the answer
        // is just parroting the question, don't let a superficially positive strength
        // line override the completeness penalty.
        // Off-topic guard takes precedence: don't boost an off-topic answer's relevance.
        boolean hasPositiveStrength = hasPositiveLanguage(response.getStrengths());
        if (!offTopic && hasPositiveStrength && relevance < 5.0) {
            log.info("[LiveFeedback] questionId={} INCONSISTENCY: positive strengths but relevance={} — correcting",
                    request.getQuestionId(), relevance);
            relevance = Math.max(relevance, 5.0);
            if (!repetitionDetected) {
                completeness = Math.max(completeness, 4.0);
            }
        }

        // ── Rule C: Short-answer keyword floor ───────────────────────────────
        if (!offTopic && isShortAnswer(request)) {
            List<String> keywords = extractMeaningfulWords(questionText);
            int matches = countWordMatches(answerText, keywords);
            double coverage = keywords.isEmpty() ? 0.0 : (double) matches / keywords.size();
            log.info("[LiveFeedback] questionId={} shortAnswer keywordCoverage={}% ({}/{})",
                    request.getQuestionId(), String.format("%.0f", coverage * 100), matches, keywords.size());

            if (coverage >= 0.30) {
                double relevanceFloor    = 5.0 + coverage * 2.0;
                double completenessFloor = 4.0 + coverage * 1.5;
                relevance = Math.max(relevance, relevanceFloor);
                // If Rule B detected that the answer is just parroting the question,
                // keyword coverage will be high by definition — don't let that
                // coincidental overlap override the repetition completeness cap.
                if (!repetitionDetected) {
                    completeness = Math.max(completeness, completenessFloor);
                }
                if (clarity >= 4.0) grammar = Math.max(grammar, 4.0);
                log.info("[LiveFeedback] questionId={} short-answer floors applied: relevance={} completeness={}",
                        request.getQuestionId(), relevance, completeness);
            }

            if (relevance < 1.0 && !answerText.isBlank() && !hasNegativeStrength(response.getStrengths())) {
                relevance = 1.0;
            }
        }

        // ── Off-topic: inject a clear warning into the feedback text ────────────
        // The LLM generates bullet text based on writing quality alone and cannot
        // detect topic mismatch. When our code determines the answer is off-topic
        // we prepend an explicit warning so the student understands why the score
        // is low, even if the strength bullets sound positive.
        List<String> improvements = response.getImprovements();
        List<String> strengths    = response.getStrengths();
        if (offTopic) {
            // Determine what the question is actually about for a useful message.
            List<String> topicKws = extractMeaningfulWords(questionText).stream()
                    .filter(w -> w.length() >= 5)
                    .filter(w -> !TASK_WORDS.contains(w))
                    .distinct()
                    .collect(Collectors.toList());
            String topicHint = topicKws.isEmpty() ? "the correct topic"
                    : "\"" + String.join("\", \"", topicKws) + "\"";
            String warning = "Your answer does not address the question topic (" + topicHint
                    + "). Rewrite your answer to focus on " + topicHint + " directly.";
            List<String> withWarning = new ArrayList<>();
            withWarning.add(warning);
            withWarning.addAll(improvements);
            improvements = withWarning;
            // Overwrite the LLM strength bullets so they don't mislead the student
            strengths = List.of("None detected — your answer addresses a different topic than what was asked.");
        }

        // ── Cap at 10 and round to 1 decimal, copy type-specific fields through ──
        return LiveFeedbackResponse.builder()
                .questionId(response.getQuestionId())
                .grammarScore(    round1(Math.min(10.0, grammar)))
                .clarityScore(    round1(Math.min(10.0, clarity)))
                .completenessScore(round1(Math.min(10.0, completeness)))
                .relevanceScore(  round1(Math.min(10.0, relevance)))
                .strengths(strengths)
                .improvements(improvements)
                .suggestions(response.getSuggestions())
                .generatedAt(response.getGeneratedAt())
                // Type-specific scores preserved unchanged — not subject to consistency rules
                .balanceScore(              response.getBalanceScore())
                .comparisonDepthScore(      response.getComparisonDepthScore())
                .argumentationStrengthScore(response.getArgumentationStrengthScore())
                .evidenceQualityScore(      response.getEvidenceQualityScore())
                .procedureAccuracyScore(    response.getProcedureAccuracyScore())
                .sequenceLogicScore(        response.getSequenceLogicScore())
                .build();
    }

    /**
     * Computes what fraction of the answer's unique meaningful words
     * are also present in the question. A high ratio (≥ 0.65) means
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

    // ─── Projected grade computation (moved from frontend QuestionCard.tsx) ──────
    //
    // Formula mirrors the one previously in calcProjectedGrade():
    //   SHORT (≤5 marks OR ≤40 words):
    //     quality = (relevance×0.50 + completeness×0.25 + clarity×0.15 + grammar×0.10) / 10
    //     floor applied when relevance ≥ 5 (student earns at least 20% of maxPoints)
    //   LONG (>5 marks AND >40 words):
    //     contentScore = (grammar×0.20 + clarity×0.30 + completeness×0.50) / 10
    //     relevanceFactor clamped to 0.5–1.0 (soft gate; relevance<2 → full zeroing)
    //     wordCountPenalty applied when actual words < 50% or 75% of expected
    //   Both paths apply plagiarism penalty tiers:
    //     ≥70% → 0.60, ≥50% → 0.50, ≥30% → 0.30, ≥15% → 0.10

    /**
     * Computes and attaches projectedGrade / projectedGradePercent / letterGrade
     * to the response using the AI scores already set on it.
     * No-op when maxPoints is not in the request.
     */
    void attachProjectedGrade(LiveFeedbackResponse response, LiveFeedbackRequest request) {
        if (request.getMaxPoints() == null) return;
        int wordCount = countWords(request.getAnswerText());
        computeAndSetGrade(response,
                request.getMaxPoints(), wordCount,
                request.getExpectedWordCount(), request.getSimilarityScore(),
                request.getAiDetectionScore());
    }

    /**
     * Computes and attaches grade fields to a response stub when the caller
     * already knows the word count (e.g. the /grade endpoint).
     */
    public void attachProjectedGradeFromWordCount(
            LiveFeedbackResponse response,
            int maxPoints, int wordCount,
            Integer expectedWordCount, Double similarityScore, Double aiDetectionScore) {
        computeAndSetGrade(response, maxPoints, wordCount, expectedWordCount, similarityScore, aiDetectionScore);
    }

    private void computeAndSetGrade(
            LiveFeedbackResponse response,
            int maxPts, int wordCount,
            Integer expectedWordCount, Double similarityScore, Double aiDetectionScore) {

        boolean isShort = maxPts <= 5 || wordCount <= 40;

        // Plagiarism penalty tier (internet/peer similarity 0–100)
        double plagPenalty = 0.0;
        if (similarityScore != null) {
            if      (similarityScore >= 70) plagPenalty = 0.60;
            else if (similarityScore >= 50) plagPenalty = 0.50;
            else if (similarityScore >= 30) plagPenalty = 0.30;
            else if (similarityScore >= 15) plagPenalty = 0.10;
        }

        // AI-generated content penalty tier (probability 0.0–1.0; -1.0 = unavailable → skip)
        double aiPenalty = 0.0;
        if (aiDetectionScore != null && aiDetectionScore >= 0.0) {
            if      (aiDetectionScore >= 0.90) aiPenalty = 0.60;
            else if (aiDetectionScore >= 0.75) aiPenalty = 0.45;
            else if (aiDetectionScore >= 0.60) aiPenalty = 0.25;
            else if (aiDetectionScore >= 0.40) aiPenalty = 0.10;
        }

        double totalPenalty = plagPenalty + aiPenalty;

        double projectedRatio;
        if (isShort) {
            double qualityScore = (response.getRelevanceScore()    * 0.50
                                 + response.getCompletenessScore() * 0.25
                                 + response.getClarityScore()      * 0.15
                                 + response.getGrammarScore()      * 0.10) / 10.0;
            double floored = response.getRelevanceScore() >= 5.0
                    ? Math.max(qualityScore, 0.20) : qualityScore;
            projectedRatio = Math.max(0.0, floored - totalPenalty);
        } else {
            double contentScore = (response.getGrammarScore()      * 0.20
                                 + response.getClarityScore()      * 0.30
                                 + response.getCompletenessScore() * 0.50) / 10.0;
            // Soft relevance gate: clamp to 0.5–1.0; completely off-topic (< 2) → full zero
            double relevanceFactor = response.getRelevanceScore() < 2.0
                    ? response.getRelevanceScore() / 10.0
                    : Math.max(0.5, response.getRelevanceScore() / 10.0);
            double base = contentScore * relevanceFactor;

            double wcPenalty = 0.0;
            if (expectedWordCount != null && expectedWordCount > 0) {
                double ratio = (double) wordCount / expectedWordCount;
                if      (ratio < 0.50) wcPenalty = 0.25;
                else if (ratio < 0.75) wcPenalty = 0.10;
            }
            projectedRatio = Math.max(0.0, base - totalPenalty - wcPenalty);
        }

        double projectedGrade        = Math.round(projectedRatio * maxPts * 10.0) / 10.0;
        double projectedGradePercent = maxPts > 0
                ? Math.round((projectedGrade / maxPts) * 1000.0) / 10.0 : 0.0;

        response.setProjectedGrade(projectedGrade);
        response.setProjectedGradePercent(projectedGradePercent);
        response.setLetterGrade(toLetterGrade(projectedGradePercent));

        log.info("[LiveFeedback] Grade: maxPts={} isShort={} plagPenalty={} aiPenalty={} totalPenalty={} projectedGrade={} ({}% {})",
                maxPts, isShort, plagPenalty, aiPenalty, totalPenalty,
                projectedGrade, projectedGradePercent, response.getLetterGrade());
    }

    /**
     * Maps a percentage (0–100) to an academic letter grade.
     * Same thresholds used across feedback-service and submission-management-service.
     */
    public static String toLetterGrade(double pct) {
        if (pct >= 90) return "A+";
        if (pct >= 80) return "A";
        if (pct >= 75) return "A-";
        if (pct >= 70) return "B+";
        if (pct >= 65) return "B";
        if (pct >= 60) return "B-";
        if (pct >= 55) return "C+";
        if (pct >= 45) return "C";
        if (pct >= 40) return "C-";
        if (pct >= 35) return "D+";
        if (pct >= 30) return "D";
        return "E";
    }

    // ─── Topic relevance utilities ────────────────────────────────────────────

    /**
     * Prepends a TOPIC CHECK instruction to the prompt so the LLM is explicitly told
     * to assign low relevance (1-2) when the answer doesn't address the question's subject.
     * Only injected when the question has ≥1 specific topic keyword (≥5 chars, not task/stop words).
     */
    private String injectTopicRelevanceCheck(String prompt, LiveFeedbackRequest request) {
        if (request.getQuestionPrompt() == null || request.getQuestionPrompt().isBlank()) return prompt;
        List<String> topicWords = extractMeaningfulWords(request.getQuestionPrompt()).stream()
                .filter(w -> w.length() >= 5)
                .filter(w -> !TASK_WORDS.contains(w))
                .distinct()
                .collect(Collectors.toList());
        if (topicWords.isEmpty()) return prompt;

        String answerLower = request.getAnswerText() != null ? request.getAnswerText().toLowerCase() : "";
        List<String> absentTopics = topicWords.stream()
                .filter(kw -> {
                    if (answerLower.contains(kw)) return false;
                    if (kw.endsWith("s") && kw.length() > 5 && answerLower.contains(kw.substring(0, kw.length() - 1))) return false;
                    return true;
                })
                .collect(Collectors.toList());

        String kw = String.join(", ", topicWords);
        StringBuilder check = new StringBuilder();
        check.append("IMPORTANT — TOPIC RELEVANCE: The answer must mention and discuss [")
             .append(kw).append("]. Check: does the student's answer contain the word(s) [").append(kw).append("]? ")
             .append("If the answer does NOT mention [").append(kw).append("], assign RELEVANCE = 1-2. ")
             .append("Well-written text about a different topic still gets RELEVANCE = 1-2.\n\n");

        // Add completeness cap instruction when multiple required topics are absent.
        if (topicWords.size() >= 3 && !absentTopics.isEmpty()) {
            String absentStr = String.join(", ", absentTopics);
            int maxComp = absentTopics.size() >= 3 ? 2
                        : absentTopics.size() == 2 ? 4
                        : 7;
            check.append("COMPLETENESS CHECK: The question requires covering [").append(kw)
                 .append("]. The answer is MISSING [").append(absentStr)
                 .append("]. COMPLETENESS must not exceed ").append(maxComp).append("/10.\n\n");
        }

        // Instruct the model not to suggest what the answer already covers.
        check.append("IMPROVEMENT / SUGGESTION RULE: Before writing each IMPROVEMENT or SUGGESTION, ")
             .append("check that this point is NOT already covered in the student's answer above. ")
             .append("Do NOT suggest things the answer has already explained.\n\n");

        String marker = "=== MANDATORY SCORING RULES ===\n";
        int idx = prompt.indexOf(marker);
        String checkStr = check.toString();
        return idx < 0 ? checkStr + prompt : prompt.substring(0, idx) + checkStr + prompt.substring(idx);
    }

    /** Synonym map for off-topic detection — prevents false positives when student uses correct synonyms. */
    private static final Map<String, List<String>> SYNONYMS = Map.of(
            "actuator",    List.of("motor", "servo", "effector", "mechanism", "drive"),
            "sensor",      List.of("detector", "transducer", "probe", "gauge", "reader"),
            "controller",  List.of("processor", "microcontroller", "computer", "brain", "logic"),
            "memory",      List.of("storage", "cache", "buffer", "register"),
            "performance", List.of("speed", "efficiency", "throughput", "latency"),
            "network",     List.of("internet", "connection", "topology", "infrastructure"),
            "database",    List.of("storage", "repository", "datastore"),
            "algorithm",   List.of("procedure", "method", "process", "routine")
    );

    /**
     * Returns true when the question has specific topic keywords and NONE of them
     * (including synonyms and de-pluralised stems) appear in the answer.
     */
    private boolean isAnswerOffTopic(String answerText, String questionText) {
        if (questionText == null || questionText.isBlank()) return false;
        List<String> topicWords = extractMeaningfulWords(questionText).stream()
                .filter(w -> w.length() >= 5)
                .filter(w -> !TASK_WORDS.contains(w))
                .distinct()
                .collect(Collectors.toList());
        if (topicWords.isEmpty()) return false;
        String lower = answerText.toLowerCase();
        long matches = topicWords.stream()
                .filter(kw -> {
                    if (lower.contains(kw)) return true;
                    // stem: "actuators" → "actuator"
                    if (kw.endsWith("s") && kw.length() > 5 && lower.contains(kw.substring(0, kw.length() - 1))) return true;
                    // synonym matching
                    List<String> syns = SYNONYMS.get(kw);
                    if (syns != null) {
                        for (String syn : syns) if (lower.contains(syn)) return true;
                    }
                    // also try stem key in synonyms: "actuators" → "actuator"
                    if (kw.endsWith("s") && kw.length() > 5) {
                        List<String> stemSyns = SYNONYMS.get(kw.substring(0, kw.length() - 1));
                        if (stemSyns != null) {
                            for (String syn : stemSyns) if (lower.contains(syn)) return true;
                        }
                    }
                    return false;
                })
                .count();
        return matches == 0;
    }

    /**
     * When the question has ≥3 specific topic keywords and the answer is missing some,
     * caps completeness to prevent inflated scores for partial coverage.
     * Returns 10 (no cap) when the question doesn't have enough required topics.
     */
    private int computeCompletenessCapFromTopics(String answerText, String questionText) {
        if (questionText == null || questionText.isBlank()) return 10;
        List<String> topicWords = extractMeaningfulWords(questionText).stream()
                .filter(w -> w.length() >= 5)
                .filter(w -> !TASK_WORDS.contains(w))
                .distinct()
                .collect(Collectors.toList());
        if (topicWords.size() < 3) return 10;
        String lower = answerText.toLowerCase();
        long absentCount = topicWords.stream()
                .filter(kw -> {
                    if (lower.contains(kw)) return false;
                    if (kw.endsWith("s") && kw.length() > 5 && lower.contains(kw.substring(0, kw.length() - 1))) return false;
                    List<String> syns = SYNONYMS.get(kw);
                    if (syns != null) for (String syn : syns) if (lower.contains(syn)) return false;
                    return true;
                })
                .count();
        if (absentCount == 0) return 10;
        if (absentCount == 1) return 7;
        if (absentCount == 2) return 4;
        return 2;
    }

    // ─── Parse failure detection & retry ─────────────────────────────────────

    /** True when the AI response produced all-zero scores AND no parseable bullet points. */
    private boolean isParseFailure(LiveFeedbackResponse r) {
        boolean allZero = r.getGrammarScore() == 0.0 && r.getClarityScore() == 0.0
                       && r.getCompletenessScore() == 0.0 && r.getRelevanceScore() == 0.0;
        boolean noContent = (r.getStrengths() == null || r.getStrengths().isEmpty()
                         || r.getStrengths().stream().allMatch(s -> s.contains("None detected")))
                         && (r.getImprovements() == null || r.getImprovements().isEmpty());
        return allZero && noContent;
    }

    /**
     * Builds a minimal, strict-format retry prompt used when the first response fails to parse.
     * Shorter prompt + explicit format example improves compliance on retry.
     */
    private String buildStrictRetryPrompt(LiveFeedbackRequest request) {
        String q = request.getQuestionPrompt() != null ? request.getQuestionPrompt() : "(no question)";
        String a = request.getAnswerText();
        return "You are an academic evaluator. Score this student answer strictly using the format below.\n\n"
             + "Question: " + q + "\n"
             + "Student Answer: " + a + "\n\n"
             + "You MUST respond with EXACTLY these 10 lines, nothing else:\n"
             + "GRAMMAR: 7\n"
             + "CLARITY: 6\n"
             + "COMPLETENESS: 5\n"
             + "RELEVANCE: 4\n"
             + "STRENGTH1: <one specific thing done well>\n"
             + "STRENGTH2: <another specific strength or 'None detected'>\n"
             + "IMPROVEMENT1: <one specific gap in the answer>\n"
             + "IMPROVEMENT2: <another gap or area to improve>\n"
             + "SUGGESTION1: <one actionable suggestion>\n"
             + "SUGGESTION2: <another suggestion>\n\n"
             + "Replace the example scores (7,6,5,4) with your actual scores (integers 0-10). "
             + "Replace placeholder text with real feedback about the student's answer.";
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

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    // ─── Response parsing ─────────────────────────────────────────────────────

    /**
     * Parses the raw LLM response into a LiveFeedbackResponse.
     * When typeResult is confident, also extracts type-specific dimension scores
     * (BALANCE, COMPARISON_DEPTH, ARGUMENTATION_STRENGTH, etc.) from the response.
     */
    private LiveFeedbackResponse parseResponse(String raw, String questionId, TypeDetectionResult typeResult) {
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
            strengths = List.of("None detected.");
        }
        if (improvements.isEmpty()) {
            log.warn("[LiveFeedback] No IMPROVEMENT lines parsed");
            improvements = List.of("Consider expanding on key points.");
        }
        if (suggestions.isEmpty()) {
            log.warn("[LiveFeedback] No SUGGESTION lines parsed");
            suggestions = List.of("Review for grammar and clarity.");
        }

        LiveFeedbackResponse.LiveFeedbackResponseBuilder builder = LiveFeedbackResponse.builder()
                .questionId(questionId)
                .grammarScore(grammar)
                .clarityScore(clarity)
                .completenessScore(completeness)
                .relevanceScore(relevance)
                .strengths(strengths)
                .improvements(improvements)
                .suggestions(suggestions)
                .generatedAt(LocalDateTime.now().toString());

        // Extract type-specific dimensions when the type was confident
        if (typeResult != null && typeResult.isConfident()) {
            AnswerType type = typeResult.getType();

            if (type == AnswerType.COMPARATIVE_ANALYSIS) {
                double balance         = extractScore(text, "BALANCE");
                double comparisonDepth = extractScore(text, "COMPARISON_DEPTH");
                builder.balanceScore(balance > 0 ? balance : null)
                       .comparisonDepthScore(comparisonDepth > 0 ? comparisonDepth : null);
                log.info("[LiveFeedback] Comparative scores questionId={} balance={} comparisonDepth={}",
                        questionId, balance, comparisonDepth);
            }

            if (type == AnswerType.ARGUMENTATIVE) {
                double argStrength    = extractScore(text, "ARGUMENTATION_STRENGTH");
                double evidenceQuality = extractScore(text, "EVIDENCE_QUALITY");
                builder.argumentationStrengthScore(argStrength > 0 ? argStrength : null)
                       .evidenceQualityScore(evidenceQuality > 0 ? evidenceQuality : null);
                log.info("[LiveFeedback] Argumentative scores questionId={} argStrength={} evidenceQuality={}",
                        questionId, argStrength, evidenceQuality);
            }

            if (type == AnswerType.PROCEDURAL) {
                double procedureAccuracy = extractScore(text, "PROCEDURE_ACCURACY");
                double sequenceLogic     = extractScore(text, "SEQUENCE_LOGIC");
                builder.procedureAccuracyScore(procedureAccuracy > 0 ? procedureAccuracy : null)
                       .sequenceLogicScore(sequenceLogic > 0 ? sequenceLogic : null);
                log.info("[LiveFeedback] Procedural scores questionId={} procedureAccuracy={} sequenceLogic={}",
                        questionId, procedureAccuracy, sequenceLogic);
            }
        }

        return builder.build();
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
            // Strip surrounding quotes the model sometimes wraps values in
            if (value.length() >= 2 &&
                ((value.startsWith("\"") && value.endsWith("\"")) ||
                 (value.startsWith("'")  && value.endsWith("'")))) {
                value = value.substring(1, value.length() - 1).trim();
            }
            // Skip placeholder tokens echoed from the prompt template
            if (value.isBlank() || value.startsWith("<") || value.startsWith("[")) continue;
            // Skip pure numbers — score values occasionally leak into bullet positions
            if (value.matches("[0-9]+(?:\\.[0-9]+)?\\s*/\\s*10") || value.matches("[0-9]+(?:\\.[0-9]+)?")) continue;
            // Strip a leading numeric score the model sometimes prefixes to bullet text:
            // "10 (well-detailed sensor types listed)" → "well-detailed sensor types listed"
            if (value.matches("^\\d+(?:\\.\\d+)?\\s*\\(.*\\)$")) {
                value = value.replaceFirst("^\\d+(?:\\.\\d+)?\\s*\\(", "").replaceFirst("\\)$", "").trim();
            } else if (value.matches("^\\d+(?:\\.\\d+)?\\s+[A-Za-z].*")) {
                value = value.replaceFirst("^\\d+(?:\\.\\d+)?\\s+", "").trim();
            }
            // Skip fragments too short to be meaningful feedback (e.g. "OK", "N/A")
            if (value.length() < 8) continue;
            if (seen.add(value.toLowerCase())) results.add(value);
        }
        return results;
    }
}
