package com.smartlms.feedback_service.dto.response;

import lombok.*;

/**
 * Response DTO for POST /api/feedback/grade.
 *
 * Returns only the grade fields — the AI quality scores are not repeated
 * because the caller already has them from the earlier live-feedback response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeCalculationResponse {

    /** Projected earned mark (0–maxPoints). */
    private Double projectedGrade;

    /** Projected grade as a percentage (0–100). */
    private Double projectedGradePercent;

    /** Letter grade (A+, A, A-… F). */
    private String letterGrade;
}
