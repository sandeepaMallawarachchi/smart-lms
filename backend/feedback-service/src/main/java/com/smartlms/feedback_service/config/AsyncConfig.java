package com.smartlms.feedback_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Value("${ai.feedback.max-concurrent-requests:5}")
    private int maxConcurrentRequests;

    @Bean(name = "feedbackTaskExecutor")
    public Executor feedbackTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(maxConcurrentRequests);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("feedback-");
        executor.initialize();
        return executor;
    }
}