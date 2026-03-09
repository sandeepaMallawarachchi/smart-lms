package com.smartlms.submission_management_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionPlagiarismSourceResponse {

    private Long id;
    private String sourceUrl;
    private String sourceTitle;
    private String sourceSnippet;
    private String matchedText;
    private Double similarityPercentage;
    /** ISO-8601 timestamp of when the plagiarism check ran. */
    private String detectedAt;
}
