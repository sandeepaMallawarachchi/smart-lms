package com.smartlms.feedback_service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.model.AnswerType;
import com.smartlms.feedback_service.service.TypeSpecificPromptBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for TypeSpecificPromptBuilder.
 *
 * TypeSpecificPromptBuilder is a Spring @Component with no injected dependencies,
 * so it can be instantiated directly — no Spring context or Mockito needed.
 *
 * Tests verify:
 *  1. Type-specific extra dimensions appear in the prompt for COMPARATIVE_ANALYSIS,
 *     ARGUMENTATIVE, and PROCEDURAL (the three types with extra LLM scoring keys).
 *  2. All prompts contain the four standard dimension keys (GRAMMAR, CLARITY,
 *     COMPLETENESS, RELEVANCE).
 *  3. All prompts embed the question text and answer text when provided.
 *  4. Mark information is included when maxPoints is set; omitted when null.
 *  5. Types that use standardFormat() do NOT include type-specific extra keys.
 *  6. UNKNOWN falls through to the long-essay generic prompt.
 */
@DisplayName("TypeSpecificPromptBuilder — prompt content verification")
class TypeSpecificPromptBuilderTest {

    private TypeSpecificPromptBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new TypeSpecificPromptBuilder();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private LiveFeedbackRequest req(String question, String answer, Integer maxPoints) {
        return LiveFeedbackRequest.builder()
                .questionId("q1")
                .questionPrompt(question)
                .answerText(answer)
                .maxPoints(maxPoints)
                .build();
    }

    private String build(AnswerType type, String question, String answer, Integer maxPoints) {
        LiveFeedbackRequest r = req(question, answer, maxPoints);
        int wordCount = answer.split("\\s+").length;
        return builder.buildPrompt(type, r, wordCount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Type-specific extra dimension keys
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Type-specific extra scoring dimensions")
    class TypeSpecificDimensions {

        @Test
        @DisplayName("COMPARATIVE_ANALYSIS prompt contains BALANCE: and COMPARISON_DEPTH:")
        void comparative_containsBalanceAndDepthKeys() {
            String prompt = build(AnswerType.COMPARATIVE_ANALYSIS,
                    "Compare TCP and UDP", "TCP is reliable whereas UDP is fast", 10);

            assertThat(prompt).contains("BALANCE:");
            assertThat(prompt).contains("COMPARISON_DEPTH:");
        }

        @Test
        @DisplayName("ARGUMENTATIVE prompt contains ARGUMENTATION_STRENGTH: and EVIDENCE_QUALITY:")
        void argumentative_containsArgAndEvidenceKeys() {
            String prompt = build(AnswerType.ARGUMENTATIVE,
                    "Do you agree that open source is more secure?",
                    "I believe open source is more secure because many eyes review the code", 10);

            assertThat(prompt).contains("ARGUMENTATION_STRENGTH:");
            assertThat(prompt).contains("EVIDENCE_QUALITY:");
        }

        @Test
        @DisplayName("PROCEDURAL prompt contains PROCEDURE_ACCURACY: and SEQUENCE_LOGIC:")
        void procedural_containsProcedureAndSequenceKeys() {
            String prompt = build(AnswerType.PROCEDURAL,
                    "What are the steps to set up a VPN?",
                    "First install the client then configure the server and finally connect", 10);

            assertThat(prompt).contains("PROCEDURE_ACCURACY:");
            assertThat(prompt).contains("SEQUENCE_LOGIC:");
        }

        @Test
        @DisplayName("COMPARATIVE_ANALYSIS prompt does NOT contain ARGUMENTATION_STRENGTH:")
        void comparative_doesNotContainArgKey() {
            String prompt = build(AnswerType.COMPARATIVE_ANALYSIS,
                    "Compare TCP and UDP", "TCP vs UDP comparison", 10);
            assertThat(prompt).doesNotContain("ARGUMENTATION_STRENGTH:");
        }

        @Test
        @DisplayName("ARGUMENTATIVE prompt does NOT contain BALANCE:")
        void argumentative_doesNotContainBalanceKey() {
            String prompt = build(AnswerType.ARGUMENTATIVE,
                    "Do you agree?", "I agree because of many reasons", 10);
            assertThat(prompt).doesNotContain("BALANCE:");
        }

        @Test
        @DisplayName("PROBLEM_SOLUTION uses standard format (no extra keys)")
        void problemSolution_standardFormatOnly() {
            String prompt = build(AnswerType.PROBLEM_SOLUTION,
                    "How would you solve the scalability problem?",
                    "The solution is to add more servers and use a load balancer", 10);

            assertThat(prompt).doesNotContain("BALANCE:");
            assertThat(prompt).doesNotContain("ARGUMENTATION_STRENGTH:");
            assertThat(prompt).doesNotContain("PROCEDURE_ACCURACY:");
        }

        @Test
        @DisplayName("LIST_BASED uses standard format (no extra keys)")
        void listBased_standardFormatOnly() {
            String prompt = build(AnswerType.LIST_BASED,
                    "List five types of malware",
                    "Virus, Worm, Trojan, Ransomware, Spyware", 5);

            assertThat(prompt).doesNotContain("BALANCE:");
            assertThat(prompt).doesNotContain("PROCEDURE_ACCURACY:");
        }

        @Test
        @DisplayName("CRITICAL_EVALUATION uses standard format (no extra keys)")
        void criticalEvaluation_standardFormatOnly() {
            String prompt = build(AnswerType.CRITICAL_EVALUATION,
                    "Critically evaluate the use of biometrics in authentication",
                    "Biometrics has advantages in convenience but weaknesses in privacy", 10);

            assertThat(prompt).doesNotContain("SEQUENCE_LOGIC:");
            assertThat(prompt).doesNotContain("EVIDENCE_QUALITY:");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Standard four dimensions — always present
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Standard four scoring dimensions always present")
    class StandardDimensionsAlwaysPresent {

        private void assertStandardKeys(String prompt) {
            assertThat(prompt).contains("GRAMMAR:");
            assertThat(prompt).contains("CLARITY:");
            assertThat(prompt).contains("COMPLETENESS:");
            assertThat(prompt).contains("RELEVANCE:");
            assertThat(prompt).contains("STRENGTH1:");
            assertThat(prompt).contains("IMPROVEMENT1:");
            assertThat(prompt).contains("SUGGESTION1:");
        }

        @Test
        @DisplayName("COMPARATIVE_ANALYSIS prompt has all standard keys")
        void comparative_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.COMPARATIVE_ANALYSIS, "Compare X and Y", "X vs Y", 10));
        }

        @Test
        @DisplayName("ARGUMENTATIVE prompt has all standard keys")
        void argumentative_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.ARGUMENTATIVE, "Do you agree?", "Yes I do", 10));
        }

        @Test
        @DisplayName("PROCEDURAL prompt has all standard keys")
        void procedural_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.PROCEDURAL, "List the steps", "First then next", 10));
        }

        @Test
        @DisplayName("PROBLEM_SOLUTION prompt has all standard keys")
        void problemSolution_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.PROBLEM_SOLUTION, "Solve the issue", "Use caching", 10));
        }

        @Test
        @DisplayName("CAUSE_EFFECT prompt has all standard keys")
        void causeEffect_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.CAUSE_EFFECT, "What caused this?", "Because of X", 10));
        }

        @Test
        @DisplayName("REFLECTIVE prompt has all standard keys")
        void reflective_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.REFLECTIVE, "Reflect on your learning", "I learned X", 10));
        }

        @Test
        @DisplayName("SHORT_ANSWER falls through to generic short prompt with all standard keys")
        void shortAnswer_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.SHORT_ANSWER, "What is SQL?", "A query language", 2));
        }

        @Test
        @DisplayName("LONG_ESSAY falls through to generic long prompt with all standard keys")
        void longEssay_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.LONG_ESSAY, "Discuss encryption", "Encryption is...", 20));
        }

        @Test
        @DisplayName("UNKNOWN falls through to long-essay generic prompt with all standard keys")
        void unknown_hasStandardKeys() {
            assertStandardKeys(build(AnswerType.UNKNOWN, "Some question", "Some answer text here", 10));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Question and answer text embedded in prompt
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Question and answer text embedded in all prompts")
    class TextEmbedding {

        @Test
        @DisplayName("Question text appears in COMPARATIVE_ANALYSIS prompt")
        void comparative_embedsQuestion() {
            String question = "Compare HTTP and HTTPS in terms of security";
            String prompt = build(AnswerType.COMPARATIVE_ANALYSIS, question, "some answer", 10);
            assertThat(prompt).contains(question);
        }

        @Test
        @DisplayName("Answer text appears in ARGUMENTATIVE prompt")
        void argumentative_embedsAnswer() {
            String answer = "I strongly believe that encryption should be mandatory for all data";
            String prompt = build(AnswerType.ARGUMENTATIVE, "Do you agree?", answer, 10);
            assertThat(prompt).contains(answer);
        }

        @Test
        @DisplayName("Both question and answer embedded in PROCEDURAL prompt")
        void procedural_embedsBoth() {
            String question = "Describe the procedure for password hashing";
            String answer   = "First hash the password using bcrypt then store the hash";
            String prompt   = build(AnswerType.PROCEDURAL, question, answer, 10);
            assertThat(prompt).contains(question);
            assertThat(prompt).contains(answer);
        }

        @Test
        @DisplayName("Null question prompt does not produce an NPE")
        void nullQuestion_noNpe() {
            LiveFeedbackRequest r = LiveFeedbackRequest.builder()
                    .questionId("q1")
                    .questionPrompt(null)
                    .answerText("some answer")
                    .maxPoints(5)
                    .build();
            String prompt = builder.buildPrompt(AnswerType.SHORT_ANSWER, r, 2);
            assertThat(prompt).isNotNull().isNotBlank();
            // Answer text still embedded; question context line should be absent
            assertThat(prompt).contains("some answer");
            assertThat(prompt).doesNotContain("Question: null");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mark information
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Mark information conditional on maxPoints")
    class MarkInformation {

        @Test
        @DisplayName("maxPoints set → mark info line appears in prompt")
        void maxPointsSet_markInfoPresent() {
            String prompt = build(AnswerType.COMPARATIVE_ANALYSIS, "Q", "A", 10);
            assertThat(prompt).contains("10 mark");
        }

        @Test
        @DisplayName("maxPoints null → no mark info line in prompt")
        void maxPointsNull_noMarkInfo() {
            String prompt = build(AnswerType.COMPARATIVE_ANALYSIS, "Q", "A", null);
            assertThat(prompt).doesNotContain("mark(s)");
        }

        @Test
        @DisplayName("maxPoints 2 → '2 mark(s)' appears in short-answer prompt")
        void maxPointsTwo_appearsInPrompt() {
            String prompt = build(AnswerType.SHORT_ANSWER, "What is SQL?", "A query language", 2);
            assertThat(prompt).contains("2 mark");
        }
    }
}
