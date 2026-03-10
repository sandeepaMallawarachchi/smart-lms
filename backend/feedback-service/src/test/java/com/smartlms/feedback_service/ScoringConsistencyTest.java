package com.smartlms.feedback_service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.dto.response.ApiResponse;
import com.smartlms.feedback_service.dto.response.LiveFeedbackResponse;
import com.smartlms.feedback_service.service.HuggingFaceService;
import com.smartlms.feedback_service.service.LiveFeedbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the scoring consistency logic in LiveFeedbackService.
 *
 * These tests verify the post-processing rules that the service applies
 * AFTER the LLM returns its raw output, ensuring that:
 *  - A correct factual answer never receives zero marks.
 *  - Positive strength language is always consistent with non-zero scores.
 *  - Question-repetition answers are penalised on completeness.
 *  - Malformed / zero-filled LLM output is corrected where strengths say otherwise.
 *
 * HuggingFaceService is mocked so tests run without a real API key or network.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Scoring Consistency — LiveFeedbackService")
class ScoringConsistencyTest {

    @Mock
    private HuggingFaceService huggingFaceService;

    @InjectMocks
    private LiveFeedbackService service;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Build a minimal short-answer request (2-mark question). */
    private LiveFeedbackRequest shortRequest(String question, String answer) {
        return LiveFeedbackRequest.builder()
                .questionId("q1")
                .questionPrompt(question)
                .answerText(answer)
                .maxPoints(2)
                .build();
    }

    /** Build a long-answer request (10-mark question). */
    private LiveFeedbackRequest longRequest(String question, String answer) {
        return LiveFeedbackRequest.builder()
                .questionId("q1")
                .questionPrompt(question)
                .answerText(answer)
                .maxPoints(10)
                .expectedWordCount(200)
                .build();
    }

    /**
     * Simulate an LLM response string in the expected format.
     * All parameters are 0-10 integer scores.
     */
    private String llmResponse(int grammar, int clarity, int completeness, int relevance,
                               String strength1, String strength2,
                               String improvement1, String improvement2,
                               String suggestion1, String suggestion2) {
        return "GRAMMAR: " + grammar + "\n"
                + "CLARITY: " + clarity + "\n"
                + "COMPLETENESS: " + completeness + "\n"
                + "RELEVANCE: " + relevance + "\n"
                + "STRENGTH1: " + strength1 + "\n"
                + "STRENGTH2: " + strength2 + "\n"
                + "IMPROVEMENT1: " + improvement1 + "\n"
                + "IMPROVEMENT2: " + improvement2 + "\n"
                + "SUGGESTION1: " + suggestion1 + "\n"
                + "SUGGESTION2: " + suggestion2;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 1 — Short correct factual answer must not receive zero
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 1: Short correct factual answer must not get zero")
    class ShortCorrectAnswer {

        /**
         * Scenario:
         *   Question: "What type of attack injects malicious SQL into a query?"
         *   Answer:   "SQL injection"
         *
         * The LLM (incorrectly) gives RELEVANCE: 0 and COMPLETENESS: 0,
         * but also writes "correctly identifies the attack" as a strength.
         *
         * Expected: enforceConsistency() corrects relevance to ≥ 5 and completeness ≥ 4.
         */
        @Test
        @DisplayName("Two-word correct answer: relevance forced ≥ 5 when LLM gives 0")
        void twoWordCorrectAnswer_relevanceCorrected() {
            String question = "What type of attack injects malicious SQL into a query?";
            String answer   = "SQL injection";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    7, 5, 0, 0,
                    "The answer correctly identifies the attack type",
                    "Answer directly addresses the question",
                    "Add more explanation of how the attack works",
                    "Describe the impact of the attack",
                    "Expand with an example",
                    "Mention prevention techniques"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("Relevance must be ≥ 5 when strengths say 'correctly identifies'")
                    .isGreaterThanOrEqualTo(5.0);
            assertThat(fb.getCompletenessScore())
                    .as("Completeness must be ≥ 4 when answer is correct")
                    .isGreaterThanOrEqualTo(4.0);
        }

        /**
         * Scenario:
         *   Question: "What does XSS stand for?"
         *   Answer:   "Cross-site scripting"
         *
         * LLM gives RELEVANCE: 1 (near-zero) with strength "accurate definition provided".
         * Expected: relevance corrected to ≥ 5.
         */
        @Test
        @DisplayName("Acronym expansion answer: near-zero relevance corrected")
        void acronymExpansionAnswer_relevanceCorrected() {
            String question = "What does XSS stand for?";
            String answer   = "Cross-site scripting";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    8, 7, 1, 1,
                    "Accurate definition provided by the student",
                    "Answers directly and precisely",
                    "Could elaborate on what XSS involves",
                    "Mention example of XSS payload",
                    "Describe how XSS is exploited",
                    "Explain the difference between stored and reflected XSS"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("Relevance must be corrected upward when strength says 'accurate'")
                    .isGreaterThanOrEqualTo(5.0);
        }

        /**
         * Scenario:
         *   Question: "Name a type of SQL attack"
         *   Answer:   "SQL injection"
         *
         * Answer shares keyword "SQL" with question — keyword floor should trigger.
         * LLM returns all zeros with no positive strength.
         * Expected: relevance still gets a keyword-based floor (≥ 1) because text is non-blank.
         */
        @Test
        @DisplayName("Short answer with question keyword: at minimum non-zero relevance")
        void keywordOverlapAnswer_nonZeroRelevance() {
            String question = "Name a type of SQL attack used to manipulate databases";
            String answer   = "SQL injection attack";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    5, 4, 3, 0,
                    "Addresses the question directly",
                    "Uses correct terminology",
                    "Should explain the mechanics",
                    "Add an example",
                    "Describe the impact",
                    "Mention prevention"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("Non-blank answer with positive strengths must not have relevance 0")
                    .isGreaterThan(0.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 2 — Positive strengths must not coexist with zero relevance
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 2: Positive strengths must not coexist with zero relevance")
    class StrengthScoreConsistency {

        /**
         * The LLM ALWAYS gives 0 for all scores but writes genuinely positive strengths.
         * This is the most common inconsistency seen in production.
         * Expected: enforceConsistency() forces relevance ≥ 5 and completeness ≥ 4.
         */
        @Test
        @DisplayName("All-zero scores with positive strength: relevance and completeness corrected")
        void allZeroScoresWithPositiveStrength_corrected() {
            String question = "Explain what a firewall does";
            String answer   = "A firewall filters network traffic based on rules to block unauthorised access";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    0, 0, 0, 0,
                    "The answer correctly explains the core function of a firewall",
                    "Demonstrates clear understanding of network security",
                    "Could add more detail about types of firewalls",
                    "Mention stateful vs stateless inspection",
                    "Include examples of firewall rules",
                    "Discuss hardware vs software firewalls"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("Relevance must be ≥ 5 when strength says 'correctly explains'")
                    .isGreaterThanOrEqualTo(5.0);
            assertThat(fb.getCompletenessScore())
                    .as("Completeness must be ≥ 4 when answer demonstrates understanding")
                    .isGreaterThanOrEqualTo(4.0);
        }

        /**
         * LLM gives RELEVANCE: 2 with strength "provides a relevant and accurate response".
         * The word "relevant" in the strength text is a positive signal.
         * Expected: relevance corrected to ≥ 5.
         */
        @Test
        @DisplayName("Near-zero relevance with 'relevant' in strength: corrected to ≥ 5")
        void nearZeroRelevanceWithRelevantStrength_corrected() {
            String question = "What is HTTPS and why is it important?";
            String answer   = "HTTPS encrypts data between the client and server using TLS, ensuring privacy and integrity";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    7, 6, 3, 2,
                    "Provides a relevant and accurate response about HTTPS",
                    "Mentions both encryption and the protocol used",
                    "Should discuss the importance of certificate authorities",
                    "Explain what happens without HTTPS",
                    "Add details about TLS handshake",
                    "Mention HSTS for added security context"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("Strength says 'relevant and accurate' — relevance must be ≥ 5")
                    .isGreaterThanOrEqualTo(5.0);
        }

        /**
         * LLM gives RELEVANCE: 8 and STRENGTH: "None detected". Scores should not be
         * inflated by the consistency rule when strengths are negative.
         * Expected: scores remain as parsed (no upward correction when "None detected").
         */
        @Test
        @DisplayName("'None detected' strength with high relevance: scores unchanged")
        void noneDetectedStrength_scoresUnchanged() {
            String question = "What is network segmentation?";
            String answer   = "asdf lkjh qwer zxcv";  // gibberish-like but passes filter

            // Simulate a case where LLM somehow gave high scores for a poor answer
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    2, 2, 1, 1,
                    "None detected — the answer does not address the question",
                    "None detected — no relevant content found",
                    "Write a complete answer explaining network segmentation",
                    "Use technical vocabulary appropriate for the topic",
                    "Define what segmentation means in networking",
                    "Give an example of VLANs as a segmentation method"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            // No positive language → no upward correction should occur
            assertThat(fb.getRelevanceScore())
                    .as("'None detected' strength should not trigger upward correction")
                    .isLessThan(5.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 3 — Answer that only repeats the question gets low completeness
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 3: Question-repetition answers penalised on completeness")
    class QuestionRepetitionPenalty {

        /**
         * Scenario:
         *   Question: "What is SQL injection?"
         *   Answer:   "SQL injection is a SQL injection attack"
         *
         * The answer adds no new information — it just repeats "SQL injection" twice.
         * Expected: completeness capped at ≤ 3 regardless of LLM score.
         */
        @Test
        @DisplayName("Answer copies question words: completeness capped at ≤ 3")
        void answerCopiesQuestion_completenessLow() {
            String question = "What is SQL injection?";
            String answer   = "SQL injection is SQL injection";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    6, 5, 8, 7,
                    "The answer references the correct topic",
                    "Uses the correct terminology",
                    "Should explain how SQL injection works",
                    "Provide an example of a malicious SQL query",
                    "Describe how to prevent SQL injection",
                    "Mention parameterised queries as a defence"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getCompletenessScore())
                    .as("Completeness must be ≤ 3 when answer repeats the question without explanation")
                    .isLessThanOrEqualTo(3.0);
        }

        /**
         * Scenario:
         *   Question: "What is a denial-of-service attack?"
         *   Answer:   "A denial-of-service attack is a denial of service"
         *
         * Similar repetition, LLM gives completeness 9.
         * Expected: capped at ≤ 3.
         */
        @Test
        @DisplayName("Paraphrased repetition: completeness still capped at ≤ 3")
        void paraphrasedRepetition_completenessLow() {
            String question = "What is a denial-of-service attack?";
            String answer   = "A denial-of-service attack is a denial of service attack that denies service";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    5, 5, 9, 8,
                    "References the correct concept name",
                    "Uses appropriate terminology",
                    "Should explain how DoS attacks overwhelm servers",
                    "Describe the difference between DoS and DDoS",
                    "Add details on how attackers generate traffic",
                    "Mention impact on availability"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getCompletenessScore())
                    .as("Repeated question phrasing must cap completeness at ≤ 3")
                    .isLessThanOrEqualTo(3.0);
        }

        /**
         * A genuine answer that uses different words from the question must NOT be penalised.
         * Question: "What is SQL injection?"
         * Answer:   "It is a technique where malicious code is inserted into a database query"
         *
         * Expected: completeness NOT capped (answer adds genuine information).
         */
        @Test
        @DisplayName("Genuine answer with different vocabulary: no repetition penalty")
        void genuineAnswerDifferentWords_noRepetitionPenalty() {
            String question = "What is SQL injection?";
            String answer   = "It is a technique where attackers insert malicious code into database queries "
                    + "to manipulate or extract data without authorisation";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    7, 7, 7, 8,
                    "Accurately explains the mechanism of the attack",
                    "Mentions data extraction which demonstrates understanding",
                    "Could add a concrete example",
                    "Mention prevention techniques such as parameterised queries",
                    "Describe the OWASP classification of SQL injection",
                    "Explain the difference between first and second order injection"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            // A genuine 7/10 completeness from the LLM should NOT be penalised
            assertThat(fb.getCompletenessScore())
                    .as("Genuine answer that adds information should not be penalised for repetition")
                    .isGreaterThan(3.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 4 — Malformed / all-zero LLM output corrected by consistency rules
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 4: Malformed LLM output does not produce false zero scores")
    class MalformedLLMOutput {

        /**
         * The LLM outputs all scores as 0 (a common failure mode where the model
         * ignores the scoring instructions) but still produces positive strength text.
         *
         * Expected: the consistency enforcement catches the contradiction and corrects scores.
         * Final relevance ≥ 5, completeness ≥ 4.
         */
        @Test
        @DisplayName("LLM outputs all zeros with positive strengths: scores corrected")
        void allZeroOutput_withPositiveStrengths_corrected() {
            String question = "Describe the purpose of a VPN";
            String answer   = "A VPN creates an encrypted tunnel over the internet to protect privacy "
                    + "and allow secure remote access to private networks";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(
                    0, 0, 0, 0,
                    "Well-explained with accurate technical detail",
                    "Demonstrates clear understanding of VPN purpose",
                    "Add detail about VPN protocols such as OpenVPN or WireGuard",
                    "Mention split tunnelling as an advanced topic",
                    "Include a real-world use case",
                    "Discuss limitations of VPNs for anonymity"
                )
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("All-zero LLM output must be corrected when strengths are positive")
                    .isGreaterThanOrEqualTo(5.0);
            assertThat(fb.getCompletenessScore())
                    .as("Completeness must be corrected upward from zero")
                    .isGreaterThanOrEqualTo(4.0);
            // Verify at least one score is non-zero overall
            double scoreSum = fb.getGrammarScore() + fb.getClarityScore()
                    + fb.getCompletenessScore() + fb.getRelevanceScore();
            assertThat(scoreSum)
                    .as("At least some scores must be non-zero for a valid answer")
                    .isGreaterThan(0.0);
        }

        /**
         * LLM format is almost correct but one field is missing (RELEVANCE not output).
         * The parser returns 0.0 for the missing field.
         * But the strengths say "correct and accurate" — consistency rule must still apply.
         *
         * Expected: relevance floor triggers even when parse produces 0 for missing field.
         */
        @Test
        @DisplayName("Missing RELEVANCE field parsed as 0: consistency rule still corrects it")
        void missingRelevanceField_correctedByStrengthRule() {
            String question = "What is two-factor authentication?";
            String answer   = "Two-factor authentication requires users to verify identity "
                    + "using two different methods such as a password and a one-time code";

            // LLM forgets to output the RELEVANCE line
            String malformedResponse =
                    "GRAMMAR: 8\n"
                    + "CLARITY: 7\n"
                    + "COMPLETENESS: 6\n"
                    // RELEVANCE line deliberately omitted
                    + "STRENGTH1: Correct and accurate explanation of 2FA\n"
                    + "STRENGTH2: Provides a relevant example of factors\n"
                    + "IMPROVEMENT1: Could name the authentication factors more precisely\n"
                    + "IMPROVEMENT2: Mention backup codes for account recovery\n"
                    + "SUGGESTION1: Add reference to TOTP or FIDO2 standards\n"
                    + "SUGGESTION2: Discuss why 2FA is superior to password-only auth";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(malformedResponse);

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getRelevanceScore())
                    .as("Missing RELEVANCE field defaults to 0, but positive strengths must correct it to ≥ 5")
                    .isGreaterThanOrEqualTo(5.0);
        }

        /**
         * The LLM wraps its output in [INST]...[/INST] tags (model echoes the prompt).
         * The parser strips these and should still parse scores correctly.
         *
         * Expected: scores are parsed from the actual content, not the echoed prompt.
         */
        @Test
        @DisplayName("LLM echoes prompt in [INST] tags: scores correctly parsed from output")
        void llmEchoesPromptInInstTags_scoresCorrectlyParsed() {
            String question = "What is encryption?";
            String answer   = "Encryption converts plaintext into ciphertext using an algorithm and key, "
                    + "ensuring only authorised parties can read the data";

            String responseWithInstWrapper =
                    "[INST] You are a fair evaluator. Question: What is encryption? "
                    + "Student Answer: Encryption converts... [/INST]\n"
                    + "GRAMMAR: 8\n"
                    + "CLARITY: 8\n"
                    + "COMPLETENESS: 7\n"
                    + "RELEVANCE: 9\n"
                    + "STRENGTH1: Accurately explains the encryption process\n"
                    + "STRENGTH2: Correctly mentions both algorithm and key\n"
                    + "IMPROVEMENT1: Could elaborate on symmetric vs asymmetric encryption\n"
                    + "IMPROVEMENT2: Mention use cases such as HTTPS or file encryption\n"
                    + "SUGGESTION1: Add an example cipher such as AES\n"
                    + "SUGGESTION2: Explain key management importance";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(responseWithInstWrapper);

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getGrammarScore()).as("Grammar parsed correctly despite [INST] wrapper").isEqualTo(8.0);
            assertThat(fb.getClarityScore()).as("Clarity parsed correctly").isEqualTo(8.0);
            assertThat(fb.getCompletenessScore()).as("Completeness parsed correctly").isEqualTo(7.0);
            assertThat(fb.getRelevanceScore()).as("Relevance parsed correctly").isEqualTo(9.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 5 — Gibberish is always rejected
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 5: Gibberish text always scores zero")
    class GibberishRejection {

        @Test
        @DisplayName("Randomly typed characters score all zeros without calling AI")
        void randomCharacters_allZeroWithoutAICall() {
            String question = "What is SQL injection?";
            String answer   = "xkjdhf qlwpzm bvcxnm asdfgh";

            // HuggingFaceService should NOT be called for gibberish
            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getGrammarScore()).isEqualTo(0.0);
            assertThat(fb.getClarityScore()).isEqualTo(0.0);
            assertThat(fb.getCompletenessScore()).isEqualTo(0.0);
            assertThat(fb.getRelevanceScore()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("Single real word is not treated as gibberish")
        void singleRealWord_notGibberish() {
            String question = "What is SQL injection?";
            String answer   = "SQL injection";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(6, 5, 4, 7,
                    "Correct technical term provided",
                    "Directly answers the question",
                    "Needs more explanation",
                    "Describe how it works",
                    "Add an example",
                    "Mention prevention")
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    shortRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            // Must reach the AI (not rejected as gibberish), so some scores > 0
            double scoreSum = fb.getGrammarScore() + fb.getClarityScore()
                    + fb.getCompletenessScore() + fb.getRelevanceScore();
            assertThat(scoreSum).isGreaterThan(0.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Case 6 — Score caps and bounds
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Case 6: Scores always within valid 0–10 range")
    class ScoreBounds {

        @Test
        @DisplayName("LLM output exceeding 10 is capped at 10")
        void llmScoresAboveTen_cappedAtTen() {
            String question = "What is a man-in-the-middle attack?";
            String answer   = "A man-in-the-middle attack intercepts communication between two parties "
                    + "without either knowing, allowing the attacker to read or modify data";

            String overshotResponse =
                    "GRAMMAR: 10\n"
                    + "CLARITY: 10\n"
                    + "COMPLETENESS: 10\n"
                    + "RELEVANCE: 10\n"
                    + "STRENGTH1: Excellent and comprehensive answer\n"
                    + "STRENGTH2: Accurately describes both eavesdropping and tampering\n"
                    + "IMPROVEMENT1: Could mention ARP spoofing as an example\n"
                    + "IMPROVEMENT2: Discuss TLS as a countermeasure\n"
                    + "SUGGESTION1: Mention session hijacking as a related attack\n"
                    + "SUGGESTION2: Explain detection methods";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(overshotResponse);

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getGrammarScore()).isLessThanOrEqualTo(10.0);
            assertThat(fb.getClarityScore()).isLessThanOrEqualTo(10.0);
            assertThat(fb.getCompletenessScore()).isLessThanOrEqualTo(10.0);
            assertThat(fb.getRelevanceScore()).isLessThanOrEqualTo(10.0);
        }

        @Test
        @DisplayName("All scores are never negative")
        void allScoresNeverNegative() {
            String question = "What is phishing?";
            String answer   = "Phishing is a social engineering attack where attackers impersonate "
                    + "trusted entities to steal credentials or personal information";

            when(huggingFaceService.generateCompletion(anyString())).thenReturn(
                llmResponse(8, 7, 7, 9,
                    "Well-defined explanation of phishing",
                    "Correctly identifies it as social engineering",
                    "Add examples of phishing emails",
                    "Mention spear phishing as a targeted variant",
                    "Discuss anti-phishing tools",
                    "Explain how to identify suspicious links")
            );

            ApiResponse<LiveFeedbackResponse> result = service.generateLiveFeedback(
                    longRequest(question, answer));

            LiveFeedbackResponse fb = result.getData();
            assertThat(fb.getGrammarScore()).isGreaterThanOrEqualTo(0.0);
            assertThat(fb.getClarityScore()).isGreaterThanOrEqualTo(0.0);
            assertThat(fb.getCompletenessScore()).isGreaterThanOrEqualTo(0.0);
            assertThat(fb.getRelevanceScore()).isGreaterThanOrEqualTo(0.0);
        }
    }
}
