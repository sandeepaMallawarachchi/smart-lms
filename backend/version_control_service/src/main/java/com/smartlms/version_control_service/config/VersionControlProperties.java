package com.smartlms.version_control_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "version")
public class VersionControlProperties {
    private Integer snapshotInterval = 10;
    private Boolean enableDeltaCompression = true;
    private Integer maxDiffSizeMb = 10;
}