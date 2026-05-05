package com.smartlms.submission_management_service.exception;

/**
 * Thrown when a caller attempts to read or mutate a resource they do not own
 * or do not have the correct role to access.
 *
 * Mapped to HTTP 403 Forbidden by GlobalExceptionHandler.
 */
public class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(String message) {
        super(message);
    }
}
