package com.smartlms.version_control_service;

import com.smartlms.version_control_service.config.VersionControlProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;


@SpringBootApplication
@EnableConfigurationProperties(VersionControlProperties.class)
@EnableAsync
public class VersionControlServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(VersionControlServiceApplication.class, args);
	}
}
