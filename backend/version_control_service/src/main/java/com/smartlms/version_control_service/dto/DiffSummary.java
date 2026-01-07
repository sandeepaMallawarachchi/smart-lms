package com.smartlms.version_control_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiffSummary {

    private Integer totalFiles;
    private Integer filesAdded;
    private Integer filesModified;
    private Integer filesDeleted;
    private Integer totalLinesAdded;
    private Integer totalLinesDeleted;
    private Integer totalLinesModified;
}