package com.example.integrity_monitoring_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Advanced multi-algorithm text similarity service.
 * Complements TF-IDF cosine with Jaccard, N-gram, and LCS algorithms.
 * Returns the maximum score across all methods to maximise recall.
 */
@Service
@Slf4j
public class AdvancedSimilarityService {

    private static final Set<String> STOP_WORDS = Set.of(
            "the","is","at","which","on","a","an","and","or","but","in","with",
            "to","for","of","as","by","from","that","this","it","are","was",
            "were","been","be","have","has","had","do","does","did","will",
            "would","could","should","may","might","must","can","not","no",
            "so","if","then","than","when","where","who","how","what","why"
    );

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Compute the maximum similarity score across all algorithms.
     * This ensures we catch plagiarism that any single algorithm might miss.
     */
    public double computeMaxSimilarity(String text1, String text2) {
        if (text1 == null || text2 == null || text1.isBlank() || text2.isBlank()) return 0.0;

        double jaccard = computeJaccardSimilarity(text1, text2);
        double ngram3  = computeNgramOverlap(text1, text2, 3);
        double ngram5  = computeNgramOverlap(text1, text2, 5);
        double lcs     = computeNormalisedLcs(text1, text2);

        double max = Math.max(Math.max(jaccard, ngram3), Math.max(ngram5, lcs));
        log.debug("[AdvSim] jaccard={} ngram3={} ngram5={} lcs={} max={}",
                jaccard, ngram3, ngram5, lcs, max);
        return max;
    }

    /**
     * Compute Jaccard similarity on word sets (after stop-word removal).
     * Good at detecting copy-paste even when word order changes slightly.
     */
    public double computeJaccardSimilarity(String text1, String text2) {
        Set<String> set1 = tokeniseToSet(text1);
        Set<String> set2 = tokeniseToSet(text2);
        if (set1.isEmpty() || set2.isEmpty()) return 0.0;

        Set<String> intersection = new HashSet<>(set1);
        intersection.retainAll(set2);

        Set<String> union = new HashSet<>(set1);
        union.addAll(set2);

        return (double) intersection.size() / union.size();
    }

    /**
     * Compute N-gram overlap (Dice coefficient on character n-grams).
     * Excellent for detecting paraphrased content with synonym substitution.
     *
     * @param n n-gram size (3 = trigrams, 5 = 5-grams)
     */
    public double computeNgramOverlap(String text1, String text2, int n) {
        List<String> ngrams1 = buildNgrams(normalise(text1), n);
        List<String> ngrams2 = buildNgrams(normalise(text2), n);
        if (ngrams1.isEmpty() || ngrams2.isEmpty()) return 0.0;

        // Dice coefficient: 2 * |intersection| / (|A| + |B|)
        Map<String, Long> freq1 = ngrams1.stream()
                .collect(Collectors.groupingBy(g -> g, Collectors.counting()));
        Map<String, Long> freq2 = ngrams2.stream()
                .collect(Collectors.groupingBy(g -> g, Collectors.counting()));

        long intersection = 0;
        for (Map.Entry<String, Long> e : freq1.entrySet()) {
            long min = Math.min(e.getValue(), freq2.getOrDefault(e.getKey(), 0L));
            intersection += min;
        }

        return (2.0 * intersection) / (ngrams1.size() + ngrams2.size());
    }

    /**
     * Compute normalised Longest Common Subsequence length.
     * Catches reordered but semantically identical text.
     * Uses word-level LCS (not character) for efficiency.
     */
    public double computeNormalisedLcs(String text1, String text2) {
        List<String> words1 = tokenise(text1);
        List<String> words2 = tokenise(text2);
        if (words1.isEmpty() || words2.isEmpty()) return 0.0;

        // Limit to 200 words each to keep O(m*n) tractable
        if (words1.size() > 200) words1 = words1.subList(0, 200);
        if (words2.size() > 200) words2 = words2.subList(0, 200);

        int lcsLen = computeLcsLength(words1, words2);
        int maxLen = Math.max(words1.size(), words2.size());
        return (double) lcsLen / maxLen;
    }

    /**
     * Detect if text1 is a structural paraphrase of text2:
     * same sentence structure, different words.
     * Returns 0.0-1.0 confidence that paraphrasing occurred.
     */
    public double detectParaphrase(String text1, String text2) {
        // Heuristic: high LCS on word-length sequences but low word overlap
        double wordOverlap = computeJaccardSimilarity(text1, text2);
        double lcs = computeNormalisedLcs(text1, text2);

        // Paraphrase signal: decent LCS (structure preserved) but low exact word overlap
        if (lcs > 0.4 && wordOverlap < 0.3) {
            return Math.min(1.0, lcs * 1.5 - wordOverlap);
        }
        return 0.0;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private Set<String> tokeniseToSet(String text) {
        return new HashSet<>(tokenise(text));
    }

    private List<String> tokenise(String text) {
        return Arrays.stream(normalise(text).split("\\s+"))
                .filter(w -> w.length() >= 3)
                .filter(w -> !STOP_WORDS.contains(w))
                .collect(Collectors.toList());
    }

    private String normalise(String text) {
        return text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private List<String> buildNgrams(String text, int n) {
        List<String> result = new ArrayList<>();
        if (text.length() < n) return result;
        for (int i = 0; i <= text.length() - n; i++) {
            result.add(text.substring(i, i + n));
        }
        return result;
    }

    private int computeLcsLength(List<String> a, List<String> b) {
        int m = a.size(), nn = b.size();
        int[][] dp = new int[m + 1][nn + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= nn; j++) {
                dp[i][j] = a.get(i - 1).equals(b.get(j - 1))
                        ? dp[i - 1][j - 1] + 1
                        : Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][nn];
    }
}
