package com.example.integrity_monitoring_service.model;

public enum CheckStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    FAILED,
    SKIPPED              // Skipped because plagiarism check not needed
}