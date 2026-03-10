package com.smartlms.submission_management_service.dto.request;

import lombok.*;

import java.util.List;

/**
 * Request body for:
 *   POST /api/submissions/{submissionId}/versions/{versionId}/answers/{questionId}/sources
 *
 * Sent by the frontend after a plagiarism check completes, carrying the
 * detailed source matches for one question in one version snapshot.
 * Replaces any previously saved sources for the same versionAnswer.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavePlagiarismSourcesRequest {

    private List<SourceItem> sources;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SourceItem {
        private String sourceUrl;
        private String sourceTitle;
        private String sourceSnippet;
        private String matchedText;
        private Double similarityPercentage;
        /** ISO-8601 timestamp — when the check that found this match ran. */
        private String detectedAt;
    }
}
