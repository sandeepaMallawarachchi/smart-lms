package com.example.integrity_monitoring_service.dto.response;

import com.example.integrity_monitoring_service.model.InternetMatch;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternetMatchResponse {

    private Long id;
    private String url;
    private String title;
    private String snippet;
    private Double similarityScore;
    private String matchedText;
    private String sourceDomain;

    public static InternetMatchResponse fromEntity(InternetMatch match) {
        return InternetMatchResponse.builder()
                .id(match.getId())
                .url(match.getUrl())
                .title(match.getTitle())
                .snippet(match.getSnippet())
                .similarityScore(match.getSimilarityScore())
                .matchedText(match.getMatchedText())
                .sourceDomain(match.getSourceDomain())
                .build();
    }
}