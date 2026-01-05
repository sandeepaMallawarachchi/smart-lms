package com.example.integrity_monitoring_service.model;

public enum QuestionType {
    FACTUAL,             // "What is 2+2?" - Same answer expected
    OBJECTIVE,           // Multiple choice, True/False
    SUBJECTIVE,          // Essay, explanation - Plagiarism check needed
    CODE,                // Programming questions
    CALCULATION,         // Math problems - Same answer expected
    UNKNOWN
}