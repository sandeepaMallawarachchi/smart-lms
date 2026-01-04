package com.example.integrity_monitoring_service.config;

import com.example.integrity_monitoring_service.service.RealtimeCheckService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class SchedulingConfig {

    private final RealtimeCheckService realtimeCheckService;

    /**
     * Clean up old real-time checks daily
     */
    @Scheduled(cron = "0 0 2 * * ?") // 2 AM daily
    public void cleanupOldRealtimeChecks() {
        log.info("Starting cleanup of old real-time checks");
        realtimeCheckService.cleanupOldChecks();
        log.info("Cleanup completed");
    }
}