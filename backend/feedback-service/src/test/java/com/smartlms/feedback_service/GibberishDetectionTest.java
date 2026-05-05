package com.smartlms.feedback_service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.LiveFeedbackResponse;
import com.smartlms.feedback_service.model.AnswerType;
import com.smartlms.feedback_service.model.TypeDetectionResult;
import com.smartlms.feedback_service.service.AnswerTypeDetector;
import com.smartlms.feedback_service.service.HuggingFaceService;
import com.smartlms.feedback_service.service.LiveFeedbackService;
import com.smartlms.feedback_service.service.TypeSpecificPromptBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Tests for the gibberish-detection gate in LiveFeedbackService.
 *
 * The gate (isGibberish / computeGibberishRatio / isGibberishWord) is private,
 * so tests drive it indirectly through generateLiveFeedback():
 *
 *  - Gibberish text  → service returns all-zero response WITHOUT calling the AI.
 *    These tests do NOT stub huggingFaceService — Mockito strict mode would throw
 *    UnnecessaryStubbingException if a stub was set up but never called.
 *
 *  - Legitimate text → service DOES call the AI.
 *    These tests stub huggingFaceService with a valid response, then assert
 *    scores are non-zero (proving the AI was reached).
 *
 * Key production bugs covered:
 *  - All-caps acronyms (SQL, XSS, VPN, HTTP) must NOT be flagged as gibberish.
 *  - Mixed letter+digit tokens (j4h, k3y) must be flagged as gibberish.
 *  - Real words with no vowels (e.g. "myth") are handled correctly.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Gibberish Detection — LiveFeedbackService gate")
class GibberishDetectionTest {

    @Mock private HuggingFaceService      huggingFaceService;
    @Mock private AnswerTypeDetector      answerTypeDetector;
    @Mock private TypeSpecificPromptBuilder typeSpecificPromptBuilder;

    @InjectMocks
    private LiveFeedbackService service;

    /** Low-confidence stub so the service always uses the generic prompt path. */
    @BeforeEach
    void setUp() {
        lenient().when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                .thenReturn(TypeDetectionResult.builder()
                        .type(AnswerType.UNKNOWN)
                        .confidence(0.30)
                        .reasoning("test stub")
                        .build());
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private LiveFeedbackRequest req(String answer) {
        return LiveFeedbackRequest.builder()
                .questionId("q1")
                .questionPrompt("What is SQL injection?")
                .answerText(answer)
                .maxPoints(5)
                .build();
    }

    /** Standard LLM response that confirms the AI was called (all scores non-zero). */
    private String validLlmResponse() {
        return "GRAMMAR: 7\nCLARITY: 7\nCOMPLETENESS: 6\nRELEVANCE: 8\n"
             + "STRENGTH1: Good explanation\nSTRENGTH2: Uses correct terminology\n"
             + "IMPROVEMENT1: Add an example\nIMPROVEMENT2: Expand the explanation\n"
             + "SUGGESTION1: Mention prevention\nSUGGESTION2: Describe the impact";
    }

    private LiveFeedbackResponse call(String answer) {
        return service.generateLiveFeedback(req(answer)).join().getData();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Gibberish → all zeros, AI NOT called
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Gibberish text → all-zero scores, AI not invoked")
    class GibberishRejected {

        @Test
        @DisplayName("Random lowercase smash scores all zeros")
        void randomLowercaseSmash_allZeros() {
            LiveFeedbackResponse fb = call("xkjdhf qlwpzm bvcxnm asdfgh");
            assertAllZero(fb);
        }

        @Test
        @DisplayName("No-vowel words score all zeros")
        void noVowelWords_allZeros() {
            // "krlj", "bxvn" — all consonants, no vowels
            LiveFeedbackResponse fb = call("krlj bxvn fghj krtl");
            assertAllZero(fb);
        }

        @Test
        @DisplayName("Mixed letter+digit tokens (keyboard mashing) score all zeros")
        void mixedLetterDigit_allZeros() {
            // j4h, k3rl, 0-9e, m1x → all detected as gibberish words
            LiveFeedbackResponse fb = call("j4h k3rl m1x e8wq");
            assertAllZero(fb);
        }

        @Test
        @DisplayName("Long consonant run (≥4) detected as gibberish")
        void longConsonantRun_allZeros() {
            // "strpt" has consonant run s,t,r,p,t = 5 — should be flagged
            LiveFeedbackResponse fb = call("strpt brtsk frplt krtsk");
            assertAllZero(fb);
        }

        @Test
        @DisplayName("Gibberish feedback response contains helpful guidance message")
        void gibberishResponse_containsGuidance() {
            LiveFeedbackResponse fb = call("xkjdhf qlwpzm bvcxnm");
            assertThat(fb.getImprovements())
                    .anyMatch(s -> s.toLowerCase().contains("gibberish")
                            || s.toLowerCase().contains("random")
                            || s.toLowerCase().contains("meaningful"));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Legitimate text → AI called, non-zero scores returned
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Legitimate text → AI invoked, non-zero scores returned")
    class LegitimateText {

        @Test
        @DisplayName("All-caps acronym 'SQL injection' is NOT treated as gibberish")
        void sqlAcronym_notGibberish() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("SQL injection");
            assertSomeNonZero(fb);
        }

        @Test
        @DisplayName("'XSS attack' with all-caps acronym passes the gibberish gate")
        void xssAcronym_notGibberish() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("XSS attack exploits client-side scripts");
            assertSomeNonZero(fb);
        }

        @Test
        @DisplayName("'VPN tunnel' with all-caps acronym passes the gibberish gate")
        void vpnAcronym_notGibberish() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("VPN tunnel encrypts all outbound traffic");
            assertSomeNonZero(fb);
        }

        @Test
        @DisplayName("'HTTP and HTTPS protocols' passes the gibberish gate")
        void httpAcronym_notGibberish() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("HTTP and HTTPS are web protocols");
            assertSomeNonZero(fb);
        }

        @Test
        @DisplayName("Normal sentence without acronyms passes the gibberish gate")
        void normalSentence_notGibberish() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("A firewall filters network traffic based on security rules");
            assertSomeNonZero(fb);
        }

        @Test
        @DisplayName("Very short but valid answer 'TCP' (acronym) passes gate")
        void shortAcronymAnswer_notGibberish() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("TCP protocol");
            assertSomeNonZero(fb);
        }

        @Test
        @DisplayName("Mixed normal and technical words: answer with ≤ 20% gibberish-looking words passes")
        void mostlyRealWords_passesGate() {
            // 4 real words + 1 suspicious = 20% — below the 35% gate threshold
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(validLlmResponse());
            LiveFeedbackResponse fb = call("SQL injection attacks database queries maliciously");
            assertSomeNonZero(fb);
        }
    }

    // ─── Assertion helpers ────────────────────────────────────────────────────

    private void assertAllZero(LiveFeedbackResponse fb) {
        assertThat(fb.getGrammarScore()).as("grammar").isEqualTo(0.0);
        assertThat(fb.getClarityScore()).as("clarity").isEqualTo(0.0);
        assertThat(fb.getCompletenessScore()).as("completeness").isEqualTo(0.0);
        assertThat(fb.getRelevanceScore()).as("relevance").isEqualTo(0.0);
    }

    private void assertSomeNonZero(LiveFeedbackResponse fb) {
        double sum = fb.getGrammarScore() + fb.getClarityScore()
                   + fb.getCompletenessScore() + fb.getRelevanceScore();
        assertThat(sum).as("sum of all scores must be > 0 (AI was reached)").isGreaterThan(0.0);
    }
}
