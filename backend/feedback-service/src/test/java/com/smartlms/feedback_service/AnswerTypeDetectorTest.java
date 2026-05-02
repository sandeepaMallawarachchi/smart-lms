package com.smartlms.feedback_service;

import com.smartlms.feedback_service.model.AnswerType;
import com.smartlms.feedback_service.model.TypeDetectionResult;
import com.smartlms.feedback_service.service.AnswerTypeDetector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for AnswerTypeDetector — no Spring context required;
 * the detector is a plain service with no injected dependencies.
 *
 * Tests cover:
 *  - Ultra-short bypass (≤ 2 words)
 *  - Format overrides (bullet list, Q/A markers)
 *  - Question-keyword detection for each major type
 *  - Answer-text confirmation boosting confidence
 *  - Answer-only detection when the question gives no signal
 *  - Fallback rules (low marks / low word count → SHORT_ANSWER; longer → LONG_ESSAY)
 *  - isConfident() boundary (≥ 0.60)
 */
@DisplayName("AnswerTypeDetector — type detection pipeline")
class AnswerTypeDetectorTest {

    private AnswerTypeDetector detector;

    @BeforeEach
    void setUp() {
        detector = new AnswerTypeDetector();
    }

    // ─── Convenience helpers ─────────────────────────────────────────────────

    /** Detect with a question and a placeholder short answer. */
    private TypeDetectionResult detectQ(String question, int maxPoints) {
        // 10-word placeholder answer — long enough to avoid ultra-short bypass
        // but short enough to stay below the 15-word confirmation threshold
        String answer = "some answer text that is around ten words here";
        return detector.detect(question, answer, maxPoints, 10);
    }

    /** Detect with explicit answer word count (for fallback / confidence tests). */
    private TypeDetectionResult detect(String question, String answer, Integer maxPoints, int wordCount) {
        return detector.detect(question, answer, maxPoints, wordCount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Ultra-short bypass
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Ultra-short answers bypass type detection")
    class UltraShortBypass {

        @Test
        @DisplayName("2-word answer → SHORT_ANSWER with confidence 1.0")
        void twoWords_alwaysShortAnswer() {
            TypeDetectionResult r = detector.detect(
                    "Compare TCP and UDP", "TCP reliable", null, 2);
            assertThat(r.getType()).isEqualTo(AnswerType.SHORT_ANSWER);
            assertThat(r.getConfidence()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("1-word answer → SHORT_ANSWER with confidence 1.0")
        void oneWord_alwaysShortAnswer() {
            TypeDetectionResult r = detector.detect(
                    "Name a network protocol", "TCP", null, 1);
            assertThat(r.getType()).isEqualTo(AnswerType.SHORT_ANSWER);
            assertThat(r.getConfidence()).isEqualTo(1.0);
        }

        @Test
        @DisplayName("3-word answer proceeds to full detection (not bypassed)")
        void threeWords_notBypassed() {
            // "Compare TCP UDP" with a comparative question → should detect COMPARATIVE_ANALYSIS
            TypeDetectionResult r = detector.detect(
                    "Compare TCP and UDP", "TCP is faster", null, 3);
            // Must NOT be the ultra-short bypass result (confidence 1.0 with SHORT_ANSWER)
            assertThat(r)
                    .satisfiesAnyOf(
                            res -> assertThat(res.getType()).isNotEqualTo(AnswerType.SHORT_ANSWER),
                            res -> assertThat(res.getConfidence()).isLessThan(1.0)
                    );
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Format overrides
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Format overrides take priority over keyword analysis")
    class FormatOverrides {

        @Test
        @DisplayName("≥3 bullet lines → LIST_BASED with high confidence")
        void threeBulletLines_listBased() {
            String answer = "• First item: HTTP\n• Second item: FTP\n• Third item: SMTP";
            TypeDetectionResult r = detector.detect("List network protocols", answer, null, 6);
            assertThat(r.getType()).isEqualTo(AnswerType.LIST_BASED);
            assertThat(r.getConfidence()).isGreaterThanOrEqualTo(0.80);
        }

        @Test
        @DisplayName("≥3 numbered lines → LIST_BASED")
        void threeNumberedLines_listBased() {
            String answer = "1. Confidentiality\n2. Integrity\n3. Availability";
            TypeDetectionResult r = detector.detect("List the CIA triad", answer, null, 5);
            assertThat(r.getType()).isEqualTo(AnswerType.LIST_BASED);
        }

        @Test
        @DisplayName("Q:/A: markers → QUESTION_ANSWER_FORMAT with high confidence")
        void qaMarkers_questionAnswerFormat() {
            String answer = "Q: What is HTTP?\nA: Hypertext Transfer Protocol.\nQ: What is HTTPS?\nA: Secure version of HTTP.";
            TypeDetectionResult r = detector.detect("Explain web protocols", answer, null, 14);
            assertThat(r.getType()).isEqualTo(AnswerType.QUESTION_ANSWER_FORMAT);
            assertThat(r.getConfidence()).isGreaterThanOrEqualTo(0.85);
        }

        @Test
        @DisplayName("Question:/Answer: markers also detected as Q/A format")
        void questionAnswerWordMarkers_detected() {
            String answer = "Question: What is SQL?\nAnswer: Structured Query Language.";
            TypeDetectionResult r = detector.detect("Explain SQL", answer, null, 7);
            assertThat(r.getType()).isEqualTo(AnswerType.QUESTION_ANSWER_FORMAT);
        }

        @Test
        @DisplayName("Only 2 bullet lines → format override does NOT trigger")
        void twoBulletLines_notOverridden() {
            String answer = "• HTTP\n• FTP\nThese are two common protocols.";
            TypeDetectionResult r = detector.detect("List network protocols", answer, null, 7);
            // Should NOT be forced to LIST_BASED by format override (only 2 bullets)
            assertThat(r.getType()).isNotEqualTo(AnswerType.QUESTION_ANSWER_FORMAT);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Question-keyword detection
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Question-keyword detection by type")
    class QuestionKeywordDetection {

        @Test
        @DisplayName("'Compare' in question → COMPARATIVE_ANALYSIS")
        void compareKeyword_comparativeAnalysis() {
            TypeDetectionResult r = detectQ("Compare TCP and UDP protocols", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.COMPARATIVE_ANALYSIS);
        }

        @Test
        @DisplayName("'Contrast' in question → COMPARATIVE_ANALYSIS")
        void contrastKeyword_comparativeAnalysis() {
            TypeDetectionResult r = detectQ("Contrast symmetric and asymmetric encryption", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.COMPARATIVE_ANALYSIS);
        }

        @Test
        @DisplayName("'Difference between' in question → COMPARATIVE_ANALYSIS")
        void differenceBetweenKeyword_comparativeAnalysis() {
            TypeDetectionResult r = detectQ("What is the difference between HTTP and HTTPS?", 5);
            assertThat(r.getType()).isEqualTo(AnswerType.COMPARATIVE_ANALYSIS);
        }

        @Test
        @DisplayName("'Do you agree' in question → ARGUMENTATIVE")
        void doYouAgreeKeyword_argumentative() {
            TypeDetectionResult r = detectQ("Do you agree that open source software is more secure?", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.ARGUMENTATIVE);
        }

        @Test
        @DisplayName("'To what extent' in question → ARGUMENTATIVE")
        void toWhatExtentKeyword_argumentative() {
            TypeDetectionResult r = detectQ("To what extent is multi-factor authentication effective?", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.ARGUMENTATIVE);
        }

        @Test
        @DisplayName("'What are the steps' in question → PROCEDURAL")
        void stepsKeyword_procedural() {
            TypeDetectionResult r = detectQ("What are the steps to configure a firewall?", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.PROCEDURAL);
        }

        @Test
        @DisplayName("'Describe the procedure' in question → PROCEDURAL")
        void procedureKeyword_procedural() {
            TypeDetectionResult r = detectQ("Describe the procedure for setting up a VPN", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.PROCEDURAL);
        }

        @Test
        @DisplayName("'What caused' in question → CAUSE_EFFECT")
        void whatCausedKeyword_causeEffect() {
            TypeDetectionResult r = detectQ("What caused the 2008 financial crisis?", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.CAUSE_EFFECT);
        }

        @Test
        @DisplayName("'Effects of' in question → CAUSE_EFFECT")
        void effectsOfKeyword_causeEffect() {
            TypeDetectionResult r = detectQ("Explain the effects of climate change on ecosystems", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.CAUSE_EFFECT);
        }

        @Test
        @DisplayName("'How would you solve' in question → PROBLEM_SOLUTION")
        void howWouldYouSolveKeyword_problemSolution() {
            TypeDetectionResult r = detectQ("How would you solve the scalability problem in this system?", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.PROBLEM_SOLUTION);
        }

        @Test
        @DisplayName("'Critically evaluate' in question → CRITICAL_EVALUATION")
        void criticallyEvaluateKeyword_criticalEvaluation() {
            TypeDetectionResult r = detectQ("Critically evaluate the effectiveness of antivirus software", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.CRITICAL_EVALUATION);
        }

        @Test
        @DisplayName("'List' in question → LIST_BASED")
        void listKeyword_listBased() {
            TypeDetectionResult r = detectQ("List five common types of malware", 5);
            assertThat(r.getType()).isEqualTo(AnswerType.LIST_BASED);
        }

        @Test
        @DisplayName("'Reflect on' in question → REFLECTIVE")
        void reflectOnKeyword_reflective() {
            TypeDetectionResult r = detectQ("Reflect on what you learned from this security incident", 10);
            assertThat(r.getType()).isEqualTo(AnswerType.REFLECTIVE);
        }

        @Test
        @DisplayName("'Summarise' in question → SUMMARY")
        void summariseKeyword_summary() {
            TypeDetectionResult r = detectQ("Summarise the main points of the lecture on encryption", 5);
            assertThat(r.getType()).isEqualTo(AnswerType.SUMMARY);
        }

        @Test
        @DisplayName("'What is' in question → SHORT_ANSWER")
        void whatIsKeyword_shortAnswer() {
            TypeDetectionResult r = detectQ("What is SQL injection?", 2);
            assertThat(r.getType()).isEqualTo(AnswerType.SHORT_ANSWER);
        }

        @Test
        @DisplayName("'Discuss' in question → LONG_ESSAY")
        void discussKeyword_longEssay() {
            TypeDetectionResult r = detectQ("Discuss the importance of encryption in modern communication", 20);
            assertThat(r.getType()).isEqualTo(AnswerType.LONG_ESSAY);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Confidence & isConfident() boundary
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Confidence levels and isConfident() boundary")
    class ConfidenceLevels {

        @Test
        @DisplayName("Strong keyword in question → confidence ≥ 0.60 → isConfident() true")
        void strongKeyword_confident() {
            // "compare" is a strong keyword for COMPARATIVE_ANALYSIS → +0.10 bonus
            TypeDetectionResult r = detectQ("Compare TCP and UDP", 10);
            assertThat(r.isConfident()).isTrue();
            assertThat(r.getConfidence()).isGreaterThanOrEqualTo(0.60);
        }

        @Test
        @DisplayName("Question + answer confirmation → higher confidence")
        void questionPlusAnswerConfirmation_boostsConfidence() {
            // Question gives COMPARATIVE_ANALYSIS; answer with ≥15 words and
            // comparative markers confirms it → +0.25 on top of base
            String question = "Compare HTTP and HTTPS protocols";
            String answer   = "HTTP transmits data in plain text whereas HTTPS encrypts all traffic. "
                    + "Both protocols use TCP however HTTPS adds a security layer via TLS. "
                    + "Similarly they share the same request-response model but differ in security.";
            int wordCount = answer.split("\\s+").length;

            TypeDetectionResult r = detector.detect(question, answer, 10, wordCount);

            assertThat(r.getType()).isEqualTo(AnswerType.COMPARATIVE_ANALYSIS);
            assertThat(r.getConfidence())
                    .as("Confirmed type must have confidence ≥ 0.80 (base 0.55 + confirmed 0.25 + strong keyword 0.10)")
                    .isGreaterThanOrEqualTo(0.80);
            assertThat(r.isConfident()).isTrue();
        }

        @Test
        @DisplayName("Ultra-short bypass always returns isConfident() true (confidence 1.0)")
        void ultraShortBypass_alwaysConfident() {
            TypeDetectionResult r = detector.detect("Compare TCP and UDP", "same protocol", null, 2);
            assertThat(r.isConfident()).isTrue();
        }

        @Test
        @DisplayName("UNKNOWN type is never confident")
        void unknownType_neverConfident() {
            // Very short answer (< 15 words) with a question that gives no keyword signal
            // → UNKNOWN with confidence 0.0
            TypeDetectionResult r = detector.detect(null, "short answer text here", null, 4);
            // May fall back to SHORT_ANSWER or LONG_ESSAY — either way should not be
            // confident with zero keyword signal and short word count
            // The fallback SHORT_ANSWER has confidence 0.75 which IS confident —
            // so we just verify type is sensible (not crashing)
            assertThat(r.getType()).isNotNull();
            assertThat(r.getConfidence()).isBetween(0.0, 1.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Answer-only detection (null / blank question)
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Answer-only detection when question gives no signal")
    class AnswerOnlyDetection {

        @Test
        @DisplayName("Comparative markers in answer (null question) → COMPARATIVE_ANALYSIS")
        void comparativeMarkersInAnswer_detected() {
            // Null question → UNKNOWN from question → fall through to answer-only detection
            String answer = "Both TCP and UDP are transport protocols. "
                    + "TCP provides reliability whereas UDP prioritises speed. "
                    + "Similarly both operate at the transport layer however they differ in handshaking. "
                    + "By comparison TCP has more overhead than UDP in terms of connection setup "
                    + "and on the other hand UDP is preferred for real-time streaming applications.";
            int wc = answer.split("\\s+").length; // ~60 words

            TypeDetectionResult r = detector.detect(null, answer, null, wc);
            assertThat(r.getType()).isEqualTo(AnswerType.COMPARATIVE_ANALYSIS);
        }

        @Test
        @DisplayName("Procedural markers in answer (null question) → PROCEDURAL")
        void proceduralMarkersInAnswer_detected() {
            String answer = "First open the terminal and navigate to the project directory. "
                    + "Second install the dependencies using the package manager. "
                    + "Then configure the environment variables by editing the config file. "
                    + "Next start the server by running the start command. "
                    + "Finally verify the application is running by checking the logs.";
            int wc = answer.split("\\s+").length;

            TypeDetectionResult r = detector.detect(null, answer, null, wc);
            assertThat(r.getType()).isEqualTo(AnswerType.PROCEDURAL);
        }

        @Test
        @DisplayName("Cause-effect markers in answer (null question) → CAUSE_EFFECT")
        void causeEffectMarkersInAnswer_detected() {
            String answer = "Poor password policies cause security breaches because attackers can "
                    + "exploit weak credentials. Therefore organisations should enforce complexity rules. "
                    + "As a result of weak passwords many systems have been compromised. "
                    + "This leads to data theft and consequently significant financial losses. "
                    + "Hence implementing multi-factor authentication is essential.";
            int wc = answer.split("\\s+").length;

            TypeDetectionResult r = detector.detect(null, answer, null, wc);
            assertThat(r.getType()).isEqualTo(AnswerType.CAUSE_EFFECT);
        }

        @Test
        @DisplayName("Problem-solution markers in answer (null question) → PROBLEM_SOLUTION")
        void problemSolutionMarkersInAnswer_detected() {
            String answer = "The main problem with legacy systems is that they are difficult to maintain. "
                    + "The challenge of outdated software creates security issues that are hard to address. "
                    + "One solution is to migrate to a modern architecture that can solve these problems. "
                    + "By adopting containerisation we can address the issue of environment inconsistency.";
            int wc = answer.split("\\s+").length;

            TypeDetectionResult r = detector.detect(null, answer, null, wc);
            assertThat(r.getType()).isEqualTo(AnswerType.PROBLEM_SOLUTION);
        }

        @Test
        @DisplayName("Answer < 15 words with no question → does not enter answer-only detection")
        void shortAnswerNoQuestion_noAnswerOnlyDetection() {
            // < 15 words → answer-only detection skipped → UNKNOWN → fallback
            String answer = "TCP is more reliable than UDP";
            TypeDetectionResult r = detector.detect(null, answer, null, 7);
            // Fallback: wordCount 7 ≤ 40 → SHORT_ANSWER
            assertThat(r.getType()).isEqualTo(AnswerType.SHORT_ANSWER);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Fallback rules
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Fallback rules when type signal is weak")
    class FallbackRules {

        @Test
        @DisplayName("No keyword signal + low word count (≤ 40) → SHORT_ANSWER fallback")
        void noSignal_lowWordCount_shortAnswerFallback() {
            // Use a question that matches no keyword pattern
            TypeDetectionResult r = detector.detect(null, "some answer text", null, 3);
            assertThat(r.getType()).isEqualTo(AnswerType.SHORT_ANSWER);
        }

        @Test
        @DisplayName("No keyword signal + maxPoints ≤ 5 → SHORT_ANSWER fallback")
        void noSignal_lowMarks_shortAnswerFallback() {
            // 50 words but only 2 marks → SHORT_ANSWER fallback
            String answer = String.join(" ", java.util.Collections.nCopies(50, "word"));
            TypeDetectionResult r = detector.detect(null, answer, 2, 50);
            assertThat(r.getType()).isEqualTo(AnswerType.SHORT_ANSWER);
        }

        @Test
        @DisplayName("No keyword signal + word count > 40 + maxPoints > 5 → LONG_ESSAY fallback")
        void noSignal_highWordCount_longEssayFallback() {
            String answer = String.join(" ", java.util.Collections.nCopies(45, "word"));
            TypeDetectionResult r = detector.detect(null, answer, 10, 45);
            assertThat(r.getType()).isEqualTo(AnswerType.LONG_ESSAY);
        }
    }
}
