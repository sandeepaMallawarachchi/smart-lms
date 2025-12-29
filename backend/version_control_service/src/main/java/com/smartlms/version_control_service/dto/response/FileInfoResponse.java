package com.smartlms.version_control_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileInfoResponse {

    private Long id;
    private String filePath;
    private String fileName;
    private Long fileSizeBytes;
    private String contentType;
    private String fileExtension;
    private String contentHash;
}
