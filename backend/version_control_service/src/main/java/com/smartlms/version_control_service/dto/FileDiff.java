package com.smartlms.version_control_service.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileDiff {

    private String filePath;
    private FileChangeType changeType;
    private String unifiedDiff;
    private List<DiffLine> diffLines;
    private Integer linesAdded;
    private Integer linesDeleted;
    private Integer linesModified;
}