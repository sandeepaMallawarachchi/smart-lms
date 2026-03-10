package com.example.integrity_monitoring_service.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RealtimeCheckResponse {

    private String sessionId;
    private String studentId;
    private Long questionId;
    private Double similarityScore;
    private Boolean flagged;
    private String warningMessage;
    private Integer textLength;
    private LocalDateTime checkedAt;

    /** Internet sources where similar content was found (populated when similarity >= threshold). */
    private List<InternetMatchResponse> internetMatches;

    /** Internet similarity score (0.0-1.0) before multiplying with peer — for display */
    private Double internetSimilarityScore;

    /** Peer similarity score (0.0-1.0) — for display */
    private Double peerSimilarityScore;

    /** Aggregate risk score 0-100 (includes number-of-matches bonus) */
    private Double riskScore;

    /** CLEAN | LOW | MEDIUM | HIGH */
    private String riskLevel;
}