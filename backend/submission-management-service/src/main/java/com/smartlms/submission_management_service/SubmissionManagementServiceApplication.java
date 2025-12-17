package com.smartlms.submission_management_service;

import com.smartlms.submission_management_service.config.FileStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(FileStorageProperties.class)
public class SubmissionManagementServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(SubmissionManagementServiceApplication.class, args);
	}

}
