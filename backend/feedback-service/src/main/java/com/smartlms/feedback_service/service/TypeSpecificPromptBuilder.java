package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.request.LiveFeedbackRequest;
import com.smartlms.feedback_service.model.AnswerType;
import org.springframework.stereotype.Component;

/**
 * Builds type-specific LLM prompts for each recognised AnswerType.
 *
 * Design principles applied throughout:
 *  - Chain-of-thought preamble: model thinks step-by-step before scoring.
 *  - Consistent 0-3 / 4-6 / 7-9 / 10 scoring scale across all types.
 *  - Soft "should/generally" language instead of hard "MUST/ABSOLUTE/NEVER"
 *    — small 7B models follow soft guidance more reliably than rigid rules.
 *  - Evidence requirement: STRENGTH and IMPROVEMENT bullets reference the
 *    student's actual words, preventing generic placeholder feedback.
 *  - Flexible 1–3 bullets per section: avoids forced repetition and allows
 *    proportional feedback (extractLines handles any count).
 *  - CONSISTENCY cross-checks removed from prompts (enforceConsistency() in
 *    LiveFeedbackService handles them in code, avoiding circular reasoning).
 *  - Technical type: GRAMMAR assesses writing quality only; technical accuracy
 *    is captured by RELEVANCE and COMPLETENESS.
 *
 * For COMPARATIVE_ANALYSIS, ARGUMENTATIVE, and PROCEDURAL, extra type-specific
 * score dimensions are added (BALANCE / COMPARISON_DEPTH, ARGUMENTATION_STRENGTH /
 * EVIDENCE_QUALITY, PROCEDURE_ACCURACY / SEQUENCE_LOGIC respectively).
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

    // ── Shared helpers ────────────────────────────────────────────────────────────

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

    /**
     * Chain-of-thought preamble that prompts the model to analyse before scoring.
     * Even small 7B models produce more accurate evaluations with this step.
     */
    private String reasoningPreamble() {
        return "Before scoring, work through these steps:\n"
             + "  1. What specific topic or skill does the question test?\n"
             + "  2. What did the student actually write — which concepts did they address?\n"
             + "  3. What is correct or effective in the answer? What is missing or wrong?\n"
             + "  4. Assign scores that honestly reflect this analysis.\n\n";
    }

    /**
     * Consistent scoring scale used across all answer types.
     * Standardised 0-3 / 4-6 / 7-9 / 10 bands prevent per-type range confusion.
     */
    private String scoringScale() {
        return "Scoring scale (apply consistently across every dimension):\n"
             + "  0-3 = weak — missing, incorrect, or not relevant to the question\n"
             + "  4-6 = partial — some correct elements but significant gaps remain\n"
             + "  7-9 = strong — mostly correct and well-explained, with only minor gaps\n"
             + "  10  = excellent — complete, accurate, and thoroughly explained\n\n";
    }

    /**
     * Standard output format shared by most answer types.
     *
     * Evidence requirement: STRENGTH and IMPROVEMENT bullets must quote or
     * closely paraphrase the student's actual words — prevents generic feedback.
     *
     * Flexible count (1–3 per section): allows proportional feedback rather than
     * forcing exactly 2 items when the answer warrants more or fewer.
     * extractLines() in the parser handles any count via STRENGTH\d+ regex.
     */
    private String standardFormat() {
        return "Respond using this format (scores must be integers 0-10):\n"
             + "GRAMMAR: <integer>\n"
             + "CLARITY: <integer>\n"
             + "COMPLETENESS: <integer>\n"
             + "RELEVANCE: <integer>\n"
             + "STRENGTH1: <quote or closely paraphrase specific text from the student's answer that is correct or effective>\n"
             + "STRENGTH2: <a second distinct strength referencing the student's actual words; write 'None detected' if no second strength>\n"
             + "STRENGTH3: <a third strength if one clearly exists; omit this line if fewer than 3 distinct strengths>\n"
             + "IMPROVEMENT1: <reference specific words or ideas from the answer — state what is wrong, weak, or missing>\n"
             + "IMPROVEMENT2: <a second improvement point, referencing the answer's content>\n"
             + "IMPROVEMENT3: <a third improvement if genuinely needed; omit this line if two are sufficient>\n"
             + "SUGGESTION1: <one actionable step the student can take immediately to improve this answer>\n"
             + "SUGGESTION2: <a distinct second suggestion; omit this line if one is sufficient>\n";
    }

    // ── 1. COMPARATIVE ANALYSIS ───────────────────────────────────────────────────
    // Extra dimensions: BALANCE, COMPARISON_DEPTH

    private String comparative(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a COMPARATIVE ANALYSIS answer.\n"
             + "This question requires the student to compare or contrast two or more subjects,\n"
             + "identifying similarities AND differences with analytical explanation.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "BALANCE — how evenly are all subjects covered?\n"
             + "  One subject takes > 70% of the text: BALANCE 0-3.\n"
             + "  Slight imbalance (~40/60 split): BALANCE 4-6.\n"
             + "  Roughly equal coverage (each within 30%): BALANCE 7-10.\n"
             + "COMPARISON_DEPTH — does the student make explicit analytical comparisons?\n"
             + "  Features listed separately without comparing: COMPARISON_DEPTH 0-3.\n"
             + "  At least one explicit comparison made: COMPARISON_DEPTH 4-6.\n"
             + "  Uses comparative language (similarly, in contrast, whereas) with analysis: 7-10.\n"
             + "COMPLETENESS — if the question asks for both similarities AND differences:\n"
             + "  Only one type provided: COMPLETENESS generally should not exceed 5.\n"
             + "  Both covered: COMPLETENESS 6-10.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format (scores must be integers 0-10):\n"
             + "GRAMMAR: <integer>\n"
             + "CLARITY: <integer>\n"
             + "COMPLETENESS: <integer>\n"
             + "RELEVANCE: <integer>\n"
             + "BALANCE: <integer>\n"
             + "COMPARISON_DEPTH: <integer>\n"
             + "STRENGTH1: <quote or paraphrase specific text from the answer that shows good comparison quality>\n"
             + "STRENGTH2: <a second distinct strength from the answer; write 'None detected' if no second one>\n"
             + "STRENGTH3: <a third strength if clearly present; omit this line otherwise>\n"
             + "IMPROVEMENT1: <reference specific text from the answer — state what comparison element is weak or missing>\n"
             + "IMPROVEMENT2: <a second improvement referencing the answer's content>\n"
             + "IMPROVEMENT3: <a third improvement if needed; omit this line if two are sufficient>\n"
             + "SUGGESTION1: <one actionable step to strengthen the comparison>\n"
             + "SUGGESTION2: <a second distinct suggestion; omit this line if one is sufficient>\n";
    }

    // ── 2. ARGUMENTATIVE / PERSUASIVE ────────────────────────────────────────────
    // Extra dimensions: ARGUMENTATION_STRENGTH, EVIDENCE_QUALITY

    private String argumentative(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring an ARGUMENTATIVE / PERSUASIVE essay answer.\n"
             + "This type requires a clear position defended with reasoning and evidence.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "ARGUMENTATION_STRENGTH — how clear and logical is the argument?\n"
             + "  No clear position taken: ARGUMENTATION_STRENGTH 0-2.\n"
             + "  Position stated but reasoning is weak or circular: 3-5.\n"
             + "  Clear position with coherent logical argument: 6-8.\n"
             + "  Compelling argument with counter-arguments addressed: 9-10.\n"
             + "EVIDENCE_QUALITY — how well are claims supported?\n"
             + "  Assertions with no evidence or examples: EVIDENCE_QUALITY 0-3.\n"
             + "  General examples given but no specific evidence: 4-6.\n"
             + "  Specific facts, data, or referenced examples: 7-10.\n"
             + "COMPLETENESS — a good argumentative answer should include introduction/thesis, body reasoning, and conclusion.\n"
             + "  Missing two of three components: COMPLETENESS generally should not exceed 4.\n"
             + "  All three present: COMPLETENESS 7-10.\n"
             + "REPETITION — restating the same point without development: COMPLETENESS generally should not exceed 4.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format (scores must be integers 0-10):\n"
             + "GRAMMAR: <integer>\n"
             + "CLARITY: <integer>\n"
             + "COMPLETENESS: <integer>\n"
             + "RELEVANCE: <integer>\n"
             + "ARGUMENTATION_STRENGTH: <integer>\n"
             + "EVIDENCE_QUALITY: <integer>\n"
             + "STRENGTH1: <quote or paraphrase a specific part of the argument that is effective>\n"
             + "STRENGTH2: <a second distinct strength from the answer; write 'None detected' if no second one>\n"
             + "STRENGTH3: <a third strength if clearly present; omit this line otherwise>\n"
             + "IMPROVEMENT1: <reference specific text from the answer — state what argument element needs work>\n"
             + "IMPROVEMENT2: <a second improvement referencing the answer's content>\n"
             + "IMPROVEMENT3: <a third improvement if needed; omit this line if two are sufficient>\n"
             + "SUGGESTION1: <one actionable step to improve reasoning or evidence>\n"
             + "SUGGESTION2: <a second distinct suggestion; omit this line if one is sufficient>\n";
    }

    // ── 3. PROBLEM–SOLUTION ───────────────────────────────────────────────────────

    private String problemSolution(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a PROBLEM-SOLUTION answer.\n"
             + "This type requires identifying a problem clearly and proposing a concrete, feasible\n"
             + "solution with explanation of how it addresses the problem.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — both problem identification and solution should be present.\n"
             + "  Only problem OR only solution described: COMPLETENESS generally should not exceed 4.\n"
             + "  Both present but one is underdeveloped: COMPLETENESS 5-7.\n"
             + "  Both well-developed with a clear link between problem and solution: 8-10.\n"
             + "RELEVANCE — the solution should directly address the specific problem identified.\n"
             + "  Generic solution unrelated to the specific problem: RELEVANCE 0-3.\n"
             + "  Solution partially addresses the problem: RELEVANCE 4-6.\n"
             + "  Solution specifically and logically addresses the problem: RELEVANCE 7-10.\n"
             + "CLARITY — is it clear what the problem is and what the solution entails?\n"
             + "  Vague on either problem or solution: CLARITY 0-4.\n"
             + "  Both stated clearly: CLARITY 7-10.\n"
             + "FEASIBILITY — an impractical solution may reduce RELEVANCE by 1-2 points.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 4. LIST-BASED / ENUMERATION ──────────────────────────────────────────────

    private String listBased(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a LIST-BASED answer.\n"
             + "This type requires enumerating specific items, examples, or points in response to\n"
             + "a question asking the student to 'list', 'name', 'identify', or 'give examples'.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — the number of items provided matters.\n"
             + "  If the question specifies a count (e.g. 'list 5') and fewer are given, reduce COMPLETENESS proportionally.\n"
             + "  If no count specified: 1-2 items = COMPLETENESS 2-4; 3-4 items = 5-7; 5+ items = 8-10.\n"
             + "RELEVANCE — every listed item should be relevant to the question.\n"
             + "  Irrelevant items reduce RELEVANCE by 1-2 points each.\n"
             + "CLARITY — items should be distinct and unambiguous.\n"
             + "  Repetitions or overlapping items: CLARITY 0-4.\n"
             + "GRAMMAR — for lists, minor grammatical variation across items is acceptable.\n"
             + "  Parallel structure (all items in the same grammatical form): GRAMMAR 8-10.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 5. PROCEDURAL / STEP-BY-STEP ─────────────────────────────────────────────
    // Extra dimensions: PROCEDURE_ACCURACY, SEQUENCE_LOGIC

    private String procedural(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a PROCEDURAL / STEP-BY-STEP answer.\n"
             + "This type requires describing a sequence of steps or a process in the correct order,\n"
             + "with enough detail for someone to follow the procedure.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "PROCEDURE_ACCURACY — are the steps themselves correct?\n"
             + "  Steps are incorrect or misleading: PROCEDURE_ACCURACY 0-3.\n"
             + "  Steps broadly correct but missing key details: 4-6.\n"
             + "  All steps correct and clearly described: 7-10.\n"
             + "SEQUENCE_LOGIC — are the steps in a logical order?\n"
             + "  Steps out of order or dependencies violated: SEQUENCE_LOGIC 0-3.\n"
             + "  Order mostly correct with minor sequencing issues: 4-6.\n"
             + "  Correct order with clear signalling (first, then, next, finally): 7-10.\n"
             + "COMPLETENESS — all necessary steps should be present.\n"
             + "  Critical step missing: COMPLETENESS generally should not exceed 5.\n"
             + "  All key steps present: COMPLETENESS 7-10.\n"
             + "CLARITY — a reader should be able to follow the procedure without asking questions.\n"
             + "  Ambiguous or assumed steps: CLARITY 0-5.\n"
             + "  Clearly explained steps: CLARITY 7-10.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + "Respond using this format (scores must be integers 0-10):\n"
             + "GRAMMAR: <integer>\n"
             + "CLARITY: <integer>\n"
             + "COMPLETENESS: <integer>\n"
             + "RELEVANCE: <integer>\n"
             + "PROCEDURE_ACCURACY: <integer>\n"
             + "SEQUENCE_LOGIC: <integer>\n"
             + "STRENGTH1: <quote or paraphrase a specific step or element from the answer that is correct>\n"
             + "STRENGTH2: <a second distinct strength from the answer; write 'None detected' if no second one>\n"
             + "STRENGTH3: <a third strength if clearly present; omit this line otherwise>\n"
             + "IMPROVEMENT1: <reference specific text from the answer — state what step is inaccurate, out of order, or missing>\n"
             + "IMPROVEMENT2: <a second improvement referencing the answer's content>\n"
             + "IMPROVEMENT3: <a third improvement if needed; omit this line if two are sufficient>\n"
             + "SUGGESTION1: <one actionable step to improve procedure accuracy or completeness>\n"
             + "SUGGESTION2: <a second distinct suggestion; omit this line if one is sufficient>\n";
    }

    // ── 6. CASE STUDY ANALYSIS ───────────────────────────────────────────────────

    private String caseStudy(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a CASE STUDY ANALYSIS answer.\n"
             + "This type requires analysing a specific scenario, applying relevant theory or knowledge\n"
             + "to explain what happened, why, and what should be done.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "RELEVANCE — the analysis should directly engage with the given case/scenario.\n"
             + "  Generic answer ignoring the specific case: RELEVANCE 0-3.\n"
             + "  Answer references the case but superficially: RELEVANCE 4-6.\n"
             + "  Specific details from the case integrated into the analysis: RELEVANCE 7-10.\n"
             + "COMPLETENESS — a strong case study answer typically covers: context, analysis, and implications/recommendations.\n"
             + "  Only one aspect addressed: COMPLETENESS 0-3.\n"
             + "  Two aspects addressed: COMPLETENESS 4-6.\n"
             + "  All three aspects addressed: COMPLETENESS 7-10.\n"
             + "CLARITY — analytical structure should be clear and logically connected.\n"
             + "  Jumps between points without connection: CLARITY 0-4.\n"
             + "  Clear structured analysis: CLARITY 7-10.\n"
             + "THEORY APPLICATION — applying relevant theory or concepts can strengthen RELEVANCE by 1-2 points.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 7. CRITICAL EVALUATION ───────────────────────────────────────────────────

    private String criticalEvaluation(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a CRITICAL EVALUATION answer.\n"
             + "This type requires evaluating the strengths AND weaknesses (or advantages AND disadvantages)\n"
             + "of a subject, with justified reasoning for each point.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — both positive and negative aspects should be addressed.\n"
             + "  Only positives OR only negatives covered: COMPLETENESS generally should not exceed 4.\n"
             + "  Both present but one side underdeveloped (fewer than 2 points): COMPLETENESS 5-6.\n"
             + "  Both sides with at least 2 well-justified points each: COMPLETENESS 7-10.\n"
             + "RELEVANCE — each strength/weakness should be directly relevant to the subject.\n"
             + "  Generic points that could apply to anything: RELEVANCE 0-3.\n"
             + "  Subject-specific points: RELEVANCE 6-10.\n"
             + "CLARITY — each point should be stated clearly with its significance explained.\n"
             + "  Points listed without explanation of why they matter: CLARITY 0-4.\n"
             + "  Each point clearly stated with justification: CLARITY 7-10.\n"
             + "OVERALL ASSESSMENT — a conclusion or balanced judgement is expected.\n"
             + "  No conclusion drawn: COMPLETENESS generally should not exceed 7.\n"
             + "  Clear conclusion weighing both sides: this is a sign of a strong, complete answer.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 8. CAUSE AND EFFECT ──────────────────────────────────────────────────────

    private String causeEffect(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a CAUSE-AND-EFFECT answer.\n"
             + "This type requires explaining why something happened (causes) and/or what resulted\n"
             + "from it (effects), with clear causal linkages.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — address what the question asks (causes, effects, or both).\n"
             + "  Question asks for both causes AND effects; only one type provided: COMPLETENESS generally should not exceed 5.\n"
             + "  Both causes and effects addressed: COMPLETENESS 7-10.\n"
             + "RELEVANCE — causal links should be logically valid.\n"
             + "  Correlation presented as causation without explanation: RELEVANCE 0-4.\n"
             + "  Plausible causal explanations with reasoning: RELEVANCE 6-10.\n"
             + "DEPTH — multiple causes/effects are stronger than a single one.\n"
             + "  Only one cause or one effect identified: COMPLETENESS 3-5.\n"
             + "  Multiple causes/effects with explanation: COMPLETENESS 7-10.\n"
             + "CAUSAL LANGUAGE — uses words like 'because', 'therefore', 'as a result', 'leads to'.\n"
             + "  No causal language used: CLARITY 0-4.\n"
             + "  Causal language used appropriately: CLARITY 7-10.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 9. REFLECTIVE WRITING ────────────────────────────────────────────────────

    private String reflective(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a REFLECTIVE WRITING answer.\n"
             + "This type requires thoughtful reflection on an experience, learning, or opinion —\n"
             + "showing personal insight and what the student has gained from it.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "RELEVANCE — the reflection should address the topic asked, not just describe events.\n"
             + "  Pure description without reflection: RELEVANCE 0-3.\n"
             + "  Describes AND reflects on meaning: RELEVANCE 6-10.\n"
             + "COMPLETENESS — reflective writing ideally covers three layers:\n"
             + "  What happened (description), what it means (interpretation), what will change (application).\n"
             + "  Only description: COMPLETENESS 0-3. Description + interpretation: COMPLETENESS 4-6.\n"
             + "  All three layers: COMPLETENESS 7-10.\n"
             + "CLARITY — personal voice is expected but the reflection should be coherent.\n"
             + "  Disorganised stream of thought: CLARITY 0-4.\n"
             + "  Clear structured reflection: CLARITY 7-10.\n"
             + "DEPTH OF INSIGHT — surface-level ('I liked it') vs deep ('I realised that ...').\n"
             + "  Surface level only: RELEVANCE generally should not exceed 5.\n"
             + "  Deep, specific insight: RELEVANCE 7-10.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 10. TECHNICAL / SCIENTIFIC EXPLANATION ───────────────────────────────────

    private String technical(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a TECHNICAL / SCIENTIFIC EXPLANATION answer.\n"
             + "This type requires explaining how something works — a mechanism, system, concept, or\n"
             + "scientific process — using accurate technical knowledge.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "RELEVANCE — technical accuracy is the primary measure here.\n"
             + "  Factually incorrect explanation: RELEVANCE 0-3.\n"
             + "  Broadly correct but with some inaccurate details: RELEVANCE 4-6.\n"
             + "  Accurate and complete technical explanation: RELEVANCE 7-10.\n"
             + "COMPLETENESS — the explanation should cover the key components or stages of the topic.\n"
             + "  Critical components missing: COMPLETENESS 0-4.\n"
             + "  Most components covered: COMPLETENESS 5-7.\n"
             + "  All key components covered: COMPLETENESS 8-10.\n"
             + "CLARITY — technical content should be explained in a logical, step-by-step manner.\n"
             + "  Jumps between concepts without clear connection: CLARITY 0-4.\n"
             + "  Logical progression through the explanation: CLARITY 7-10.\n"
             + "GRAMMAR — assess sentence structure and writing quality only.\n"
             + "  Note: technical terminology use reflects accuracy (captured by RELEVANCE and COMPLETENESS),\n"
             + "  not grammar. A technically accurate answer in simple language can still score GRAMMAR 7-8.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 11. SUMMARY / SYNOPSIS ───────────────────────────────────────────────────

    private String summary(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a SUMMARY / SYNOPSIS answer.\n"
             + "This type requires condensing the main ideas of a text, topic, or concept into a\n"
             + "shorter form using the student's own words, without adding new opinions.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — the key points should all be captured.\n"
             + "  Only 1 of 3+ main points identified: COMPLETENESS 0-3.\n"
             + "  Most main points captured: COMPLETENESS 5-7.\n"
             + "  All key points captured concisely: COMPLETENESS 8-10.\n"
             + "RELEVANCE — a summary should stick to the source topic without personal opinion.\n"
             + "  Student has added opinions or irrelevant content: reduce RELEVANCE by 1-2 points.\n"
             + "  Pure summary of key points: RELEVANCE 7-10.\n"
             + "CLARITY — summarised ideas should be clear and concise.\n"
             + "  Repetitive or unnecessarily verbose: CLARITY 0-4.\n"
             + "  Concise and clear: CLARITY 7-10.\n"
             + "OWN WORDS — verbatim copy of source text without paraphrase: COMPLETENESS generally should not exceed 4.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 12. ANALYTICAL WRITING ───────────────────────────────────────────────────

    private String analytical(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring an ANALYTICAL WRITING answer.\n"
             + "This type requires breaking down a topic into its components, examining each part,\n"
             + "and explaining how they relate to the whole.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — multiple components, dimensions, or factors should be identified.\n"
             + "  Only 1 component analysed: COMPLETENESS 0-3.\n"
             + "  2-3 components: COMPLETENESS 4-6.\n"
             + "  4+ components with inter-relationships explained: COMPLETENESS 7-10.\n"
             + "DEPTH — description alone is not analysis.\n"
             + "  Only describes what something is: RELEVANCE generally should not exceed 5.\n"
             + "  Explains WHY or HOW components matter: RELEVANCE 7-10.\n"
             + "CLARITY — analytical structure should be clear: component → explanation → significance.\n"
             + "RELEVANCE — the analysis should directly address the question's focus.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 13. NARRATIVE / STORY-BASED ─────────────────────────────────────────────

    private String narrative(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a NARRATIVE / STORY-BASED answer.\n"
             + "This type requires recounting or narrating events in a coherent sequence,\n"
             + "with clear setting, progression, and resolution where appropriate.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — the narrative should have a beginning, middle, and end.\n"
             + "  Describes isolated events without sequence: COMPLETENESS 0-4.\n"
             + "  Clear narrative arc (beginning → middle → end): COMPLETENESS 7-10.\n"
             + "CLARITY — events should be in chronological or logical order.\n"
             + "  Events jumbled or confusingly ordered: CLARITY 0-4.\n"
             + "  Clear, well-ordered narrative: CLARITY 7-10.\n"
             + "RELEVANCE — the narrative should address what the question asked.\n"
             + "  Off-topic story: RELEVANCE 0-3.\n"
             + "  Directly addresses the question topic: RELEVANCE 7-10.\n"
             + "GRAMMAR — narrative writing benefits from descriptive, varied language.\n"
             + "  Flat, repetitive language: GRAMMAR 4-5.\n"
             + "  Engaging, varied vocabulary: GRAMMAR 8-10.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 14. INTERNAL Q&A FORMAT ─────────────────────────────────────────────────

    private String qaFormat(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring an answer that uses an internal\n"
             + "QUESTION-AND-ANSWER format (the student has answered using Q:/A: markers or\n"
             + "sub-questions). Evaluate the substance of each answer segment collectively.\n"
             + markInfo(r) + lengthInfo(wordCount) + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "COMPLETENESS — all sub-questions or prompts should be answered.\n"
             + "  Missing answers for any sub-question: reduce COMPLETENESS proportionally.\n"
             + "RELEVANCE — each answer segment should be relevant to its corresponding question.\n"
             + "  An irrelevant segment: reduce RELEVANCE by 1 point per segment.\n"
             + "CLARITY — answers should be concise and well-explained.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    // ── 15–16. Generic fallbacks ──────────────────────────────────────────────────

    private String shortAnswerGeneric(LiveFeedbackRequest r, int wordCount) {
        return "You are a fair academic evaluator scoring a short-answer question.\n"
             + markInfo(r)
             + "Answer length: " + wordCount + " word(s).\n\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "SHORT-ANSWER GRADING:\n"
             + "  Correct, direct, and relevant = RELEVANCE 7-9, COMPLETENESS 6-8.\n"
             + "  Partially correct or missing detail = RELEVANCE 4-6, COMPLETENESS 3-5.\n"
             + "  Wrong or irrelevant = RELEVANCE 0-2, COMPLETENESS 0-2.\n"
             + "  A one-sentence correct answer deserves full credit — short does not mean incomplete.\n"
             + "CONSISTENCY: Numeric scores should match the qualitative comments.\n"
             + "  If a STRENGTH says the answer is correct or directly answers the question,\n"
             + "  RELEVANCE should be >= 5 and COMPLETENESS should be >= 4.\n"
             + "GRAMMAR: Minor grammar issues are acceptable for short answers — do not let grammar dominate.\n"
             + "  A correct answer with minor grammar still scores well on RELEVANCE.\n"
             + "REPETITION: If the answer just repeats words from the question without explanation, COMPLETENESS 0-3.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }

    private String longEssayGeneric(LiveFeedbackRequest r, int wordCount) {
        String completenessHint = r.getExpectedWordCount() != null
                ? "Expected length: " + r.getExpectedWordCount() + " words. Current: " + wordCount + " words.\n"
                : "";
        return "You are a fair academic evaluator scoring a long-answer question.\n"
             + markInfo(r)
             + "Answer length: " + wordCount + " word(s).\n"
             + completenessHint + "\n"
             + reasoningPreamble()
             + scoringScale()
             + "=== SCORING GUIDELINES ===\n"
             + "CONSISTENCY: Numeric scores should match the qualitative comments.\n"
             + "  If a STRENGTH says the answer is correct or relevant, RELEVANCE should be >= 5.\n"
             + "  If the answer is completely off-topic, RELEVANCE 0-2 and strengths should reflect this.\n"
             + "SCORING:\n"
             + "  Well-explained and mostly complete = 7-9 across all dimensions.\n"
             + "  Shows genuine understanding with some gaps = 5-7.\n"
             + "  Very incomplete or mostly incorrect = 2-4.\n"
             + "  Gibberish or blank = 0.\n"
             + "REPETITION: If the answer just copies the question, COMPLETENESS 0-3.\n"
             + "\n"
             + questionContext(r)
             + "Student Answer: " + r.getAnswerText() + "\n\n"
             + standardFormat();
    }
}
