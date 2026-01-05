package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.response.FeedbackResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedbackCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${ai.feedback.cache-enabled:true}")
    private boolean cacheEnabled;

    @Value("${ai.feedback.cache-ttl-days:7}")
    private int cacheTtlDays;

    private static final String CACHE_PREFIX = "feedback:";

    /**
     * Generate cache key based on submission content and rubric
     */
    public String generateCacheKey(String submissionContent, Long rubricId) {
        try {
            String input = submissionContent + (rubricId != null ? rubricId.toString() : "");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            return CACHE_PREFIX + hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            log.error("Error generating cache key: {}", e.getMessage());
            return CACHE_PREFIX + submissionContent.hashCode() + "_" + rubricId;
        }
    }

    /**
     * Get cached feedback
     */
    public FeedbackResponse getCachedFeedback(String cacheKey) {
        if (!cacheEnabled) {
            return null;
        }

        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof FeedbackResponse) {
                log.debug("Cache hit for key: {}", cacheKey);
                return (FeedbackResponse) cached;
            }
        } catch (Exception e) {
            log.warn("Error retrieving from cache: {}", e.getMessage());
        }

        return null;
    }

    /**
     * Cache feedback response
     */
    public void cacheFeedback(String cacheKey, FeedbackResponse feedback) {
        if (!cacheEnabled) {
            return;
        }

        try {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    feedback,
                    cacheTtlDays,
                    TimeUnit.DAYS
            );
            log.debug("Cached feedback with key: {}", cacheKey);
        } catch (Exception e) {
            log.warn("Error caching feedback: {}", e.getMessage());
        }
    }

    /**
     * Clear cache for specific key
     */
    public void clearCache(String cacheKey) {
        try {
            redisTemplate.delete(cacheKey);
            log.debug("Cleared cache for key: {}", cacheKey);
        } catch (Exception e) {
            log.warn("Error clearing cache: {}", e.getMessage());
        }
    }

    /**
     * Clear all feedback cache
     */
    public void clearAllCache() {
        try {
            var keys = redisTemplate.keys(CACHE_PREFIX + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.info("Cleared {} cache entries", keys.size());
            }
        } catch (Exception e) {
            log.warn("Error clearing all cache: {}", e.getMessage());
        }
    }
}