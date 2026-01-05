package com.smartlms.version_control_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.smartlms.version_control_service.model.VersionTriggerType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionResponse {

    private Long id;
    private Long submissionId;
    private Integer versionNumber;
    private String commitHash;
    private Long parentVersionId;
    private String commitMessage;
    private VersionTriggerType triggerType;
    private String createdBy;
    private Map<String, Object> metadata;
    private String changesSummary;
    private Integer totalFiles;
    private Long totalSizeBytes;
    private LocalDateTime createdAt;
    private Boolean isSnapshot;
    private List<FileInfoResponse> files;
}