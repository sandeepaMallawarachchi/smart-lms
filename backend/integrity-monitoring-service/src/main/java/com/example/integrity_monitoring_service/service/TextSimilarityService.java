package com.example.integrity_monitoring_service.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealVector;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Text similarity calculation using TF-IDF and Cosine Similarity
 */
@Service
@Slf4j
public class TextSimilarityService {

    /**
     * Calculate similarity between two texts
     */
    public double calculateSimilarity(String text1, String text2) {
        if (text1 == null || text2 == null || text1.isEmpty() || text2.isEmpty()) {
            return 0.0;
        }

        try {
            // Tokenize
            List<String> tokens1 = tokenize(text1);
            List<String> tokens2 = tokenize(text2);

            if (tokens1.isEmpty() || tokens2.isEmpty()) {
                return 0.0;
            }

            // Build vocabulary
            Set<String> vocabulary = new HashSet<>();
            vocabulary.addAll(tokens1);
            vocabulary.addAll(tokens2);

            // Compute TF-IDF vectors
            RealVector vector1 = computeTfIdfVector(tokens1, vocabulary);
            RealVector vector2 = computeTfIdfVector(tokens2, vocabulary);

            // Calculate cosine similarity
            double dotProduct = vector1.dotProduct(vector2);
            double norm1 = vector1.getNorm();
            double norm2 = vector2.getNorm();

            if (norm1 == 0 || norm2 == 0) {
                return 0.0;
            }

            return dotProduct / (norm1 * norm2);

        } catch (Exception e) {
            log.error("Error calculating text similarity: {}", e.getMessage(), e);
            return 0.0;
        }
    }

    /**
     * Tokenize text into words
     */
    private List<String> tokenize(String text) {
        // Convert to lowercase and split by non-alphanumeric characters
        String cleaned = text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        return Arrays.stream(cleaned.split("\\s+"))
                .filter(word -> word.length() > 2) // Remove very short words
                .filter(word -> !isStopWord(word))   // Remove stop words
                .collect(Collectors.toList());
    }

    /**
     * Check if word is a stop word
     */
    private boolean isStopWord(String word) {
        Set<String> stopWords = Set.of(
                "the", "is", "at", "which", "on", "a", "an", "and", "or",
                "but", "in", "with", "to", "for", "of", "as", "by", "from",
                "that", "this", "it", "are", "was", "were", "been", "be",
                "have", "has", "had", "do", "does", "did", "will", "would",
                "could", "should", "may", "might", "must", "can"
        );
        return stopWords.contains(word);
    }

    /**
     * Compute TF-IDF vector for a document
     */
    private RealVector computeTfIdfVector(List<String> tokens, Set<String> vocabulary) {
        double[] vector = new double[vocabulary.size()];
        Map<String, Integer> termFrequency = calculateTermFrequency(tokens);

        List<String> vocabList = new ArrayList<>(vocabulary);
        for (int i = 0; i < vocabList.size(); i++) {
            String term = vocabList.get(i);
            int tf = termFrequency.getOrDefault(term, 0);
            // Simplified TF-IDF (IDF component would require document collection)
            vector[i] = tf > 0 ? 1 + Math.log(tf) : 0;
        }

        return new ArrayRealVector(vector);
    }

    /**
     * Calculate term frequency
     */
    private Map<String, Integer> calculateTermFrequency(List<String> tokens) {
        Map<String, Integer> frequency = new HashMap<>();
        for (String token : tokens) {
            frequency.put(token, frequency.getOrDefault(token, 0) + 1);
        }
        return frequency;
    }

    /**
     * Calculate similarity between a student's text and internet search results.
     *
     * Strategy: concatenate all snippets into one "corpus" document and compare
     * against the student's text once. This produces a much more reliable TF-IDF
     * cosine similarity than comparing against each 150-char snippet individually,
     * because a single short snippet shares too few vocabulary tokens with a
     * 300-500 word student essay to yield a meaningful cosine score.
     *
     * We also compute a per-snippet max as a secondary signal and return the
     * higher of the two.
     */
    public double calculateInternetSimilarity(String studentText, List<Map<String, String>> searchResults) {
        if (searchResults == null || searchResults.isEmpty()) {
            return 0.0;
        }

        // ── 1. Concatenated corpus comparison ─────────────────────────────────
        // Join all snippets + titles into one document. More shared vocabulary
        // means TF-IDF vectors overlap more — gives an honest overall similarity.
        StringBuilder corpus = new StringBuilder();
        for (Map<String, String> result : searchResults) {
            String title   = result.getOrDefault("title", "");
            String snippet = result.getOrDefault("snippet", "");
            if (!title.isEmpty())   corpus.append(title).append(". ");
            if (!snippet.isEmpty()) corpus.append(snippet).append(" ");
        }
        double corpusSim = corpus.length() > 0
                ? calculateSimilarity(studentText, corpus.toString().trim())
                : 0.0;
        log.debug("[TextSimilarity] Internet corpus similarity={} (corpusLen={})", corpusSim, corpus.length());

        // ── 2. Per-snippet max (secondary signal) ──────────────────────────────
        double maxSnippetSim = 0.0;
        for (Map<String, String> result : searchResults) {
            String snippet = result.getOrDefault("snippet", "");
            if (!snippet.isEmpty()) {
                double sim = calculateSimilarity(studentText, snippet);
                if (sim > maxSnippetSim) {
                    log.debug("[TextSimilarity] Per-snippet sim={} domain={}", sim, result.getOrDefault("domain", "?"));
                    maxSnippetSim = sim;
                }
            }
        }

        double finalSim = Math.max(corpusSim, maxSnippetSim);
        log.debug("[TextSimilarity] calculateInternetSimilarity — corpusSim={} maxSnippetSim={} final={}",
                corpusSim, maxSnippetSim, finalSim);
        return finalSim;
    }
}