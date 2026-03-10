package com.smartlms.submission_management_service.exception;

/**
 * Thrown when a lecturer attempts to change marks or feedback before the
 * assignment deadline has passed.
 *
 * Rule: lecturers may only override AI marks/feedback AFTER the due date.
 * Before the deadline, the final grade is always the AI-generated grade.
 */
public class DeadlineNotPassedException extends RuntimeException {
    public DeadlineNotPassedException(String message) {
        super(message);
    }
}
