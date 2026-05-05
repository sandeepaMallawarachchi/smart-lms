package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.model.AnswerType;
import org.springframework.stereotype.Component;

/**
 * Builds type-specific LLM prompts for each recognised AnswerType.
 *
 * Each prompt:
 *  - Opens with a role definition tuned to the answer structure expected.
 *  - Lists MANDATORY SCORING RULES specific to that type.
 *  - Defines the exact output format (keys must be parseable by extractScore / extractLines).
 *  - For COMPARATIVE_ANALYSIS, ARGUMENTATIVE, and PROCEDURAL, adds type-specific
 *    score dimensions (BALANCE / COMPARISON_DEPTH, ARGUMENTATION_STRENGTH / EVIDENCE_QUALITY,
 *    PROCEDURE_ACCURACY / SEQUENCE_LOGIC respectively).
 *  - All other types use the standard 4 dimensions (GRAMMAR / CLARITY / COMPLETENESS / RELEVANCE).
 *
 * Fall-through to SHORT_ANSWER / LONG_ESSAY is handled by LiveFeedbackService
 * when type confidence is below threshold.
 */
@Component
public class TypeSpecificPromptBuilder {

    // ── Public API ────────────────────────────────────────────────────────────────

    public String buildPrompt(AnswerType type, LiveFeedbackRequest request, int wordCount) {
        switch (type) {
            case COMPARATIVE_ANALYSIS:   return comparative(request, wordCount);
            case ARGUMENTATIVE:          return argumentative(request, wordCount);
            case PROBLEM_SOLUTION:       return problemSolution(request, wordCount);
            case LIST_BASED:             return listBased(request, wordCount);
            case PROCEDURAL:             return procedural(request, wordCount);
            case CASE_STUDY:             return caseStudy(request, wordCount);
            case CRITICAL_EVALUATION:    return criticalEvaluation(request, wordCount);
            case CAUSE_EFFECT:           return causeEffect(request, wordCount);
            case REFLECTIVE:             return reflective(request, wordCount);
            case TECHNICAL_EXPLANATION:  return technical(request, wordCount);
            case SUMMARY:                return summary(request, wordCount);
            case ANALYTICAL:             return analytical(request, wordCount);
            case NARRATIVE:              return narrative(request, wordCount);
            case QUESTION_ANSWER_FORMAT: return qaFormat(request, wordCount);
            case SHORT_ANSWER:           return shortAnswerGeneric(request, wordCount);
            case LONG_ESSAY:             return longEssayGeneric(request, wordCount);
            default:                     return longEssayGeneric(request, wordCount);
        }
    }

    // ── Helper builders shared across prompts ─────────────────────────────────────

    private String markInfo(LiveFeedbackRequest r) {
        return r.getMaxPoints() != null
                ? "This question is worth " + r.getMaxPoints() + " mark(s).\n"
                : "";
    }

    private String lengthInfo(int wordCount) {
        return "Answer length: " + wordCount + " word(s).\n";
    }

    private String questionContext(LiveFeedbackRequest r) {
        return (r.getQuestionPrompt() != null && !r.getQuestionPrompt().isBlank())
                ? "Question: " + r.getQuestionPrompt() + "\n"
                : "";
    }

    private String standardFormat() {
        return "Use this exact format (only these keys, integers 0-10 for scores):\n"
             + "GRAMMAR: <integer 0-10>\n"
             + "CLARITY: <integer 0-10>\n"
             + "COMPLETENESS: <integer 0-10>\n"
             + "RELEVANCE: <integer 0-10>\n"
             + "STRENGTH1: <quote or paraphrase a specific part of the student's answer that is correct or well-done>\n"
             + "STRENGTH2: <another specific strength referencing the answer content, or 'None detected' if poor>\n"
             + "IMPROVEMENT1: <specific content from the answer that needs improvement or is missing — reference the student's words>\n"
             + "IMPROVEMENT2: <another specific improvement point — do not repeat IMPROVEMENT1>\n"
             + "SUGGESTION1: <one actionable, specific suggestion the student can act on immediately>\n"
             + "SUGGESTION2: <a second distinct actionable suggestion>";
    }

    // ── 1. COMPARATIVE ANALYSIS ───────────────────────────────────────────────────
    // Extra dimensions: BALANCE, COMPARISON_DEPTH

    private String comparative(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a COMPARATIVE ANALYSIS answer.\n"
             + "This question requires the student to compare or contrast two or more subjects,\n"
             + "identifying similarities AND differences with analytical explanation.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. BALANCE — coverage of all subjects must be roughly equal.\n"
             + "   One subject dominates (> 70% of text): BALANCE 0-3.\n"
             + "   Slight imbalance (~40/60 split): BALANCE 4-6.\n"
             + "   Roughly equal coverage (each within 30%): BALANCE 7-10.\n"
             + "2. COMPARISON_DEPTH — looks for actual analytical comparisons, not separate descriptions.\n"
             + "   Features listed separately without comparing: COMPARISON_DEPTH 0-3.\n"
             + "   At least one explicit comparison made: COMPARISON_DEPTH 4-6.\n"
             + "   Uses transition words (similarly, in contrast, whereas, conversely) + analysis: 7-10.\n"
             + "3. COMPLETENESS — must address what the question asks.\n"
             + "   Question asks for both similarities AND differences; only one covered: max 5.\n"
             + "   Both covered: COMPLETENESS 6-10.\n"
             + "4. CONSISTENCY — if any STRENGTH praises the comparison, RELEVANCE must be >= 5.\n"
             + "5. GIBBERISH / BLANK — all scores 0.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + "GRAMMAR: <integer 0-10>\n"
             + "CLARITY: <integer 0-10>\n"
             + "COMPLETENESS: <integer 0-10>\n"
             + "RELEVANCE: <integer 0-10>\n"
             + "BALANCE: <integer 0-10>\n"
             + "COMPARISON_DEPTH: <integer 0-10>\n"
             + "STRENGTH1: <specific strength about the comparison quality>\n"
             + "STRENGTH2: <second strength about the comparison, or 'None detected' if poor>\n"
             + "IMPROVEMENT1: <specific way to improve the comparison>\n"
             + "IMPROVEMENT2: <second improvement for better comparative analysis>\n"
             + "SUGGESTION1: <actionable suggestion to strengthen the comparison>\n"
             + "SUGGESTION2: <actionable suggestion for better analytical depth>";
    }

    // ── 2. ARGUMENTATIVE / PERSUASIVE ────────────────────────────────────────────
    // Extra dimensions: ARGUMENTATION_STRENGTH, EVIDENCE_QUALITY

    private String argumentative(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring an ARGUMENTATIVE / PERSUASIVE essay answer.\n"
             + "This type requires the student to take a clear position and defend it with reasoning and evidence.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. ARGUMENTATION_STRENGTH — is there a clear thesis and logical defence?\n"
             + "   No clear position taken: ARGUMENTATION_STRENGTH 0-2.\n"
             + "   Position stated but reasoning is weak or circular: 3-5.\n"
             + "   Clear position + coherent logical argument: 6-8.\n"
             + "   Compelling argument with counter-arguments addressed: 9-10.\n"
             + "2. EVIDENCE_QUALITY — are claims supported?\n"
             + "   Assertions made with no evidence or examples: EVIDENCE_QUALITY 0-3.\n"
             + "   General examples given but no specific evidence: 4-6.\n"
             + "   Specific facts, data, or referenced examples: 7-10.\n"
             + "3. COMPLETENESS — an argument should have: introduction/thesis, body (reasoning), conclusion.\n"
             + "   Missing two of three components: COMPLETENESS max 4.\n"
             + "   All three present: COMPLETENESS 7-10.\n"
             + "4. CONSISTENCY — if STRENGTH mentions 'clear argument' or 'well-supported', RELEVANCE >= 6.\n"
             + "5. REPETITION — restating the same point without development: COMPLETENESS max 4.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + "GRAMMAR: <integer 0-10>\n"
             + "CLARITY: <integer 0-10>\n"
             + "COMPLETENESS: <integer 0-10>\n"
             + "RELEVANCE: <integer 0-10>\n"
             + "ARGUMENTATION_STRENGTH: <integer 0-10>\n"
             + "EVIDENCE_QUALITY: <integer 0-10>\n"
             + "STRENGTH1: <specific strength about the argument>\n"
             + "STRENGTH2: <second strength, or 'None detected' if poor>\n"
             + "IMPROVEMENT1: <specific way to strengthen the argument>\n"
             + "IMPROVEMENT2: <second improvement for better persuasion>\n"
             + "SUGGESTION1: <actionable suggestion to improve evidence or reasoning>\n"
             + "SUGGESTION2: <actionable suggestion for clearer argumentation>";
    }

    // ── 3. PROBLEM–SOLUTION ───────────────────────────────────────────────────────

    private String problemSolution(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a PROBLEM-SOLUTION answer.\n"
             + "This type requires the student to identify a problem clearly and then propose a\n"
             + "concrete, feasible solution with explanation of how it addresses the problem.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — both parts must be present:\n"
             + "   Only problem OR only solution described: COMPLETENESS max 4.\n"
             + "   Both parts present but one is underdeveloped: COMPLETENESS 5-7.\n"
             + "   Both parts well-developed with clear link between problem and solution: 8-10.\n"
             + "2. RELEVANCE — solution must directly address the identified problem.\n"
             + "   Generic solution unrelated to the specific problem: RELEVANCE 0-3.\n"
             + "   Solution partially addresses the problem: RELEVANCE 4-6.\n"
             + "   Solution specifically and logically addresses the problem: RELEVANCE 7-10.\n"
             + "3. CLARITY — is it clear what the problem is and what the proposed solution entails?\n"
             + "   Vague on either problem or solution: CLARITY 0-4.\n"
             + "   Both stated clearly: CLARITY 7-10.\n"
             + "4. CONSISTENCY — if STRENGTH says 'clear solution', RELEVANCE >= 5.\n"
             + "5. FEASIBILITY NOTE — assess whether the proposed solution is realistic for academic context.\n"
             + "   An impractical solution may reduce RELEVANCE by 1-2 points.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 4. LIST-BASED / ENUMERATION ──────────────────────────────────────────────

    private String listBased(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a LIST-BASED answer.\n"
             + "This type requires the student to enumerate specific items, examples, or points\n"
             + "in response to a question asking them to 'list', 'name', 'identify', or 'give examples'.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — number of items listed matters.\n"
             + "   If question specifies a count (e.g. 'list 5') and fewer are given, reduce COMPLETENESS proportionally.\n"
             + "   If no count specified: 1-2 items = COMPLETENESS 2-4; 3-4 = 5-7; 5+ = 8-10.\n"
             + "2. RELEVANCE — every listed item must be relevant to the question.\n"
             + "   Any irrelevant items reduce RELEVANCE by 1-2 points each.\n"
             + "3. CLARITY — items should be distinct and unambiguous.\n"
             + "   Repetitions or overlapping items: CLARITY 0-4.\n"
             + "4. GRAMMAR — for lists, minor grammatical variation across items is acceptable.\n"
             + "   Parallel structure (all items same grammatical form) = GRAMMAR 8-10.\n"
             + "5. CONSISTENCY — if STRENGTH says 'covers all key points', COMPLETENESS >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 5. PROCEDURAL / STEP-BY-STEP ─────────────────────────────────────────────
    // Extra dimensions: PROCEDURE_ACCURACY, SEQUENCE_LOGIC

    private String procedural(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a PROCEDURAL / STEP-BY-STEP answer.\n"
             + "This type requires the student to describe a sequence of steps or a process in the\n"
             + "correct order, with enough detail for someone to follow the procedure.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. PROCEDURE_ACCURACY — are the steps themselves correct?\n"
             + "   Steps are incorrect or misleading: PROCEDURE_ACCURACY 0-3.\n"
             + "   Steps are broadly correct but missing key details: 4-6.\n"
             + "   All steps correct and clearly described: 7-10.\n"
             + "2. SEQUENCE_LOGIC — are the steps in a logical order?\n"
             + "   Steps are out of order or dependencies violated: SEQUENCE_LOGIC 0-3.\n"
             + "   Order is mostly correct with minor sequencing issues: 4-6.\n"
             + "   Correct order with clear signalling (first, then, next, finally): 7-10.\n"
             + "3. COMPLETENESS — all necessary steps must be present.\n"
             + "   Critical step missing: COMPLETENESS max 5.\n"
             + "   All key steps present: COMPLETENESS 7-10.\n"
             + "4. CLARITY — a reader should be able to follow the procedure without asking questions.\n"
             + "   Ambiguous or assumed steps: CLARITY 0-5.\n"
             + "   Clearly explained steps: CLARITY 7-10.\n"
             + "5. CONSISTENCY — if STRENGTH says 'clear procedure' or 'correct steps', RELEVANCE >= 5.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + "GRAMMAR: <integer 0-10>\n"
             + "CLARITY: <integer 0-10>\n"
             + "COMPLETENESS: <integer 0-10>\n"
             + "RELEVANCE: <integer 0-10>\n"
             + "PROCEDURE_ACCURACY: <integer 0-10>\n"
             + "SEQUENCE_LOGIC: <integer 0-10>\n"
             + "STRENGTH1: <specific strength about the procedure or steps>\n"
             + "STRENGTH2: <second strength, or 'None detected' if poor>\n"
             + "IMPROVEMENT1: <specific way to improve accuracy or completeness of steps>\n"
             + "IMPROVEMENT2: <second improvement for better procedural clarity>\n"
             + "SUGGESTION1: <actionable suggestion for clearer step description>\n"
             + "SUGGESTION2: <actionable suggestion for better sequencing or detail>";
    }

    // ── 6. CASE STUDY ANALYSIS ───────────────────────────────────────────────────

    private String caseStudy(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a CASE STUDY ANALYSIS answer.\n"
             + "This type requires the student to analyse a specific scenario, applying relevant\n"
             + "theory or knowledge to explain what happened, why, and what should be done.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. RELEVANCE — the analysis must directly engage with the given case/scenario.\n"
             + "   Generic answer ignoring the specific case: RELEVANCE 0-3.\n"
             + "   Answer references the case but superficially: RELEVANCE 4-6.\n"
             + "   Specific details from the case are integrated into the analysis: RELEVANCE 7-10.\n"
             + "2. COMPLETENESS — a good case study answer covers: context, analysis, implications/recommendations.\n"
             + "   Only one aspect addressed: COMPLETENESS 0-3.\n"
             + "   Two aspects addressed: COMPLETENESS 4-6.\n"
             + "   All three aspects addressed: COMPLETENESS 7-10.\n"
             + "3. CLARITY — analytical structure should be clear and logically connected.\n"
             + "   Jumps between points without connection: CLARITY 0-4.\n"
             + "   Clear structured analysis: CLARITY 7-10.\n"
             + "4. THEORY APPLICATION — if relevant theory/concepts are applied, boost RELEVANCE by 1-2.\n"
             + "5. CONSISTENCY — if STRENGTH mentions 'good analysis of the case', RELEVANCE >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 7. CRITICAL EVALUATION ───────────────────────────────────────────────────

    private String criticalEvaluation(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a CRITICAL EVALUATION answer.\n"
             + "This type requires the student to evaluate the strengths AND weaknesses (or\n"
             + "advantages AND disadvantages) of a subject, with justified reasoning for each point.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — must address BOTH positive and negative aspects.\n"
             + "   Only positives OR only negatives: COMPLETENESS max 4.\n"
             + "   Both present but one side underdeveloped (< 2 points): COMPLETENESS 5-6.\n"
             + "   Both sides with at least 2 well-justified points each: COMPLETENESS 7-10.\n"
             + "2. RELEVANCE — each strength/weakness must be directly relevant to the subject.\n"
             + "   Generic points that apply to anything: RELEVANCE 0-3.\n"
             + "   Subject-specific points: RELEVANCE 6-10.\n"
             + "3. CLARITY — each point should be stated clearly and its significance explained.\n"
             + "   Points listed without explanation of WHY they matter: CLARITY 0-4.\n"
             + "   Each point clearly stated with justification: CLARITY 7-10.\n"
             + "4. BALANCED JUDGEMENT — a conclusion or overall assessment is expected.\n"
             + "   No conclusion drawn: COMPLETENESS -1 penalty (cap at COMPLETENESS - 1).\n"
             + "   Clear conclusion that weighs both sides: RELEVANCE +1 bonus.\n"
             + "5. CONSISTENCY — if STRENGTH mentions 'balanced evaluation', RELEVANCE >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 8. CAUSE AND EFFECT ──────────────────────────────────────────────────────

    private String causeEffect(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a CAUSE-AND-EFFECT answer.\n"
             + "This type requires the student to explain why something happened (causes) and/or\n"
             + "what resulted from it (effects), with clear causal linkages.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — must address what the question asks: causes, effects, or both.\n"
             + "   Question asks for both causes AND effects; only one type provided: COMPLETENESS max 5.\n"
             + "   Both causes and effects addressed: COMPLETENESS 7-10.\n"
             + "2. RELEVANCE — causal links must be logically valid.\n"
             + "   Correlation presented as causation without explanation: RELEVANCE 0-4.\n"
             + "   Plausible causal explanations with reasoning: RELEVANCE 6-10.\n"
             + "3. DEPTH — multiple causes/effects are better than one.\n"
             + "   Only one cause or one effect identified: COMPLETENESS 3-5.\n"
             + "   Multiple causes/effects with explanation: COMPLETENESS 7-10.\n"
             + "4. CAUSAL LANGUAGE — uses words like 'because', 'therefore', 'as a result', 'leads to'.\n"
             + "   No causal language used: CLARITY 0-4.\n"
             + "   Causal language used appropriately: CLARITY 7-10.\n"
             + "5. CONSISTENCY — if STRENGTH says 'explains the causes/effects well', RELEVANCE >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 9. REFLECTIVE WRITING ────────────────────────────────────────────────────

    private String reflective(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a REFLECTIVE WRITING answer.\n"
             + "This type requires the student to thoughtfully reflect on an experience, learning,\n"
             + "or opinion — showing personal insight and what they have gained from it.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. RELEVANCE — must reflect on the topic asked, not just describe what happened.\n"
             + "   Pure description without reflection: RELEVANCE 0-3.\n"
             + "   Describes AND reflects on meaning: RELEVANCE 6-10.\n"
             + "2. COMPLETENESS — good reflective writing has three parts:\n"
             + "   What happened (description), what it means (interpretation), what will change (application).\n"
             + "   Only description: COMPLETENESS 0-3.\n"
             + "   Description + interpretation: COMPLETENESS 4-6.\n"
             + "   All three parts: COMPLETENESS 7-10.\n"
             + "3. CLARITY — personal voice is expected but the reflection must be coherent.\n"
             + "   Disorganised stream of thought: CLARITY 0-4.\n"
             + "   Clear structured reflection: CLARITY 7-10.\n"
             + "4. DEPTH OF INSIGHT — surface-level ('I liked it') vs deep ('I realised that ...').\n"
             + "   Surface level: RELEVANCE max 5.\n"
             + "   Deep, specific insight: RELEVANCE 7-10.\n"
             + "5. CONSISTENCY — if STRENGTH says 'thoughtful reflection', RELEVANCE >= 5.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 10. TECHNICAL / SCIENTIFIC EXPLANATION ───────────────────────────────────

    private String technical(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a TECHNICAL / SCIENTIFIC EXPLANATION answer.\n"
             + "This type requires the student to explain how something works — a mechanism, system,\n"
             + "concept, or scientific process — using accurate technical knowledge.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. RELEVANCE — technical accuracy matters above all else.\n"
             + "   Factually incorrect explanation: RELEVANCE 0-3.\n"
             + "   Broadly correct but with inaccurate details: RELEVANCE 4-6.\n"
             + "   Accurate and complete technical explanation: RELEVANCE 7-10.\n"
             + "2. COMPLETENESS — the explanation should cover the key components or stages.\n"
             + "   Misses critical components: COMPLETENESS 0-4.\n"
             + "   Covers most components: COMPLETENESS 5-7.\n"
             + "   All key components covered: COMPLETENESS 8-10.\n"
             + "3. CLARITY — technical content should be explained in a logical, step-by-step manner.\n"
             + "   Jumps between concepts without connection: CLARITY 0-4.\n"
             + "   Logical progression through the explanation: CLARITY 7-10.\n"
             + "4. TERMINOLOGY — appropriate technical vocabulary should be used correctly.\n"
             + "   No technical terms used: GRAMMAR 5 max.\n"
             + "   Technical terms used accurately: GRAMMAR 7-10.\n"
             + "5. CONSISTENCY — if STRENGTH says 'accurate explanation', RELEVANCE >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 11. SUMMARY / SYNOPSIS ───────────────────────────────────────────────────

    private String summary(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a SUMMARY / SYNOPSIS answer.\n"
             + "This type requires the student to condense the main ideas of a text, topic, or\n"
             + "concept into a shorter form using their own words, without adding new opinions.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — the key points must be captured.\n"
             + "   Only 1 of 3+ main points identified: COMPLETENESS 0-3.\n"
             + "   Most main points captured: COMPLETENESS 5-7.\n"
             + "   All key points captured concisely: COMPLETENESS 8-10.\n"
             + "2. RELEVANCE — a summary should stick to the source topic without personal opinion.\n"
             + "   Student has added opinions or irrelevant content: RELEVANCE -1 penalty.\n"
             + "   Pure summary of key points: RELEVANCE 7-10.\n"
             + "3. CLARITY — summarised ideas should be clear and concise.\n"
             + "   Repetitive or unnecessarily verbose: CLARITY 0-4.\n"
             + "   Concise and clear: CLARITY 7-10.\n"
             + "4. OWN WORDS — copy-pasting source text verbatim without paraphrase: COMPLETENESS max 4.\n"
             + "5. CONSISTENCY — if STRENGTH says 'good summary', RELEVANCE >= 5.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 12. ANALYTICAL WRITING ───────────────────────────────────────────────────

    private String analytical(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring an ANALYTICAL WRITING answer.\n"
             + "This type requires the student to break down a topic into its components,\n"
             + "examine each part, and explain how they relate to the whole.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — multiple components / dimensions / factors should be identified.\n"
             + "   Only 1 component analysed: COMPLETENESS 0-3.\n"
             + "   2-3 components: COMPLETENESS 4-6.\n"
             + "   4+ components with inter-relationships explained: COMPLETENESS 7-10.\n"
             + "2. DEPTH — description alone is NOT analysis.\n"
             + "   Only describes what something is: RELEVANCE max 5.\n"
             + "   Explains WHY or HOW components matter: RELEVANCE 7-10.\n"
             + "3. CLARITY — analytical structure should be clear: component → explanation → significance.\n"
             + "4. RELEVANCE — analysis must directly address the question's focus.\n"
             + "5. CONSISTENCY — if STRENGTH says 'strong analysis', RELEVANCE >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 13. NARRATIVE / STORY-BASED ─────────────────────────────────────────────

    private String narrative(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a NARRATIVE / STORY-BASED answer.\n"
             + "This type requires the student to recount or narrate events in a coherent sequence,\n"
             + "with clear setting, progression, and resolution where appropriate.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — narrative should have a beginning, middle, and end.\n"
             + "   Only describes isolated event(s) without sequence: COMPLETENESS 0-4.\n"
             + "   Clear narrative arc (beginning → middle → end): COMPLETENESS 7-10.\n"
             + "2. CLARITY — events should be described in chronological or logical order.\n"
             + "   Events jumbled or confusingly ordered: CLARITY 0-4.\n"
             + "   Clear, well-ordered narrative: CLARITY 7-10.\n"
             + "3. RELEVANCE — the narrative must address what the question asked.\n"
             + "   Off-topic story: RELEVANCE 0-3.\n"
             + "   Directly addresses the question topic: RELEVANCE 7-10.\n"
             + "4. LANGUAGE — narrative writing benefits from descriptive, varied language.\n"
             + "   Flat, repetitive language: GRAMMAR 5.\n"
             + "   Engaging, varied vocabulary: GRAMMAR 8-10.\n"
             + "5. CONSISTENCY — if STRENGTH says 'engaging narrative', RELEVANCE >= 5.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 14. INTERNAL Q&A FORMAT ─────────────────────────────────────────────────

    private String qaFormat(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring an answer that uses an internal\n"
             + "QUESTION-AND-ANSWER format (the student has answered using Q:/A: markers or\n"
             + "sub-questions). Evaluate the substance of each answer segment collectively.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. COMPLETENESS — all sub-questions / prompts should be answered.\n"
             + "   Missing answers for any sub-question: reduce COMPLETENESS proportionally.\n"
             + "2. RELEVANCE — each answer segment must be relevant to its corresponding question.\n"
             + "   An irrelevant segment: RELEVANCE -1 per segment.\n"
             + "3. CLARITY — answers should be concise and well-explained.\n"
             + "4. CONSISTENCY — if STRENGTH says 'addresses all parts', COMPLETENESS >= 6.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format:\n"
             + standardFormat();
    }

    // ── 15–16. Generic fallbacks (copied from LiveFeedbackService logic) ─────────

    private String shortAnswerGeneric(LiveFeedbackRequest r, int wordCount) {
        String markLine = markInfo(r);
        String qCtx = questionContext(r);
        return "You are a fair academic evaluator scoring a short-answer question.\n"
             + markLine
             + "Answer length: " + wordCount + " word(s).\n\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. CONSISTENCY: Numeric scores MUST match qualitative comments.\n"
             + "   If any STRENGTH says the answer is correct, accurate, or directly answers the question,\n"
             + "   then RELEVANCE must be >= 5 and COMPLETENESS must be >= 4. This rule is ABSOLUTE.\n"
             + "2. SHORT-ANSWER GRADING:\n"
             + "   Correct + direct + relevant = RELEVANCE 7-9, COMPLETENESS 6-8.\n"
             + "   Partially correct or missing detail = RELEVANCE 4-6, COMPLETENESS 3-5.\n"
             + "   Wrong or irrelevant = RELEVANCE 0-2, COMPLETENESS 0-2.\n"
             + "   NEVER give RELEVANCE 0 if the answer addresses the question topic.\n"
             + "3. GRAMMAR: Minor issues are acceptable — do NOT let grammar dominate.\n"
             + "4. REPETITION: If the answer just repeats words from the question, COMPLETENESS 0-3.\n"
             + "5. BLANK/GIBBERISH: ALL scores 0.\n\n"
             + qCtx
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond ONLY in this exact format:\n"
             + standardFormat();
    }

    private String longEssayGeneric(LiveFeedbackRequest r, int wordCount) {
        String markLine = markInfo(r);
        String qCtx = questionContext(r);
        String completenessHint = r.getExpectedWordCount() != null
                ? "Expected length: " + r.getExpectedWordCount() + " words. Current: " + wordCount + " words.\n"
                : "";
        return "You are a fair academic evaluator scoring a long-answer question.\n"
             + markLine
             + "Answer length: " + wordCount + " word(s).\n"
             + completenessHint + "\n"
             + "=== MANDATORY SCORING RULES ===\n"
             + "1. CONSISTENCY: Numeric scores MUST match qualitative comments.\n"
             + "   If any STRENGTH says the answer is correct or relevant, RELEVANCE >= 5.\n"
             + "2. SCORING GUIDE:\n"
             + "   Well-explained, mostly complete = 7-9 across all dimensions.\n"
             + "   Shows genuine understanding with some gaps = 5-7.\n"
             + "   Very incomplete or mostly incorrect = 2-4.\n"
             + "   Gibberish or blank = 0.\n"
             + "3. REPETITION: If the answer copies the question, COMPLETENESS 0-3.\n\n"
             + qCtx
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond ONLY in this exact format:\n"
             + standardFormat();
    }
}
