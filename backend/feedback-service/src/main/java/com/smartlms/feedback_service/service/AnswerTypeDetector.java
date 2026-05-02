package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.model.AnswerType;
import com.smartlms.feedback_service.model.TypeDetectionResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Detects the structural type of a student's text answer from the question prompt
 * and the answer text itself.
 *
 * Detection pipeline:
 *  1. Ultra-short answers (≤ 2 words) → SHORT_ANSWER immediately.
 *  2. Format overrides: bullet/numbered lists → LIST_BASED; Q:/A: markers → QUESTION_ANSWER_FORMAT.
 *  3. Question-text keyword matching → candidate type.
 *  4. Answer-text confirmation (if ≥ 15 words of answer available).
 *  5. If question gave no signal, attempt detection from answer text alone.
 *  6. Confidence calculation from signals found.
 *  7. Fallback to SHORT_ANSWER / LONG_ESSAY when confidence < 0.45.
 *
 * Note on markers: all transition-word markers use a trailing space (e.g. "similarly ")
 * rather than a trailing comma so that valid academic writing without Oxford commas
 * (e.g. "similarly both systems") is still recognised.
 */
@Service
@Slf4j
public class AnswerTypeDetector {

    // ── Public API ────────────────────────────────────────────────────────────────

    public TypeDetectionResult detect(String questionPrompt, String answerText,
                                      Integer maxPoints, int wordCount) {

        // Ultra-short answers: bypass full detection
        if (wordCount <= 2) {
            return result(AnswerType.SHORT_ANSWER, 1.0, "≤ 2 words — treated as short answer");
        }

        // Format overrides — structural signals take priority over keyword analysis
        if (isBulletPointFormat(answerText)) {
            return result(AnswerType.LIST_BASED, 0.85, "Answer uses bullet / numbered list format");
        }
        if (isQAFormat(answerText)) {
            return result(AnswerType.QUESTION_ANSWER_FORMAT, 0.90, "Answer contains Q:/A: format markers");
        }

        // Question-text keyword detection
        String predictedType = detectTypeFromQuestion(questionPrompt);
        boolean confirmedByAnswer = false;

        // Answer-text confirmation (only if there is enough text to analyse)
        if (!predictedType.equals("UNKNOWN") && answerText != null && wordCount >= 15) {
            confirmedByAnswer = confirmType(predictedType, answerText.toLowerCase());
        }

        // If question gave no signal, fall back to answer-only heuristics
        if (predictedType.equals("UNKNOWN") && answerText != null && wordCount >= 15) {
            predictedType = detectTypeFromAnswer(answerText.toLowerCase());
        }

        // Confidence
        double confidence = calculateConfidence(questionPrompt, predictedType, confirmedByAnswer, wordCount);

        // Fallback when signal is too weak
        if (predictedType.equals("UNKNOWN") || confidence < 0.45) {
            if ((maxPoints != null && maxPoints <= 5) || wordCount <= 40) {
                return result(AnswerType.SHORT_ANSWER, 0.75, "Fallback: low marks / word count");
            }
            return result(AnswerType.LONG_ESSAY, 0.65, "Fallback: no type signal, longer answer");
        }

        try {
            AnswerType type = AnswerType.valueOf(predictedType);
            String reason = confirmedByAnswer ? "question + answer confirmed" : "question keywords only";
            log.info("[TypeDetector] type={} confidence={} reason={}", type, String.format("%.2f", confidence), reason);
            return result(type, confidence, reason);
        } catch (IllegalArgumentException e) {
            return result(AnswerType.LONG_ESSAY, 0.55, "Parse fallback");
        }
    }

    // ── Question-text keyword detection ──────────────────────────────────────────

    private String detectTypeFromQuestion(String questionPrompt) {
        if (questionPrompt == null || questionPrompt.isBlank()) return "UNKNOWN";
        String q = questionPrompt.toLowerCase().trim();

        // COMPARATIVE_ANALYSIS — check first, very distinctive keywords
        if (anyOf(q, "compare ", "contrast ", "difference between", "similarities between",
                "similarities and differences", " vs ", " versus ", "which is better",
                "what distinguishes", "how does", "differ")) {
            return "COMPARATIVE_ANALYSIS";
        }

        // CAUSE_EFFECT
        if (anyOf(q, "what caused", "why did", "what are the effects of", "what are the consequences",
                "what led to", "what resulted in", "explain the cause", "explain the effect",
                "what impact", "causes of", "effects of", "consequences of",
                "reasons for", "what is the result of")) {
            return "CAUSE_EFFECT";
        }

        // ARGUMENTATIVE
        if (anyOf(q, "do you agree", "to what extent", "argue ", "should ", "justify",
                "make a case", "defend your", "is it justified", "discuss whether",
                "do you think", "should we", "convince", "take a position",
                "is it right", "is it wrong")) {
            return "ARGUMENTATIVE";
        }

        // CRITICAL_EVALUATION
        if (anyOf(q, "critically", "evaluate ", "assess the ", "strengths and weaknesses",
                "critique", "appraise", "advantages and disadvantages",
                "pros and cons", "what are the limitations", "how effective")) {
            return "CRITICAL_EVALUATION";
        }

        // PROBLEM_SOLUTION
        if (anyOf(q, "how would you solve", "what is the solution", "how can we address",
                "propose a solution", "what are the challenges", "how to overcome",
                "what steps would you take to solve", "recommend a solution",
                "how would you improve", "identify the problems and", "suggest ways to")) {
            return "PROBLEM_SOLUTION";
        }

        // PROCEDURAL
        if (anyOf(q, "what are the steps", "explain the process of", "describe the procedure",
                "walk through", "outline the steps", "what is the method",
                "how is it done", "describe how to ", "explain the process",
                "what process do you")) {
            return "PROCEDURAL";
        }

        // LIST_BASED
        if (anyOf(q, "list ", "enumerate", "name the", "name three", "name five",
                "identify ", "give examples of", "state the ", "what are the ",
                "mention ", "provide examples of", "what types of", "what kinds of",
                "what factors", "name at least")) {
            return "LIST_BASED";
        }

        // REFLECTIVE
        if (anyOf(q, "reflect on", "what have you learned", "how has this affected you",
                "describe your experience", "what did you learn from",
                "what is your personal opinion", "how did you feel",
                "think back on", "your perspective on", "what would you do differently")) {
            return "REFLECTIVE";
        }

        // CASE_STUDY
        if (anyOf(q, "based on the case", "analyze this scenario", "in the case of",
                "consider the following situation", "based on the scenario",
                "the following case study", "examine this situation",
                "analyze the situation described")) {
            return "CASE_STUDY";
        }

        // TECHNICAL_EXPLANATION
        if (anyOf(q, "explain how ", "describe the mechanism", "how does it work",
                "what is the function of", "describe the structure of",
                "how does", "function", "what is the role of", "describe the working of",
                "explain the concept of")) {
            return "TECHNICAL_EXPLANATION";
        }

        // SUMMARY
        if (anyOf(q, "summarize", "summarise", "briefly describe", "in your own words",
                "provide an overview of", "what is the main idea", "give a brief account",
                "outline the main points")) {
            return "SUMMARY";
        }

        // ANALYTICAL
        if (anyOf(q, "analyze ", "analyse ", "break down", "examine the ",
                "what factors contribute", "what are the components of",
                "investigate ", "explore the relationship", "what elements")) {
            return "ANALYTICAL";
        }

        // NARRATIVE
        if (anyOf(q, "tell the story", "describe what happened", "narrate",
                "write a story about", "describe the events", "recount")) {
            return "NARRATIVE";
        }

        // SHORT_ANSWER / definition queries
        if (anyOf(q, "define ", "what is ", "what are ", "who is ",
                "when was ", "where is ")) {
            return "SHORT_ANSWER";
        }

        // LONG_ESSAY
        if (anyOf(q, "discuss ", "describe ", "explain ", "elaborate on ",
                "write an essay", "provide a detailed")) {
            return "LONG_ESSAY";
        }

        return "UNKNOWN";
    }

    // ── Answer-only detection (when question gave no signal) ──────────────────────

    private String detectTypeFromAnswer(String lower) {
        // Comparative markers (space-suffixed, no trailing commas)
        int comparative = countOf(lower, "both ", "similarly ", "likewise ", "in contrast",
                "conversely ", "on the other hand", "whereas ", "by comparison",
                "on one hand", "by contrast");
        if (comparative >= 2) return "COMPARATIVE_ANALYSIS";

        // Cause-effect markers
        int causal = countOf(lower, "because ", "therefore ", "as a result",
                "consequently ", "due to ", "leads to ", "caused by ", "resulting in ",
                "thus ", "hence ", "this is why");
        if (causal >= 2) return "CAUSE_EFFECT";

        // Argumentative markers
        int argument = countOf(lower, "i believe", "i argue", "in my opinion",
                "evidence suggests", "firstly ", "furthermore ", "in conclusion",
                "it is clear that", "one could argue");
        if (argument >= 2) return "ARGUMENTATIVE";

        // Procedural markers
        int procedural = countOf(lower, "step 1", "step 2", "first ", "second ",
                "third ", "then ", "next ", "finally ", "after that", "begin by");
        if (procedural >= 2) return "PROCEDURAL";

        // Reflective markers
        int reflective = countOf(lower, "i learned", "i realised", "i realized",
                "i felt ", "i have gained", "my experience", "i discovered",
                "i now understand", "this taught me");
        if (reflective >= 2) return "REFLECTIVE";

        // Problem + solution
        if ((lower.contains("problem") || lower.contains("challenge") || lower.contains("issue"))
                && (lower.contains("solution") || lower.contains("solve") || lower.contains("address"))) {
            return "PROBLEM_SOLUTION";
        }

        return "UNKNOWN";
    }

    // ── Answer-text type confirmation ─────────────────────────────────────────────

    private boolean confirmType(String predictedType, String lower) {
        switch (predictedType) {
            case "COMPARATIVE_ANALYSIS": return confirmComparativeAnalysis(lower);
            case "PROBLEM_SOLUTION":     return confirmProblemSolution(lower);
            case "ARGUMENTATIVE":        return confirmArgumentative(lower);
            case "LIST_BASED":           return confirmListBased(lower);
            case "PROCEDURAL":           return confirmProcedural(lower);
            case "CAUSE_EFFECT":         return confirmCauseEffect(lower);
            case "REFLECTIVE":           return confirmReflective(lower);
            case "CRITICAL_EVALUATION":  return confirmCriticalEvaluation(lower);
            case "CASE_STUDY":           return confirmCaseStudy(lower);
            case "TECHNICAL_EXPLANATION":return confirmTechnical(lower);
            case "ANALYTICAL":           return confirmAnalytical(lower);
            case "NARRATIVE":            return confirmNarrative(lower);
            case "SUMMARY":              return true;
            case "SHORT_ANSWER":         return true;
            case "LONG_ESSAY":           return true;
            default:                     return false;
        }
    }

    private boolean confirmComparativeAnalysis(String lower) {
        // Use space-suffixed markers so "however " matches "however the" as well as "however, the"
        int n = countOf(lower, "both ", "similarly ", "likewise ", "in contrast",
                "conversely ", "on the other hand", "whereas ", "however ",
                "although ", "by comparison", "on one hand", "by contrast");
        return n >= 2;
    }

    private boolean confirmProblemSolution(String lower) {
        boolean hasProblem = lower.contains("problem") || lower.contains("challenge") || lower.contains("issue");
        boolean hasSolution = lower.contains("solution") || lower.contains("solve")
                || lower.contains("address") || lower.contains("recommend");
        return hasProblem && hasSolution;
    }

    private boolean confirmArgumentative(String lower) {
        int n = countOf(lower, "i believe", "i argue", "in my opinion", "evidence",
                "firstly ", "furthermore ", "therefore ", "in conclusion",
                "it is clear", "one could argue", "thus ", "hence ");
        return n >= 2;
    }

    private boolean confirmListBased(String lower) {
        long bulletLines = lower.lines()
                .filter(l -> l.trim().matches("^[•\\-\\*]\\s+.{2,}"))
                .count();
        long numberedLines = lower.lines()
                .filter(l -> l.trim().matches("^\\d+[.):]\\s+.{2,}"))
                .count();
        int markers = countOf(lower, "first ", "second ", "third ", "fourth ",
                "additionally ", "also ", "another ", "finally ", "lastly ");
        return bulletLines >= 2 || numberedLines >= 2 || markers >= 2;
    }

    private boolean confirmProcedural(String lower) {
        int n = countOf(lower, "step 1", "step 2", "first ", "second ",
                "then ", "next ", "finally ", "after that", "lastly ",
                "begin by", "start by", "once you");
        return n >= 2;
    }

    private boolean confirmCauseEffect(String lower) {
        int n = countOf(lower, "because ", "therefore ", "as a result",
                "consequently ", "due to ", "leads to ", "caused by ",
                "resulting in ", "thus ", "hence ");
        return n >= 2;
    }

    private boolean confirmReflective(String lower) {
        int n = countOf(lower, "i learned", "i realised", "i realized", "i felt ",
                "i have gained", "my experience", "i discovered",
                "i now understand", "this taught me", "i think ", "i believe");
        return n >= 2;
    }

    private boolean confirmCriticalEvaluation(String lower) {
        boolean hasPositive = lower.contains("strength") || lower.contains("advantage") || lower.contains("benefit");
        boolean hasNegative = lower.contains("weakness") || lower.contains("disadvantage") || lower.contains("limitation");
        return hasPositive && hasNegative;
    }

    private boolean confirmCaseStudy(String lower) {
        int n = countOf(lower, "in this case", "in this situation", "the organisation",
                "the organization", "the company", "the scenario",
                "this example", "in this instance");
        return n >= 1;
    }

    private boolean confirmTechnical(String lower) {
        int n = countOf(lower, "mechanism", "process ", "function ", "structure ",
                "component", "system ", "works by", "operates", "technical", "scientific");
        return n >= 2;
    }

    private boolean confirmAnalytical(String lower) {
        int n = countOf(lower, "factor", "component", "element ", "aspect ",
                "dimension", "analysis", "indicates", "suggests", "demonstrates");
        return n >= 2;
    }

    private boolean confirmNarrative(String lower) {
        int n = countOf(lower, " was ", " were ", " had ", " went ",
                " came ", " said ", " told ", " began ", " ended ");
        return n >= 3;
    }

    // ── Confidence calculation ────────────────────────────────────────────────────

    private double calculateConfidence(String questionPrompt, String detectedType,
                                       boolean confirmed, int wordCount) {
        if (detectedType.equals("UNKNOWN")) return 0.0;

        double base = 0.55; // question-only signal baseline

        if (confirmed)       base += 0.25; // answer confirms question signal
        if (wordCount >= 50) base += 0.05; // more text = more evidence
        if (wordCount >= 100) base += 0.05;

        if (questionPrompt != null && hasStrongKeyword(questionPrompt.toLowerCase(), detectedType)) {
            base += 0.10; // distinctive keyword (e.g. "compare", "critically analyse")
        }

        return Math.min(0.95, base);
    }

    private boolean hasStrongKeyword(String lower, String type) {
        switch (type) {
            case "COMPARATIVE_ANALYSIS": return lower.contains("compare") || lower.contains("contrast");
            case "ARGUMENTATIVE":        return lower.contains("do you agree") || lower.contains("argue");
            case "PROCEDURAL":           return lower.contains("steps") || lower.contains("procedure");
            case "CAUSE_EFFECT":         return lower.contains("caused") || lower.contains("effects of");
            case "CRITICAL_EVALUATION":  return lower.contains("critically") || lower.contains("evaluate");
            case "REFLECTIVE":           return lower.contains("reflect") || lower.contains("learned");
            case "PROBLEM_SOLUTION":     return lower.contains("solution") || lower.contains("how would you solve");
            case "SUMMARY":              return lower.contains("summarize") || lower.contains("summarise");
            case "LIST_BASED":           return lower.contains("list ") || lower.contains("enumerate");
            default:                     return false;
        }
    }

    // ── Format overrides (structural signals) ────────────────────────────────────

    private boolean isBulletPointFormat(String answerText) {
        if (answerText == null) return false;
        long bullets = answerText.lines()
                .filter(l -> l.trim().matches("^[•\\-\\*]\\s+.{2,}"))
                .count();
        long numbered = answerText.lines()
                .filter(l -> l.trim().matches("^\\d+[.):]\\s+.{2,}"))
                .count();
        return bullets >= 3 || numbered >= 3;
    }

    private boolean isQAFormat(String answerText) {
        if (answerText == null) return false;
        String lower = answerText.toLowerCase();
        return (lower.contains("q:") && lower.contains("a:"))
                || (lower.contains("question:") && lower.contains("answer:"));
    }

    // ── Utilities ────────────────────────────────────────────────────────────────

    private boolean anyOf(String text, String... patterns) {
        for (String p : patterns) {
            if (text.contains(p)) return true;
        }
        return false;
    }

    private int countOf(String text, String... markers) {
        int n = 0;
        for (String m : markers) {
            if (text.contains(m)) n++;
        }
        return n;
    }

    private TypeDetectionResult result(AnswerType type, double confidence, String reasoning) {
        return TypeDetectionResult.builder()
                .type(type)
                .confidence(confidence)
                .reasoning(reasoning)
                .build();
    }
}
