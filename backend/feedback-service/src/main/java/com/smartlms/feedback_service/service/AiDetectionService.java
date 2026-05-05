package com.smartlms.feedback_service.service;

import com.smartlms.feedback_service.dto.response.AiDetectionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Classifies student answer text as AI-generated or human-written
 * using the Hello-SimpleAI/chatgpt-detector-roberta model on HuggingFace.
 *
 * Penalty tiers (applied additively alongside plagiarism penalty in LiveFeedbackService):
 *   aiScore >= 0.90 → -0.60
 *   aiScore >= 0.75 → -0.45
 *   aiScore >= 0.60 → -0.25
 *   aiScore >= 0.40 → -0.10
 *   aiScore <  0.40 → no penalty
 *   aiScore == -1.0 → service unavailable, no penalty
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiDetectionService {

    private final HuggingFaceService huggingFaceService;

    public AiDetectionResponse detect(String text) {
        if (text == null || text.trim().length() < 20) {
            return AiDetectionResponse.builder()
                    .aiScore(0.0)
                    .isAiGenerated(false)
                    .label("HUMAN_WRITTEN")
                    .build();
        }

        double score = huggingFaceService.detectAiContent(text);
        log.info("[AiDetection] score={} textLen={}", score, text.length());

        if (score < 0) {
            return AiDetectionResponse.builder()
                    .aiScore(-1.0)
                    .isAiGenerated(false)
                    .label("UNAVAILABLE")
                    .build();
        }

        boolean isAi = score >= 0.75;
        String label = score >= 0.90 ? "VERY_LIKELY_AI"
                     : score >= 0.75 ? "LIKELY_AI"
                     : score >= 0.60 ? "POSSIBLY_AI"
                     : "HUMAN_WRITTEN";

        return AiDetectionResponse.builder()
                .aiScore(score)
                .isAiGenerated(isAi)
                .label(label)
                .build();
    }
}
