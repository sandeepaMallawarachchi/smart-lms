package com.smartlms.submission_management_service.model;

public enum SubmissionStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    GRADED,
    RETURNED,
    RESUBMITTED,
    // Additional statuses used by frontend
    LATE,
    PENDING_REVIEW,
    FLAGGED
}
