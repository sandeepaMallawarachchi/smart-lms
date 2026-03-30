package com.example.integrity_monitoring_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Executor used to parallelise the peer-comparison and internet-search legs
     * of a COMBINED plagiarism check. Two threads per check are enough since each
     * check fires exactly two tasks; the queue absorbs bursts.
     */
    @Bean(name = "plagiarismTaskExecutor")
    public Executor plagiarismTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("plagiarism-");
        executor.initialize();
        return executor;
    }
}
