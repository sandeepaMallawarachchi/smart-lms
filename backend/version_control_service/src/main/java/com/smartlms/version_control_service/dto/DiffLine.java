package com.smartlms.version_control_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiffLine {

    private DiffLineType type;
    private Integer lineNumber;
    private String content;
}
