package com.smartlms.version_control_service.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiffRequest {

    @NotNull(message = "Source version ID is required")
    private Long sourceVersionId;

    @NotNull(message = "Target version ID is required")
    private Long targetVersionId;

    private String filePath; // Optional: specific file to diff
}