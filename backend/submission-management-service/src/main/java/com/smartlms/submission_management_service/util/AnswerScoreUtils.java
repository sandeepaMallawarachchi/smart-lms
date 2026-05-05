package com.smartlms.submission_management_service.util;

import com.smartlms.submission_management_service.model.Answer;

import java.util.List;

/**
 * Shared scoring logic for AI-generated answer marks.
 *
 * Formula (weights sum to 1.0):
 *   relevance × 0.40 + completeness × 0.30 + clarity × 0.15 + grammar × 0.15
 *
 * Weights are normalised when one or more dimensions are null, so the result
 * always stays on the 0–10 scale regardless of which scores are present.
 * Returns null when no AI scores are available at all.
 */
public final class AnswerScoreUtils {

    private static final double W_RELEVANCE    = 0.40;
    private static final double W_COMPLETENESS = 0.30;
    private static final double W_CLARITY      = 0.15;
    private static final double W_GRAMMAR      = 0.15;

    private AnswerScoreUtils() {}

    /**
     * Splits a {@code "||"}-delimited string into a list of trimmed tokens.
     * Returns an empty list for null or blank input.
     */
    public static List<String> splitPipe(String value) {
        if (value == null || value.isBlank()) return List.of();
        return List.of(value.split("\\|\\|"));
    }

    /**
     * Maps a percentage score (0–100) to an academic letter grade.
     * Thresholds mirror those used in feedback-service's LiveFeedbackService.
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

    /**
     * Computes the weighted AI mark for an answer (0–10, rounded to 2 d.p.).
     * Returns {@code null} if none of the four score dimensions are set.
     */
    public static Double computeWeightedMark(Answer a) {
        boolean hasAny = a.getRelevanceScore()    != null
                      || a.getCompletenessScore() != null
                      || a.getClarityScore()      != null
                      || a.getGrammarScore()      != null;
        if (!hasAny) return null;

        double weightedSum   = 0.0;
        double appliedWeight = 0.0;

        if (a.getRelevanceScore()    != null) { weightedSum += W_RELEVANCE    * a.getRelevanceScore();    appliedWeight += W_RELEVANCE;    }
        if (a.getCompletenessScore() != null) { weightedSum += W_COMPLETENESS * a.getCompletenessScore(); appliedWeight += W_COMPLETENESS; }
        if (a.getClarityScore()      != null) { weightedSum += W_CLARITY      * a.getClarityScore();      appliedWeight += W_CLARITY;      }
        if (a.getGrammarScore()      != null) { weightedSum += W_GRAMMAR      * a.getGrammarScore();      appliedWeight += W_GRAMMAR;      }

        double mark = appliedWeight > 0 ? weightedSum / appliedWeight : 0.0;
        return Math.round(mark * 100.0) / 100.0;
    }
}
