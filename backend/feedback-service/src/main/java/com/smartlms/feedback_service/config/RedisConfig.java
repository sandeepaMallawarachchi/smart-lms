package com.smartlms.feedback_service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@EnableCaching
@Slf4j
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    /**
     * Lazy so that the TCP connection is not attempted at startup.
     * Only active when ai.feedback.cache-enabled=true (default).
     */
    @Bean
    @Lazy
    @ConditionalOnProperty(name = "ai.feedback.cache-enabled", havingValue = "true", matchIfMissing = true)
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(redisHost, redisPort);
        return new LettuceConnectionFactory(config);
    }

    @Bean
    @Lazy
    @ConditionalOnProperty(name = "ai.feedback.cache-enabled", havingValue = "true", matchIfMissing = true)
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Fallback CacheManager used when Redis caching is disabled.
     * Ensures @EnableCaching never blocks startup due to a missing Redis bean.
     */
    @Bean
    @ConditionalOnProperty(name = "ai.feedback.cache-enabled", havingValue = "false")
    public CacheManager noOpCacheManager() {
        log.info("[RedisConfig] ai.feedback.cache-enabled=false — using NoOpCacheManager");
        return new NoOpCacheManager();
    }
}