package com.example.integrity_monitoring_service.dto.response;

import com.example.integrity_monitoring_service.model.CheckStatus;
import com.example.integrity_monitoring_service.model.CheckType;
import com.example.integrity_monitoring_service.model.PlagiarismCheck;
import com.example.integrity_monitoring_service.model.QuestionType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlagiarismCheckResponse {

    private Long id;
    private Long submissionId;
    private String studentId;
    private String assignmentId;
    private Long questionId;
    private CheckType checkType;
    private CheckStatus status;
    private QuestionType questionType;
    private Boolean plagiarismCheckNeeded;
    private String skipReason;

    // Scores
    private Double overallSimilarityScore;
    private Double maxSimilarityScore;
    private Double studentSimilarityScore;
    private Double internetSimilarityScore;

    // Flags
    private Boolean flagged;
    private Integer matchesFound;
    private Integer internetMatchesFound;
    private Long processingTimeMs;

    // Matches
    private List<SimilarityMatchResponse> similarityMatches;
    private List<InternetMatchResponse> internetMatches;

    // Metadata
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PlagiarismCheckResponse fromEntity(PlagiarismCheck check) {
        return PlagiarismCheckResponse.builder()
                .id(check.getId())
                .submissionId(check.getSubmissionId())
                .studentId(check.getStudentId())
                .assignmentId(check.getAssignmentId())
                .questionId(check.getQuestionId())
                .checkType(check.getCheckType())
                .status(check.getStatus())
                .questionType(check.getQuestionType())
                .plagiarismCheckNeeded(check.getPlagiarismCheckNeeded())
                .skipReason(check.getSkipReason())
                .overallSimilarityScore(check.getOverallSimilarityScore())
                .maxSimilarityScore(check.getMaxSimilarityScore())
                .studentSimilarityScore(check.getStudentSimilarityScore())
                .internetSimilarityScore(check.getInternetSimilarityScore())
                .flagged(check.getFlagged())
                .matchesFound(check.getMatchesFound())
                .internetMatchesFound(check.getInternetMatchesFound())
                .processingTimeMs(check.getProcessingTimeMs())
                .similarityMatches(check.getSimilarityMatches().stream()
                        .map(SimilarityMatchResponse::fromEntity)
                        .collect(Collectors.toList()))
                .internetMatches(check.getInternetMatches().stream()
                        .map(InternetMatchResponse::fromEntity)
                        .collect(Collectors.toList()))
                .metadata(check.getMetadata())
                .createdAt(check.getCreatedAt())
                .updatedAt(check.getUpdatedAt())
                .build();
    }
}