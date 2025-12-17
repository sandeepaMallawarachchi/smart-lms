package com.smartlms.version_control_service.model;

public enum VersionTriggerType {
    MANUAL,              // User explicitly saved
    AUTO_SAVE,           // Automatic periodic save
    FILE_UPLOAD,         // New file uploaded
    AI_FEEDBACK,         // AI feedback cycle completed
    SUBMISSION,          // Submission submitted
    GRADE_RECEIVED,      // Graded by instructor
    MILESTONE           // Project milestone reached
}
