package com.smartlms.feedback_service.exception;

public class FeedbackGenerationException extends RuntimeException {
    public FeedbackGenerationException(String message) {
        super(message);
    }

    public FeedbackGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}