package com.example.integrity_monitoring_service.dto.response;

import com.example.integrity_monitoring_service.model.SimilarityMatch;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimilarityMatchResponse {

    private Long id;
    private Long matchedSubmissionId;
    private String matchedStudentId;
    private Double similarityScore;
    private String fileName;
    private String matchedFileName;
    private Integer matchingLines;
    private Integer tokensMatched;
    private String details;

    public static SimilarityMatchResponse fromEntity(SimilarityMatch match) {
        return SimilarityMatchResponse.builder()
                .id(match.getId())
                .matchedSubmissionId(match.getMatchedSubmissionId())
                .matchedStudentId(match.getMatchedStudentId())
                .similarityScore(match.getSimilarityScore())
                .fileName(match.getFileName())
                .matchedFileName(match.getMatchedFileName())
                .matchingLines(match.getMatchingLines())
                .tokensMatched(match.getTokensMatched())
                .details(match.getDetails())
                .build();
    }
}