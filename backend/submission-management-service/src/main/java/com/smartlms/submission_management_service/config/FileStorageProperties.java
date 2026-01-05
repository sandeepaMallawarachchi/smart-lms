package com.smartlms.submission_management_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "file.upload")
public class FileStorageProperties {
    private String dir = "C:\\RP\\uploads";
}