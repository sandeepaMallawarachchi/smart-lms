package com.example.integrity_monitoring_service.model;

public enum CheckType {
    CODE_JPLAG,           // Code plagiarism using JPlag
    TEXT_COSINE,          // Text similarity using Cosine
    INTERNET_SEARCH,      // Internet plagiarism using Google
    COMBINED,             // All methods combined
    REALTIME              // Real-time as user types
}