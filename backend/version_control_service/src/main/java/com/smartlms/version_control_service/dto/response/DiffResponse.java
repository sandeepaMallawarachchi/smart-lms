package com.smartlms.version_control_service.dto.response;

import java.util.List;

import com.smartlms.version_control_service.dto.DiffSummary;
import com.smartlms.version_control_service.dto.FileDiff;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiffResponse {

    private Long sourceVersionId;
    private Integer sourceVersionNumber;
    private Long targetVersionId;
    private Integer targetVersionNumber;
    private List<FileDiff> fileDiffs;
    private DiffSummary summary;
}
