package com.smartlms.feedback_service.model;

/**
 * All recognised text-answer types that the AI feedback system can detect.
 * Detection runs from question text + answer text. When confidence >= 0.60
 * a type-specific prompt is used; otherwise the system falls back to the
 * generic SHORT_ANSWER / LONG_ESSAY prompts.
 */
public enum AnswerType {

    SHORT_ANSWER("Short Answer / Definition"),
    LONG_ESSAY("Long Descriptive Essay"),
    COMPARATIVE_ANALYSIS("Comparative Analysis"),
    PROBLEM_SOLUTION("Problem–Solution"),
    ARGUMENTATIVE("Argumentative / Persuasive"),
    LIST_BASED("List-Based / Enumeration"),
    PROCEDURAL("Step-by-Step Procedure"),
    CASE_STUDY("Case Study Analysis"),
    CRITICAL_EVALUATION("Critical Evaluation"),
    CAUSE_EFFECT("Cause-and-Effect Analysis"),
    REFLECTIVE("Reflective Writing"),
    TECHNICAL_EXPLANATION("Technical / Scientific Explanation"),
    SUMMARY("Summary / Synopsis"),
    ANALYTICAL("Analytical Writing"),
    NARRATIVE("Narrative / Story-Based"),
    QUESTION_ANSWER_FORMAT("Internal Q&A Format"),
    UNKNOWN("Unknown / General");

    private final String displayName;

    AnswerType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
