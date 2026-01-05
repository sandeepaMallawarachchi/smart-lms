package com.example.integrity_monitoring_service.service;

import com.example.integrity_monitoring_service.model.QuestionType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Analyzes questions to determine if plagiarism checking is needed
 */
@Service
@Slf4j
public class QuestionAnalyzerService {

    @Value("${integrity.question-analysis.enabled:true}")
    private boolean analysisEnabled;

    @Value("${integrity.question-analysis.factual-question-threshold:0.8}")
    private double factualQuestionThreshold;

    // Keywords that indicate factual/objective questions
    private static final List<String> FACTUAL_KEYWORDS = Arrays.asList(
            "what is", "define", "definition of", "meaning of",
            "who is", "when did", "where is", "how many",
            "calculate", "compute", "solve", "find the value"
    );

    // Keywords that indicate subjective questions
    private static final List<String> SUBJECTIVE_KEYWORDS = Arrays.asList(
            "explain", "describe", "discuss", "analyze",
            "compare", "contrast", "evaluate", "justify",
            "argue", "essay", "opinion", "why do you think"
    );

    // Patterns for objective questions
    private static final Pattern TRUE_FALSE_PATTERN = Pattern.compile(
            "(?i)(true|false|t/f|correct or incorrect)"
    );

    private static final Pattern MULTIPLE_CHOICE_PATTERN = Pattern.compile(
            "(?i)(a\\)|b\\)|c\\)|d\\)|choose|select one|which of the following)"
    );

    /**
     * Determine if plagiarism check is needed for a question
     */
    public boolean isPlagiarismCheckNeeded(String questionText, String expectedAnswer) {
        if (!analysisEnabled) {
            return true; // Always check if analysis is disabled
        }

        if (questionText == null || questionText.trim().isEmpty()) {
            return true; // Check by default if no question text
        }

        QuestionType type = determineQuestionType(questionText);

        log.debug("Question type detected: {} for question: {}", type,
                questionText.substring(0, Math.min(50, questionText.length())));

        return switch (type) {
            case FACTUAL, CALCULATION, OBJECTIVE ->
                // No need for plagiarism check - same answer expected
                    false;
            case CODE, SUBJECTIVE ->
                // Plagiarism check needed
                    true;
            default ->
                // When unsure, check for plagiarism
                    true;
        };
    }

    /**
     * Determine the type of question
     */
    public QuestionType determineQuestionType(String questionText) {
        String lowerQuestion = questionText.toLowerCase();

        // Check for code questions
        if (isCodeQuestion(questionText)) {
            return QuestionType.CODE;
        }

        // Check for objective questions
        if (TRUE_FALSE_PATTERN.matcher(questionText).find() ||
                MULTIPLE_CHOICE_PATTERN.matcher(questionText).find()) {
            return QuestionType.OBJECTIVE;
        }

        // Check for factual questions
        int factualScore = 0;
        for (String keyword : FACTUAL_KEYWORDS) {
            if (lowerQuestion.contains(keyword)) {
                factualScore++;
            }
        }

        // Check for subjective questions
        int subjectiveScore = 0;
        for (String keyword : SUBJECTIVE_KEYWORDS) {
            if (lowerQuestion.contains(keyword)) {
                subjectiveScore++;
            }
        }

        // Check for calculation questions
        if (isCalculationQuestion(questionText)) {
            return QuestionType.CALCULATION;
        }

        // Determine based on scores
        if (factualScore > 0 && factualScore > subjectiveScore) {
            return QuestionType.FACTUAL;
        } else if (subjectiveScore > 0) {
            return QuestionType.SUBJECTIVE;
        }

        return QuestionType.UNKNOWN;
    }

    /**
     * Check if question is code-related
     */
    private boolean isCodeQuestion(String questionText) {
        String lower = questionText.toLowerCase();

        List<String> codeKeywords = Arrays.asList(
                "write a program", "implement", "code", "function",
                "algorithm", "class", "method", "loop", "array",
                "public class", "def ", "function ", "var ", "let "
        );

        for (String keyword : codeKeywords) {
            if (lower.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if question is calculation-based
     */
    private boolean isCalculationQuestion(String questionText) {
        String lower = questionText.toLowerCase();

        List<String> mathKeywords = Arrays.asList(
                "calculate", "compute", "solve", "find",
                "what is the value", "evaluate", "simplify"
        );

        for (String keyword : mathKeywords) {
            if (lower.contains(keyword)) {
                return true;
            }
        }

        // Check for mathematical symbols
        return questionText.matches(".*[+\\-*/=<>^].*") ||
                questionText.matches(".*\\d+.*"); // Contains numbers
    }

    /**
     * Get reason for skipping plagiarism check
     */
    public String getSkipReason(QuestionType questionType) {
        return switch (questionType) {
            case FACTUAL -> "Factual question - same answer expected from all students";
            case OBJECTIVE ->
                    "Objective question (True/False or Multiple Choice) - no plagiarism check needed";
            case CALCULATION -> "Calculation question - same numerical answer expected";
            default -> "Question type does not require plagiarism checking";
        };
    }
}