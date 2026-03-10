package com.smartlms.submission_management_service;

import com.smartlms.submission_management_service.model.Answer;
import com.smartlms.submission_management_service.repository.*;
import com.smartlms.submission_management_service.service.SubmissionService;
import com.smartlms.submission_management_service.service.VersionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the weighted AI mark formula used by both
 * SubmissionService and VersionService.
 *
 * Formula:  mark = 0.40 * relevance
 *                + 0.30 * completeness
 *                + 0.15 * clarity
 *                + 0.15 * grammar
 *
 * Relevance + completeness account for 70% of the mark because they measure
 * concept correctness — the primary goal of any answer.
 *
 * All private methods are accessed via reflection so tests remain fast
 * (no Spring context, no database).
 *
 * Tests cover:
 *   Case 5 — Weighted formula produces fair marks for short factual answers
 *   Case 6 — Both SubmissionService and VersionService use identical formulas
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Weighted Mark Formula — SubmissionService & VersionService")
class WeightedMarkFormulaTest {

    // ── Mocks injected into SubmissionService ───────────────────────────────
    @Mock private SubmissionRepository         submissionRepository;
    @Mock private AnswerRepository             answerRepository;
    @Mock private VersionService               versionService;       // dependency of SubmissionService

    // ── Mocks injected into VersionService ──────────────────────────────────
    @Mock private SubmissionVersionRepository       submissionVersionRepository;
    @Mock private VersionAnswerRepository           versionAnswerRepository;
    @Mock private VersionPlagiarismSourceRepository plagiarismSourceRepository;

    // Mockito calls the Lombok-generated all-args constructor using the @Mock fields above.
    @InjectMocks private SubmissionService submissionService;
    @InjectMocks private VersionService    versionServiceInstance;

    // ── Reflection helpers ───────────────────────────────────────────────────

    /**
     * Invoke SubmissionService.computeWeightedMark(Answer) via reflection.
     */
    private Double computeWeightedMark(Answer answer) throws Exception {
        Method m = SubmissionService.class.getDeclaredMethod("computeWeightedMark", Answer.class);
        m.setAccessible(true);
        return (Double) m.invoke(submissionService, answer);
    }

    /**
     * Invoke VersionService.computeAiMark(Answer) via reflection.
     */
    private Double computeAiMarkInVersionService(Answer answer) throws Exception {
        Method m = VersionService.class.getDeclaredMethod("computeAiMark", Answer.class);
        m.setAccessible(true);
        return (Double) m.invoke(versionServiceInstance, answer);
    }

    /** Build an Answer with the given four AI dimension scores. */
    private Answer answerWith(Double grammar, Double clarity, Double completeness, Double relevance) {
        Answer a = new Answer();
        a.setGrammarScore(grammar);
        a.setClarityScore(clarity);
        a.setCompletenessScore(completeness);
        a.setRelevanceScore(relevance);
        a.setAiGeneratedMark(null); // force recalculation
        return a;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 5 — Weighted formula produces fair marks for short factual answers
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 5: Weighted formula fair for short factual answers")
    class WeightedFormulaFairness {

        /**
         * Scenario: "SQL injection" as answer to "What is SQL injection?"
         *   Post-enforcement scores (after consistency rules):
         *     grammar=7, clarity=5, completeness=5, relevance=6
         *
         * Old flat average: (7+5+5+6)/4 = 5.75
         * New weighted:     0.15*7 + 0.15*5 + 0.30*5 + 0.40*6 = 1.05+0.75+1.50+2.40 = 5.70
         *
         * For a clearly correct short answer with RELEVANCE=8:
         * Old flat:  (7+5+5+8)/4 = 6.25
         * New:       0.15*7+0.15*5+0.30*5+0.40*8 = 1.05+0.75+1.50+3.20 = 6.50
         *
         * The weighted formula rewards correct relevance more.
         * Expected: mark in the range [5.5, 7.5] for typical short-correct input.
         */
        @Test
        @DisplayName("Typical short-correct answer: mark in fair range [5.5, 7.5]")
        void typicalShortCorrectAnswer_fairMark() throws Exception {
            // Scores reflecting a short-answer after consistency floors applied
            Answer answer = answerWith(7.0, 5.0, 5.0, 7.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark).isNotNull();
            // Expected: 0.15*7 + 0.15*5 + 0.30*5 + 0.40*7 = 1.05+0.75+1.50+2.80 = 6.10
            assertThat(mark)
                    .as("Short correct answer should score in the fair range [5.5, 7.5]")
                    .isBetween(5.5, 7.5);
        }

        /**
         * A perfectly correct, fully relevant answer should score ≥ 8/10.
         *   grammar=9, clarity=9, completeness=9, relevance=10
         * New: 0.15*9+0.15*9+0.30*9+0.40*10 = 1.35+1.35+2.70+4.00 = 9.40
         */
        @Test
        @DisplayName("Perfect answer (all 9-10 scores): mark ≥ 8.0")
        void perfectAnswer_markAboveEight() throws Exception {
            Answer answer = answerWith(9.0, 9.0, 9.0, 10.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark).isNotNull();
            assertThat(mark)
                    .as("Perfect scores should yield a mark ≥ 8.0")
                    .isGreaterThanOrEqualTo(8.0);
        }

        /**
         * Good grammar but completely wrong/irrelevant answer:
         *   grammar=9, clarity=8, completeness=1, relevance=1
         * Old flat:  (9+8+1+1)/4 = 4.75  — unfairly high because grammar inflates
         * New:       0.15*9+0.15*8+0.30*1+0.40*1 = 1.35+1.20+0.30+0.40 = 3.25
         *
         * The weighted formula correctly gives a lower mark to a wrong-but-well-written answer.
         * Expected: mark < 4.0
         */
        @Test
        @DisplayName("Well-written but irrelevant answer: mark < 4.0 (not inflated by grammar)")
        void goodGrammarWrongAnswer_markBelowFour() throws Exception {
            Answer answer = answerWith(9.0, 8.0, 1.0, 1.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark).isNotNull();
            assertThat(mark)
                    .as("High grammar on an irrelevant answer should NOT inflate the mark above 4.0")
                    .isLessThan(4.0);
        }

        /**
         * Correct concept, poor grammar — still deserves a pass mark.
         *   grammar=2, clarity=3, completeness=7, relevance=8
         * New: 0.15*2+0.15*3+0.30*7+0.40*8 = 0.30+0.45+2.10+3.20 = 6.05
         * Old: (2+3+7+8)/4 = 5.0
         *
         * Expected: mark ≥ 5.5 (grammar does not sink a conceptually correct answer)
         */
        @Test
        @DisplayName("Poor grammar but correct concept: mark ≥ 5.5 (concept wins)")
        void poorGrammarCorrectConcept_markPassFair() throws Exception {
            Answer answer = answerWith(2.0, 3.0, 7.0, 8.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark).isNotNull();
            assertThat(mark)
                    .as("Poor grammar should not prevent a conceptually correct answer from passing")
                    .isGreaterThanOrEqualTo(5.5);
        }

        /**
         * All scores are zero (blank or gibberish answer, caught upstream by gibberish
         * detector but also must hold as a safety net at formula level).
         * Expected: mark = 0.0 exactly.
         */
        @Test
        @DisplayName("All zero scores: mark exactly 0.0")
        void allZeroScores_markIsZero() throws Exception {
            Answer answer = answerWith(0.0, 0.0, 0.0, 0.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark).isNotNull();
            assertThat(mark)
                    .as("All-zero input must produce a zero mark")
                    .isEqualTo(0.0);
        }

        /**
         * Only relevance is present (other dimensions null — not yet scored).
         * Normalisation ensures the result is still on the 0–10 scale, not deflated.
         * Expected: mark = relevanceScore (since it's the only dimension, full weight).
         */
        @Test
        @DisplayName("Only relevance score present: normalised to relevance value")
        void onlyRelevancePresent_normalisedCorrectly() throws Exception {
            Answer answer = answerWith(null, null, null, 8.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark).isNotNull();
            // appliedWeight = 0.40, weightedSum = 0.40*8 = 3.2, normalised = 3.2/0.40 = 8.0
            assertThat(mark)
                    .as("Single dimension (relevance=8) should normalise to 8.0, not 3.2")
                    .isEqualTo(8.0);
        }

        /**
         * No scores at all (answer has not been AI-evaluated yet).
         * Expected: null (no mark available).
         */
        @Test
        @DisplayName("No scores at all: returns null (no AI evaluation yet)")
        void noScores_returnsNull() throws Exception {
            Answer answer = answerWith(null, null, null, null);

            Double mark = computeWeightedMark(answer);

            assertThat(mark)
                    .as("Answer with no AI scores must return null, not 0")
                    .isNull();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 6 — SubmissionService and VersionService use identical formula
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 6: SubmissionService and VersionService produce identical marks")
    class FormulaConsistencyAcrossServices {

        /**
         * Both services must produce identical marks for the same input scores.
         * VersionService.computeAiMark first checks if aiGeneratedMark is already set;
         * we pass null to force recalculation.
         *
         * Tested with multiple score combinations.
         */
        @Test
        @DisplayName("Short-answer scores: both services return identical mark")
        void shortAnswerScores_identicalMark() throws Exception {
            Answer answer = answerWith(7.0, 5.0, 6.0, 8.0);

            Double fromSubmission = computeWeightedMark(answer);
            Double fromVersion    = computeAiMarkInVersionService(answer);

            assertThat(fromSubmission).isNotNull();
            assertThat(fromVersion).isNotNull();
            assertThat(fromSubmission)
                    .as("SubmissionService and VersionService must produce the same mark")
                    .isEqualTo(fromVersion);
        }

        @Test
        @DisplayName("All-maximum scores: both services return identical mark")
        void allMaxScores_identicalMark() throws Exception {
            Answer answer = answerWith(10.0, 10.0, 10.0, 10.0);

            Double fromSubmission = computeWeightedMark(answer);
            Double fromVersion    = computeAiMarkInVersionService(answer);

            assertThat(fromSubmission).isEqualTo(fromVersion);
            assertThat(fromSubmission)
                    .as("All-maximum scores must yield 10.0")
                    .isEqualTo(10.0);
        }

        @Test
        @DisplayName("Partial scores (only grammar + relevance): both services identical")
        void partialScores_identicalMark() throws Exception {
            Answer answer = answerWith(6.0, null, null, 7.0);

            Double fromSubmission = computeWeightedMark(answer);
            Double fromVersion    = computeAiMarkInVersionService(answer);

            assertThat(fromSubmission).isNotNull();
            assertThat(fromVersion).isNotNull();
            assertThat(fromSubmission)
                    .as("Partial score normalisation must be identical across both services")
                    .isEqualTo(fromVersion);
        }

        @Test
        @DisplayName("VersionService returns existing aiGeneratedMark if already set (immutability)")
        void versionService_returnsExistingMarkIfSet() throws Exception {
            Answer answer = answerWith(3.0, 3.0, 3.0, 3.0);
            answer.setAiGeneratedMark(9.5); // pre-existing — must not be recalculated

            Double fromVersion = computeAiMarkInVersionService(answer);

            assertThat(fromVersion)
                    .as("VersionService must return the pre-existing aiGeneratedMark without recalculating")
                    .isEqualTo(9.5);
        }

        /**
         * Verify the concrete weight values by computing expected manually.
         * Formula: 0.40*R + 0.30*C + 0.15*Cl + 0.15*G
         */
        @Test
        @DisplayName("Formula weight verification: manual calculation matches output")
        void formulaWeightVerification() throws Exception {
            // Choose easy-to-calculate values
            double grammar      = 4.0;
            double clarity      = 6.0;
            double completeness = 8.0;
            double relevance    = 10.0;

            double expected = 0.15 * grammar + 0.15 * clarity + 0.30 * completeness + 0.40 * relevance;
            // = 0.60 + 0.90 + 2.40 + 4.00 = 7.90
            expected = Math.round(expected * 100.0) / 100.0;

            Answer answer = answerWith(grammar, clarity, completeness, relevance);
            Double fromSubmission = computeWeightedMark(answer);
            Double fromVersion    = computeAiMarkInVersionService(answer);

            assertThat(fromSubmission)
                    .as("SubmissionService mark must match manual calculation " + expected)
                    .isEqualTo(expected);
            assertThat(fromVersion)
                    .as("VersionService mark must match manual calculation " + expected)
                    .isEqualTo(expected);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 7 — Real-world example scenarios with expected mark ranges
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 7: Real-world answer scenarios with expected grade bands")
    class RealWorldScenarios {

        /**
         * "SQL injection" answering "What is SQL injection?"
         * After consistency enforcement the scores would be approximately:
         *   grammar=7, clarity=6, completeness=5, relevance=6
         * Mark = 0.15*7+0.15*6+0.30*5+0.40*6 = 1.05+0.90+1.50+2.40 = 5.85
         * Expected grade band: Pass (5–7 out of 10)
         */
        @Test
        @DisplayName("Scenario A: 'SQL injection' — two-word correct answer → Pass band [5, 7]")
        void scenarioA_twoWordCorrect_passBand() throws Exception {
            Answer answer = answerWith(7.0, 6.0, 5.0, 6.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark)
                    .as("Two-word correct factual answer should fall in Pass band [5, 7]")
                    .isBetween(5.0, 7.0);
        }

        /**
         * "Cross-site scripting" answering "What does XSS stand for?"
         * Perfect short answer: grammar=8, clarity=8, completeness=7, relevance=9
         * Mark = 0.15*8+0.15*8+0.30*7+0.40*9 = 1.20+1.20+2.10+3.60 = 8.10
         * Expected grade band: Merit (7–9 out of 10)
         */
        @Test
        @DisplayName("Scenario B: 'Cross-site scripting' — precise acronym → Merit band [7, 9]")
        void scenarioB_acronymExpansion_meritBand() throws Exception {
            Answer answer = answerWith(8.0, 8.0, 7.0, 9.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark)
                    .as("Precise factual expansion should fall in Merit band [7, 9]")
                    .isBetween(7.0, 9.5);
        }

        /**
         * "A firewall filters network traffic and monitors packets"
         * answering "What does a firewall do?"
         * Solid but brief: grammar=7, clarity=7, completeness=6, relevance=8
         * Mark = 0.15*7+0.15*7+0.30*6+0.40*8 = 1.05+1.05+1.80+3.20 = 7.10
         * Expected band: Merit (7–8)
         */
        @Test
        @DisplayName("Scenario C: Brief but complete definition → Merit band [6.5, 8.5]")
        void scenarioC_briefDefinition_meritBand() throws Exception {
            Answer answer = answerWith(7.0, 7.0, 6.0, 8.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark)
                    .as("Brief but complete definition should fall in Merit band [6.5, 8.5]")
                    .isBetween(6.5, 8.5);
        }

        /**
         * "A firewall is a firewall that does firewall things"
         * (question repetition, caught by LiveFeedbackService and completeness capped at 3)
         * Scores after repetition penalty: grammar=6, clarity=5, completeness=3, relevance=5
         * Mark = 0.15*6+0.15*5+0.30*3+0.40*5 = 0.90+0.75+0.90+2.00 = 4.55
         * Expected: below pass (< 5)
         */
        @Test
        @DisplayName("Scenario D: Question-repetition after penalty → Below-pass band [3, 5)")
        void scenarioD_questionRepetition_belowPass() throws Exception {
            // completeness=3 reflects cap applied by LiveFeedbackService
            Answer answer = answerWith(6.0, 5.0, 3.0, 5.0);

            Double mark = computeWeightedMark(answer);

            assertThat(mark)
                    .as("Repetition answer with completeness=3 should be below passing mark 5.0")
                    .isLessThan(5.0);
        }

        /**
         * Completely wrong answer with excellent grammar:
         *   "A firewall is a device used for printing documents." (wrong concept)
         * grammar=9, clarity=8, completeness=1, relevance=1
         * Old flat: (9+8+1+1)/4 = 4.75 — inflated by grammar
         * New:      0.15*9+0.15*8+0.30*1+0.40*1 = 1.35+1.20+0.30+0.40 = 3.25
         *
         * The weighted formula correctly prevents grammar from saving a wrong answer.
         * Expected: mark < 4.0
         */
        @Test
        @DisplayName("Scenario E: Wrong answer with high grammar → Weighted mark < 4.0")
        void scenarioE_wrongAnswerHighGrammar_lowMark() throws Exception {
            Answer answer = answerWith(9.0, 8.0, 1.0, 1.0);

            Double fromSubmission = computeWeightedMark(answer);
            Double oldFlatAverage = (9.0 + 8.0 + 1.0 + 1.0) / 4.0;

            assertThat(fromSubmission)
                    .as("Wrong answer with high grammar must score < 4.0")
                    .isLessThan(4.0);
            assertThat(fromSubmission)
                    .as("Weighted formula must score LOWER than old flat average for wrong-but-well-written answer")
                    .isLessThan(oldFlatAverage);
        }
    }
}
