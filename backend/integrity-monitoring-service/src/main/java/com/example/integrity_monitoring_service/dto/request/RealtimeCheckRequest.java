package com.example.integrity_monitoring_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RealtimeCheckRequest {

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotBlank(message = "Student ID is required")
    private String studentId;

    @NotNull(message = "Question ID is required")
    private Long questionId;

    @NotBlank(message = "Text content is required")
    private String textContent;

    private String questionText;
    private String questionType;
}