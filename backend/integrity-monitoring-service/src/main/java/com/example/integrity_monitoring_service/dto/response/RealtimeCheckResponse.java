package com.example.integrity_monitoring_service.dto.response;

import lombok.*;

import java.time.LocalDateTime;

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
}