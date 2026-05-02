package com.smartlms.feedback_service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
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
import static org.mockito.Mockito.when;

/**
 * Tests for the LLM response parsing path in LiveFeedbackService, with focus on:
 *
 *  1. Type-specific score extraction — BALANCE/COMPARISON_DEPTH for COMPARATIVE_ANALYSIS,
 *     ARGUMENTATION_STRENGTH/EVIDENCE_QUALITY for ARGUMENTATIVE,
 *     PROCEDURE_ACCURACY/SEQUENCE_LOGIC for PROCEDURAL.
 *
 *  2. Non-typed answers (low-confidence detection) → type-specific fields are null.
 *
 *  3. detectedAnswerType and typeConfidence are stamped on the final response.
 *
 *  4. A type-specific score of 0 in the LLM response is stored as null
 *     (the service treats 0 as "not provided").
 *
 *  5. Standard 4 scores are always parsed alongside type-specific ones.
 *
 * All tests use a confident TypeDetectionResult stub so the type-specific
 * parseResponse branch is exercised.  The TypeSpecificPromptBuilder is stubbed
 * to return a simple placeholder string (the actual prompt content is irrelevant
 * here — we are testing parsing, not prompt construction).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("LiveFeedbackService — type-specific score parsing")
class LiveFeedbackParsingTest {

    @Mock private HuggingFaceService        huggingFaceService;
    @Mock private AnswerTypeDetector        answerTypeDetector;
    @Mock private TypeSpecificPromptBuilder typeSpecificPromptBuilder;

    @InjectMocks
    private LiveFeedbackService service;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Build a confident TypeDetectionResult for the given type. */
    private TypeDetectionResult confident(AnswerType type) {
        return TypeDetectionResult.builder()
                .type(type)
                .confidence(0.85)
                .reasoning("test stub — confident")
                .build();
    }

    /** Build a low-confidence (not confident) TypeDetectionResult. */
    private TypeDetectionResult notConfident() {
        return TypeDetectionResult.builder()
                .type(AnswerType.UNKNOWN)
                .confidence(0.30)
                .reasoning("test stub — not confident")
                .build();
    }

    private LiveFeedbackRequest longReq(String question, String answer) {
        return LiveFeedbackRequest.builder()
                .questionId("q1")
                .questionPrompt(question)
                .answerText(answer)
                .maxPoints(10)
                .expectedWordCount(150)
                .build();
    }

    /** Standard LLM response for the 4 base scores plus type-specific extras. */
    private String comparativeResponse(int balance, int compDepth) {
        return "GRAMMAR: 7\nCLARITY: 7\nCOMPLETENESS: 7\nRELEVANCE: 7\n"
             + "BALANCE: " + balance + "\nCOMPARISON_DEPTH: " + compDepth + "\n"
             + "STRENGTH1: Good comparison\nSTRENGTH2: Covers both subjects\n"
             + "IMPROVEMENT1: Add more transitions\nIMPROVEMENT2: Elaborate on similarities\n"
             + "SUGGESTION1: Use contrast words\nSUGGESTION2: Add a conclusion";
    }

    private String argumentativeResponse(int argStrength, int evidenceQuality) {
        return "GRAMMAR: 7\nCLARITY: 7\nCOMPLETENESS: 7\nRELEVANCE: 7\n"
             + "ARGUMENTATION_STRENGTH: " + argStrength + "\nEVIDENCE_QUALITY: " + evidenceQuality + "\n"
             + "STRENGTH1: Clear position taken\nSTRENGTH2: Logical reasoning\n"
             + "IMPROVEMENT1: Add citations\nIMPROVEMENT2: Address counter-arguments\n"
             + "SUGGESTION1: Include statistics\nSUGGESTION2: Strengthen conclusion";
    }

    private String proceduralResponse(int procAccuracy, int seqLogic) {
        return "GRAMMAR: 7\nCLARITY: 7\nCOMPLETENESS: 7\nRELEVANCE: 7\n"
             + "PROCEDURE_ACCURACY: " + procAccuracy + "\nSEQUENCE_LOGIC: " + seqLogic + "\n"
             + "STRENGTH1: Correct steps listed\nSTRENGTH2: Clear order\n"
             + "IMPROVEMENT1: Add detail to each step\nIMPROVEMENT2: Verify step order\n"
             + "SUGGESTION1: Use numbered list\nSUGGESTION2: Add verification step";
    }

    private String standardResponse() {
        return "GRAMMAR: 7\nCLARITY: 7\nCOMPLETENESS: 7\nRELEVANCE: 7\n"
             + "STRENGTH1: Good answer\nSTRENGTH2: Relevant content\n"
             + "IMPROVEMENT1: Expand more\nIMPROVEMENT2: Add examples\n"
             + "SUGGESTION1: Review grammar\nSUGGESTION2: Add structure";
    }

    private String answer() {
        return "This is a valid answer with enough words to avoid gibberish detection "
             + "and pass the suspicious text check in enforce consistency logic";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPARATIVE_ANALYSIS type-specific score extraction
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("COMPARATIVE_ANALYSIS — BALANCE and COMPARISON_DEPTH extracted")
    class ComparativeParsing {

        @BeforeEach
        void stubConfidentComparative() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(confident(AnswerType.COMPARATIVE_ANALYSIS));
            when(typeSpecificPromptBuilder.buildPrompt(eq(AnswerType.COMPARATIVE_ANALYSIS), any(), anyInt()))
                    .thenReturn("dummy comparative prompt");
        }

        @Test
        @DisplayName("BALANCE:8 and COMPARISON_DEPTH:6 extracted and populated in response")
        void balanceAndDepthPopulated() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(comparativeResponse(8, 6));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Compare TCP and UDP", answer())).join().getData();

            assertThat(fb.getBalanceScore()).as("balanceScore").isEqualTo(8.0);
            assertThat(fb.getComparisonDepthScore()).as("comparisonDepthScore").isEqualTo(6.0);
        }

        @Test
        @DisplayName("Standard 4 scores also parsed correctly alongside comparative dimensions")
        void standardScoresAlsoParsed() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(comparativeResponse(7, 5));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Compare HTTP and HTTPS", answer())).join().getData();

            assertThat(fb.getGrammarScore()).as("grammar").isEqualTo(7.0);
            assertThat(fb.getClarityScore()).as("clarity").isEqualTo(7.0);
            assertThat(fb.getCompletenessScore()).as("completeness").isGreaterThan(0.0);
            assertThat(fb.getRelevanceScore()).as("relevance").isGreaterThan(0.0);
        }

        @Test
        @DisplayName("BALANCE:0 in response → balanceScore stored as null (not 0)")
        void zeroBalance_storedAsNull() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(comparativeResponse(0, 5));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Compare A and B", answer())).join().getData();

            assertThat(fb.getBalanceScore())
                    .as("BALANCE:0 should be stored as null, not 0.0")
                    .isNull();
        }

        @Test
        @DisplayName("ARGUMENTATION_STRENGTH and EVIDENCE_QUALITY not populated for COMPARATIVE type")
        void argScoresNotPopulatedForComparative() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(comparativeResponse(7, 6));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Compare TCP and UDP", answer())).join().getData();

            assertThat(fb.getArgumentationStrengthScore()).isNull();
            assertThat(fb.getEvidenceQualityScore()).isNull();
            assertThat(fb.getProcedureAccuracyScore()).isNull();
            assertThat(fb.getSequenceLogicScore()).isNull();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ARGUMENTATIVE type-specific score extraction
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("ARGUMENTATIVE — ARGUMENTATION_STRENGTH and EVIDENCE_QUALITY extracted")
    class ArgumentativeParsing {

        @BeforeEach
        void stubConfidentArgumentative() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(confident(AnswerType.ARGUMENTATIVE));
            when(typeSpecificPromptBuilder.buildPrompt(eq(AnswerType.ARGUMENTATIVE), any(), anyInt()))
                    .thenReturn("dummy argumentative prompt");
        }

        @Test
        @DisplayName("ARGUMENTATION_STRENGTH:8 and EVIDENCE_QUALITY:6 extracted and populated")
        void argStrengthAndEvidencePopulated() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(argumentativeResponse(8, 6));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Do you agree that encryption is essential?", answer())).join().getData();

            assertThat(fb.getArgumentationStrengthScore()).as("argumentationStrengthScore").isEqualTo(8.0);
            assertThat(fb.getEvidenceQualityScore()).as("evidenceQualityScore").isEqualTo(6.0);
        }

        @Test
        @DisplayName("BALANCE and comparison scores not populated for ARGUMENTATIVE type")
        void comparativeScoresNotPopulatedForArgumentative() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(argumentativeResponse(7, 5));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Do you agree?", answer())).join().getData();

            assertThat(fb.getBalanceScore()).isNull();
            assertThat(fb.getComparisonDepthScore()).isNull();
            assertThat(fb.getProcedureAccuracyScore()).isNull();
            assertThat(fb.getSequenceLogicScore()).isNull();
        }

        @Test
        @DisplayName("EVIDENCE_QUALITY:0 in response → evidenceQualityScore stored as null")
        void zeroEvidenceQuality_storedAsNull() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(argumentativeResponse(6, 0));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Do you agree?", answer())).join().getData();

            assertThat(fb.getEvidenceQualityScore())
                    .as("EVIDENCE_QUALITY:0 should be stored as null")
                    .isNull();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROCEDURAL type-specific score extraction
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("PROCEDURAL — PROCEDURE_ACCURACY and SEQUENCE_LOGIC extracted")
    class ProceduralParsing {

        @BeforeEach
        void stubConfidentProcedural() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(confident(AnswerType.PROCEDURAL));
            when(typeSpecificPromptBuilder.buildPrompt(eq(AnswerType.PROCEDURAL), any(), anyInt()))
                    .thenReturn("dummy procedural prompt");
        }

        @Test
        @DisplayName("PROCEDURE_ACCURACY:9 and SEQUENCE_LOGIC:7 extracted and populated")
        void procedureAndSequencePopulated() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(proceduralResponse(9, 7));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("What are the steps to configure a VPN?", answer())).join().getData();

            assertThat(fb.getProcedureAccuracyScore()).as("procedureAccuracyScore").isEqualTo(9.0);
            assertThat(fb.getSequenceLogicScore()).as("sequenceLogicScore").isEqualTo(7.0);
        }

        @Test
        @DisplayName("Comparative and argumentative scores not populated for PROCEDURAL type")
        void otherTypeScoresNotPopulatedForProcedural() {
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(proceduralResponse(8, 7));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Explain the process", answer())).join().getData();

            assertThat(fb.getBalanceScore()).isNull();
            assertThat(fb.getComparisonDepthScore()).isNull();
            assertThat(fb.getArgumentationStrengthScore()).isNull();
            assertThat(fb.getEvidenceQualityScore()).isNull();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Non-typed answers — type-specific scores remain null
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Low-confidence detection → all type-specific scores are null")
    class NonTypedAnswers {

        @BeforeEach
        void stubNotConfident() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(notConfident());
        }

        @Test
        @DisplayName("UNKNOWN with low confidence → all type-specific score fields are null")
        void unknownType_allTypeSpecificScoresNull() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(standardResponse());

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Explain SQL injection", answer())).join().getData();

            assertThat(fb.getBalanceScore()).isNull();
            assertThat(fb.getComparisonDepthScore()).isNull();
            assertThat(fb.getArgumentationStrengthScore()).isNull();
            assertThat(fb.getEvidenceQualityScore()).isNull();
            assertThat(fb.getProcedureAccuracyScore()).isNull();
            assertThat(fb.getSequenceLogicScore()).isNull();
        }

        @Test
        @DisplayName("Low-confidence type → standard 4 scores still parsed and non-zero")
        void lowConfidence_standardScoresParsed() {
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(standardResponse());

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Explain SQL injection", answer())).join().getData();

            assertThat(fb.getGrammarScore()).isGreaterThan(0.0);
            assertThat(fb.getClarityScore()).isGreaterThan(0.0);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // detectedAnswerType and typeConfidence metadata stamped on result
    // ═══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("detectedAnswerType and typeConfidence stamped on response")
    class MetadataStamping {

        @Test
        @DisplayName("Confident COMPARATIVE_ANALYSIS → detectedAnswerType='COMPARATIVE_ANALYSIS'")
        void comparativeType_stampedOnResponse() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(confident(AnswerType.COMPARATIVE_ANALYSIS));
            when(typeSpecificPromptBuilder.buildPrompt(any(), any(), anyInt()))
                    .thenReturn("dummy prompt");
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(comparativeResponse(7, 6));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Compare TCP and UDP", answer())).join().getData();

            assertThat(fb.getDetectedAnswerType()).isEqualTo("COMPARATIVE_ANALYSIS");
            assertThat(fb.getTypeConfidence()).isEqualTo(0.85);
        }

        @Test
        @DisplayName("UNKNOWN type → detectedAnswerType='UNKNOWN' stamped")
        void unknownType_stampedOnResponse() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(notConfident());
            when(huggingFaceService.generateCompletion(anyString())).thenReturn(standardResponse());

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Explain something", answer())).join().getData();

            assertThat(fb.getDetectedAnswerType()).isEqualTo("UNKNOWN");
            assertThat(fb.getTypeConfidence()).isEqualTo(0.30);
        }

        @Test
        @DisplayName("ARGUMENTATIVE → detectedAnswerType='ARGUMENTATIVE' and confidence 0.85")
        void argumentativeType_stampedOnResponse() {
            when(answerTypeDetector.detect(anyString(), anyString(), any(), anyInt()))
                    .thenReturn(confident(AnswerType.ARGUMENTATIVE));
            when(typeSpecificPromptBuilder.buildPrompt(any(), any(), anyInt()))
                    .thenReturn("dummy prompt");
            when(huggingFaceService.generateCompletion(anyString()))
                    .thenReturn(argumentativeResponse(7, 6));

            LiveFeedbackResponse fb = service.generateLiveFeedback(
                    longReq("Do you agree?", answer())).join().getData();

            assertThat(fb.getDetectedAnswerType()).isEqualTo("ARGUMENTATIVE");
            assertThat(fb.getTypeConfidence()).isEqualTo(0.85);
        }
    }
}
