package com.smartlms.version_control_service.dto.request;

import java.util.HashMap;
import java.util.Map;

import com.smartlms.version_control_service.model.VersionTriggerType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionCreateRequest {

    @NotNull(message = "Submission ID is required")
    private Long submissionId;

    private String commitMessage;

    @NotNull(message = "Trigger type is required")
    private VersionTriggerType triggerType;

    private String createdBy;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
}