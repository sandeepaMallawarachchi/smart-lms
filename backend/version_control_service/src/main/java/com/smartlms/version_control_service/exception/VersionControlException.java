package com.smartlms.version_control_service.exception;


public class VersionControlException extends RuntimeException {
    public VersionControlException(String message) {
        super(message);
    }

    public VersionControlException(String message, Throwable cause) {
        super(message, cause);
    }
}
