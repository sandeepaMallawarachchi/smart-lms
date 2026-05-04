package com.example.integrity_monitoring_service.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Complete data object used for PDF report generation.
 * Aggregates plagiarism check results + AI feedback.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlagiarismReportData {

    // ── Submission metadata ──────────────────────────────────────────────────
    String studentName;
    String studentId;
    String assignmentTitle;
    String courseName;
    String submissionId;
    LocalDateTime submissionDate;
    LocalDateTime downloadDate;
    int wordCount;
    int charCount;

    // ── Overall similarity scores (0–100) ────────────────────────────────────
    double overallSimilarity;
    double internetSimilarity;
    double studentPaperSimilarity;
    double publicationSimilarity; // approximated via academic domain sources

    // ── Match category percentages (0–100) ───────────────────────────────────
    double notCitedOrQuotedPct;
    double missingQuotationsPct;
    double missingCitationPct;
    double citedAndQuotedPct;

    // ── Top sources ──────────────────────────────────────────────────────────
    @Builder.Default
    List<TopSource> topSources = new ArrayList<>();

    // ── Full answer text + highlights ────────────────────────────────────────
    String answerText;

    @Builder.Default
    List<TextHighlight> highlights = new ArrayList<>();

    // ── AI feedback (optional) ───────────────────────────────────────────────
    AiFeedbackSection aiFeedback;

    // ── Per-question breakdown ───────────────────────────────────────────────
    @Builder.Default
    List<QuestionSection> questionSections = new ArrayList<>();

    // ── Nested types ─────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopSource {
        int rank;
        String type;          // "Internet", "Student papers", "Publications"
        String label;         // URL or anonymised institution name
        double similarityPct; // 0–100
        String matchedExcerpt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TextHighlight {
        int startIndex;
        int endIndex;
        int sourceRank;   // which top source this belongs to (1-based)
        String status;    // "NOT_CITED", "MISSING_QUOTATIONS", "MISSING_CITATION", "CITED_AND_QUOTED"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionSection {
        int questionNumber;
        String questionText;
        String answerText;
        int wordCount;
        /** Maximum marks allocated to this question (e.g. 20, 30). 0 = unknown. */
        double maxPoints;
        /** Actual AI-suggested earned mark in 0-maxPoints scale (e.g. 15.5 for a 20-mark question). Use directly. */
        double aiGeneratedMark;
        /** Similarity score 0-100 stored in Answer entity. */
        double similarityScore;
        /** LOW / MEDIUM / HIGH, or empty if no check run. */
        String similaritySeverity;
        boolean flagged;
        double relevanceScore;     // 0-10
        double completenessScore;  // 0-10
        double clarityScore;       // 0-10
        double grammarScore;       // 0-10
        List<String> strengths;
        List<String> improvements;
        /** Internet sources that matched this specific question's answer (from SMS plagiarismSources). */
        @Builder.Default
        List<TopSource> sources = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiFeedbackSection {
        double grammarScore;       // 0–10
        double clarityScore;       // 0–10
        double completenessScore;  // 0–10
        double relevanceScore;     // 0–10
        List<String> strengths;
        List<String> improvements;
        List<String> suggestions;
    }
}
