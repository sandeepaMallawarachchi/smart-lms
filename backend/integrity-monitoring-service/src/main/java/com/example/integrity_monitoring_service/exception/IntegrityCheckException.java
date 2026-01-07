package com.example.integrity_monitoring_service.exception;

public class IntegrityCheckException extends RuntimeException {
    public IntegrityCheckException(String message) {
        super(message);
    }

    public IntegrityCheckException(String message, Throwable cause) {
        super(message, cause);
    }
}